import {
  canonicalPimNeighborId,
  canonicalPeerNhId,
} from "./canonicalIds.js";
import {
  canonicalizeLagNumber,
  canonicalizeInterfaceName,
  canonicalizePortName,
  evidenceFromObject,
  firstGraphValue,
  graphValueList,
  objectFields,
  objectIdentity,
} from "./canonicalInterface.js";
import {
  connectedSubnetContainsIp,
  normalizeIp,
  peerIpsFromInterfaceAddress,
  prefixContainsIp,
} from "./ipUtils.js";
import {
  createCanonicalNode,
  createGraphDiagnostic,
  createGraphEdge,
  DiagnosticKind,
  NodeKind,
  RelationKind,
} from "./types.js";

function addCandidate(candidateMap, sourceId, targetId, evidence, confidence = 100) {
  if (!sourceId || !targetId) return;
  if (!candidateMap.has(sourceId)) candidateMap.set(sourceId, new Map());
  const byTarget = candidateMap.get(sourceId);
  if (!byTarget.has(targetId)) {
    byTarget.set(targetId, { targetId, confidence, evidence: [] });
  }
  byTarget.get(targetId).confidence = Math.max(byTarget.get(targetId).confidence, confidence);
  byTarget.get(targetId).evidence.push(evidence);
}

function edgeEvidence(candidate) {
  return candidate.evidence[0] || { source: "derived", reason: "resolver" };
}

function mergedEvidence(candidate, fallback) {
  const evidence = candidate.evidence?.length ? candidate.evidence : [fallback].filter(Boolean);
  return evidence.filter(Boolean);
}

function ensureContextNode(context, node, object = {}) {
  const existing = context.nodesById.get(node.id);
  const merged = existing
    ? {
      ...existing,
      attributes: {
        ...(existing.attributes || {}),
        ...(node.attributes || {}),
      },
      sourceObjectIds: [...new Set([
        ...(existing.sourceObjectIds || []),
        ...(node.sourceObjectIds || []),
      ].filter(Boolean))],
      evidence: [
        ...(existing.evidence || []),
        ...(node.evidence || []),
      ],
    }
    : node;

  context.nodesById.set(merged.id, merged);
  const existingEntry = context.entryByNodeId.get(merged.id);
  if (existingEntry) {
    existingEntry.node = merged;
    return existingEntry;
  }

  const entry = { object, node: merged };
  context.entryByNodeId.set(merged.id, entry);
  if (!context.entriesByKind.has(merged.kind)) context.entriesByKind.set(merged.kind, []);
  context.entriesByKind.get(merged.kind).push(entry);
  return entry;
}

function findLagEntryByRef(context, value = "") {
  const lagRef = canonicalizeLagNumber(value);
  return lagRef ? context.index.lagByNumber.get(lagRef) || null : null;
}

function findPortEntryByRef(context, value = "") {
  const portRef = canonicalizePortName(value);
  return portRef ? context.index.portByName.get(portRef) || null : null;
}

