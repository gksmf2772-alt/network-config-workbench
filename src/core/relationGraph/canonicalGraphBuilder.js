import {
  canonicalBgpNeighborId,
  canonicalLagId,
  canonicalL3InterfaceId,
  canonicalPimId,
  canonicalPortId,
  canonicalStaticRouteId,
} from "./canonicalIds.js";
import {
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

function canonicalNodeSpecFromObject(object = {}, options = {}) {
  const type = objectType(object);
  const fields = objectFields(object);
  const deviceId = objectDeviceId(object, options.deviceId);
  const vrf = objectVrf(object);

  if (type === "port") {
    const name = fields.port || object.sourceName || objectIdentity(object);
    if (!name) return null;
    return {
      id: canonicalPortId({ deviceId, name }),
      kind: NodeKind.PORT,
      label: canonicalizePortName(name),
      deviceId,
      vrf: "",
      attributes: { name: canonicalizePortName(name) },
    };
  }

  if (type === "lag") {
    const lag = fields.lag || object.sourceName || objectIdentity(object);
    if (!lag) return null;
    return {
      id: canonicalLagId({ deviceId, lag }),
      kind: NodeKind.LAG,
      label: canonicalizeLagNumber(lag),
      deviceId,
      vrf: "",
      attributes: { lag: canonicalizeLagNumber(lag) },
    };
  }

  if (INTERFACE_TYPES.has(type)) {
    const name = fields.interface || fields["subscriber-interface"] || fields["group-interface"] || object.sourceName || objectIdentity(object);
    if (!name) return null;
    return {
      id: canonicalL3InterfaceId({ deviceId, vrf, name }),
      kind: NodeKind.L3_INTERFACE,
      label: String(name),
      deviceId,
      vrf,
      attributes: {
        name: String(name),
        address: fields.address || fields.prefix || object.prefix || "",
        ipAddress: object.ipAddress || "",
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
    const neighborIp = fields.neighbor || object.peerIp || objectIdentity(object);
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
    const neighborIp = firstGraphValue(fields.neighbor || fields["neighbor-ip"]);
    if (!interfaceName) return null;
    return {
      id: canonicalPimId({ deviceId, vrf, interfaceName }),
      kind: NodeKind.PIM,
      label: String(interfaceName),
      deviceId,
      vrf,
      attributes: { interface: interfaceName, neighborIp },
    };
  }

  return null;
}

function mergeCanonicalNode(existing, next, object) {
  return {
    ...existing,
    attributes: {
      ...existing.attributes,
      ...next.attributes,
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
  const node = existing ? mergeCanonicalNode(existing, nextNode, object) : nextNode;
  context.nodesById.set(node.id, node);

  const entry = { object, node };
  context.entryByNodeId.set(node.id, entry);
  if (!context.entriesByKind.has(node.kind)) context.entriesByKind.set(node.kind, []);
  context.entriesByKind.get(node.kind).push(entry);

  if (node.kind === NodeKind.PORT) {
    context.index.portByName.set(node.attributes.name, entry);
  } else if (node.kind === NodeKind.LAG) {
    context.index.lagByNumber.set(node.attributes.lag, entry);
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
