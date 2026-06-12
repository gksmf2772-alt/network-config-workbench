function normalizeNodeType(type = "") {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "static-route") return "static";
  if (normalized === "qos-policy") return "qos";
  if (normalized === "route-policy") return "policy";
  if (normalized === "bgp-group") return "bgp";
  if (["subscriber-interface", "group-interface"].includes(normalized)) return "interface";
  if (normalized === "services") return "services";
  if (normalized === "row-band") return "row-band";
  if (normalized === "column-header") return "column-header";
  if (normalized === "more") return "more";
  return normalized || "object";
}

function normalizeStatus(status = "", side = "") {
  const normalized = String(status || "").toLowerCase();
  if (["added", "new-only", "missing-old"].includes(normalized)) return "added";
  if (["removed", "old-only", "missing", "missing-new"].includes(normalized)) return "removed";
  if (["changed", "different", "candidate", "structure-converted"].includes(normalized)) return "modified";
  if (normalized === "cluster") return "cluster";
  if (side === "new" && normalized === "added") return "added";
  if (side === "old" && normalized === "missing") return "removed";
  return "unchanged";
}

function edgeMode(edge = {}) {
  if (edge.graphMode) return edge.graphMode;
  return String(edge.type || "").startsWith("internal-") ? "internal" : "comparison";
}

function edgeTypeForMode(mode = "") {
  return mode === "comparison" ? "compare" : "internal";
}

const COLUMN_RANK = {
  port: 0,
  lag: 1,
  interface: 2,
  peer: 3,
  services: 4,
  sap: 8,
  service: 8,
  static: 4,
  bgp: 5,
  pim: 6,
  filter: 7,
  qos: 7,
  policy: 7,
  more: 8,
};

export function toReactFlowData(analyticsNodes = [], analyticsEdges = []) {
  const nodes = (analyticsNodes || []).map((node) => {
    const id = String(node.id);
    const nodeType = normalizeNodeType(node.objectType || node.type);
    const label = node.label || node.key || id;
    const matchScore = node.confidence ?? node.matchScore ?? null;
    return {
      id,
      type: "configNode",
      position: {
        x: Number.isFinite(Number(node.position?.x)) ? Number(node.position.x) : 0,
        y: Number.isFinite(Number(node.position?.y)) ? Number(node.position.y) : 0,
      },
      style: node.style || undefined,
      zIndex: Number.isFinite(Number(node.zIndex)) ? Number(node.zIndex) : undefined,
      draggable: node.isRowBand || node.isColumnHeader ? false : undefined,
      selectable: node.isColumnHeader ? false : undefined,
      data: {
        nodeId: id,
        canonicalId: node.canonicalId || id,
        canonicalKind: node.canonicalKind || "",
        label,
        fullLabel: node.fullLabel || label,
        nodeType,
        columnRank: COLUMN_RANK[nodeType] ?? 99,
        columnKind: node.columnKind || "",
        rawNodeType: node.objectType || node.type || "object",
        status: normalizeStatus(node.status, node.side),
        rawStatus: node.status || "",
        side: node.side || "",
        config: node.config ?? node.fields ?? {},
        objectKey: node.key || "",
        viewLayout: node.viewLayout || "",
        viewMode: node.viewMode || "",
        nodeWidth: Number.isFinite(Number(node.width)) ? Number(node.width) : null,
        nodeHeight: Number.isFinite(Number(node.height)) ? Number(node.height) : null,
        chainId: node.chainId || "",
        chainDetail: node.chainDetail || null,
        isRowBand: Boolean(node.isRowBand),
        isColumnHeader: Boolean(node.isColumnHeader),
        problem: Boolean(node.problem),
        serviceAggregate: Boolean(node.serviceAggregate),
        serviceCounts: node.serviceCounts || null,
        staticAggregate: Boolean(node.staticAggregate),
        aggregate: node.aggregate || null,
        aggregateParentId: node.aggregateParentId || "",
        collapsedByDefault: Boolean(node.collapsedByDefault),
        matchScore,
        cluster: Boolean(node.cluster),
        hiddenCount: node.hiddenCount || 0,
        searchText: [
          node.objectType,
          node.type,
          node.label,
          node.key,
          node.status,
          node.side,
          node.hiddenSearch,
        ].join(" ").toLowerCase(),
        original: node,
      },
    };
  });

  const edges = (analyticsEdges || []).map((edge) => {
    const mode = edgeMode(edge);
    return {
      id: String(edge.id),
      source: String(edge.source),
      target: String(edge.target),
      type: "configEdge",
      animated: false,
      hidden: true,
      data: {
        edgeType: edgeTypeForMode(mode),
        graphMode: mode,
        label: edge.label || "",
        relation: edge.relation || "",
        canonicalSourceId: edge.canonicalSourceId || edge.original?.source || "",
        canonicalTargetId: edge.canonicalTargetId || edge.original?.target || "",
        chainId: edge.chainId || "",
        chainDetail: edge.chainDetail || null,
        aggregateId: edge.aggregateId || "",
        collapsedByDefault: Boolean(edge.collapsedByDefault),
        confidence: edge.confidence ?? null,
        changed: Boolean(edge.changed),
        original: edge,
      },
    };
  });

  return { nodes, edges };
}

export function validateReactFlowData(nodes = [], edges = []) {
  const nodeIds = new Set();
  const duplicateNodeIds = [];
  for (const node of nodes || []) {
    if (nodeIds.has(node.id)) duplicateNodeIds.push(node.id);
    nodeIds.add(node.id);
  }

  const edgeIds = new Set();
  const duplicateEdgeIds = [];
  const missingEndpoints = [];
  for (const edge of edges || []) {
    if (edgeIds.has(edge.id)) duplicateEdgeIds.push(edge.id);
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      missingEndpoints.push({
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        missingSource: !nodeIds.has(edge.source),
        missingTarget: !nodeIds.has(edge.target),
      });
    }
  }

  return {
    valid: duplicateNodeIds.length === 0 && duplicateEdgeIds.length === 0 && missingEndpoints.length === 0,
    duplicateNodeIds,
    duplicateEdgeIds,
    missingEndpoints,
  };
}