export function resolvePortLagRelations(context) {
  const candidatesByPortId = new Map();
  const diagnostics = [];

  for (const lagEntry of context.entriesByKind.get(NodeKind.LAG) || []) {
    const fields = objectFields(lagEntry.object);
    const members = [
      ...graphValueList(fields.members),
      ...graphValueList(fields["member-port"]),
      ...graphValueList(fields["port-member"]),
    ];
    for (const member of members) {
      const portEntry = findPortEntryByRef(context, member);
      if (!portEntry) {
        diagnostics.push(createGraphDiagnostic({
          kind: DiagnosticKind.UNRESOLVED,
          relation: RelationKind.MEMBER_OF,
          nodeId: lagEntry.node.id,
          nodeKind: NodeKind.LAG,
          evidence: evidenceFromObject(lagEntry.object, "lag-member-port-unresolved"),
          reason: `member port not found: ${member}`,
        }));
        continue;
      }
      addCandidate(
        candidatesByPortId,
        portEntry.node.id,
        lagEntry.node.id,
        evidenceFromObject(lagEntry.object, "lag-member-port"),
        100
      );
    }
  }

  for (const portEntry of context.entriesByKind.get(NodeKind.PORT) || []) {
    const fields = objectFields(portEntry.object);
    const lagRefs = [
      ...graphValueList(fields.lag),
      ...graphValueList(fields["channel-group"]),
      ...graphValueList(fields.channelGroup),
    ];
    for (const lagRef of lagRefs) {
      const lagEntry = findLagEntryByRef(context, lagRef);
      if (!lagEntry) {
        diagnostics.push(createGraphDiagnostic({
          kind: DiagnosticKind.UNRESOLVED,
          relation: RelationKind.MEMBER_OF,
          nodeId: portEntry.node.id,
          nodeKind: NodeKind.PORT,
          evidence: evidenceFromObject(portEntry.object, "port-lag-reference-unresolved"),
          reason: `lag not found: ${lagRef}`,
        }));
        continue;
      }
      addCandidate(
        candidatesByPortId,
        portEntry.node.id,
        lagEntry.node.id,
        evidenceFromObject(portEntry.object, "port-lag-reference"),
        100
      );
    }
  }

  const edges = [];
  for (const [portId, byLag] of candidatesByPortId.entries()) {
    const candidates = [...byLag.values()];
    const portEntry = context.entryByNodeId.get(portId);
    if (candidates.length > 1) {
      diagnostics.push(createGraphDiagnostic({
        kind: DiagnosticKind.CONFLICT,
        relation: RelationKind.MEMBER_OF,
        nodeId: portId,
        nodeKind: NodeKind.PORT,
        candidateNodeIds: candidates.map((candidate) => candidate.targetId),
        evidence: candidates.flatMap((candidate) => candidate.evidence),
        reason: "physical port maps to multiple LAGs",
      }));
      continue;
    }

    const candidate = candidates[0];
    const lagEntry = context.entryByNodeId.get(candidate.targetId);
    edges.push(createGraphEdge({
      source: portId,
      target: candidate.targetId,
      sourceKind: portEntry.node.kind,
      targetKind: lagEntry.node.kind,
      relation: RelationKind.MEMBER_OF,
      confidence: candidate.confidence,
      evidence: edgeEvidence(candidate),
      reason: edgeEvidence(candidate).reason,
    }));
  }

  return { edges, diagnostics };
}

function buildPortToLagMap(memberOfEdges = []) {
  return memberOfEdges.reduce((result, edge) => {
    if (edge.relation === RelationKind.MEMBER_OF) result.set(edge.source, edge.target);
    return result;
  }, new Map());
}

function addLagInterfaceCandidate({ context, candidatesByInterfaceId, interfaceEntry, lagEntry, evidence, confidence }) {
  addCandidate(candidatesByInterfaceId, interfaceEntry.node.id, lagEntry.node.id, evidence, confidence);
}

