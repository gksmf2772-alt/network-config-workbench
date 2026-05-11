// src/core/parsers/nokiaMdCliParser.js

import { createNormalizedObject } from "./index.js";

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
  for (const line of lines) {
    const trimmed = line.trim();

    const address = trimmed.match(/^address\s+(\S+)/i);
    if (address) {
      return {
        ipAddress: address[1],
        prefix: address[1],
        raw: trimmed,
      };
    }

    const ipv4Primary = trimmed.match(/^primary\s+address\s+(\S+)/i);
    if (ipv4Primary) {
      return {
        ipAddress: ipv4Primary[1],
        prefix: ipv4Primary[1],
        raw: trimmed,
      };
    }
  }

  return null;
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

function parseMdCliPorts(lines) {
  const blocks = collectBraceBlocks(lines, /^port\s+"?([^"\s{]+)"?\s*\{/i);

  return blocks.map((block, index) => {
    const description = extractDescription(block.lines);
    const identity = description || block.name;

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
    const identity = description || block.name;

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
      },
    });

    object.description = description;

    return object;
  });
}

function parseMdCliInterfaces(lines) {
  const blocks = collectBraceBlocks(lines, /^interface\s+"?([^"\s{]+)"?\s*\{/i);

  return blocks.map((block, index) => {
    const description = extractDescription(block.lines);
    const addressInfo = extractAddress(block.lines);

    const identity = addressInfo?.prefix || description || block.name;

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
        ipAddress: addressInfo?.ipAddress || null,
        prefix: addressInfo?.prefix || null,
      },
    });

    object.description = description;
    object.ipAddress = addressInfo?.ipAddress || null;
    object.prefix = addressInfo?.prefix || null;

    return object;
  });
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

export function parseNokiaMdCliConfig(configText) {
  const lines = splitLines(configText);

  return [
    ...parseMdCliPorts(lines),
    ...parseMdCliLags(lines),
    ...parseMdCliInterfaces(lines),
    ...parseMdCliStaticRoutes(lines),
    ...parseMdCliBgpNeighbors(lines),
  ];
}