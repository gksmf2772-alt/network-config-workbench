// src/core/parsers/nokiaClassicParser.js
import {
  buildHierarchyKey,
  canonicalInterfaceName,
  canonicalServiceName,
  canonicalStaticRouteIdentity,
  normalizeNokiaSemanticFields,
} from "../semanticFieldNormalizer.js";
import {
  buildStaticRouteNextHopFields,
  collectStaticRouteNextHopEntriesFromLines,
  mergeStaticRouteFields,
} from "../staticRouteFields.js";

function splitLines(configText = "") {
  return String(configText || "")
    .split(/\r?\n/)
    .map((raw, index) => ({
      raw,
      lineNo: index + 1,
      text: raw.trim(),
    }));
}

function stripQuotes(value = "") {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function normalizeState(value = "") {
  const text = String(value || "").trim().toLowerCase();

  if (text === "no shutdown") return "enabled";
  if (text === "shutdown") return "disabled";
  if (text === "admin-state enable") return "enabled";
  if (text === "admin-state disable") return "disabled";

  return text;
}

function createObject({
  id,
  sourceName,
  normalizedType,
  normalizedIdentity,
  fields = {},
  rawLines = [],
}) {
  return {
    id,
    vendor: "nokia-classic",
    sourceType: normalizedType,
    sourceName,
    normalizedType,
    normalizedIdentity,

    description: fields.description || null,
    ipAddress: fields.address || null,
    prefix: fields.route || fields.address || null,
    peerIp: fields.neighbor || fields.peerIp || null,
    peerAs: fields["peer-as"] || fields.peerAs || null,
    nextHop: fields["next-hop"] || fields.nextHop || null,

    fields: normalizeNokiaSemanticFields(fields),
    rawLines,
  };
}

function createCurrentObject(type, name, rawLine) {
  const baseFields = {};

  if (type === "port") baseFields.port = name;
  if (type === "lag") baseFields.lag = name;
  if (type === "interface") baseFields.interface = name;
  if (type === "static-route") {
    baseFields.route = name;
    baseFields.address = name;
  }
  if (type === "bgp") {
    baseFields.neighbor = name;
    baseFields.peerIp = name;
  }
  if (type === "pim") baseFields.interface = name;

  return {
    type,
    name,
    rawLines: [rawLine],
    fields: baseFields,
  };
}

function flushCurrent(current, objects) {
  if (!current) return null;

  const fields = current.type === "static-route"
    ? buildStaticRouteAggregateFields(current)
    : current.fields;

  const normalizedIdentity =
    current.type === "static-route"
      ? (canonicalStaticRouteIdentity(fields) || fields.route || current.name)
      : fields.neighbor ||
        fields.interface ||
        fields.lag ||
        fields.port ||
        current.name;

  objects.push(
    createObject({
      id: `old-${current.type}-${normalizedIdentity}`,
      sourceName: current.name,
      normalizedType: current.type,
      normalizedIdentity,
      fields,
      rawLines: current.rawLines,
    })
  );

  return null;
}

function buildStaticRouteAggregateFields(current) {
  const fields = {
    route: current.fields.route || current.name,
    address: current.fields.address || current.fields.route || current.name,
  };
  if (current.fields.description) fields.description = current.fields.description;

  return {
    ...fields,
    ...buildStaticRouteNextHopFields(
      collectStaticRouteNextHopEntriesFromLines(current.rawLines)
    ),
  };
}

function makeServiceObject({ type, name, fields, rawLines, index }) {
  const normalizedFields = normalizeNokiaSemanticFields(fields);
  const identity =
    normalizedFields["default-host"] ||
    normalizedFields["static-host"] ||
    normalizedFields.sap ||
    normalizedFields["group-interface"] ||
    normalizedFields["subscriber-interface"] ||
    normalizedFields.interface ||
    canonicalServiceName(name);

  return createObject({
    id: `old-${type}-${index}-${identity}`,
    sourceName: name || identity,
    normalizedType: type,
    normalizedIdentity: identity,
    fields: normalizedFields,
    rawLines,
  });
}

function parseClassicServiceObjects(lines) {
  const objects = [];
  const context = { interface: "", subscriber: "", group: "", sap: "" };

  lines.forEach((line, index) => {
    const text = line.text;
    if (!text) return;

    let match = text.match(/^configure\s+router\s+(?:\S+\s+)?interface\s+"?([^"]+)"?/i) ||
      text.match(/^interface\s+"?([^"{]+)"?/i);
    if (match) {
      context.interface = canonicalInterfaceName(match[1]);
      context.subscriber = "";
      context.group = "";
      context.sap = "";
      return;
    }

    match = text.match(/^subscriber-interface\s+"?([^"\s]+)"?/i);
    if (match) {
      context.subscriber = canonicalServiceName(match[1]);
      context.group = "";
      context.sap = "";
      objects.push(makeServiceObject({
        type: "subscriber-interface",
        name: context.subscriber,
        fields: { interface: context.interface, "subscriber-interface": context.subscriber },
        rawLines: collectClassicBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^group-interface\s+"?([^"\s]+)"?/i);
    if (match) {
      context.group = canonicalServiceName(match[1]);
      context.sap = "";
      objects.push(makeServiceObject({
        type: "group-interface",
        name: context.group,
        fields: {
          interface: context.interface,
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
        },
        rawLines: collectClassicBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^sap\s+(\S+)/i);
    if (match) {
      context.sap = canonicalServiceName(match[1]);
      objects.push(makeServiceObject({
        type: "sap",
        name: context.sap,
        fields: {
          interface: context.interface,
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          sap: context.sap,
        },
        rawLines: collectClassicBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^filter\s+ip\s+(.+)$/i);
    if (match && context.sap) {
      objects.push(makeServiceObject({
        type: "sap",
        name: context.sap,
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          sap: context.sap,
          "ingress.filter.ip": stripQuotes(match[1]),
        },
        rawLines: collectClassicBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^qos\s+(.+)$/i);
    if (match && context.sap) {
      objects.push(makeServiceObject({
        type: "sap",
        name: context.sap,
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          sap: context.sap,
          "egress.qos": stripQuotes(match[1]),
        },
        rawLines: collectClassicBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^authentication-policy\s+(.+)$/i);
    if (match && context.group) {
      objects.push(makeServiceObject({
        type: "group-interface",
        name: context.group,
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          "authentication-policy": stripQuotes(match[1]),
        },
        rawLines: collectClassicBlockLines(lines, index),
        index,
      }));
      return;
    }

    if (/^no\s+redirects$/i.test(text) && context.group) {
      objects.push(makeServiceObject({
        type: "icmp-options",
        name: buildHierarchyKey([context.subscriber, context.group]),
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          "icmp.redirects.disabled": true,
        },
        rawLines: collectClassicBlockLines(lines, index),
        index,
      }));
      return;
    }

    if (/^allow-unmatching-subnets$/i.test(text) && context.group) {
      objects.push(makeServiceObject({
        type: "dhcp",
        name: buildHierarchyKey([context.subscriber, context.group]),
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          "dhcp.allow-unmatching-subnets": true,
        },
        rawLines: collectClassicBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^static-host\s+(\S+)(?:\s+next-hop\s+(\S+))?/i);
    if (match) {
      const host = stripQuotes(match[1]);
      objects.push(makeServiceObject({
        type: "static-host",
        name: host,
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          "static-host": host,
          "next-hop": stripQuotes(match[2] || ""),
        },
        rawLines: collectClassicBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^default-host\s+(\S+)(?:\s+next-hop\s+(\S+))?/i);
    if (match) {
      const host = stripQuotes(match[1]);
      objects.push(makeServiceObject({
        type: "default-host",
        name: host,
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          "default-host": host,
          "next-hop": stripQuotes(match[2] || ""),
        },
        rawLines: collectClassicBlockLines(lines, index),
        index,
      }));
      return;
    }

    if (/^sub-sla-mgmt$/i.test(text) && context.sap) {
      objects.push(makeServiceObject({
        type: "sub-sla-mgmt",
        name: context.sap,
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          sap: context.sap,
          "sub-sla-mgmt": "present",
        },
        rawLines: collectClassicBlockLines(lines, index),
        index,
      }));
    }
  });

  return objects;
}

function mergeObjectsBySemanticIdentity(objects = []) {
  const merged = new Map();

  objects.forEach((object) => {
    const key = `${object.normalizedType}:${object.normalizedIdentity}`;
    if (!merged.has(key)) {
      merged.set(key, { ...object, fields: { ...(object.fields || {}) }, rawLines: [...(object.rawLines || [])] });
      return;
    }

    const target = merged.get(key);
    target.fields = normalizeNokiaSemanticFields(
      target.normalizedType === "static-route"
        ? mergeStaticRouteFields(target.fields, object.fields)
        : {
            ...(target.fields || {}),
            ...(object.fields || {}),
          }
    );
    target.rawLines = mergeRawLines(target.rawLines, object.rawLines);
    target.description ||= object.description;
    target.ipAddress ||= object.ipAddress;
    target.prefix ||= object.prefix;
    target.nextHop = target.fields["next-hop"] || target.nextHop || object.nextHop;
    target.peerIp ||= object.peerIp;
    target.peerAs ||= object.peerAs;
  });

  return [...merged.values()];
}

function mergeRawLines(base = [], next = []) {
  const result = [...(base || [])];
  const seen = new Set(result.map((line) => String(line || "")));

  for (const line of next || []) {
    const key = String(line || "");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }

  return result;
}

//## 새 객체 시작 구문 ##
function parseHeaderLine(text) {
  let match;

  match = text.match(/^configure\s+port\s+(\S+)/i);
  if (match) return { type: "port", name: stripQuotes(match[1]) };

  match = text.match(/^port\s+(\S+)/i);
  if (match) return { type: "port", name: stripQuotes(match[1]) };

  match = text.match(/^configure\s+lag\s+(\S+)/i);
  if (match) return { type: "lag", name: stripQuotes(match[1]) };

  match = text.match(/^lag\s+(\S+)/i);
  if (match) return { type: "lag", name: stripQuotes(match[1]) };

  match = text.match(/^configure\s+router\s+(?:\S+\s+)?interface\s+"?([^"]+)"?/i);
  if (match) return { type: "interface", name: stripQuotes(match[1]) };

  match = text.match(/^interface\s+"?([^"{]+)"?/i);
  if (match) return { type: "interface", name: stripQuotes(match[1]) };

  match = text.match(/^static-route-entry\s+(\S+)/i);
  if (match) return { type: "static-route", name: stripQuotes(match[1]) };

  match = text.match(/^route\s+"?([^"\s{}]+)"?(?:\s+route-type\b|\s+create\b|\s*\{|$)/i);
  if (match) return { type: "static-route", name: stripQuotes(match[1]) };

  match = text.match(/^configure\s+router\s+(?:\S+\s+)?static-routes\s+route\s+"?(\S+)"?/i);
  if (match) return { type: "static-route", name: stripQuotes(match[1]) };

  match = text.match(/^configure\s+router\s+(?:\S+\s+)?bgp\s+neighbor\s+"?([^"\s]+)"?/i);
  if (match) return { type: "bgp", name: stripQuotes(match[1]) };

  match = text.match(/^neighbor\s+"?([^"\s]+)"?/i);
  if (match) return { type: "bgp", name: stripQuotes(match[1]) };

  match = text.match(/^configure\s+router\s+(?:\S+\s+)?pim\s+interface\s+"?([^"]+)"?/i);
  if (match) return { type: "pim", name: stripQuotes(match[1]) };

  match = text.match(/^pim\s+interface\s+"?([^"]+)"?/i);
  if (match) return { type: "pim", name: stripQuotes(match[1]) };

  return null;
}

function indentationOf(raw = "") {
  return String(raw || "").match(/^\s*/)?.[0]?.length || 0;
}

function isClassicSemanticBlockStart(text = "") {
  return Boolean(
    parseHeaderLine(text) ||
    /^subscriber-interface\s+"?([^"\s]+)"?/i.test(text) ||
    /^group-interface\s+"?([^"\s]+)"?/i.test(text) ||
    /^sap\s+\S+/i.test(text) ||
    /^static-host\s+\S+/i.test(text) ||
    /^default-host\s+\S+/i.test(text) ||
    /^sub-sla-mgmt$/i.test(text)
  );
}

function collectClassicBlockLines(lines = [], startIndex = 0) {
  const startLine = lines[startIndex];
  if (!startLine) return [];

  const startIndent = indentationOf(startLine.raw);
  const block = [startLine.raw];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const text = line.text;
    if (!text) {
      block.push(line.raw);
      continue;
    }

    if (
      indentationOf(line.raw) <= startIndent &&
      isClassicSemanticBlockStart(text)
    ) {
      break;
    }

    block.push(line.raw);

    if (/^(exit|})$/i.test(text) && indentationOf(line.raw) <= startIndent) {
      break;
    }
  }

  return block;
}

