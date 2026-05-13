// src/core/parsers/juniperParser.js

import {
  createNormalizedObject,
} from "./index.js";

function splitLines(configText = "") {
  return String(configText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function ensureObject(map, key, factory) {
  if (!map.has(key)) {
    map.set(key, factory());
  }

  return map.get(key);
}

export function parseJuniperSetConfig(configText = "") {
  const lines = splitLines(configText);

  const interfaceMap = new Map();
  const staticRouteMap = new Map();
  const bgpMap = new Map();
  const pimMap = new Map();

  for (const line of lines) {

    /*
    =========================
    INTERFACE
    =========================
    */

    let match = line.match(
      /^set interfaces (\S+) unit (\S+) family inet address (\S+)$/i
    );

    if (match) {
      const [, ifName, unit, address] = match;

      const interfaceName = `${ifName}.${unit}`;

      const object = ensureObject(
        interfaceMap,
        interfaceName,
        () =>
          createNormalizedObject({
            id: `juniper-interface-${interfaceName}`,
            vendor: "juniper-set",
            sourceType: "interface",
            sourceName: interfaceName,
            normalizedType: "interface",
            normalizedIdentity: interfaceName,
            rawLines: [],
            fields: {
              interface: interfaceName,
              address,
            },
          })
      );

      object.rawLines.push(line);
      object.ipAddress = address;
      object.prefix = address;

      continue;
    }

    /*
    =========================
    STATIC ROUTE
    =========================
    */

    match = line.match(
      /^set routing-options static route (\S+) next-hop (\S+)$/i
    );

    if (match) {
      const [, route, nextHop] = match;

      const object = ensureObject(
        staticRouteMap,
        route,
        () =>
          createNormalizedObject({
            id: `juniper-static-route-${route}`,
            vendor: "juniper-set",
            sourceType: "static-route",
            sourceName: route,
            normalizedType: "static-route",
            normalizedIdentity: route,
            rawLines: [],
            fields: {
              route,
            },
          })
      );

      object.rawLines.push(line);
      object.fields["next-hop"] = nextHop;
      object.prefix = route;

      continue;
    }

    /*
    =========================
    BGP
    =========================
    */

    match = line.match(
      /^set protocols bgp group (\S+) neighbor (\S+) peer-as (\S+)$/i
    );

    if (match) {
      const [, group, neighbor, peerAs] = match;

      const object = ensureObject(
        bgpMap,
        neighbor,
        () =>
          createNormalizedObject({
            id: `juniper-bgp-${neighbor}`,
            vendor: "juniper-set",
            sourceType: "bgp",
            sourceName: neighbor,
            normalizedType: "bgp",
            normalizedIdentity: neighbor,
            rawLines: [],
            fields: {
              neighbor,
              group,
            },
          })
      );

      object.rawLines.push(line);

      object.peerIp = neighbor;
      object.peerAs = peerAs;

      object.fields.peerAs = peerAs;

      continue;
    }

    /*
    =========================
    PIM
    =========================
    */

    match = line.match(
      /^set protocols pim interface (\S+) mode (\S+)$/i
    );

    if (match) {
      const [, interfaceName, mode] = match;

      const object = ensureObject(
        pimMap,
        interfaceName,
        () =>
          createNormalizedObject({
            id: `juniper-pim-${interfaceName}`,
            vendor: "juniper-set",
            sourceType: "pim",
            sourceName: interfaceName,
            normalizedType: "pim",
            normalizedIdentity: interfaceName,
            rawLines: [],
            fields: {
              interface: interfaceName,
              mode,
            },
          })
      );

      object.rawLines.push(line);

      continue;
    }
  }

  return [
    ...interfaceMap.values(),
    ...staticRouteMap.values(),
    ...bgpMap.values(),
    ...pimMap.values(),
  ];
}