export function resolveLagInterfaceRelations(context, { memberOfEdges = [] } = {}) {
  const portToLag = buildPortToLagMap(memberOfEdges);
  const candidatesByInterfaceId = new Map();
  const diagnostics = [];

  for (const interfaceEntry of context.entriesByKind.get(NodeKind.L3_INTERFACE) || []) {
    const fields = objectFields(interfaceEntry.object);
    const lagRefs = [
      ...graphValueList(fields.lag),
      ...graphValueList(fields.sap).map((value) => value.split(":")[0]),
    ];
    const portRefs = [
      ...graphValueList(fields.port),
      ...graphValueList(fields["member-port"]),
    ];

    for (const lagRef of lagRefs) {
      const lagEntry = findLagEntryByRef(context, lagRef);
      if (!lagEntry) {
        diagnostics.push(createGraphDiagnostic({
          kind: DiagnosticKind.UNRESOLVED,
          relation: RelationKind.HAS_INTERFACE,
          nodeId: interfaceEntry.node.id,
          nodeKind: NodeKind.L3_INTERFACE,
          evidence: evidenceFromObject(interfaceEntry.object, "interface-lag-reference-unresolved"),
          reason: `lag not found: ${lagRef}`,
        }));
        continue;
      }
      addLagInterfaceCandidate({
        context,
        candidatesByInterfaceId,
        interfaceEntry,
        lagEntry,
        evidence: evidenceFromObject(interfaceEntry.object, "interface-lag-reference"),
        confidence: 100,
      });
    }

    for (const portRef of portRefs) {
      const portEntry = findPortEntryByRef(context, portRef);
      if (!portEntry) {
        diagnostics.push(createGraphDiagnostic({
          kind: DiagnosticKind.UNRESOLVED,
          relation: RelationKind.HAS_INTERFACE,
          nodeId: interfaceEntry.node.id,
          nodeKind: NodeKind.L3_INTERFACE,
          evidence: evidenceFromObject(interfaceEntry.object, "interface-port-reference-unresolved"),
          reason: `port not found: ${portRef}`,
        }));
        continue;
      }
      const lagId = portToLag.get(portEntry.node.id);
      if (!lagId) {
        diagnostics.push(createGraphDiagnostic({
          kind: DiagnosticKind.UNRESOLVED,
          relation: RelationKind.HAS_INTERFACE,
          nodeId: interfaceEntry.node.id,
          nodeKind: NodeKind.L3_INTERFACE,
          candidateNodeIds: [portEntry.node.id],
          evidence: evidenceFromObject(interfaceEntry.object, "interface-port-without-lag"),
          reason: `port has no resolved LAG: ${portRef}`,
        }));
        continue;
      }
      addCandidate(
        candidatesByInterfaceId,
        interfaceEntry.node.id,
        lagId,
        evidenceFromObject(interfaceEntry.object, "interface-port-reference"),
        95
      );
    }
  }

  const edges = [];
  for (const [interfaceId, byLag] of candidatesByInterfaceId.entries()) {
    const candidates = [...byLag.values()];
    const interfaceEntry = context.entryByNodeId.get(interfaceId);
    if (candidates.length > 1) {
      diagnostics.push(createGraphDiagnostic({
        kind: DiagnosticKind.AMBIGUOUS,
        relation: RelationKind.HAS_INTERFACE,
        nodeId: interfaceId,
        nodeKind: NodeKind.L3_INTERFACE,
        candidateNodeIds: candidates.map((candidate) => candidate.targetId),
        evidence: candidates.flatMap((candidate) => candidate.evidence),
        reason: "interface maps to multiple LAG candidates",
      }));
      continue;
    }

    const candidate = candidates[0];
    const lagEntry = context.entryByNodeId.get(candidate.targetId);
    edges.push(createGraphEdge({
      source: candidate.targetId,
      target: interfaceId,
      sourceKind: lagEntry.node.kind,
      targetKind: interfaceEntry.node.kind,
      relation: RelationKind.HAS_INTERFACE,
      confidence: candidate.confidence,
      evidence: edgeEvidence(candidate),
      reason: edgeEvidence(candidate).reason,
    }));
  }

  return { edges, diagnostics };
}

function interfaceNameFromEntry(interfaceEntry) {
  const fields = objectFields(interfaceEntry.object);
  return canonicalizeInterfaceName(
    interfaceEntry.node.attributes?.name ||
    fields.interface ||
    fields["subscriber-interface"] ||
    fields["group-interface"] ||
    objectIdentity(interfaceEntry.object)
  );
}

function interfaceAddresses(interfaceEntry) {
  const fields = objectFields(interfaceEntry.object);
  return [
    ...graphValueList(interfaceEntry.node.attributes?.address),
    ...graphValueList(interfaceEntry.node.attributes?.ipAddress),
    ...graphValueList(fields.address),
    ...graphValueList(fields["ip-address"]),
    ...graphValueList(fields.ipAddress),
    ...graphValueList(fields.ipv4),
  ].filter(Boolean);
}

function explicitInterfacePeerIps(interfaceEntry) {
  const fields = objectFields(interfaceEntry.object);
  return [
    ...graphValueList(fields.peer),
    ...graphValueList(fields["peer-ip"]),
    ...graphValueList(fields.peerIp),
    ...graphValueList(fields.neighbor),
    ...graphValueList(fields["neighbor-ip"]),
    ...graphValueList(fields["remote-address"]),
    ...graphValueList(fields.remoteAddress),
    ...graphValueList(fields["default-host.next-hop"]),
  ]
    .map(normalizeIp)
    .filter(Boolean);
}

