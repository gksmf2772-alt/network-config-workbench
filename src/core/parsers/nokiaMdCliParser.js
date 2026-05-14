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

export function parseNokiaMdCliConfig(configText) {
  const lines = splitLines(configText);

  return [
    ...parseMdCliPorts(lines),
    ...parseMdCliLags(lines),
    ...parseMdCliInterfaces(lines),
    ...parseMdCliStaticRoutes(lines),
    ...parseMdCliBgpNeighbors(lines),
    ...parseMdCliPimInterfaces(lines),
  ];
}