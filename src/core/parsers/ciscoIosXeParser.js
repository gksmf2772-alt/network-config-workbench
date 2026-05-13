// src/core/parsers/ciscoIosXeParser.js

import { createNormalizedObject } from "./index.js";
import { normalizeIpv4Prefix } from "../utils/ipUtils.js";

function splitLines(configText) {
  return typeof configText === "string" ? configText.split(/\r?\n/) : [];
}

function isTopLevelLine(line) {
  return line.trim() && !/^\s/.test(line);
}

function isInterfaceStart(line) {
  return /^interface\s+(.+)$/i.test(line.trim());
}

function isRouterBgpStart(line) {
  return /^router\s+bgp\s+(\S+)/i.test(line.trim());
}

function extractDescription(lines) {
  for (const line of lines) {
    const match = line.trim().match(/^description\s+(.+)$/i);
    if (match) return stripQuotes(match[1].trim());
  }
  return null;
}

function stripQuotes(value) {
  return String(value || "").replace(/^["']|["']$/g, "").trim();
}

function extractCiscoIpAddress(lines) {
  for (const line of lines) {
    const trimmed = line.trim();

    const ipv4 = trimmed.match(/^ip\s+address\s+(\S+)\s+(\S+)/i);
    if (ipv4) {
      return {
        ipAddress: ipv4[1],
        prefix: normalizeIpv4Prefix(ipv4[1], ipv4[2]),
        raw: trimmed,
      };
    }

    const ipv6 = trimmed.match(/^ipv6\s+address\s+(\S+)/i);
    if (ipv6) {
      return {
        ipAddress: ipv6[1],
        prefix: ipv6[1],
        raw: trimmed,
      };
    }
  }

  return null;
}

function hasLine(lines, regex) {
  return lines.some((line) => regex.test(line.trim()));
}

function classifyCiscoInterface(name, lines) {
  const hasIpAddress = Boolean(extractCiscoIpAddress(lines));
  const hasNoSwitchport = hasLine(lines, /^no\s+switchport$/i);
  const hasSwitchport = hasLine(lines, /^switchport\b/i) && !hasNoSwitchport;

  if (/^(vlan|loopback|tunnel)/i.test(name)) {
    return "interface";
  }

  if (/^port-channel/i.test(name)) {
    if (hasIpAddress || hasNoSwitchport) return "interface";
    return "lag";
  }

  if (
    /^(ethernet|fastethernet|gigabitethernet|tengigabitethernet|twentyfivegigabitethernet|fortygigabitethernet|hundredgigabitethernet)/i.test(
      name
    )
  ) {
    if (hasIpAddress || hasNoSwitchport) return "interface";
    return "port";
  }

  if (hasIpAddress || hasNoSwitchport) return "interface";
  if (hasSwitchport) return "port";

  return "unknown";
}

function collectCiscoInterfaceBlocks(lines) {
  const blocks = [];

  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (isInterfaceStart(line)) {
      if (current) blocks.push(current);

      const [, name] = trimmed.match(/^interface\s+(.+)$/i);

      current = {
        name: name.trim(),
        lines: [line],
      };

      continue;
    }

    if (current) {
      if (trimmed === "!") {
        current.lines.push(line);
        blocks.push(current);
        current = null;
        continue;
      }

      if (isTopLevelLine(line) && !isInterfaceStart(line)) {
        blocks.push(current);
        current = null;
      } else {
        current.lines.push(line);
      }
    }
  }

  if (current) blocks.push(current);

  return blocks;
}

function parseCiscoInterfaces(lines) {
  return collectCiscoInterfaceBlocks(lines).map((block, index) => {
    const normalizedType = classifyCiscoInterface(block.name, block.lines);
    const description = extractDescription(block.lines);
    const ipInfo = extractCiscoIpAddress(block.lines);
    const channelGroup = block.lines
      .map((line) => line.trim())
      .map((line) => line.match(/^channel-group\s+(\S+)/i))
      .find(Boolean);

    const identity =
      normalizedType === "interface" && ipInfo?.prefix
        ? ipInfo.prefix
        : description || block.name;

    const object = createNormalizedObject({
      id: `cisco-interface-${index}-${block.name}`,
      vendor: "cisco-ios-xe",
      sourceType: "interface",
      sourceName: block.name,
      normalizedType,
      normalizedIdentity: identity,
      rawLines: block.lines,
      fields: {
        interfaceName: block.name,
        description,
        ipAddress: ipInfo?.ipAddress || null,
        prefix: ipInfo?.prefix || null,
        hasNoSwitchport: hasLine(block.lines, /^no\s+switchport$/i),
        hasSwitchport: hasLine(block.lines, /^switchport\b/i),
        lag: channelGroup?.[1] || null,
      },
    });

    object.description = description;
    object.ipAddress = ipInfo?.ipAddress || null;
    object.prefix = ipInfo?.prefix || null;

    return object;
  });
}

function parseCiscoStaticRoutes(lines) {
  const routes = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const match = trimmed.match(/^ip\s+route\s+(\S+)\s+(\S+)\s+(\S+)(.*)$/i);

    if (!match) return;

    const [, destination, mask, nextHop, rest] = match;

    const prefix = normalizeIpv4Prefix(destination, mask);

    const object = createNormalizedObject({
      id: `cisco-static-route-${index}-${destination}`,
      vendor: "cisco-ios-xe",
      sourceType: "ip route",
      sourceName: destination,
      normalizedType: "static-route",
      normalizedIdentity: prefix,
      rawLines: [line],
      fields: {
        destination,
        mask,
        nextHop,
        rest: rest.trim(),
      },
    });

    object.prefix = prefix;

    routes.push(object);
  });

  return routes;
}