function ensurePeerNode(context, interfaceEntry, ip, reason, evidence = []) {
  const peerIp = normalizeIp(ip);
  if (!peerIp) return null;

  const node = createCanonicalNode({
    id: canonicalPeerNhId({
      deviceId: interfaceEntry.node.deviceId,
      vrf: interfaceEntry.node.vrf,
      ip: peerIp,
    }),
    kind: NodeKind.PEER_NH,
    label: peerIp,
    deviceId: interfaceEntry.node.deviceId,
    vrf: interfaceEntry.node.vrf,
    attributes: {
      ip: peerIp,
      interfaceId: interfaceEntry.node.id,
      interfaceName: interfaceNameFromEntry(interfaceEntry),
    },
    sourceObjectIds: [interfaceEntry.object?.id || ""],
    evidence: evidence.length ? evidence : evidenceFromObject(interfaceEntry.object, reason),
  });
  return ensureContextNode(context, node, interfaceEntry.object);
}

function createPeerEdge(context, interfaceEntry, peerEntry, confidence, evidence, reason) {
  return createGraphEdge({
    source: interfaceEntry.node.id,
    target: peerEntry.node.id,
    sourceKind: interfaceEntry.node.kind,
    targetKind: peerEntry.node.kind,
    relation: RelationKind.HAS_PEER,
    confidence,
    evidence,
    reason,
  });
}

function dedupeEdges(edges = []) {
  const byId = new Map();
  for (const edge of edges) byId.set(edge.id, edge);
  return [...byId.values()];
}

function sameDeviceAndVrf(leftEntry, rightEntry) {
  return (
    leftEntry.node.deviceId === rightEntry.node.deviceId &&
    leftEntry.node.vrf === rightEntry.node.vrf
  );
}

function interfaceMatchesRef(interfaceEntry, ref = "") {
  const normalizedRef = canonicalizeInterfaceName(ref);
  return Boolean(normalizedRef && normalizedRef === interfaceNameFromEntry(interfaceEntry));
}

function addRelationCandidate(candidates, candidate) {
  if (!candidate?.peerEntry) return;
  const id = [
    candidate.peerEntry.node.id,
    candidate.interfaceEntry?.node?.id || candidate.routeEntry?.node?.id || "",
  ].join("::");
  const existing = candidates.get(id);
  if (!existing || candidate.confidence > existing.confidence) {
    candidates.set(id, {
      ...candidate,
      evidence: candidate.evidence.filter(Boolean),
    });
    return;
  }
  if (candidate.confidence === existing.confidence) {
    existing.evidence.push(...candidate.evidence.filter(Boolean));
  }
}

function highestCandidates(candidates) {
  const values = [...candidates.values()];
  if (!values.length) return [];
  const max = Math.max(...values.map((candidate) => candidate.confidence));
  return values.filter((candidate) => candidate.confidence === max);
}

function candidatesForIpAcrossInterfaces(context, {
  ownerEntry,
  ip,
  explicitInterfaceRef = "",
  exactConfidence = 95,
  connectedConfidence = 70,
  explicitInterfaceConfidence = 100,
  evidenceReason = "ip-relation",
  restrictToInterfaceIds = null,
}) {
  const peerIp = normalizeIp(ip);
  const candidates = new Map();
  const peerEdges = [];
  if (!peerIp) return { candidates, peerEdges };

  for (const interfaceEntry of context.entriesByKind.get(NodeKind.L3_INTERFACE) || []) {
    if (!sameDeviceAndVrf(ownerEntry, interfaceEntry)) continue;
    if (restrictToInterfaceIds && !restrictToInterfaceIds.has(interfaceEntry.node.id)) continue;

    const addresses = interfaceAddresses(interfaceEntry);
    const explicitPeers = explicitInterfacePeerIps(interfaceEntry);
    const computedPeers = addresses.flatMap(peerIpsFromInterfaceAddress);
    const interfaceEvidence = evidenceFromObject(interfaceEntry.object, evidenceReason);
    const ownerEvidence = evidenceFromObject(ownerEntry.object, evidenceReason);
    let confidence = 0;
    let reason = "";

    if (explicitInterfaceRef && interfaceMatchesRef(interfaceEntry, explicitInterfaceRef)) {
      confidence = explicitInterfaceConfidence;
      reason = `${evidenceReason}-outgoing-interface`;
    } else if ([...explicitPeers, ...computedPeers].includes(peerIp)) {
      confidence = exactConfidence;
      reason = `${evidenceReason}-peer-ip`;
    } else if (addresses.some((address) => connectedSubnetContainsIp(address, peerIp))) {
      confidence = connectedConfidence;
      reason = `${evidenceReason}-connected-subnet`;
    }

    if (!confidence) continue;

    const evidence = [ownerEvidence, interfaceEvidence];
    const peerEntry = ensurePeerNode(context, interfaceEntry, peerIp, reason, evidence);
    const peerEdge = createPeerEdge(context, interfaceEntry, peerEntry, confidence, evidence, reason);
    peerEdges.push(peerEdge);
    addRelationCandidate(candidates, {
      peerEntry,
      interfaceEntry,
      confidence,
      evidence,
      reason,
    });
  }

  return { candidates, peerEdges };
}

