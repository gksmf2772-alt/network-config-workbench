import {
  canonicalBgpNeighborId,
  canonicalLagId,
  canonicalL3InterfaceId,
  canonicalPimId,
  canonicalPortId,
  canonicalStaticRouteId,
} from "./canonicalIds.js";
import {
  canonicalizeInterfaceName,
  canonicalizeLagNumber,
  canonicalizePortName,
  evidenceFromObject,
  firstGraphValue,
  graphValueList,
  objectDeviceId,
  objectFields,
  objectIdentity,
  objectType,
  objectVrf,
} from "./canonicalInterface.js";
import {
  resolveBgpRelations,
  resolveInterfacePeerRelations,
  resolveLagInterfaceRelations,
  resolvePimRelations,
  resolvePortLagRelations,
  resolveStaticRouteRelations,
} from "./relationResolver.js";
import { createCanonicalNode, NodeKind } from "./types.js";

const INTERFACE_TYPES = new Set(["interface", "subscriber-interface", "group-interface"]);

function cleanDisplayValue(value = "") {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function firstRawMatch(object = {}, patterns = []) {
  const lines = Array.isArray(object.rawLines) ? object.rawLines : [];
  for (const line of lines) {
    const text = String(line || "");
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return cleanDisplayValue(match[1]);
    }
  }
  return "";
}

function rawDisplayName(object = {}, type = "") {
  if (type === "port") {
    return firstRawMatch(object, [
      /^\s*port\s+"?([^"\s{}]+)"?/i,
      /^\s*\/configure\s*\{\s*port\s+"?([^"\s{}]+)"?/i,
      /\bport\s+"?([^"\s{}]+)"?/i,
    ]);
  }
  if (type === "lag") {
    return firstRawMatch(object, [
      /^\s*lag\s+"?([^"\s{}]+)"?/i,
      /^\s*\/configure\s*\{\s*lag\s+"?([^"\s{}]+)"?/i,
      /\blag\s+"?([^"\s{}]+)"?/i,
    ]);
  }
  if (INTERFACE_TYPES.has(type) || type === "pim") {
    return firstRawMatch(object, [
      /^\s*interface\s+"?([^"\s{}]+)"?/i,
      /^\s*\/configure\s*\{.*\binterface\s+"?([^"\s{}]+)"?/i,
      /\binterface\s+"?([^"\s{}]+)"?/i,
    ]);
  }
  if (type === "bgp") {
    return firstRawMatch(object, [
      /^\s*neighbor\s+"?([^"\s{}]+)"?/i,
      /^\s*\/configure\s*\{.*\bbgp\s+neighbor\s+"?([^"\s{}]+)"?/i,
      /\bneighbor\s+"?([^"\s{}]+)"?/i,
    ]);
  }
  return "";
}

function rawInterfacePortRefs(object = {}) {
  const lines = Array.isArray(object.rawLines) ? object.rawLines : [];
  const refs = [];
  for (const line of lines) {
    const text = String(line || "");
    const match =
      text.match(/\b(?:physical-port|port-id|port)\s+"?([^"\s{}]+)"?/i) ||
      text.match(/\bsap\s+"?([^"\s{}]+)"?/i);
    if (match?.[1]) refs.push(cleanDisplayValue(match[1]).split(":")[0]);
  }
  return refs;
}

function rawInterfaceLagRefs(object = {}) {
  const lines = Array.isArray(object.rawLines) ? object.rawLines : [];
  const refs = [];
  for (const line of lines) {
    const text = String(line || "");
    const match =
      text.match(/\bsap\s+"?(lag[-_\w]+)"?/i) ||
      text.match(/\blag\s+"?([^"\s{}:]+)"?/i);
    if (match?.[1]) refs.push(cleanDisplayValue(match[1]).split(":")[0]);
  }
  return refs;
}

function ipFromAddress(value = "") {
  return String(value || "").match(/\d{1,3}(?:\.\d{1,3}){3}/)?.[0] || "";
}

function joinAddressPrefix(address = "", prefixLength = "") {
  const cleanAddress = cleanDisplayValue(address);
  const cleanPrefix = cleanDisplayValue(prefixLength);
  if (!cleanAddress) return "";
  if (cleanAddress.includes("/") || !cleanPrefix) return cleanAddress;
  return `${cleanAddress}/${cleanPrefix}`;
}