function isStaticRouteBlockHeader(text = "") {
  if (/\bnext-hop\b/i.test(text) && !/^static-route-entry\s+\S+\s+create\b/i.test(text)) {
    return false;
  }

  return (
    /^static-route-entry\s+\S+(?:\s+create\b|\s*\{|$)/i.test(text) ||
    /^route\s+"?[^"\s{}]+"?(?:\s+route-type\b|\s+create\b|\s*\{|$)/i.test(text) ||
    /^configure\s+router\s+(?:\S+\s+)?static-routes\s+route\s+"?\S+"?/i.test(text)
  );
}

function appendLineToCurrentObject(current, line) {
  if (!current) return false;

  const text = line.text;

  if (
    current.type === "static-route" &&
    current.blockDepth > 0 &&
    isStaticRouteBlockHeader(text) &&
    current.rawLines.length > 0
  ) {
    current.blockDepth += 1;
  }

  current.rawLines.push(line.raw);
  applyFieldLine(current, text);

  if (/^(exit|})$/i.test(text)) {
    if (current.type === "static-route" && current.blockDepth > 0) {
      current.blockDepth -= 1;
    }

    return false;
  }

  return false;
}

//## 객체 안 필드 구문 ##
function applyFieldLine(current, text) {
  if (!current) return;

  let match;

  match = text.match(/^description\s+(.+)$/i);
  if (match) {
    current.fields.description = stripQuotes(match[1]);
    return;
  }

  match = text.match(/^address\s+(\S+)/i);
  if (match) {
    current.fields.address = stripQuotes(match[1]);
    return;
  }

  match = text.match(/^ip\s+address\s+(\S+)(?:\s+(\S+))?/i);
  if (match) {
    current.fields.address = match[2]
      ? `${match[1]} ${match[2]}`
      : match[1];
    return;
  }

  match = text.match(/^next-hop\s+"?([^"\s]+)"?/i);
  if (match) {
    current.fields["next-hop"] = stripQuotes(match[1]);
    return;
  }

  match = text.match(/^indirect\s+"?([^"\s]+)"?/i);
  if (match && current.type === "static-route") {
    current.fields["next-hop"] = stripQuotes(match[1]);
    current.fields["next-hop-type"] = "indirect";
    return;
  }

  if (/^tunnel-next-hop$/i.test(text) && current.type === "static-route") {
    current.fields["tunnel-next-hop"] = "true";
    return;
  }

  match = text.match(/^port\s+"?([^"\s]+)"?/i);
  if (match && current.type === "lag") {
    const member = stripQuotes(match[1]);
    current.fields["member-port"] = member;
    current.fields.members = [
      ...(Array.isArray(current.fields.members) ? current.fields.members : []),
      member,
    ];
    return;
  }

  match = text.match(/^tag\s+(\S+)/i);
  if (match) {
    current.fields.tag = stripQuotes(match[1]);
    return;
  }

  match = text.match(/^remote-as\s+(\S+)/i);
  if (match) {
    current.fields["peer-as"] = stripQuotes(match[1]);
    current.fields.peerAs = stripQuotes(match[1]);
    return;
  }

  match = text.match(/^peer-as\s+(\S+)/i);
  if (match) {
    current.fields["peer-as"] = stripQuotes(match[1]);
    current.fields.peerAs = stripQuotes(match[1]);
    return;
  }

  match = text.match(/^authentication-key\s+(.+)$/i);
  if (match) {
    current.fields["authentication-key"] = stripQuotes(match[1]);
    return;
  }

  match = text.match(/^import\s+(.+)$/i);
  if (match && current.type === "bgp") {
    current.fields["import.policy"] = stripQuotes(match[1]);
    return;
  }

  match = text.match(/^export\s+(.+)$/i);
  if (match && current.type === "bgp") {
    current.fields["export.policy"] = stripQuotes(match[1]);
    return;
  }

  match = text.match(/^group\s+"?([^"]+)"?/i);
  if (match) {
    current.fields.group = stripQuotes(match[1]);
    return;
  }

  if (/^(no\s+shutdown|shutdown|admin-state\s+enable|admin-state\s+disable)$/i.test(text)) {
    const state = normalizeState(text);
    current.fields.state = state;
    current.fields["admin-state"] = state;
  }
}