function routeNextHops(routeEntry) {
  const fields = objectFields(routeEntry.object);
  return [
    ...graphValueList(routeEntry.node.attributes?.nextHops),
    ...graphValueList(fields["next-hop"]),
    ...graphValueList(fields.nextHop),
    ...graphValueList(fields.gateway),
  ]
    .map(normalizeIp)
    .filter(Boolean);
}

function routeOutgoingInterface(routeEntry) {
  const fields = objectFields(routeEntry.object);
  return firstGraphValue(
    routeEntry.node.attributes?.outgoingInterface ||
    fields["outgoing-interface"] ||
    fields.outgoingInterface ||
    fields["next-hop-interface"] ||
    fields.interface ||
    fields["egress-interface"]
  );
}

export function resolveInterfacePeerRelations(context) {
  const edges = [];
  const diagnostics = [];

  for (const interfaceEntry of context.entriesByKind.get(NodeKind.L3_INTERFACE) || []) {
    const evidence = evidenceFromObject(interfaceEntry.object, "interface-peer");
    const peerIps = [
      ...explicitInterfacePeerIps(interfaceEntry),
      ...interfaceAddresses(interfaceEntry).flatMap(peerIpsFromInterfaceAddress),
    ];

    for (const peerIp of [...new Set(peerIps.map(normalizeIp).filter(Boolean))]) {
      const peerEntry = ensurePeerNode(context, interfaceEntry, peerIp, "interface-peer", evidence);
      edges.push(createPeerEdge(context, interfaceEntry, peerEntry, 95, evidence, "interface-peer"));
    }
  }

  return { edges: dedupeEdges(edges), diagnostics };
}