function rawInterfaceAddressParts(object = {}) {
  const lines = Array.isArray(object.rawLines) ? object.rawLines : [];
  let address = "";
  let prefixLength = "";

  for (const line of lines) {
    const text = String(line || "").trim();
    const addressMatch =
      text.match(/^address\s+"?(\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?)"?/i) ||
      text.match(/\bipv4\s+primary\s+address\s+"?(\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?)"?/i) ||
      text.match(/\bipv4\s+address\s+"?(\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?)"?/i) ||
      text.match(/\bprimary\b.*\baddress\s+"?(\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?)"?/i);
    if (addressMatch?.[1]) address = cleanDisplayValue(addressMatch[1]);

    const prefixMatch = text.match(/\bprefix-length\s+(\d{1,3})\b/i);
    if (prefixMatch?.[1]) prefixLength = cleanDisplayValue(prefixMatch[1]);
  }

  return { address, prefixLength };
}

function interfaceAddressFromObject(fields = {}, object = {}) {
  const fieldAddress = firstGraphValue(fields.address || fields.prefix || object.prefix);
  const fieldPrefix = firstGraphValue(fields["prefix-length"] || fields.prefixLength);
  const address = joinAddressPrefix(fieldAddress, fieldPrefix);
  if (address) return address;

  const raw = rawInterfaceAddressParts(object);
  return joinAddressPrefix(raw.address, raw.prefixLength);
}

function sapPortRefs(fields = {}) {
  return graphValueList(fields.sap)
    .map((value) => cleanDisplayValue(value).split(":")[0])
    .filter((value) => value.includes("/"));
}

function sapLagRefs(fields = {}) {
  return graphValueList(fields.sap)
    .map((value) => cleanDisplayValue(value).split(":")[0])
    .filter((value) => value && !value.includes("/"));
}

function interfaceAliasNames(fields = {}, name = "") {
  return [...new Set([
    name,
    fields.interface,
    fields["subscriber-interface"],
    ...graphValueList(fields["group-interface"]),
  ].filter(Boolean))];
}

function sourceDisplayName(object = {}, fallback = "", type = "") {
  return cleanDisplayValue(
    rawDisplayName(object, type) ||
    object.sourceName ||
    object.identity ||
    fallback ||
    object.normalizedIdentity ||
    object.id ||
    ""
  );
}

