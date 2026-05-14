// src/core/parsers/nokiaMdCliParser.js

import { createNormalizedObject } from "./index.js";
import {
  buildHierarchyKey,
  canonicalInterfaceName,
  canonicalServiceName,
  normalizeNokiaSemanticFields,
} from "../semanticFieldNormalizer.js";

function splitLines(configText) {
  return typeof configText === "string" ? configText.split(/\r?\n/) : [];
}

function stripQuotes(value) {
  return String(value || "").replace(/^["']|["']$/g, "").trim();
}

function extractDescription(lines) {
  for (const line of lines) {
    const match = line.trim().match(/^description\s+"?(.+?)"?$/i);
    if (match) return stripQuotes(match[1]);
  }
  return null;
}

function extractAddress(lines) {
  let ipv4Address = null;
  let prefixLength = null;
  let raw = null;

  for (const line of lines) {
    const trimmed = line.trim();

    const addressMatch = trimmed.match(/^address\s+(\S+)/i);
    if (addressMatch) {
      ipv4Address = stripQuotes(addressMatch[1]);
      raw = trimmed;
      continue;
    }

    const prefixMatch = trimmed.match(/^prefix-length\s+(\d{1,3})$/i);
    if (prefixMatch) {
      prefixLength = prefixMatch[1];
      continue;
    }

    const ipv4Primary = trimmed.match(/^primary\s+address\s+(\S+)/i);
    if (ipv4Primary) {
      const value = stripQuotes(ipv4Primary[1]);
      return {
        ipAddress: value.includes("/") ? value.split("/")[0] : value,
        prefix: value,
        raw: trimmed,
      };
    }
  }

  if (!ipv4Address) return null;

  const prefix = ipv4Address.includes("/")
    ? ipv4Address
    : prefixLength
      ? `${ipv4Address}/${prefixLength}`
      : ipv4Address;

  return {
    ipAddress: ipv4Address.includes("/") ? ipv4Address.split("/")[0] : ipv4Address,
    prefix,
    raw: raw || prefix,
  };
}

function isTopLevelMdLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return !/^\s/.test(line);
}

function collectBraceBlocks(lines, startRegex) {
  const blocks = [];
  let current = null;
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!current && startRegex.test(trimmed)) {
      const match = trimmed.match(startRegex);

      current = {
        name: stripQuotes(match?.[1] || ""),
        lines: [line],
      };

      depth += (line.match(/\{/g) || []).length;
      depth -= (line.match(/\}/g) || []).length;

      if (depth <= 0 && trimmed.includes("{")) {
        blocks.push(current);
        current = null;
        depth = 0;
      }

      continue;
    }

    if (current) {
      current.lines.push(line);

      depth += (line.match(/\{/g) || []).length;
      depth -= (line.match(/\}/g) || []).length;

      if (depth <= 0) {
        blocks.push(current);
        current = null;
        depth = 0;
      }
    }
  }

  if (current) blocks.push(current);

  return blocks;
}

function findMdCliBlockLines(lines = [], startIndex = 0) {
  const first = lines[startIndex];
  if (first == null) return [];

  const block = [first];
  let depth = (first.match(/\{/g) || []).length - (first.match(/\}/g) || []).length;

  if (depth <= 0 && !first.includes("{")) {
    return block;
  }

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    block.push(line);
    depth += (line.match(/\{/g) || []).length;
    depth -= (line.match(/\}/g) || []).length;

    if (depth <= 0) break;
  }

  return block;
}

function parseMdCliPorts(lines) {
  const blocks = collectBraceBlocks(lines, /^port\s+"?([^"\s{]+)"?\s*\{/i);

  return blocks.map((block, index) => {
    const description = extractDescription(block.lines);
    const identity = block.name;

    const object = createNormalizedObject({
      id: `nokia-md-port-${index}-${block.name}`,
      vendor: "nokia-md-cli",
      sourceType: "port",
      sourceName: block.name,
      normalizedType: "port",
      normalizedIdentity: identity,
      rawLines: block.lines,
      fields: {
        port: block.name,
        description,
      },
    });

    object.description = description;

    return object;
  });
}

function parseMdCliLags(lines) {
  const blocks = collectBraceBlocks(lines, /^lag\s+"?([^"\s{]+)"?\s*\{/i);

  return blocks.map((block, index) => {
    const description = extractDescription(block.lines);
    const members = block.lines
      .map((line) => line.trim())
      .map((line) =>
        line.match(/^port\s+"?([^"\s]+)"?/i)
      )
      .filter(Boolean)
      .map((match) => match[1]);

    const identity = block.name;

    const object = createNormalizedObject({
      id: `nokia-md-lag-${index}-${block.name}`,
      vendor: "nokia-md-cli",
      sourceType: "lag",
      sourceName: block.name,
      normalizedType: "lag",
      normalizedIdentity: identity,
      rawLines: block.lines,
      fields: {
        lag: block.name,
        description,
        members,
      },
    });

    object.description = description;

    return object;
  });
}