export function resolveStaticRouteRelations(context) {
  const edges = [];
  const diagnostics = [];
  const routeResults = [];

  for (const routeEntry of context.entriesByKind.get(NodeKind.STATIC_ROUTE) || []) {
    const nextHops = [...new Set(routeNextHops(routeEntry))];
    if (!nextHops.length) {
      diagnostics.push(createGraphDiagnostic({
        kind: DiagnosticKind.UNRESOLVED,
        relation: RelationKind.USED_BY_STATIC,
        nodeId: routeEntry.node.id,
        nodeKind: NodeKind.STATIC_ROUTE,
        evidence: evidenceFromObject(routeEntry.object, "static-route-missing-next-hop"),
        reason: "static route has no next-hop",
      }));
      continue;
    }

    for (const nextHop of nextHops) {
      const { candidates, peerEdges } = candidatesForIpAcrossInterfaces(context, {
        ownerEntry: routeEntry,
        ip: nextHop,
        explicitInterfaceRef: routeOutgoingInterface(routeEntry),
        exactConfidence: 95,
        connectedConfidence: 70,
        explicitInterfaceConfidence: 100,
        evidenceReason: "static-route-next-hop",
      });
      edges.push(...peerEdges);
      const top = highestCandidates(candidates);

      if (!top.length) {
        diagnostics.push(createGraphDiagnostic({
          kind: DiagnosticKind.UNRESOLVED,
          relation: RelationKind.USED_BY_STATIC,
          nodeId: routeEntry.node.id,
          nodeKind: NodeKind.STATIC_ROUTE,
          evidence: evidenceFromObject(routeEntry.object, "static-route-next-hop-unresolved"),
          reason: `no interface candidate for next-hop ${nextHop}`,
        }));
        continue;
      }

      if (top.length > 1) {
        diagnostics.push(createGraphDiagnostic({
          kind: DiagnosticKind.AMBIGUOUS,
          relation: RelationKind.USED_BY_STATIC,
          nodeId: routeEntry.node.id,
          nodeKind: NodeKind.STATIC_ROUTE,
          candidateNodeIds: top.map((candidate) => candidate.peerEntry.node.id),
          evidence: top.flatMap((candidate) => candidate.evidence),
          reason: `multiple top candidates for static next-hop ${nextHop}`,
        }));
        continue;
      }

      const candidate = top[0];
      const edge = createGraphEdge({
        source: candidate.peerEntry.node.id,
        target: routeEntry.node.id,
        sourceKind: candidate.peerEntry.node.kind,
        targetKind: routeEntry.node.kind,
        relation: RelationKind.USED_BY_STATIC,
        confidence: candidate.confidence,
        evidence: mergedEvidence(candidate, evidenceFromObject(routeEntry.object, "static-route-next-hop")),
        reason: candidate.reason,
      });
      edges.push(edge);
      routeResults.push({
        routeEntry,
        nextHop,
        peerEntry: candidate.peerEntry,
        prefix: routeEntry.node.attributes?.prefix || objectFields(routeEntry.object).route || "",
        confidence: candidate.confidence,
        evidence: edge.evidence,
      });
    }
  }

  return { edges: dedupeEdges(edges), diagnostics, routeResults };
}

function bgpNeighborIp(bgpEntry) {
  const fields = objectFields(bgpEntry.object);
  return normalizeIp(bgpEntry.node.attributes?.neighborIp || fields.neighbor || objectIdentity(bgpEntry.object));
}

function isTruthyField(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return Boolean(text && !["false", "disable", "disabled", "0", "none", "no"].includes(text));
}

function isBgpMultihopOrLoopback(bgpEntry) {
  const fields = objectFields(bgpEntry.object);
  return [
    bgpEntry.node.attributes?.multihop,
    bgpEntry.node.attributes?.updateSource,
    bgpEntry.node.attributes?.loopback,
    fields["ebgp-multihop"],
    fields.multihop,
    fields["multi-hop"],
    fields.ttl,
    fields["update-source"],
    fields["local-address"],
    fields.localAddress,
    fields.loopback,
    fields["loopback-neighbor"],
  ].some(isTruthyField);
}

function addStaticReachabilityCandidates(candidates, bgpEntry, neighborIp, staticRouteResults = []) {
  for (const routeResult of staticRouteResults) {
    if (!sameDeviceAndVrf(bgpEntry, routeResult.routeEntry)) continue;
    if (!prefixContainsIp(routeResult.prefix, neighborIp)) continue;
    addRelationCandidate(candidates, {
      peerEntry: routeResult.peerEntry,
      interfaceEntry: null,
      routeEntry: routeResult.routeEntry,
      confidence: Math.max(60, Math.min(85, routeResult.confidence)),
      evidence: [
        evidenceFromObject(bgpEntry.object, "bgp-static-reachability"),
        ...routeResult.evidence,
      ],
      reason: "bgp-static-reachability",
    });
  }
}