function collectCiscoBgpBlock(lines) {
  const blocks = [];

  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (isRouterBgpStart(line)) {
      if (current) blocks.push(current);

      const [, asn] = trimmed.match(/^router\s+bgp\s+(\S+)/i);

      current = {
        asn,
        lines: [line],
      };

      continue;
    }

    if (current) {
      if (trimmed === "!") {
        current.lines.push(line);
        blocks.push(current);
        current = null;
        continue;
      }

      if (isTopLevelLine(line) && !isRouterBgpStart(line)) {
        blocks.push(current);
        current = null;
      } else {
        current.lines.push(line);
      }
    }
  }

  if (current) blocks.push(current);

  return blocks;
}

function parseCiscoBgp(lines) {
  const result = new Map();

  for (const block of collectCiscoBgpBlock(lines)) {
    for (const line of block.lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^neighbor\s+(\S+)\s+(.+)$/i);

      if (!match) continue;

      const [, peerIp, command] = match;

      if (!result.has(peerIp)) {
        const object = createNormalizedObject({
          id: `cisco-bgp-${peerIp}`,
          vendor: "cisco-ios-xe",
          sourceType: "router bgp neighbor",
          sourceName: peerIp,
          normalizedType: "bgp",
          normalizedIdentity: peerIp,
          rawLines: [],
          fields: {
            localAs: block.asn,
            neighbor: peerIp,
          },
        });

        object.peerIp = peerIp;

        result.set(peerIp, object);
      }

      const object = result.get(peerIp);
      object.rawLines.push(line);

      const remoteAs = command.match(/^remote-as\s+(\S+)/i);
      if (remoteAs) {
        object.peerAs = remoteAs[1];
        object.fields.peerAs = remoteAs[1];
      }

      const description = command.match(/^description\s+(.+)$/i);
      if (description) {
        object.description = stripQuotes(description[1]);
        object.fields.description = object.description;
      }
    }
  }

  return Array.from(result.values());
}

function parseCiscoPimInterfaces(lines) {
  return collectCiscoInterfaceBlocks(lines)
    .filter((block) =>
      block.lines.some((line) =>
        /^ip\s+pim\s+(sparse-mode|dense-mode|sparse-dense-mode)$/i.test(
          line.trim()
        )
      )
    )
    .map((block, index) => {
      const modeLine = block.lines
        .map((line) => line.trim())
        .find((line) =>
          /^ip\s+pim\s+(sparse-mode|dense-mode|sparse-dense-mode)$/i.test(line)
        );

      const modeMatch = modeLine?.match(
        /^ip\s+pim\s+(sparse-mode|dense-mode|sparse-dense-mode)$/i
      );

      const mode = modeMatch?.[1] || "enabled";

      const object = createNormalizedObject({
        id: `cisco-pim-${index}-${block.name}`,
        vendor: "cisco-ios-xe",
        sourceType: "pim",
        sourceName: block.name,
        normalizedType: "pim",
        normalizedIdentity: block.name,
        rawLines: block.lines.filter((line) =>
          /^ip\s+pim\s+/i.test(line.trim())
        ),
        fields: {
          interface: block.name,
          mode,
        },
      });

      object.state = "enabled";

      return object;
    });
}

export function parseCiscoIosXeConfig(configText) {
  const lines = splitLines(configText);

  return [
    ...parseCiscoInterfaces(lines),
    ...parseCiscoStaticRoutes(lines),
    ...parseCiscoBgp(lines),
    ...parseCiscoPimInterfaces(lines),
  ];
}