function canonicalNodeSpecFromObject(object = {}, options = {}) {
  const type = objectType(object);
  const fields = objectFields(object);
  const deviceId = objectDeviceId(object, options.deviceId);
  const vrf = objectVrf(object);

  if (type === "port") {
    const name = fields.port || object.sourceName || objectIdentity(object);
    const displayName = sourceDisplayName(object, name, type);
    const normalizedName = canonicalizePortName(name);
    if (!name) return null;
    return {
      id: canonicalPortId({ deviceId, name }),
      kind: NodeKind.PORT,
      label: displayName || normalizedName,
      deviceId,
      vrf: "",
      attributes: {
        name: displayName || normalizedName,
        normalizedName,
      },
    };
  }

  if (type === "lag") {
    const lag = fields.lag || object.sourceName || objectIdentity(object);
    const displayLag = sourceDisplayName(object, lag, type);
    const normalizedLag = canonicalizeLagNumber(lag);
    if (!lag) return null;
    return {
      id: canonicalLagId({ deviceId, lag }),
      kind: NodeKind.LAG,
      label: displayLag || normalizedLag,
      deviceId,
      vrf: "",
      attributes: {
        lag: displayLag || normalizedLag,
        normalizedLag,
      },
    };
  }

  if (INTERFACE_TYPES.has(type)) {
    const name = fields.interface || fields["subscriber-interface"] || fields["group-interface"] || object.sourceName || objectIdentity(object);
    const displayName = sourceDisplayName(object, name, type);
    const normalizedName = canonicalizeInterfaceName(name);
    const aliases = interfaceAliasNames(fields, name);
    const address = interfaceAddressFromObject(fields, object);
    if (!name) return null;
    return {
      id: canonicalL3InterfaceId({ deviceId, vrf, name }),
      kind: NodeKind.L3_INTERFACE,
      label: displayName || String(name),
      deviceId,
      vrf,
      attributes: {
        name: displayName || String(name),
        normalizedName,
        address,
        ipAddress: object.ipAddress || fields.ipAddress || ipFromAddress(address),
        aliases,
        normalizedAliases: aliases.map(canonicalizeInterfaceName).filter(Boolean),
        lagRefs: [
          ...graphValueList(fields.lag),
          ...sapLagRefs(fields),
          ...rawInterfaceLagRefs(object),
        ],
        portRefs: [
          ...graphValueList(fields.port),
          ...graphValueList(fields["member-port"]),
          ...sapPortRefs(fields),
          ...rawInterfacePortRefs(object),
        ],
      },
    };
  }

  if (type === "static-route") {
    const prefix = fields.route || fields.prefix || fields.address || object.prefix || objectIdentity(object);
    const nextHops = graphValueList(fields["next-hop"] || fields.nextHop || fields.gateway);
    const nextHop = firstGraphValue(nextHops);
    if (!prefix) return null;
    return {
      id: canonicalStaticRouteId({ deviceId, vrf, prefix, nextHop }),
      kind: NodeKind.STATIC_ROUTE,
      label: [prefix, nextHop].filter(Boolean).join(" via ") || String(prefix),
      deviceId,
      vrf,
      attributes: {
        prefix,
        nextHop,
        nextHops,
        outgoingInterface: firstGraphValue(
          fields["outgoing-interface"] ||
          fields.outgoingInterface ||
          fields["next-hop-interface"] ||
          fields.interface ||
          fields["egress-interface"]
        ),
      },
    };
  }

  if (type === "bgp") {
    const neighborIp = fields.neighbor || object.peerIp || rawDisplayName(object, type) || objectIdentity(object);
    if (!neighborIp) return null;
    return {
      id: canonicalBgpNeighborId({ deviceId, vrf, neighborIp }),
      kind: NodeKind.BGP_NEIGHBOR,
      label: String(neighborIp),
      deviceId,
      vrf,
      attributes: {
        neighborIp: String(neighborIp),
        peerAs: fields["peer-as"] || fields.peerAs || object.peerAs || "",
        multihop: fields["ebgp-multihop"] || fields.multihop || fields["multi-hop"] || "",
        updateSource: fields["update-source"] || fields.localAddress || fields["local-address"] || "",
        loopback: fields.loopback || fields["loopback-neighbor"] || "",
      },
    };
  }

  if (type === "pim") {
    const interfaceName = fields.interface || objectIdentity(object);
    const displayInterfaceName = sourceDisplayName(object, interfaceName, type);
    const normalizedInterfaceName = canonicalizeInterfaceName(interfaceName);
    const neighborIp = firstGraphValue(fields.neighbor || fields["neighbor-ip"]);
    if (!interfaceName) return null;
    return {
      id: canonicalPimId({ deviceId, vrf, interfaceName }),
      kind: NodeKind.PIM,
      label: displayInterfaceName || String(interfaceName),
      deviceId,
      vrf,
      attributes: {
        interface: displayInterfaceName || String(interfaceName),
        normalizedInterface: normalizedInterfaceName,
        neighborIp,
      },
    };
  }

  return null;
}

function isEmptyAttribute(value) {
  return value == null || value === "" || (Array.isArray(value) && !value.length);
}

function mergeAttributeValue(existing, next) {
  if (Array.isArray(existing) || Array.isArray(next)) {
    const values = [
      ...(Array.isArray(existing) ? existing : isEmptyAttribute(existing) ? [] : [existing]),
      ...(Array.isArray(next) ? next : isEmptyAttribute(next) ? [] : [next]),
    ];
    return [...new Set(values.filter((value) => !isEmptyAttribute(value)))];
  }
  if (isEmptyAttribute(next)) return existing;
  if (isEmptyAttribute(existing)) return next;
  return next;
}

function mergeAttributes(existing = {}, next = {}) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(next || {})) {
    merged[key] = mergeAttributeValue(merged[key], value);
  }
  return merged;
}

function mergeEntryObject(existing = {}, next = {}) {
  return {
    ...existing,
    sourceName: existing.sourceName || next.sourceName || "",
    identity: existing.identity || next.identity || "",
    normalizedIdentity: existing.normalizedIdentity || next.normalizedIdentity || "",
    fields: mergeAttributes(objectFields(existing), objectFields(next)),
    rawLines: [...new Set([
      ...(Array.isArray(existing.rawLines) ? existing.rawLines : []),
      ...(Array.isArray(next.rawLines) ? next.rawLines : []),
    ])],
  };
}