export function resolveBgpRelations(context, { staticRouteResults = [] } = {}) {
  const edges = [];
  const diagnostics = [];

  for (const bgpEntry of context.entriesByKind.get(NodeKind.BGP_NEIGHBOR) || []) {
    const neighborIp = bgpNeighborIp(bgpEntry);
    if (!neighborIp) {
      diagnostics.push(createGraphDiagnostic({
        kind: DiagnosticKind.UNRESOLVED,
        relation: RelationKind.USED_BY_BGP,
        nodeId: bgpEntry.node.id,
        nodeKind: NodeKind.BGP_NEIGHBOR,
        evidence: evidenceFromObject(bgpEntry.object, "bgp-missing-neighbor"),
        reason: "BGP object has no neighbor IP",
      }));
      continue;
    }

    const { candidates, peerEdges } = candidatesForIpAcrossInterfaces(context, {
      ownerEntry: bgpEntry,
      ip: neighborIp,
      exactConfidence: 95,
      connectedConfidence: 70,
      evidenceReason: "bgp-neighbor",
    });
    edges.push(...peerEdges);

    if (isBgpMultihopOrLoopback(bgpEntry) && !candidates.size) {
      addStaticReachabilityCandidates(candidates, bgpEntry, neighborIp, staticRouteResults);
    }

    const top = highestCandidates(candidates);
    if (!top.length) {
      diagnostics.push(createGraphDiagnostic({
        kind: DiagnosticKind.UNRESOLVED,
        relation: RelationKind.USED_BY_BGP,
        nodeId: bgpEntry.node.id,
        nodeKind: NodeKind.BGP_NEIGHBOR,
        evidence: evidenceFromObject(bgpEntry.object, "bgp-neighbor-unresolved"),
        reason: `no peer next-hop candidate for BGP neighbor ${neighborIp}`,
      }));
      continue;
    }

    if (top.length > 1) {
      diagnostics.push(createGraphDiagnostic({
        kind: DiagnosticKind.AMBIGUOUS,
        relation: RelationKind.USED_BY_BGP,
        nodeId: bgpEntry.node.id,
        nodeKind: NodeKind.BGP_NEIGHBOR,
        candidateNodeIds: top.map((candidate) => candidate.peerEntry.node.id),
        evidence: top.flatMap((candidate) => candidate.evidence),
        reason: `multiple top candidates for BGP neighbor ${neighborIp}`,
      }));
      continue;
    }

    const candidate = top[0];
    edges.push(createGraphEdge({
      source: candidate.peerEntry.node.id,
      target: bgpEntry.node.id,
      sourceKind: candidate.peerEntry.node.kind,
      targetKind: bgpEntry.node.kind,
      relation: RelationKind.USED_BY_BGP,
      confidence: candidate.confidence,
      evidence: mergedEvidence(candidate, evidenceFromObject(bgpEntry.object, "bgp-neighbor")),
      reason: candidate.reason,
    }));
  }

  return { edges: dedupeEdges(edges), diagnostics };
}

function pimInterfaceName(pimEntry) {
  const fields = objectFields(pimEntry.object);
  return canonicalizeInterfaceName(pimEntry.node.attributes?.interface || fields.interface || objectIdentity(pimEntry.object));
}

function pimNeighborIps(pimEntry) {
  const fields = objectFields(pimEntry.object);
  return [
    ...graphValueList(pimEntry.node.attributes?.neighborIp),
    ...graphValueList(fields.neighbor),
    ...graphValueList(fields["neighbor-ip"]),
    ...graphValueList(fields.pimNeighbor),
  ]
    .map(normalizeIp)
    .filter(Boolean);
}

function findPimInterfaceCandidates(context, pimEntry) {
  const interfaceName = pimInterfaceName(pimEntry);
  const candidates = [];
  if (!interfaceName) return candidates;
  for (const interfaceEntry of context.entriesByKind.get(NodeKind.L3_INTERFACE) || []) {
    if (!sameDeviceAndVrf(pimEntry, interfaceEntry)) continue;
    if (interfaceNameFromEntry(interfaceEntry) === interfaceName) candidates.push(interfaceEntry);
  }
  return candidates;
}

function ensurePimNeighborNode(context, pimEntry, neighborIp) {
  const peerIp = normalizeIp(neighborIp);
  const node = createCanonicalNode({
    id: canonicalPimNeighborId({
      deviceId: pimEntry.node.deviceId,
      vrf: pimEntry.node.vrf,
      interfaceName: pimInterfaceName(pimEntry),
      neighborIp: peerIp,
    }),
    kind: NodeKind.PIM_NEIGHBOR,
    label: peerIp,
    deviceId: pimEntry.node.deviceId,
    vrf: pimEntry.node.vrf,
    attributes: {
      interface: pimInterfaceName(pimEntry),
      neighborIp: peerIp,
    },
    sourceObjectIds: [pimEntry.object?.id || ""],
    evidence: evidenceFromObject(pimEntry.object, "pim-neighbor"),
  });
  return ensureContextNode(context, node, pimEntry.object);
}

