// src/core/parsers/nokiaClassicParser.js

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

    fields,
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

  const normalizedIdentity =
    current.fields.route ||
    current.fields.neighbor ||
    current.fields.interface ||
    current.fields.lag ||
    current.fields.port ||
    current.name;

  objects.push(
    createObject({
      id: `old-${current.type}-${normalizedIdentity}`,
      sourceName: current.name,
      normalizedType: current.type,
      normalizedIdentity,
      fields: current.fields,
      rawLines: current.rawLines,
    })
  );

  return null;
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

    const header = parseHeaderLine(text);

    if (header) {
      current = flushCurrent(current, objects);
      current = createCurrentObject(header.type, header.name, line.raw);
      continue;
    }

    if (!current) continue;

    current.rawLines.push(line.raw);

    if (/^(exit|})$/i.test(text)) {
      current = flushCurrent(current, objects);
      continue;
    }

    applyFieldLine(current, text);
  }

  flushCurrent(current, objects);

  return {
    vendor: "nokia-classic",
    side,
    objects,
    warnings,
    errors,
  };
}