function mergeCanonicalNode(existing, next, object) {
  const mergedAttributes = mergeAttributes(existing.attributes, next.attributes);
  if (existing.attributes?.name) mergedAttributes.name = existing.attributes.name;
  if (existing.attributes?.lag) mergedAttributes.lag = existing.attributes.lag;
  if (existing.attributes?.interface) mergedAttributes.interface = existing.attributes.interface;

  return {
    ...existing,
    attributes: {
      ...mergedAttributes,
    },
    sourceObjectIds: [...new Set([
      ...(existing.sourceObjectIds || []),
      object.id || "",
    ].filter(Boolean))],
    evidence: [
      ...(existing.evidence || []),
      evidenceFromObject(object, "canonical-node"),
    ],
  };
}

function addCanonicalNode(context, object, options) {
  const spec = canonicalNodeSpecFromObject(object, options);
  if (!spec) return null;

  const nextNode = createCanonicalNode({
    ...spec,
    sourceObjectIds: [object.id || ""],
    evidence: evidenceFromObject(object, "canonical-node"),
  });
  const existing = context.nodesById.get(nextNode.id);
  const existingEntry = context.entryByNodeId.get(nextNode.id);
  const node = existing ? mergeCanonicalNode(existing, nextNode, object) : nextNode;
  context.nodesById.set(node.id, node);

  const entry = existingEntry
    ? { object: mergeEntryObject(existingEntry.object, object), node }
    : { object, node };
  context.entryByNodeId.set(node.id, entry);
  if (!context.entriesByKind.has(node.kind)) context.entriesByKind.set(node.kind, []);
  const entries = context.entriesByKind.get(node.kind);
  const existingEntryIndex = entries.findIndex((item) => item.node.id === node.id);
  if (existingEntryIndex >= 0) {
    entries[existingEntryIndex] = entry;
  } else {
    entries.push(entry);
  }

  if (node.kind === NodeKind.PORT) {
    context.index.portByName.set(node.attributes.normalizedName || canonicalizePortName(node.attributes.name), entry);
  } else if (node.kind === NodeKind.LAG) {
    context.index.lagByNumber.set(node.attributes.normalizedLag || canonicalizeLagNumber(node.attributes.lag), entry);
  }

  return entry;
}

export function createCanonicalGraphContext({ objects = [], deviceId = "device" } = {}) {
  const context = {
    nodesById: new Map(),
    entryByNodeId: new Map(),
    entriesByKind: new Map(),
    index: {
      portByName: new Map(),
      lagByNumber: new Map(),
    },
  };

  for (const object of objects || []) {
    addCanonicalNode(context, object, { deviceId });
  }

  return context;
}

function uniqueEdges(edges = []) {
  const byId = new Map();
  for (const edge of edges) {
    byId.set(edge.id, edge);
  }
  return [...byId.values()];
}

export function buildCanonicalGraph({ objects = [], deviceId = "device" } = {}) {
  const context = createCanonicalGraphContext({ objects, deviceId });
  const portLag = resolvePortLagRelations(context);
  const lagInterface = resolveLagInterfaceRelations(context, {
    memberOfEdges: portLag.edges,
  });
  const interfacePeers = resolveInterfacePeerRelations(context);
  const staticRoutes = resolveStaticRouteRelations(context, {
    peerEdges: interfacePeers.edges,
  });
  const bgp = resolveBgpRelations(context, {
    peerEdges: interfacePeers.edges,
    staticRouteResults: staticRoutes.routeResults,
  });
  const pim = resolvePimRelations(context, {
    peerEdges: interfacePeers.edges,
  });

  return {
    nodes: [...context.nodesById.values()],
    edges: uniqueEdges([
      ...portLag.edges,
      ...lagInterface.edges,
      ...interfacePeers.edges,
      ...staticRoutes.edges,
      ...bgp.edges,
      ...pim.edges,
    ]),
    diagnostics: [
      ...portLag.diagnostics,
      ...lagInterface.diagnostics,
      ...interfacePeers.diagnostics,
      ...staticRoutes.diagnostics,
      ...bgp.diagnostics,
      ...pim.diagnostics,
    ],
  };
}

export function staticRouteNextHops(object = {}) {
  const fields = objectFields(object);
  return graphValueList(fields["next-hop"] || fields.gateway);
}