export function parseNokiaClassicConfig(configText = "", { side = "old" } = {}) {
  const lines = splitLines(configText);
  const objects = [];
  const warnings = [];
  const errors = [];

  let current = null;

  for (const line of lines) {
    const text = line.text;
    if (!text) continue;

    if (current?.type === "static-route" && current.blockDepth > 0) {
      if (appendLineToCurrentObject(current, line)) {
        current = flushCurrent(current, objects);
      }
      continue;
    }

    if (current?.type === "lag" && /^port\s+\S+/i.test(text)) {
      appendLineToCurrentObject(current, line);
      continue;
    }

    const header = parseHeaderLine(text);

    if (header) {
      current = flushCurrent(current, objects);
      current = createCurrentObject(header.type, header.name, line.raw);
      if (header.type === "static-route" && isStaticRouteBlockHeader(text)) {
        current.blockDepth = 1;
      }
      continue;
    }

    if (!current) continue;

    if (appendLineToCurrentObject(current, line)) {
      current = flushCurrent(current, objects);
    }
  }

  flushCurrent(current, objects);
  objects.push(...parseClassicServiceObjects(lines));

  return {
    vendor: "nokia-classic",
    side,
    objects: mergeObjectsBySemanticIdentity(objects),
    warnings,
    errors,
  };
}
