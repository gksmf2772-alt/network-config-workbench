export const NodeKind = Object.freeze({
  PORT: "PORT",
  LAG: "LAG",
  L3_INTERFACE: "L3_INTERFACE",
  PEER_NH: "PEER_NH",
  STATIC_ROUTE: "STATIC_ROUTE",
  BGP_NEIGHBOR: "BGP_NEIGHBOR",
  PIM: "PIM",
  PIM_NEIGHBOR: "PIM_NEIGHBOR",
});

export const RelationKind = Object.freeze({
  MEMBER_OF: "MEMBER_OF",
  HAS_INTERFACE: "HAS_INTERFACE",
  HAS_PEER: "HAS_PEER",
  USED_BY_STATIC: "USED_BY_STATIC",
  USED_BY_BGP: "USED_BY_BGP",
  HAS_PIM: "HAS_PIM",
  USED_BY_PIM: "USED_BY_PIM",
});

export const DiagnosticKind = Object.freeze({
  AMBIGUOUS: "ambiguous",
  UNRESOLVED: "unresolved",
  CONFLICT: "conflict",
});

export const DIRECT_RELATION_ENDPOINTS = Object.freeze({
  [RelationKind.MEMBER_OF]: [NodeKind.PORT, NodeKind.LAG],
  [RelationKind.HAS_INTERFACE]: [NodeKind.LAG, NodeKind.L3_INTERFACE],
  [RelationKind.HAS_PEER]: [NodeKind.L3_INTERFACE, NodeKind.PEER_NH],
  [RelationKind.USED_BY_STATIC]: [NodeKind.PEER_NH, NodeKind.STATIC_ROUTE],
  [RelationKind.USED_BY_BGP]: [NodeKind.PEER_NH, NodeKind.BGP_NEIGHBOR],
  [RelationKind.HAS_PIM]: [NodeKind.L3_INTERFACE, NodeKind.PIM],
  [RelationKind.USED_BY_PIM]: [NodeKind.PEER_NH, NodeKind.PIM_NEIGHBOR],
});

export function isDirectRelationAllowed(relation, sourceKind, targetKind) {
  const endpoints = DIRECT_RELATION_ENDPOINTS[relation];
  return Boolean(endpoints && endpoints[0] === sourceKind && endpoints[1] === targetKind);
}

export function createCanonicalNode({
  id,
  kind,
  label,
  deviceId,
  vrf = "",
  attributes = {},
  sourceObjectIds = [],
  evidence = [],
}) {
  if (!id || !kind) {
    throw new Error("Canonical node requires id and kind");
  }
  return {
    id,
    kind,
    label: label || id,
    deviceId: deviceId || "",
    vrf,
    attributes,
    sourceObjectIds: [...new Set(sourceObjectIds.filter(Boolean))],
    evidence: Array.isArray(evidence) ? evidence.filter(Boolean) : [evidence].filter(Boolean),
  };
}

export function createGraphEdge({
  id,
  source,
  target,
  sourceKind,
  targetKind,
  relation,
  confidence,
  evidence,
  reason = "",
}) {
  if (!isDirectRelationAllowed(relation, sourceKind, targetKind)) {
    throw new Error(`Transitive or invalid relation is not allowed: ${sourceKind} ${relation} ${targetKind}`);
  }
  if (!Number.isFinite(Number(confidence))) {
    throw new Error("Graph edge requires numeric confidence");
  }
  const evidenceList = Array.isArray(evidence) ? evidence.filter(Boolean) : [evidence].filter(Boolean);
  if (!evidenceList.length || evidenceList.some((item) => !item.source)) {
    throw new Error("Graph edge requires evidence with source");
  }
  return {
    id: id || `${relation}:${source}->${target}`,
    source,
    target,
    relation,
    confidence: Number(confidence),
    evidence: evidenceList,
    reason,
  };
}

export function createGraphDiagnostic({
  kind,
  relation,
  nodeId = "",
  nodeKind = "",
  candidateNodeIds = [],
  evidence = [],
  reason = "",
}) {
  return {
    kind,
    relation,
    nodeId,
    nodeKind,
    candidateNodeIds: [...new Set(candidateNodeIds.filter(Boolean))],
    evidence: Array.isArray(evidence) ? evidence.filter(Boolean) : [evidence].filter(Boolean),
    reason,
  };
}