function parseMdCliInterfaces(lines) {
  const blocks = collectBraceBlocks(
    lines.filter((line, index) => {
      const prev = lines[index - 1]?.trim() || "";
      return !/^pim\s*\{/i.test(prev);
    }),
    /^interface\s+"?([^"\s{]+)"?\s*\{/i
  );

  return blocks
    .map((block, index) => {
      const description = extractDescription(block.lines);
      const addressInfo = extractAddress(block.lines);

      // L3 address가 없는 interface wrapper는 semantic interface 객체로 만들지 않는다.
      // 예: interface "ge-0/0/0" { ... } 는 port/physical wrapper 성격이므로 제외
      if (!addressInfo?.prefix) {
        return null;
      }

      const identity = addressInfo.prefix;

      const object = createNormalizedObject({
        id: `nokia-md-interface-${index}-${block.name}`,
        vendor: "nokia-md-cli",
        sourceType: "interface",
        sourceName: block.name,
        normalizedType: "interface",
        normalizedIdentity: identity,
        rawLines: block.lines,
        fields: {
          interface: block.name,
          description,
          address: addressInfo.prefix,
          ipAddress: addressInfo.ipAddress,
          prefix: addressInfo.prefix,
        },
      });

      object.description = description;
      object.ipAddress = addressInfo.ipAddress;
      object.prefix = addressInfo.prefix;

      return object;
    })
    .filter(Boolean);
}

function parseMdCliPimInterfaces(lines) {
  const objects = [];

  let inPim = false;
  let depth = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (/^pim\s*\{/i.test(trimmed)) {
      inPim = true;
      depth = 1;
      continue;
    }

    if (!inPim) continue;

    if (trimmed.includes("{")) {
      depth += (trimmed.match(/\{/g) || []).length;
    }

    if (trimmed.includes("}")) {
      depth -= (trimmed.match(/\}/g) || []).length;

      if (depth <= 0) {
        inPim = false;
      }
    }

    const match = trimmed.match(/^interface\s+"?([^"\s]+)"?\s*\{/i);

    if (!match) continue;

    const interfaceName = match[1];

    const blockLines = [raw];
    let blockDepth = 1;

    for (let j = i + 1; j < lines.length; j += 1) {
      const subLine = lines[j];

      blockLines.push(subLine);

      if (subLine.includes("{")) {
        blockDepth += (subLine.match(/\{/g) || []).length;
      }

      if (subLine.includes("}")) {
        blockDepth -= (subLine.match(/\}/g) || []).length;
      }

      if (blockDepth <= 0) {
        i = j;
        break;
      }
    }

    const object = createNormalizedObject({
      id: `nokia-md-pim-${interfaceName}`,
      vendor: "nokia-md-cli",
      sourceType: "pim",
      sourceName: interfaceName,
      normalizedType: "pim",
      normalizedIdentity: interfaceName,
      rawLines: blockLines,
      fields: {
        interface: interfaceName,
      },
    });

    object.state = "enabled";

    objects.push(object);
  }

  return objects;
}

function parseMdCliStaticRoutes(lines) {
  const blocks = collectBraceBlocks(
    lines,
    /^route\s+"?([^"\s{]+)"?(?:\s+route-type\s+\S+)?\s*\{/i
  );

  return blocks.map((block, index) => {
    const prefix = stripQuotes(block.name);

    const object = createNormalizedObject({
      id: `nokia-md-static-route-${index}-${prefix}`,
      vendor: "nokia-md-cli",
      sourceType: "route",
      sourceName: prefix,
      normalizedType: "static-route",
      normalizedIdentity: prefix,
      rawLines: block.lines,
      fields: {
        route: prefix,
      },
    });

    object.prefix = prefix;

    for (const line of block.lines) {
      const trimmed = line.trim();

      const nextHop = trimmed.match(/^next-hop\s+"?([^"\s{]+)"?/i);
      if (nextHop) {
        object.fields["next-hop"] = nextHop[1];
      }

      const tag = trimmed.match(/^tag\s+(\S+)$/i);
      if (tag) {
        object.fields.tag = tag[1];
      }

      if (/^admin-state\s+enable$/i.test(trimmed)) {
        object.fields.state = "enabled";
      }

      if (/^admin-state\s+disable$/i.test(trimmed)) {
        object.fields.state = "disabled";
      }
    }

    return object;
  });
}

