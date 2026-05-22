// src/core/parsers/nokiaMdCliParser.js

import { createNormalizedObject } from "./index.js";
import {
  buildHierarchyKey,
  canonicalAdminState,
  canonicalInterfaceIdentity,
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

function splitLines(configText) {
  return typeof configText === "string" ? configText.split(/\r?\n/) : [];
}

function stripQuotes(value) {
  return String(value || "").replace(/^["']|["']$/g, "").trim();
}

function normalizeState(value = "") {
  const text = String(value || "").trim().toLowerCase();
  if (text === "enable" || text === "enabled" || text === "no shutdown") return "enabled";
  if (text === "disable" || text === "disabled" || text === "shutdown") return "disabled";
  return text;
}

function normalizeIcmpState(value = "") {
  return canonicalAdminState(value);
}

function ipAddressFromPrefix(value = "") {
  const cleanValue = stripQuotes(value);
  if (!cleanValue) return null;
  return cleanValue.includes("/") ? cleanValue.split("/")[0] : cleanValue;
}

function applyDerivedObjectMetadata(object, { updateIdentity = true } = {}) {
  const fields = object.fields || {};
  const prefix = fields.route || fields.prefix || fields.address || object.prefix || null;

  object.description = fields.description || object.description || null;
  object.prefix = prefix;
  object.ipAddress = fields.address
    ? ipAddressFromPrefix(fields.address)
    : object.ipAddress || ipAddressFromPrefix(prefix);
  object.nextHop = fields["next-hop"] || object.nextHop || null;
  object.peerIp = fields.neighbor || fields.peerIp || object.peerIp || null;
  object.peerAs = fields["peer-as"] || fields.peerAs || object.peerAs || null;

  if (updateIdentity && object.normalizedType === "interface") {
    object.normalizedIdentity = canonicalInterfaceIdentity(fields, object.sourceName || object.normalizedIdentity);
  }

  return object;
}

function tokenizeMdCliLine(line = "") {
  const tokens = [];
  const regex = /"([^"]*)"|[{}]|\S+/g;
  let match;

  while ((match = regex.exec(String(line || "")))) {
    const quoted = match[1] !== undefined;
    const raw = match[0];
    const token = quoted ? match[1] : raw;
    tokens.push({
      raw,
      token: stripQuotes(token).replace(/[{};,]+$/g, ""),
      normalized: stripQuotes(token).replace(/[{};,]+$/g, "").toLowerCase(),
      quoted,
    });
  }

  return tokens.filter((item) => item.token !== "");
}

function unwrapConfigureOneLine(line = "") {
  const tokens = tokenizeMdCliLine(line)
    .map((item) => item.token)
    .filter((token) => token !== "{" && token !== "}");

  if (tokens[0]?.toLowerCase() === "/configure" || tokens[0]?.toLowerCase() === "configure") {
    return tokens.slice(1);
  }

  return [];
}

function tokenEquals(tokens, index, expected) {
  return String(tokens[index] || "").toLowerCase() === String(expected || "").toLowerCase();
}

function findToken(tokens = [], token = "", start = 0) {
  const normalized = String(token || "").toLowerCase();
  for (let index = start; index < tokens.length; index += 1) {
    if (String(tokens[index] || "").toLowerCase() === normalized) return index;
  }
  return -1;
}

function findPath(tokens = [], path = [], start = 0) {
  const normalizedPath = path.map((item) => String(item || "").toLowerCase());
  for (let index = start; index <= tokens.length - normalizedPath.length; index += 1) {
    const matched = normalizedPath.every(
      (part, offset) => String(tokens[index + offset] || "").toLowerCase() === part
    );
    if (matched) return index;
  }
  return -1;
}

function pathExists(tokens = [], path = [], start = 0) {
  return findPath(tokens, path, start) >= 0;
}

function valueAfterPath(tokens = [], path = [], start = 0) {
  const index = findPath(tokens, path, start);
  if (index < 0) return "";
  return tokens[index + path.length] || "";
}

function fieldAfterToken(tokens = [], token = "", start = 0) {
  const index = findToken(tokens, token, start);
  return index >= 0 ? tokens[index + 1] || "" : "";
}

function extractBracketedPolicyList(line = "", keyword = "import") {
  const pattern = new RegExp(`\\b${keyword}\\s+policy\\s+\\[(.+?)\\]`, "i");
  const match = String(line || "").match(pattern);
  if (!match) return "";
  const quoted = [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
  if (quoted.length) return quoted.join(",");
  return match[1].split(/\s+/).map(stripQuotes).filter(Boolean).join(",");
}

function setField(fields, field, value) {
  const cleanValue = stripQuotes(value);
  if (!field || !cleanValue || fields[field] !== undefined) return;
  fields[field] = cleanValue;
}

function mapLeafFields(fields, tokens, start, specs = []) {
  const orderedSpecs = [...specs].sort((a, b) => b.path.length - a.path.length);

  for (let index = start; index < tokens.length; index += 1) {
    for (const spec of orderedSpecs) {
      const pathIndex = findPath(tokens, spec.path, index);
      if (pathIndex !== index) continue;

      const value = tokens[index + spec.path.length];
      if (!value) continue;

      setField(fields, spec.field, spec.normalize ? spec.normalize(value) : value);
      index += spec.path.length;
      break;
    }
  }

  return fields;
}

function createMdCliOneLineObject({ type, identity, sourceType, sourceName, fields, rawLine, index }) {
  const normalizedFields = normalizeNokiaSemanticFields(fields);
  const object = createNormalizedObject({
    id: `nokia-md-oneline-${type}-${index}-${identity}`,
    vendor: "nokia-md-cli",
    sourceType: sourceType || type,
    sourceName: sourceName || identity,
    normalizedType: type,
    normalizedIdentity: identity,
    rawLines: [rawLine],
    fields: normalizedFields,
  });

  return applyDerivedObjectMetadata(object, { updateIdentity: false });
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

function latestScope(stack = [], names = []) {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (names.includes(stack[index])) return stack[index];
  }
  return "";
}

function updateMdCliInterfaceBlockScope(stack, text = "") {
  const openCount = (text.match(/\{/g) || []).length;
  if (openCount) {
    const match = text.match(/^([a-z0-9-]+)(?:\s+"?[^"\s{}]+"?)?\s*\{/i);
    const scope = match?.[1]?.toLowerCase() || "";
    if (scope) stack.push(scope);
  }

  const closeCount = (text.match(/\}/g) || []).length;
  for (let count = 0; count < closeCount; count += 1) {
    stack.pop();
  }
}

function extractMdCliInterfaceBlockFields(lines = [], interfaceName = "") {
  const fields = { interface: interfaceName };
  const description = extractDescription(lines);
  const addressInfo = extractAddress(lines);
  const stack = [];

  if (description) fields.description = description;

  if (addressInfo?.prefix) {
    fields.address = addressInfo.prefix;
    fields.ipAddress = addressInfo.ipAddress;
    fields.prefix = addressInfo.prefix;
  }

  lines.forEach((line) => {
    const text = line.trim();
    if (!text) return;

    const nestedIcmp = text.match(/^(redirects|ttl-expired|unreachables)\s*\{\s*admin-state\s+(enable|disable|enabled|disabled|true|false)/i);
    if (nestedIcmp) {
      fields[`icmp.${nestedIcmp[1].toLowerCase()}`] = normalizeIcmpState(nestedIcmp[2]);
      updateMdCliInterfaceBlockScope(stack, text);
      return;
    }

    const sap = text.match(/^sap\s+"?([^"\s{]+)"?\s*\{/i);
    if (sap) {
      setField(fields, "sap", sap[1]);
      updateMdCliInterfaceBlockScope(stack, text);
      return;
    }

    const adminState = text.match(/^admin-state\s+(enable|disable|enabled|disabled)$/i);
    if (adminState) {
      const icmpOption = latestScope(stack, ["redirects", "ttl-expired", "unreachables"]);
      if (icmpOption) {
        fields[`icmp.${icmpOption}`] = normalizeIcmpState(adminState[1]);
      } else {
        fields.state = normalizeState(adminState[1]);
        fields["admin-state"] = normalizeState(adminState[1]);
      }
      updateMdCliInterfaceBlockScope(stack, text);
      return;
    }

    const maskReply = text.match(/^mask-reply\s+(true|false|enable|disable|enabled|disabled)$/i);
    if (maskReply) {
      fields["icmp.mask-reply"] = normalizeIcmpState(maskReply[1]);
      updateMdCliInterfaceBlockScope(stack, text);
      return;
    }

    const filterIp = text.match(/^ip\s+"?([^"\s{}]+)"?/i) || text.match(/^filter\s+ip\s+"?([^"\s{}]+)"?/i);
    if (filterIp && stack.includes("sap") && stack.includes("filter")) {
      if (stack.includes("ingress")) setField(fields, "ingress.filter.ip", filterIp[1]);
      if (stack.includes("egress")) setField(fields, "egress.filter.ip", filterIp[1]);
      updateMdCliInterfaceBlockScope(stack, text);
      return;
    }

    const policyName = text.match(/^policy-name\s+"?([^"\s{}]+)"?/i);
    if (policyName && stack.includes("sap")) {
      if (stack.includes("ingress")) setField(fields, "ingress.qos.sap-ingress.policy-name", policyName[1]);
      if (stack.includes("egress")) setField(fields, "egress.qos.sap-egress.policy-name", policyName[1]);
      updateMdCliInterfaceBlockScope(stack, text);
      return;
    }

    updateMdCliInterfaceBlockScope(stack, text);
  });

  return normalizeNokiaSemanticFields(fields);
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

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!current && startRegex.test(trimmed)) {
      const match = trimmed.match(startRegex);

      current = {
        name: stripQuotes(match?.[1] || ""),
        lines: [line],
        startIndex: index,
        startIndent: line.match(/^\s*/)?.[0]?.length || 0,
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

function updateMdCliBraceScope(stack, rawLine = "") {
  const text = String(rawLine || "").trim();
  if (!text) return;

  const openCount = (text.match(/\{/g) || []).length;
  if (openCount) {
    const match = text.match(/^([a-z0-9-]+)(?:\s+"?[^"\s{}]+"?)?\s*\{/i);
    const scope = match?.[1]?.toLowerCase() || "";
    if (scope) stack.push(scope);
  }

  const closeCount = (text.match(/\}/g) || []).length;
  for (let count = 0; count < closeCount; count += 1) {
    stack.pop();
  }
}

function isMdCliLineInsideScope(lines = [], lineIndex = -1, scopeName = "") {
  const stack = [];
  const targetScope = String(scopeName || "").toLowerCase();

  for (let index = 0; index < lineIndex; index += 1) {
    updateMdCliBraceScope(stack, lines[index]);
  }

  return stack.includes(targetScope);
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
  const blocks = collectBraceBlocks(lines, /^port\s+"?([^"\s{]+)"?\s*\{/i)
    .filter((block) => !isMdCliLineInsideScope(lines, block.startIndex, "lag"));

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

function extractMdCliLagBlockFields(lines = [], lagName = "") {
  const fields = { lag: lagName };
  const description = extractDescription(lines);
  const members = [];
  const stack = [];

  if (description) fields.description = description;

  lines.forEach((line) => {
    const text = line.trim();
    if (!text) return;

    let match = text.match(/^admin-state\s+(enable|disable|enabled|disabled)$/i);
    if (match) {
      fields.state = normalizeState(match[1]);
      fields["admin-state"] = normalizeState(match[1]);
      updateMdCliBraceScope(stack, text);
      return;
    }

    match = text.match(/^port\s+"?([^"\s{]+)"?/i);
    if (match) {
      const member = stripQuotes(match[1]);
      if (member && !members.includes(member)) members.push(member);
      updateMdCliBraceScope(stack, text);
      return;
    }

    match = text.match(/^lacp-xmit-interval\s+(\S+)/i);
    if (match) {
      fields["lacp-xmit-interval"] = stripQuotes(match[1]);
      updateMdCliBraceScope(stack, text);
      return;
    }

    match = text.match(/^administrative-key\s+(\S+)/i);
    if (match && stack.includes("lacp")) {
      fields["lacp.administrative-key"] = stripQuotes(match[1]);
      updateMdCliBraceScope(stack, text);
      return;
    }

    match = text.match(/^mode\s+(\S+)/i);
    if (match) {
      const value = stripQuotes(match[1]);
      if (stack.includes("adapt-qos")) {
        fields["access.adapt-qos.mode"] = value;
      } else if (stack.includes("lacp")) {
        fields.lacpMode = value;
        fields["lacp-mode"] = value;
      } else {
        fields.mode = value;
      }
      updateMdCliBraceScope(stack, text);
      return;
    }

    updateMdCliBraceScope(stack, text);
  });

  if (members.length) {
    fields.members = members;
    fields["member-port"] = members.join(", ");
  }

  return normalizeNokiaSemanticFields(fields);
}

function parseMdCliLags(lines) {
  const blocks = collectBraceBlocks(lines, /^lag\s+"?([^"\s{]+)"?\s*\{/i);

  return blocks.map((block, index) => {
    const fields = extractMdCliLagBlockFields(block.lines, block.name);

    const identity = block.name;

    const object = createNormalizedObject({
      id: `nokia-md-lag-${index}-${block.name}`,
      vendor: "nokia-md-cli",
      sourceType: "lag",
      sourceName: block.name,
      normalizedType: "lag",
      normalizedIdentity: identity,
      rawLines: block.lines,
      fields,
    });

    object.description = fields.description || null;

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
      const fields = extractMdCliInterfaceBlockFields(block.lines, block.name);

      // L3 address가 없는 interface wrapper는 semantic interface 객체로 만들지 않는다.
      // 예: interface "ge-0/0/0" { ... } 는 port/physical wrapper 성격이므로 제외
      if (!fields.address) {
        return null;
      }

      const identity = fields.address;

      const object = createNormalizedObject({
        id: `nokia-md-interface-${index}-${block.name}`,
        vendor: "nokia-md-cli",
        sourceType: "interface",
        sourceName: block.name,
        normalizedType: "interface",
        normalizedIdentity: identity,
        rawLines: block.lines,
        fields,
      });

      object.description = fields.description || null;
      object.ipAddress = fields.ipAddress || ipAddressFromPrefix(fields.address);
      object.prefix = fields.prefix || fields.address;

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

  return blocks.map((block, index) =>
    createMdCliStaticRouteBlockObject(block.name, block.lines, index)
  );
}

function createMdCliStaticRouteBlockObject(prefixName, rawLines, index) {
  const prefix = stripQuotes(prefixName);
  const fields = {
    route: prefix,
  };

  for (const line of rawLines) {
    const trimmed = line.trim();
    const description = trimmed.match(/^description\s+"?(.+?)"?$/i);
    if (description) {
      fields.description = stripQuotes(description[1]);
    }
  }

  const normalizedFields = normalizeNokiaSemanticFields({
    ...fields,
    ...buildStaticRouteNextHopFields(
      collectStaticRouteNextHopEntriesFromLines(rawLines)
    ),
  });
  const identity = canonicalStaticRouteIdentity(normalizedFields) || prefix;

  const object = createNormalizedObject({
    id: `nokia-md-static-route-${index}-${identity}`,
    vendor: "nokia-md-cli",
    sourceType: "route",
    sourceName: prefix,
    normalizedType: "static-route",
    normalizedIdentity: identity,
    rawLines,
    fields: normalizedFields,
  });

  object.prefix = prefix;
  object.nextHop = normalizedFields["next-hop"] || null;
  object.description = normalizedFields.description || null;

  return object;
}

function parseMdCliBgpNeighbors(lines) {
  const blocks = collectBraceBlocks(lines, /^neighbor\s+"?([^"\s{]+)"?\s*\{/i);

  return blocks.map((block, index) => {
    const peerIp = block.name;
    const description = extractDescription(block.lines);

    let peerAs = null;
    let group = null;
    let authenticationKey = null;
    let state = null;
    for (const line of block.lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^peer-as\s+(\S+)/i);
      if (match) peerAs = match[1];
      const remoteAs = trimmed.match(/^remote-as\s+(\S+)/i);
      if (remoteAs) peerAs = remoteAs[1];
      const groupMatch = trimmed.match(/^group\s+"?([^"]+)"?/i);
      if (groupMatch) group = stripQuotes(groupMatch[1]);
      const authMatch = trimmed.match(/^authentication-key\s+(.+)$/i);
      if (authMatch) authenticationKey = stripQuotes(authMatch[1]);
      if (/^admin-state\s+enable$/i.test(trimmed) || /^no\s+shutdown$/i.test(trimmed)) state = "enabled";
      if (/^admin-state\s+disable$/i.test(trimmed) || /^shutdown$/i.test(trimmed)) state = "disabled";
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
        "peer-as": peerAs,
        group,
        "authentication-key": authenticationKey,
        state,
        "admin-state": state,
      },
    });

    object.peerIp = peerIp;
    object.peerAs = peerAs;
    object.description = description;

    return object;
  });
}

function parseMdCliBgpGroups(lines) {
  const blocks = collectBraceBlocks(lines, /^group\s+"?([^"\s{]+)"?\s*\{/i);

  return blocks.map((block, index) => {
    const groupName = block.name;
    const description = extractDescription(block.lines);
    const fields = { group: groupName };

    for (const line of block.lines) {
      const trimmed = line.trim();
      let match = trimmed.match(/^peer-as\s+(\S+)/i) || trimmed.match(/^remote-as\s+(\S+)/i);
      if (match) fields["peer-as"] = stripQuotes(match[1]);
      match = trimmed.match(/^authentication-key\s+(.+)$/i);
      if (match) fields["authentication-key"] = stripQuotes(match[1]);
      match = trimmed.match(/^local-address\s+(\S+)/i);
      if (match) fields["local-address"] = stripQuotes(match[1]);
      match = trimmed.match(/^import\s+policy\s+\[(.+?)\]/i);
      if (match) fields["import.policy"] = extractBracketedPolicyList(trimmed, "import");
      match = trimmed.match(/^export\s+policy\s+\[(.+?)\]/i);
      if (match) fields["export.policy"] = extractBracketedPolicyList(trimmed, "export");
      match = trimmed.match(/^import\s+"?([^"\s]+)"?/i);
      if (match && !fields["import.policy"]) fields["import.policy"] = stripQuotes(match[1]);
      match = trimmed.match(/^export\s+"?([^"\s]+)"?/i);
      if (match && !fields["export.policy"]) fields["export.policy"] = stripQuotes(match[1]);
      if (/^admin-state\s+enable$/i.test(trimmed) || /^no\s+shutdown$/i.test(trimmed)) {
        fields.state = "enabled";
        fields["admin-state"] = "enabled";
      }
      if (/^admin-state\s+disable$/i.test(trimmed) || /^shutdown$/i.test(trimmed)) {
        fields.state = "disabled";
        fields["admin-state"] = "disabled";
      }
    }

    if (description) fields.description = description;
    const normalizedFields = normalizeNokiaSemanticFields(fields);
    const object = createNormalizedObject({
      id: `nokia-md-bgp-group-${index}-${groupName}`,
      vendor: "nokia-md-cli",
      sourceType: "bgp-group",
      sourceName: groupName,
      normalizedType: "bgp-group",
      normalizedIdentity: groupName,
      rawLines: block.lines,
      fields: normalizedFields,
    });

    object.description = normalizedFields.description || null;
    object.metadataOnly = true;
    object.relationshipRole = "bgp-group-definition";

    return object;
  });
}

function createMdServiceObject({ type, name, fields, rawLines, index }) {
  const normalizedFields = normalizeNokiaSemanticFields(fields);
  const identity =
    type === "interface"
      ? canonicalInterfaceIdentity(normalizedFields, name || normalizedFields.interface)
      : type === "subscriber-interface"
        ? normalizedFields["subscriber-interface"] || canonicalServiceName(name)
      : normalizedFields["default-host"] ||
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
  const context = { interface: "", subscriber: "", group: "", sap: "", interfaceAddressBlock: false };
  const stack = [];
  let pendingDefaultHost = null;
  let pendingStaticHost = null;
  const isPlainInterfaceContext = () => Boolean(
    context.interface &&
    !context.subscriber &&
    !context.group &&
    !context.interfaceAddressBlock
  );

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
          context.interfaceAddressBlock = false;
        }
        if (scope === "default-host") pendingDefaultHost = null;
        if (scope === "static-host") pendingStaticHost = null;
      }
      if (text === "}") return;
    }

    let match = text.match(/^interface\s+"?([^"\s{]+)"?\s*\{/i);
    if (match) {
      const rawLines = findMdCliBlockLines(lines, index);
      context.interface = canonicalInterfaceName(match[1]);
      context.interfaceAddressBlock = Boolean(extractAddress(rawLines)?.prefix);
      stack.push("interface");
      if (context.interfaceAddressBlock) return;
      objects.push(createMdServiceObject({
        type: "interface",
        name: context.interface,
        fields: { interface: context.interface },
        rawLines,
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
      if (context.interfaceAddressBlock && !context.subscriber && !context.group) return;
      if (isPlainInterfaceContext()) {
        objects.push(createMdServiceObject({
          type: "interface",
          name: context.interface,
          fields: {
            interface: context.interface,
            sap: context.sap,
          },
          rawLines: findMdCliBlockLines(lines, index),
          index,
        }));
        return;
      }
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
      if (context.interfaceAddressBlock && !context.subscriber && !context.group) return;
      if (isPlainInterfaceContext()) {
        objects.push(createMdServiceObject({
          type: "interface",
          name: context.interface,
          fields: {
            interface: context.interface,
            sap: context.sap,
            "ingress.filter.ip": stripQuotes(match[1]),
          },
          rawLines: findMdCliBlockLines(lines, index),
          index,
        }));
        return;
      }
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
      if (context.interfaceAddressBlock && !context.subscriber && !context.group) return;
      if (isPlainInterfaceContext()) {
        objects.push(createMdServiceObject({
          type: "interface",
          name: context.interface,
          fields: {
            interface: context.interface,
            sap: context.sap,
            "egress.qos.sap-egress.policy-name": stripQuotes(match[1]),
          },
          rawLines: findMdCliBlockLines(lines, index),
          index,
        }));
        return;
      }
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

const PORT_ONE_LINE_FIELDS = [
  { path: ["admin-state"], field: "state", normalize: normalizeState },
  { path: ["admin-state"], field: "admin-state", normalize: normalizeState },
  { path: ["description"], field: "description" },
  { path: ["ethernet", "mode"], field: "mode" },
  { path: ["ethernet", "mtu"], field: "mtu" },
  { path: ["mtu"], field: "mtu" },
  { path: ["ethernet", "crc-monitor", "signal-degrade", "threshold"], field: "crc-monitor.signal-degrade.threshold" },
  { path: ["ethernet", "egress", "port-scheduler-policy", "policy-name"], field: "egress.port-scheduler-policy" },
  { path: ["ethernet", "access", "egress", "queue-group"], field: "egress.queue-group" },
  { path: ["instance-id"], field: "egress.queue-group.instance-id" },
  { path: ["int-dest-id"], field: "egress.queue-group.int-dest-id" },
];

const LAG_ONE_LINE_FIELDS = [
  { path: ["admin-state"], field: "state", normalize: normalizeState },
  { path: ["admin-state"], field: "admin-state", normalize: normalizeState },
  { path: ["description"], field: "description" },
  { path: ["mode"], field: "mode" },
  { path: ["lacp", "mode"], field: "lacpMode" },
  { path: ["lacp", "mode"], field: "lacp-mode" },
  { path: ["lacp", "administrative-key"], field: "lacp.administrative-key" },
  { path: ["lacp-xmit-interval"], field: "lacp-xmit-interval" },
  { path: ["access", "adapt-qos", "mode"], field: "access.adapt-qos.mode" },
  { path: ["port"], field: "member-port" },
];

const INTERFACE_ONE_LINE_FIELDS = [
  { path: ["description"], field: "description" },
  { path: ["ipv4", "primary", "address"], field: "address" },
  { path: ["ipv4", "primary", "prefix-length"], field: "prefix-length" },
  { path: ["ip", "address"], field: "address" },
  { path: ["address"], field: "address" },
  { path: ["admin-state"], field: "state", normalize: normalizeState },
  { path: ["admin-state"], field: "admin-state", normalize: normalizeState },
  { path: ["ipv4", "icmp", "mask-reply"], field: "icmp.mask-reply", normalize: normalizeIcmpState },
  { path: ["ipv4", "icmp", "redirects", "admin-state"], field: "icmp.redirects", normalize: normalizeState },
  { path: ["ipv4", "icmp", "ttl-expired", "admin-state"], field: "icmp.ttl-expired", normalize: normalizeState },
  { path: ["ipv4", "icmp", "unreachables", "admin-state"], field: "icmp.unreachables", normalize: normalizeState },
];

const SUBSCRIBER_ONE_LINE_FIELDS = [
  { path: ["description"], field: "description" },
  { path: ["admin-state"], field: "state", normalize: normalizeState },
  { path: ["admin-state"], field: "admin-state", normalize: normalizeState },
  { path: ["ipv4", "allow-unmatching-subnets"], field: "dhcp.allow-unmatching-subnets" },
  { path: ["ipv4", "address"], field: "address" },
  { path: ["prefix-length"], field: "prefix-length" },
];

const GROUP_ONE_LINE_FIELDS = [
  { path: ["radius-auth-policy"], field: "radius-auth-policy" },
  { path: ["ipv4", "neighbor-discovery", "populate"], field: "neighbor-discovery.populate" },
];

const DHCP_ONE_LINE_FIELDS = [
  { path: ["ipv4", "dhcp", "admin-state"], field: "dhcp.admin-state", normalize: normalizeState },
  { path: ["ipv4", "dhcp", "filter"], field: "dhcp.filter" },
  { path: ["ipv4", "dhcp", "server"], field: "dhcp.server" },
  { path: ["ipv4", "dhcp", "trusted"], field: "dhcp.trusted" },
  { path: ["ipv4", "dhcp", "lease-populate", "max-leases"], field: "dhcp.lease-populate.max-leases" },
];

const SAP_ONE_LINE_FIELDS = [
  { path: ["ingress", "filter", "ip"], field: "ingress.filter.ip" },
  { path: ["egress", "filter", "ip"], field: "egress.filter.ip" },
  { path: ["ingress", "qos", "sap-ingress", "policy-name"], field: "ingress.qos.sap-ingress.policy-name" },
  { path: ["egress", "qos", "sap-egress", "policy-name"], field: "egress.qos.sap-egress.policy-name" },
];

const CPU_PROTECTION_ONE_LINE_FIELDS = [
  { path: ["cpu-protection", "policy-id"], field: "cpu-protection.policy-id" },
];

const SUB_SLA_MGMT_ONE_LINE_FIELDS = [
  { path: ["sub-sla-mgmt", "admin-state"], field: "sub-sla-mgmt.admin-state", normalize: normalizeState },
  { path: ["sub-sla-mgmt", "sub-ident-policy"], field: "sub-sla-mgmt.sub-ident-policy" },
  { path: ["sub-ident-policy"], field: "sub-sla-mgmt.sub-ident-policy" },
  { path: ["sub-sla-mgmt", "subscriber-limit"], field: "sub-sla-mgmt.subscriber-limit" },
  { path: ["subscriber-limit"], field: "sub-sla-mgmt.subscriber-limit" },
  { path: ["sub-sla-mgmt", "defaults", "sub-profile"], field: "sub-sla-mgmt.defaults.sub-profile" },
  { path: ["defaults", "sub-profile"], field: "sub-sla-mgmt.defaults.sub-profile" },
  { path: ["sub-sla-mgmt", "defaults", "sla-profile"], field: "sub-sla-mgmt.defaults.sla-profile" },
  { path: ["defaults", "sla-profile"], field: "sub-sla-mgmt.defaults.sla-profile" },
  { path: ["sla-profile"], field: "sub-sla-mgmt.defaults.sla-profile" },
  { path: ["sub-sla-mgmt", "defaults", "subscriber-id"], field: "sub-sla-mgmt.defaults.subscriber-id" },
  { path: ["defaults", "subscriber-id"], field: "sub-sla-mgmt.defaults.subscriber-id" },
  { path: ["subscriber-id"], field: "sub-sla-mgmt.defaults.subscriber-id" },
  { path: ["sub-sla-mgmt", "defaults", "int-dest-id", "string"], field: "sub-sla-mgmt.defaults.int-dest-id" },
  { path: ["defaults", "int-dest-id", "string"], field: "sub-sla-mgmt.defaults.int-dest-id" },
  { path: ["int-dest-id", "string"], field: "sub-sla-mgmt.defaults.int-dest-id" },
];

const STATIC_HOST_ONE_LINE_FIELDS = [
  { path: ["mac"], field: "static-host.mac" },
  { path: ["admin-state"], field: "static-host.admin-state", normalize: normalizeState },
  { path: ["sub-profile"], field: "static-host.sub-profile" },
  { path: ["sla-profile"], field: "static-host.sla-profile" },
  { path: ["int-dest-id"], field: "static-host.int-dest-id" },
  { path: ["subscriber-id"], field: "static-host.subscriber-id" },
];

const BGP_ONE_LINE_FIELDS = [
  { path: ["description"], field: "description" },
  { path: ["group"], field: "group" },
  { path: ["authentication-key"], field: "authentication-key" },
  { path: ["peer-as"], field: "peer-as" },
  { path: ["remote-as"], field: "peer-as" },
  { path: ["admin-state"], field: "state", normalize: normalizeState },
  { path: ["admin-state"], field: "admin-state", normalize: normalizeState },
  { path: ["import", "policy"], field: "import.policy" },
  { path: ["export", "policy"], field: "export.policy" },
];

const STATIC_ROUTE_ONE_LINE_FIELDS = [
  { path: ["next-hop"], field: "next-hop" },
  { path: ["metric"], field: "metric" },
  { path: ["tag"], field: "tag" },
  { path: ["description"], field: "description" },
  { path: ["admin-state"], field: "state", normalize: normalizeState },
  { path: ["admin-state"], field: "admin-state", normalize: normalizeState },
];

const PIM_ONE_LINE_FIELDS = [
  { path: ["admin-state"], field: "state", normalize: normalizeState },
  { path: ["description"], field: "description" },
];

function getStaticRouteRoutingContext(tokens = []) {
  const serviceIndex = findToken(tokens, "service");
  if (serviceIndex < 0) return "";

  const vprnIndex = findToken(tokens, "vprn", serviceIndex + 1);
  if (vprnIndex >= 0 && tokens[vprnIndex + 1]) {
    return `vprn:${stripQuotes(tokens[vprnIndex + 1]).toLowerCase()}`;
  }

  return "";
}

function parseMdCliOneLinePort(tokens, rawLine, index) {
  if (!tokenEquals(tokens, 0, "port") || !tokens[1]) return null;
  const portId = stripQuotes(tokens[1]);
  const fields = mapLeafFields({ port: portId }, tokens, 2, PORT_ONE_LINE_FIELDS);
  if (pathExists(tokens, ["ethernet", "down-on-internal-error"], 2)) {
    fields["down-on-internal-error"] = "true";
  }
  return createMdCliOneLineObject({
    type: "port",
    identity: portId,
    sourceType: "port",
    sourceName: portId,
    fields,
    rawLine,
    index,
  });
}

function parseMdCliOneLineLag(tokens, rawLine, index) {
  if (!tokenEquals(tokens, 0, "lag") || !tokens[1]) return null;
  const lagName = stripQuotes(tokens[1]);
  const fields = mapLeafFields({ lag: lagName }, tokens, 2, LAG_ONE_LINE_FIELDS);
  if (fields.lacpMode && !fields["lacp-mode"]) fields["lacp-mode"] = fields.lacpMode;
  if (fields["member-port"]) fields.members = [fields["member-port"]];
  return createMdCliOneLineObject({
    type: "lag",
    identity: lagName,
    sourceType: "lag",
    sourceName: lagName,
    fields,
    rawLine,
    index,
  });
}

function withPrefix(fields = {}) {
  const next = { ...fields };
  const address = stripQuotes(next.address || "");
  const prefixLength = stripQuotes(next["prefix-length"] || "");
  if (address && prefixLength && !address.includes("/")) {
    next.address = `${address}/${prefixLength}`;
    next.prefix = next.address;
  } else if (address) {
    next.prefix = address;
  }
  return next;
}

function createMdCliServiceOneLineObject({ type, identityParts, sourceType, sourceName, fields, rawLine, index }) {
  return createMdCliOneLineObject({
    type,
    identity: buildHierarchyKey(identityParts),
    sourceType: sourceType || type,
    sourceName: sourceName || identityParts.filter(Boolean).at(-1) || type,
    fields,
    rawLine,
    index,
  });
}

function createMdCliSubscriberOneLineObject({ subscriberName, fields, rawLine, index }) {
  return createMdCliServiceOneLineObject({
    type: "subscriber-interface",
    identityParts: [subscriberName],
    sourceType: "subscriber-interface",
    sourceName: subscriberName,
    fields,
    rawLine,
    index,
  });
}

function parseMdCliOneLineInterfaceService({ tokens, rawLine, index, serviceType, serviceId, interfaceIndex }) {
  const interfaceName = canonicalInterfaceName(tokens[interfaceIndex + 1]);
  const baseFields = {
    service: serviceType,
    "service-id": serviceId,
    interface: interfaceName,
  };
  const sapIndex = findToken(tokens, "sap", interfaceIndex + 2);

  if (sapIndex >= 0 && tokens[sapIndex + 1]) {
    const sapName = canonicalServiceName(tokens[sapIndex + 1]);
    const fields = mapLeafFields(
      { ...baseFields, sap: sapName },
      tokens,
      sapIndex + 2,
      SAP_ONE_LINE_FIELDS
    );
    return createMdCliServiceOneLineObject({
      type: "interface",
      identityParts: [serviceId, interfaceName],
      sourceType: "interface",
      sourceName: interfaceName,
      fields,
      rawLine,
      index,
    });
  }

  const fields = withPrefix(mapLeafFields(baseFields, tokens, interfaceIndex + 2, INTERFACE_ONE_LINE_FIELDS));
  return createMdCliServiceOneLineObject({
    type: "interface",
    identityParts: [serviceId, interfaceName],
    sourceType: "interface",
    sourceName: interfaceName,
    fields,
    rawLine,
    index,
  });
}

function parseMdCliOneLineSubscriberService({ tokens, rawLine, index, serviceType, serviceId, subscriberIndex }) {
  const subscriberName = canonicalServiceName(tokens[subscriberIndex + 1]);
  const baseFields = {
    service: serviceType,
    "service-id": serviceId,
    "subscriber-interface": subscriberName,
  };
  const groupIndex = findToken(tokens, "group-interface", subscriberIndex + 2);

  if (groupIndex < 0 || !tokens[groupIndex + 1]) {
    const fields = withPrefix(mapLeafFields(baseFields, tokens, subscriberIndex + 2, SUBSCRIBER_ONE_LINE_FIELDS));
    return createMdCliSubscriberOneLineObject({
      subscriberName,
      fields,
      rawLine,
      index,
    });
  }

  const groupName = canonicalServiceName(tokens[groupIndex + 1]);
  const groupFields = {
    ...baseFields,
    "group-interface": groupName,
  };
  const sapIndex = findToken(tokens, "sap", groupIndex + 2);
  const dhcpIndex = findPath(tokens, ["ipv4", "dhcp"], groupIndex + 2);

  if (sapIndex >= 0 && tokens[sapIndex + 1]) {
    return parseMdCliOneLineSubscriberSap({
      tokens,
      rawLine,
      index,
      serviceId,
      subscriberName,
      groupName,
      sapIndex,
      baseFields: groupFields,
    });
  }

  if (dhcpIndex >= 0) {
    const fields = mapLeafFields(groupFields, tokens, groupIndex + 2, DHCP_ONE_LINE_FIELDS);
    if (pathExists(tokens, ["ipv4", "dhcp", "lease-populate", "l2-header"], groupIndex + 2)) {
      fields["dhcp.lease-populate.l2-header"] = "true";
    }
    return createMdCliSubscriberOneLineObject({
      subscriberName,
      fields,
      rawLine,
      index,
    });
  }

  const fields = mapLeafFields(groupFields, tokens, groupIndex + 2, GROUP_ONE_LINE_FIELDS);
  return createMdCliSubscriberOneLineObject({
    subscriberName,
    fields,
    rawLine,
    index,
  });
}

function parseMdCliOneLineSubscriberSap({ tokens, rawLine, index, serviceId, subscriberName, groupName, sapIndex, baseFields }) {
  const sapName = canonicalServiceName(tokens[sapIndex + 1]);
  const sapFields = {
    ...baseFields,
    sap: sapName,
  };
  const staticHostIndex = findToken(tokens, "static-host", sapIndex + 2);
  const defaultHostIndex = findToken(tokens, "default-host", sapIndex + 2);
  const subSlaIndex = findToken(tokens, "sub-sla-mgmt", sapIndex + 2);
  const cpuProtectionIndex = findToken(tokens, "cpu-protection", sapIndex + 2);

  if (staticHostIndex >= 0) {
    const hostIp = tokenEquals(tokens, staticHostIndex + 1, "ipv4")
      ? stripQuotes(tokens[staticHostIndex + 2])
      : stripQuotes(tokens[staticHostIndex + 1]);
    const fields = mapLeafFields(
      { ...sapFields, "static-host": hostIp },
      tokens,
      staticHostIndex + 1,
      STATIC_HOST_ONE_LINE_FIELDS
    );
    return createMdCliSubscriberOneLineObject({
      subscriberName,
      fields,
      rawLine,
      index,
    });
  }

  if (defaultHostIndex >= 0) {
    const hostIp = tokenEquals(tokens, defaultHostIndex + 1, "ipv4")
      ? stripQuotes(tokens[defaultHostIndex + 2])
      : stripQuotes(tokens[defaultHostIndex + 1]);
    const prefixLength = valueAfterPath(tokens, ["prefix-length"], defaultHostIndex + 1);
    const host = hostIp && prefixLength ? `${hostIp}/${prefixLength}` : hostIp;
    const fields = {
      ...sapFields,
      "default-host": host,
      "prefix-length": prefixLength,
    };
    setField(fields, "default-host.next-hop", valueAfterPath(tokens, ["next-hop"], defaultHostIndex + 1));
    return createMdCliSubscriberOneLineObject({
      subscriberName,
      fields,
      rawLine,
      index,
    });
  }

  if (subSlaIndex >= 0) {
    const fields = mapLeafFields(
      { ...sapFields, "sub-sla-mgmt": "present" },
      tokens,
      subSlaIndex,
      SUB_SLA_MGMT_ONE_LINE_FIELDS
    );
    return createMdCliSubscriberOneLineObject({
      subscriberName,
      fields,
      rawLine,
      index,
    });
  }

  if (cpuProtectionIndex >= 0) {
    const fields = mapLeafFields(
      { ...sapFields, "cpu-protection": "present" },
      tokens,
      cpuProtectionIndex,
      CPU_PROTECTION_ONE_LINE_FIELDS
    );
    if (pathExists(tokens, ["cpu-protection", "ip-src-monitoring"], cpuProtectionIndex)) {
      fields["cpu-protection.ip-src-monitoring"] = "true";
    }
    return createMdCliSubscriberOneLineObject({
      subscriberName,
      fields,
      rawLine,
      index,
    });
  }

  const fields = mapLeafFields(sapFields, tokens, sapIndex + 2, SAP_ONE_LINE_FIELDS);
  return createMdCliSubscriberOneLineObject({
    subscriberName,
    fields,
    rawLine,
    index,
  });
}

function parseMdCliOneLineService(tokens, rawLine, index) {
  if (!tokenEquals(tokens, 0, "service")) return null;

  const serviceType = tokens[1] || "";
  const serviceId = stripQuotes(tokens[2] || "");
  const interfaceIndex = findToken(tokens, "interface", 3);
  const subscriberIndex = findToken(tokens, "subscriber-interface", 3);

  if (subscriberIndex >= 0 && tokens[subscriberIndex + 1]) {
    return parseMdCliOneLineSubscriberService({
      tokens,
      rawLine,
      index,
      serviceType,
      serviceId,
      subscriberIndex,
    });
  }

  if (interfaceIndex >= 0 && tokens[interfaceIndex + 1]) {
    return parseMdCliOneLineInterfaceService({
      tokens,
      rawLine,
      index,
      serviceType,
      serviceId,
      interfaceIndex,
    });
  }

  return null;
}

function parseMdCliOneLineRouter(tokens, rawLine, index) {
  if (!tokenEquals(tokens, 0, "router")) return null;

  const bgpIndex = findToken(tokens, "bgp", 1);
  const staticRoutesIndex = findToken(tokens, "static-routes", 1);
  const pimIndex = findToken(tokens, "pim", 1);

  if (bgpIndex >= 0 && tokenEquals(tokens, bgpIndex + 1, "neighbor") && tokens[bgpIndex + 2]) {
    const peerIp = stripQuotes(tokens[bgpIndex + 2]);
    const fields = mapLeafFields(
      { neighbor: peerIp, peerIp },
      tokens,
      bgpIndex + 3,
      BGP_ONE_LINE_FIELDS
    );
    const importPolicy = extractBracketedPolicyList(rawLine, "import");
    if (importPolicy) fields["import.policy"] = importPolicy;
    const exportPolicy = extractBracketedPolicyList(rawLine, "export");
    if (exportPolicy) fields["export.policy"] = exportPolicy;
    return createMdCliOneLineObject({
      type: "bgp",
      identity: peerIp,
      sourceType: "neighbor",
      sourceName: peerIp,
      fields,
      rawLine,
      index,
    });
  }

  if (bgpIndex >= 0 && tokenEquals(tokens, bgpIndex + 1, "group") && tokens[bgpIndex + 2]) {
    const groupName = stripQuotes(tokens[bgpIndex + 2]);
    const fields = mapLeafFields(
      { group: groupName },
      tokens,
      bgpIndex + 3,
      BGP_ONE_LINE_FIELDS
    );
    const importPolicy = extractBracketedPolicyList(rawLine, "import");
    if (importPolicy) fields["import.policy"] = importPolicy;
    const exportPolicy = extractBracketedPolicyList(rawLine, "export");
    if (exportPolicy) fields["export.policy"] = exportPolicy;
    const object = createMdCliOneLineObject({
      type: "bgp-group",
      identity: groupName,
      sourceType: "bgp-group",
      sourceName: groupName,
      fields,
      rawLine,
      index,
    });
    object.metadataOnly = true;
    object.relationshipRole = "bgp-group-definition";
    return object;
  }

  if (
    staticRoutesIndex >= 0 &&
    tokenEquals(tokens, staticRoutesIndex + 1, "route") &&
    tokens[staticRoutesIndex + 2]
  ) {
    const route = stripQuotes(tokens[staticRoutesIndex + 2]);
    const routingContext = getStaticRouteRoutingContext(tokens);
    const fields = mapLeafFields(
      routingContext ? { route, prefix: route, "routing-context": routingContext } : { route, prefix: route },
      tokens,
      staticRoutesIndex + 3,
      STATIC_ROUTE_ONE_LINE_FIELDS
    );
    const normalizedFields = normalizeNokiaSemanticFields(fields);
    const identity = canonicalStaticRouteIdentity(normalizedFields) || route;
    return createMdCliOneLineObject({
      type: "static-route",
      identity,
      sourceType: "route",
      sourceName: route,
      fields: normalizedFields,
      rawLine,
      index,
    });
  }

  if (pimIndex >= 0 && tokenEquals(tokens, pimIndex + 1, "interface") && tokens[pimIndex + 2]) {
    const interfaceName = canonicalInterfaceName(tokens[pimIndex + 2]);
    const fields = mapLeafFields(
      { interface: interfaceName },
      tokens,
      pimIndex + 3,
      PIM_ONE_LINE_FIELDS
    );
    return createMdCliOneLineObject({
      type: "pim",
      identity: interfaceName,
      sourceType: "pim",
      sourceName: interfaceName,
      fields,
      rawLine,
      index,
    });
  }

  return null;
}

function parseMdCliOneLineObject(line, index) {
  if (!/^\s*\/?configure\s*\{/i.test(line)) return null;
  const tokens = unwrapConfigureOneLine(line);
  if (!tokens.length) return null;

  return (
    parseMdCliOneLinePort(tokens, line, index) ||
    parseMdCliOneLineLag(tokens, line, index) ||
    parseMdCliOneLineService(tokens, line, index) ||
    parseMdCliOneLineRouter(tokens, line, index)
  );
}

function parseMdCliOneLineObjects(lines) {
  return lines
    .map((line, index) => parseMdCliOneLineObject(line, index))
    .filter(Boolean);
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
    applyDerivedObjectMetadata(target);
  });

  return mergeFinalizedObjectsBySemanticIdentity([...merged.values()].map(applyDerivedObjectMetadata));
}

function mergeFinalizedObjectsBySemanticIdentity(objects = []) {
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
    applyDerivedObjectMetadata(target);
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
    ...parseMdCliOneLineObjects(lines),
    ...parseMdCliPorts(lines),
    ...parseMdCliLags(lines),
    ...parseMdCliInterfaces(lines),
    ...parseMdCliStaticRoutes(lines),
    ...parseMdCliBgpGroups(lines),
    ...parseMdCliBgpNeighbors(lines),
    ...parseMdCliPimInterfaces(lines),
    ...parseMdCliServiceObjects(lines),
  ]);
}