export function resolvePimRelations(context) {
  const edges = [];
  const diagnostics = [];

  for (const pimEntry of context.entriesByKind.get(NodeKind.PIM) || []) {
    const interfaceCandidates = findPimInterfaceCandidates(context, pimEntry);
    const pimEvidence = evidenceFromObject(pimEntry.object, "pim-interface");
    const restrictedInterfaceIds = new Set(interfaceCandidates.map((entry) => entry.node.id));

    if (!interfaceCandidates.length) {
      diagnostics.push(createGraphDiagnostic({
        kind: DiagnosticKind.UNRESOLVED,
        relation: RelationKind.HAS_PIM,
        nodeId: pimEntry.node.id,
        nodeKind: NodeKind.PIM,
        evidence: pimEvidence,
        reason: `PIM interface not found: ${pimInterfaceName(pimEntry)}`,
      }));
    } else if (interfaceCandidates.length > 1) {
      diagnostics.push(createGraphDiagnostic({
        kind: DiagnosticKind.AMBIGUOUS,
        relation: RelationKind.HAS_PIM,
        nodeId: pimEntry.node.id,
        nodeKind: NodeKind.PIM,
        candidateNodeIds: interfaceCandidates.map((entry) => entry.node.id),
        evidence: pimEvidence,
        reason: `multiple PIM interface candidates: ${pimInterfaceName(pimEntry)}`,
      }));
    } else {
      const interfaceEntry = interfaceCandidates[0];
      edges.push(createGraphEdge({
        source: interfaceEntry.node.id,
        target: pimEntry.node.id,
        sourceKind: interfaceEntry.node.kind,
        targetKind: pimEntry.node.kind,
        relation: RelationKind.HAS_PIM,
        confidence: 100,
        evidence: pimEvidence,
        reason: "pim-interface-enable",
      }));
    }

    for (const neighborIp of [...new Set(pimNeighborIps(pimEntry))]) {
      const pimNeighborEntry = ensurePimNeighborNode(context, pimEntry, neighborIp);
      const { candidates, peerEdges } = candidatesForIpAcrossInterfaces(context, {
        ownerEntry: pimEntry,
        ip: neighborIp,
        exactConfidence: 95,
        connectedConfidence: 70,
        evidenceReason: "pim-neighbor",
        restrictToInterfaceIds: restrictedInterfaceIds.size ? restrictedInterfaceIds : null,
      });
      edges.push(...peerEdges);

      const top = highestCandidates(candidates);
      if (!top.length) {
        diagnostics.push(createGraphDiagnostic({
          kind: DiagnosticKind.UNRESOLVED,
          relation: RelationKind.USED_BY_PIM,
          nodeId: pimNeighborEntry.node.id,
          nodeKind: NodeKind.PIM_NEIGHBOR,
          evidence: evidenceFromObject(pimEntry.object, "pim-neighbor-unresolved"),
          reason: `no peer next-hop candidate for PIM neighbor ${neighborIp}`,
        }));
        continue;
      }

      if (top.length > 1) {
        diagnostics.push(createGraphDiagnostic({
          kind: DiagnosticKind.AMBIGUOUS,
          relation: RelationKind.USED_BY_PIM,
          nodeId: pimNeighborEntry.node.id,
          nodeKind: NodeKind.PIM_NEIGHBOR,
          candidateNodeIds: top.map((candidate) => candidate.peerEntry.node.id),
          evidence: top.flatMap((candidate) => candidate.evidence),
          reason: `multiple top candidates for PIM neighbor ${neighborIp}`,
        }));
        continue;
      }

      const candidate = top[0];
      edges.push(createGraphEdge({
        source: candidate.peerEntry.node.id,
        target: pimNeighborEntry.node.id,
        sourceKind: candidate.peerEntry.node.kind,
        targetKind: pimNeighborEntry.node.kind,
        relation: RelationKind.USED_BY_PIM,
        confidence: candidate.confidence,
        evidence: mergedEvidence(candidate, evidenceFromObject(pimEntry.object, "pim-neighbor")),
        reason: candidate.reason,
      }));
    }
  }

  return { edges: dedupeEdges(edges), diagnostics };
}