function parseMdCliBgpNeighbors(lines) {
  const blocks = collectBraceBlocks(lines, /^neighbor\s+"?([^"\s{]+)"?\s*\{/i);

  return blocks.map((block, index) => {
    const peerIp = block.name;
    const description = extractDescription(block.lines);

    let peerAs = null;
    for (const line of block.lines) {
      const match = line.trim().match(/^peer-as\s+(\S+)/i);
      if (match) peerAs = match[1];
    }

    const object = createNormalizedObject({
      id: `nokia-md-bgp-${index}-${peerIp}`,
      vendor: "nokia-md-cli",
      sourceType: "neighbor",
      sourceName: peerIp,
      normalizedType: "bgp",
      normalizedIdentity: peerIp,
      rawLines: block.lines,
      fields: {
        neighbor: peerIp,
        description,
        peerAs,
      },
    });

    object.peerIp = peerIp;
    object.peerAs = peerAs;
    object.description = description;

    return object;
  });
}

function createMdServiceObject({ type, name, fields, rawLines, index }) {
  const normalizedFields = normalizeNokiaSemanticFields(fields);
  const identity =
    normalizedFields["default-host"] ||
    normalizedFields["static-host"] ||
    normalizedFields.sap ||
    normalizedFields["group-interface"] ||
    normalizedFields["subscriber-interface"] ||
    normalizedFields.interface ||
    canonicalServiceName(name);

  const object = createNormalizedObject({
    id: `nokia-md-${type}-${index}-${identity}`,
    vendor: "nokia-md-cli",
    sourceType: type,
    sourceName: name || identity,
    normalizedType: type,
    normalizedIdentity: identity,
    rawLines,
    fields: normalizedFields,
  });

  object.prefix = normalizedFields["default-host"] || normalizedFields["static-host"] || null;
  object.ipAddress = object.prefix?.split("/")?.[0] || null;

  return object;
}

function parseMdCliServiceObjects(lines) {
  const objects = [];
  const context = { interface: "", subscriber: "", group: "", sap: "" };
  const stack = [];
  let pendingDefaultHost = null;
  let pendingStaticHost = null;

  lines.forEach((raw, index) => {
    const text = raw.trim();
    if (!text) return;

    const closeCount = (text.match(/\}/g) || []).length;
    if (closeCount) {
      for (let count = 0; count < closeCount; count += 1) {
        const scope = stack.pop();
        if (scope === "sap") context.sap = "";
        if (scope === "group-interface") {
          context.group = "";
          context.sap = "";
        }
        if (scope === "subscriber-interface") {
          context.subscriber = "";
          context.group = "";
          context.sap = "";
        }
        if (scope === "interface") {
          context.interface = "";
          context.subscriber = "";
          context.group = "";
          context.sap = "";
        }
        if (scope === "default-host") pendingDefaultHost = null;
        if (scope === "static-host") pendingStaticHost = null;
      }
      if (text === "}") return;
    }

    let match = text.match(/^interface\s+"?([^"\s{]+)"?\s*\{/i);
    if (match) {
      context.interface = canonicalInterfaceName(match[1]);
      stack.push("interface");
      objects.push(createMdServiceObject({
        type: "interface",
        name: context.interface,
        fields: { interface: context.interface },
        rawLines: findMdCliBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^subscriber-interface\s+"?([^"\s{]+)"?\s*\{/i);
    if (match) {
      context.subscriber = canonicalServiceName(match[1]);
      context.group = "";
      context.sap = "";
      stack.push("subscriber-interface");
      objects.push(createMdServiceObject({
        type: "subscriber-interface",
        name: context.subscriber,
        fields: { interface: context.interface, "subscriber-interface": context.subscriber },
        rawLines: findMdCliBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^group-interface\s+"?([^"\s{]+)"?\s*\{/i);
    if (match) {
      context.group = canonicalServiceName(match[1]);
      context.sap = "";
      stack.push("group-interface");
      objects.push(createMdServiceObject({
        type: "group-interface",
        name: context.group,
        fields: {
          interface: context.interface,
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
        },
        rawLines: findMdCliBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^sap\s+"?([^"\s{]+)"?\s*\{/i);
    if (match) {
      context.sap = canonicalServiceName(match[1]);
      stack.push("sap");
      objects.push(createMdServiceObject({
        type: "sap",
        name: context.sap,
        fields: {
          interface: context.interface,
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          sap: context.sap,
        },
        rawLines: findMdCliBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^ip\s+"?([^"\s{]+)"?/i);
    if (match && stack.includes("filter") && stack.includes("ingress") && context.sap) {
      objects.push(createMdServiceObject({
        type: "sap",
        name: context.sap,
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          sap: context.sap,
          "ingress.filter.ip": stripQuotes(match[1]),
        },
        rawLines: findMdCliBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^policy-name\s+"?([^"\s{]+)"?/i);
    if (match && stack.includes("sap-egress") && context.sap) {
      objects.push(createMdServiceObject({
        type: "sap",
        name: context.sap,
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          sap: context.sap,
          "egress.qos.sap-egress.policy-name": stripQuotes(match[1]),
        },
        rawLines: findMdCliBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^radius-auth-policy\s+"?([^"\s{]+)"?/i);
    if (match && context.group) {
      objects.push(createMdServiceObject({
        type: "group-interface",
        name: context.group,
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          "radius-auth-policy": stripQuotes(match[1]),
        },
        rawLines: findMdCliBlockLines(lines, index),
        index,
      }));
      return;
    }

    if (/^admin-state\s+disable$/i.test(text) && stack.includes("redirects") && context.group) {
      objects.push(createMdServiceObject({
        type: "icmp-options",
        name: buildHierarchyKey([context.subscriber, context.group]),
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          "icmp.redirects.disabled": true,
        },
        rawLines: findMdCliBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^allow-unmatching-subnets\s+(true|false)$/i);
    if (match && context.group) {
      objects.push(createMdServiceObject({
        type: "dhcp",
        name: buildHierarchyKey([context.subscriber, context.group]),
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          "dhcp.allow-unmatching-subnets": match[1],
        },
        rawLines: findMdCliBlockLines(lines, index),
        index,
      }));
      return;
    }

    match = text.match(/^ipv4\s+(\S+)\s+prefix-length\s+(\d+)\s*\{/i);
    if (match && stack.includes("default-host")) {
      pendingDefaultHost = `${stripQuotes(match[1])}/${match[2]}`;
      return;
    }

    if (match && stack.includes("static-host")) {
      pendingStaticHost = `${stripQuotes(match[1])}/${match[2]}`;
      return;
    }

    if (/^default-host\s*\{/i.test(text)) {
      stack.push("default-host");
      return;
    }

    if (/^static-host\s*\{/i.test(text)) {
      stack.push("static-host");
      return;
    }

    match = text.match(/^next-hop\s+(\S+)/i);
    if (match && pendingDefaultHost) {
      objects.push(createMdServiceObject({
        type: "default-host",
        name: pendingDefaultHost,
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          "default-host": pendingDefaultHost,
          "next-hop": stripQuotes(match[1]),
        },
        rawLines: findMdCliBlockLines(lines, index),
        index,
      }));
      return;
    }

    if (match && pendingStaticHost) {
      objects.push(createMdServiceObject({
        type: "static-host",
        name: pendingStaticHost,
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          "static-host": pendingStaticHost,
          "next-hop": stripQuotes(match[1]),
        },
        rawLines: findMdCliBlockLines(lines, index),
        index,
      }));
      return;
    }

    if (/^sub-sla-mgmt\s*\{/i.test(text) && context.sap) {
      objects.push(createMdServiceObject({
        type: "sub-sla-mgmt",
        name: context.sap,
        fields: {
          "subscriber-interface": context.subscriber,
          "group-interface": context.group,
          sap: context.sap,
          "sub-sla-mgmt": "present",
        },
        rawLines: findMdCliBlockLines(lines, index),
        index,
      }));
    }

    const openCount = (text.match(/\{/g) || []).length;
    if (openCount) {
      const scopeName = text.match(/^([a-z0-9-]+)/i)?.[1];
      if (scopeName && !["interface", "subscriber-interface", "group-interface", "sap", "default-host", "static-host"].includes(scopeName)) {
        stack.push(scopeName);
      }
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
    target.fields = normalizeNokiaSemanticFields({
      ...(target.fields || {}),
      ...(object.fields || {}),
    });
    target.rawLines = mergeRawLines(target.rawLines, object.rawLines);
    target.description ||= object.description;
    target.ipAddress ||= object.ipAddress;
    target.prefix ||= object.prefix;
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

export function parseNokiaMdCliConfig(configText) {
  const lines = splitLines(configText);

  return mergeObjectsBySemanticIdentity([
    ...parseMdCliPorts(lines),
    ...parseMdCliLags(lines),
    ...parseMdCliInterfaces(lines),
    ...parseMdCliStaticRoutes(lines),
    ...parseMdCliBgpNeighbors(lines),
    ...parseMdCliPimInterfaces(lines),
    ...parseMdCliServiceObjects(lines),
  ]);
}
