import { NodeKind, RelationKind } from "./types.js";
import {
  canonicalizeLagNumber,
  canonicalizePortName,
  graphValueList,
} from "./canonicalInterface.js";
import {
  normalizeIp,
  parseIPv4Cidr,
  prefixContainsIp,
} from "./ipUtils.js";

export const ViewMode = Object.freeze({
  SUMMARY: "summary",
  DETAIL: "detail",
  FULL: "full",
});

export const COLUMN_SERVICES = "SERVICES";

export const COLUMN_LAYOUT = Object.freeze({
  [NodeKind.PORT]: { width: 90, gapAfter: 60 },
  [NodeKind.LAG]: { width: 90, gapAfter: 90 },
  [NodeKind.L3_INTERFACE]: { width: 150, gapAfter: 90 },
  [NodeKind.PEER_NH]: { width: 130, gapAfter: 90 },
  [NodeKind.STATIC_ROUTE]: { width: 160, gapAfter: 80 },
  [NodeKind.BGP_NEIGHBOR]: { width: 150, gapAfter: 80 },
  [NodeKind.PIM]: { width: 150, gapAfter: 0 },
  [COLUMN_SERVICES]: { width: 210, gapAfter: 0 },
});

export const ROW_HEIGHT = 56;
export const ROW_GAP = 10;

const HEADER_Y = 0;
const ROW_Y_START = 42;
const SIDE_X_GAP = 96;
const ROW_BAND_PADDING_X = 12;
const ROW_BAND_PADDING_Y = 5;
const SERVICE_ITEM_GAP = 10;

const SUMMARY_COLUMNS = [
  NodeKind.PORT,
  NodeKind.LAG,
  NodeKind.L3_INTERFACE,
  NodeKind.PEER_NH,
  COLUMN_SERVICES,
];

const DETAIL_BASE_COLUMNS = [
  NodeKind.PORT,
  NodeKind.LAG,
  NodeKind.L3_INTERFACE,
  NodeKind.PEER_NH,
];

const DETAIL_SERVICE_COLUMNS = [
  NodeKind.STATIC_ROUTE,
  NodeKind.BGP_NEIGHBOR,
  NodeKind.PIM,
];

const COLUMN_LABELS = Object.freeze({
  [NodeKind.PORT]: "PORT",
  [NodeKind.LAG]: "LAG",
  [NodeKind.L3_INTERFACE]: "INTERFACE",
  [NodeKind.PEER_NH]: "PEER/NH",
  [NodeKind.STATIC_ROUTE]: "STATIC",
  [NodeKind.BGP_NEIGHBOR]: "BGP",
  [NodeKind.PIM]: "PIM",
  [COLUMN_SERVICES]: "SERVICES",
});

export const VIEW_COLUMN_X = Object.freeze(computeColumnLayout([
  ...DETAIL_BASE_COLUMNS,
  ...DETAIL_SERVICE_COLUMNS,
]).xByColumn);

const NODE_TYPE_BY_KIND = Object.freeze({
  [NodeKind.PORT]: "port",
  [NodeKind.LAG]: "lag",
  [NodeKind.L3_INTERFACE]: "interface",
  [NodeKind.PEER_NH]: "peer",
  [NodeKind.STATIC_ROUTE]: "static",
  [NodeKind.BGP_NEIGHBOR]: "bgp",
  [NodeKind.PIM]: "pim",
  [NodeKind.PIM_NEIGHBOR]: "pim",
});

const EDGE_TYPE_BY_RELATION = Object.freeze({
  [RelationKind.MEMBER_OF]: "canonical-port-lag",
  [RelationKind.HAS_INTERFACE]: "canonical-lag-interface",
  [RelationKind.HAS_PEER]: "canonical-interface-peer",
  [RelationKind.USED_BY_STATIC]: "canonical-peer-static",
  [RelationKind.USED_BY_BGP]: "canonical-peer-bgp",
  [RelationKind.HAS_PIM]: "canonical-interface-pim",
  [RelationKind.USED_BY_PIM]: "canonical-peer-pim",
});

const DIRECT_PORT_INTERFACE_RELATION = "DIRECT_PORT_INTERFACE";

function viewColumnKind(kind) {
  return kind === NodeKind.PIM_NEIGHBOR ? NodeKind.PIM : kind;
}

function viewObjectType(kind) {
  return NODE_TYPE_BY_KIND[kind] || "object";
}

function edgeTypeForRelation(relation, fallback = "") {
  if (fallback) return fallback;
  return EDGE_TYPE_BY_RELATION[relation] || `canonical-${String(relation || "edge").toLowerCase()}`;
}

export function normalizeViewMode(mode = ViewMode.SUMMARY) {
  const normalized = String(mode || "").toLowerCase();
  return Object.values(ViewMode).includes(normalized) ? normalized : ViewMode.SUMMARY;
}

export function computeColumnLayout(columns = []) {
  const xByColumn = {};
  const specs = [];
  let cursor = 0;

  for (const column of columns) {
    const config = COLUMN_LAYOUT[column] || { width: 130, gapAfter: 70 };
    xByColumn[column] = cursor;
    specs.push({
      kind: column,
      label: COLUMN_LABELS[column] || String(column),
      x: cursor,
      width: config.width,
      gapAfter: config.gapAfter,
    });
    cursor += config.width + config.gapAfter;
  }

  const last = specs[specs.length - 1];
  return {
    columns: specs,
    xByColumn,
    width: last ? last.x + last.width : 0,
  };
}

function shortText(value = "", limit = 22) {
  const text = String(value || "");
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(1, limit - 3))}...`;
}

function nodeLabel(node = {}) {
  if (!node) return "";
  if (node.kind === NodeKind.PEER_NH) return node.attributes?.ip || node.label || node.id;
  if (node.kind === NodeKind.STATIC_ROUTE) return node.attributes?.prefix || node.label || node.id;
  if (node.kind === NodeKind.BGP_NEIGHBOR) return node.attributes?.neighborIp || node.label || node.id;
  if (node.kind === NodeKind.PIM_NEIGHBOR) return node.attributes?.neighborIp || node.label || node.id;
  if (node.kind === NodeKind.PIM) return node.attributes?.interface || node.label || node.id;
  return node.label || node.attributes?.name || node.attributes?.lag || node.id;
}

function shortNodeLabel(node = {}) {
  if (!node) return "";
  if (node.kind === NodeKind.PORT) return shortText(node.attributes?.name || nodeLabel(node), 14);
  if (node.kind === NodeKind.LAG) return shortText(node.attributes?.lag || nodeLabel(node), 12);
  if (node.kind === NodeKind.L3_INTERFACE) return shortText(node.attributes?.name || nodeLabel(node), 24);
  if (node.kind === NodeKind.PEER_NH) return shortText(node.attributes?.ip || nodeLabel(node), 18);
  if (node.kind === NodeKind.STATIC_ROUTE) return shortText(node.attributes?.prefix || nodeLabel(node), 24);
  if (node.kind === NodeKind.BGP_NEIGHBOR) return shortText(node.attributes?.neighborIp || nodeLabel(node), 20);
  if (node.kind === NodeKind.PIM_NEIGHBOR) return shortText(node.attributes?.neighborIp || nodeLabel(node), 20);
  if (node.kind === NodeKind.PIM) return shortText(node.attributes?.interface || nodeLabel(node), 24);
  return shortText(nodeLabel(node), 22);
}

function sourceObjectKey(node = {}) {
  return node.sourceObjectIds?.[0] || node.attributes?.objectKey || "";
}

function cloneId(side, canonicalId, rowIndex, suffix = "") {
  return [
    "view",
    side || "config",
    rowIndex,
    canonicalId,
    suffix,
  ].filter((part) => part !== "").map((part) => encodeURIComponent(String(part))).join(":");
}

function chainIdForRow(side, row = {}, rowIndex = 0) {
  return [
    "chain",
    side || "config",
    rowIndex,
    row.portNode?.id || "no-port",
    row.lagNode?.id || "no-lag",
    row.interfaceNode?.id || "no-interface",
    row.peerNode?.id || "no-peer",
  ].map((part) => encodeURIComponent(String(part))).join(":");
}

function sideLabel(side = "") {
  if (side === "old") return "기존 설정";
  if (side === "new") return "신규 설정";
  return "설정";
}

function addSideHeaderNode(viewNodes, viewNodeIds, { side, layout, viewMode, xOffset }) {
  const id = `side-header:${viewMode}:${side}`;
  if (viewNodeIds.has(id)) return;
  viewNodeIds.add(id);
  viewNodes.push({
    id,
    canonicalId: id,
    canonicalKind: "SIDE_HEADER",
    objectType: "column-header",
    label: sideLabel(side),
    position: { x: xOffset, y: -32 },
    width: layout.width,
    height: 24,
    zIndex: -4,
    viewLayout: "trace-matrix",
    viewMode,
    isColumnHeader: true,
    columnKind: "SIDE",
    status: "unchanged",
  });
}

function addHeaderNodes(viewNodes, viewNodeIds, { side, columns, layout, viewMode, xOffset = 0 }) {
  for (const column of columns) {
    const id = `header:${viewMode}:${side}:${column}`;
    if (viewNodeIds.has(id)) continue;
    viewNodeIds.add(id);
    const spec = layout.columns.find((item) => item.kind === column);
    viewNodes.push({
      id,
      canonicalId: id,
      canonicalKind: "COLUMN_HEADER",
      objectType: "column-header",
      label: spec?.label || COLUMN_LABELS[column] || String(column),
      position: { x: xOffset + (spec?.x || 0), y: HEADER_Y },
      width: spec?.width || 130,
      height: 28,
      zIndex: -5,
      viewLayout: "trace-matrix",
      viewMode,
      isColumnHeader: true,
      columnKind: column,
      status: "unchanged",
    });
  }
}

function addRowBand(viewNodes, viewNodeIds, {
  chainId,
  chainDetail,
  y,
  rowHeight,
  layout,
  viewMode,
  xOffset = 0,
}) {
  const id = `band:${chainId}`;
  if (viewNodeIds.has(id)) return id;
  viewNodeIds.add(id);
  viewNodes.push({
    id,
    canonicalId: chainId,
    canonicalKind: "CHAIN_ROW",
    objectType: "row-band",
    label: "",
    position: {
      x: xOffset - ROW_BAND_PADDING_X,
      y: y - ROW_BAND_PADDING_Y,
    },
    width: layout.width + ROW_BAND_PADDING_X * 2,
    height: rowHeight + ROW_BAND_PADDING_Y * 2,
    zIndex: -10,
    viewLayout: "trace-matrix",
    viewMode,
    chainId,
    chainDetail,
    isRowBand: true,
    problem: chainDetail.problem,
    status: "unchanged",
  });
  return id;
}

function addNode(viewNodes, viewNodeIds, {
  side,
  canonicalNode,
  rowIndex,
  y,
  columnKind = null,
  columnsByKind,
  xOffset = 0,
  chainId,
  chainDetail,
  suffix = "",
  label = null,
  objectType = null,
  canonicalId = null,
  canonicalKind = null,
  serviceAggregate = false,
  serviceCounts = null,
  status = "unchanged",
}) {
  if (!canonicalNode && !canonicalId) return null;
  const resolvedColumn = columnKind || viewColumnKind(canonicalNode?.kind);
  const column = columnsByKind.get(resolvedColumn);
  if (!column) return null;
  const id = canonicalNode
    ? cloneId(side, canonicalNode.id, rowIndex, suffix)
    : cloneId(side, canonicalId, rowIndex, suffix);
  if (viewNodeIds.has(id)) return id;
  viewNodeIds.add(id);
  const fullLabel = canonicalNode ? nodeLabel(canonicalNode) : (label || canonicalId || id);
  viewNodes.push({
    id,
    canonicalId: canonicalNode?.id || canonicalId || id,
    canonicalKind: canonicalNode?.kind || canonicalKind || resolvedColumn,
    side,
    objectType: objectType || viewObjectType(canonicalNode?.kind),
    label: label || (canonicalNode ? shortNodeLabel(canonicalNode) : fullLabel),
    fullLabel,
    key: canonicalNode ? sourceObjectKey(canonicalNode) : "",
    status,
    confidence: chainDetail?.confidence?.min ?? null,
    position: { x: xOffset + column.x, y },
    width: column.width,
    height: ROW_HEIGHT,
    zIndex: 0,
    viewLayout: "trace-matrix",
    viewMode: chainDetail?.viewMode || "",
    chainId,
    chainDetail,
    columnKind: resolvedColumn,
    serviceAggregate,
    serviceCounts,
    problem: chainDetail?.problem || false,
    original: canonicalNode || null,
  });
  return id;
}

function addEdge(viewEdges, viewEdgeIds, {
  id,
  source,
  target,
  relation,
  confidence = null,
  evidence = [],
  side,
  original = null,
  chainId = "",
  chainDetail = null,
  canonicalSourceId = "",
  canonicalTargetId = "",
  type = "",
}) {
  if (!source || !target || source === target) return;
  const edgeId = id || `view-edge:${source}->${target}:${relation || type}`;
  if (viewEdgeIds.has(edgeId)) return;
  viewEdgeIds.add(edgeId);
  viewEdges.push({
    id: edgeId,
    source,
    target,
    type: edgeTypeForRelation(relation, type),
    graphMode: "internal",
    side,
    relation,
    label: type || relation,
    confidence: confidence ?? original?.confidence ?? null,
    evidence: evidence.length ? evidence : (original?.evidence || []),
    status: "linked",
    changed: false,
    canonicalSourceId: canonicalSourceId || original?.source || "",
    canonicalTargetId: canonicalTargetId || original?.target || "",
    chainId,
    chainDetail,
    original,
  });
}

function buildIndexes(graph = {}) {
  const nodesById = new Map((graph.nodes || []).map((node) => [node.id, node]));
  const portByName = new Map();
  const lagByName = new Map();
  const bgpByNeighborIp = new Map();
  const outgoingByRelation = new Map();
  const incomingByRelation = new Map();

  for (const node of graph.nodes || []) {
    if (node.kind === NodeKind.PORT) {
      const key = node.attributes?.normalizedName || canonicalizePortName(node.attributes?.name || node.label || node.id);
      if (key && !portByName.has(key)) portByName.set(key, node);
    }
    if (node.kind === NodeKind.LAG) {
      const key = node.attributes?.normalizedLag || canonicalizeLagNumber(node.attributes?.lag || node.label || node.id);
      if (key && !lagByName.has(key)) lagByName.set(key, node);
    }
    if (node.kind === NodeKind.BGP_NEIGHBOR) {
      const key = normalizeIp(node.attributes?.neighborIp || node.label);
      if (key) {
        if (!bgpByNeighborIp.has(key)) bgpByNeighborIp.set(key, []);
        bgpByNeighborIp.get(key).push(node);
      }
    }
  }

  for (const edge of graph.edges || []) {
    const outKey = `${edge.relation}:${edge.source}`;
    const inKey = `${edge.relation}:${edge.target}`;
    if (!outgoingByRelation.has(outKey)) outgoingByRelation.set(outKey, []);
    if (!incomingByRelation.has(inKey)) incomingByRelation.set(inKey, []);
    outgoingByRelation.get(outKey).push(edge);
    incomingByRelation.get(inKey).push(edge);
  }

  return {
    nodesById,
    portByName,
    lagByName,
    bgpByNeighborIp,
    outgoing(relation, sourceId) {
      return outgoingByRelation.get(`${relation}:${sourceId}`) || [];
    },
    incoming(relation, targetId) {
      return incomingByRelation.get(`${relation}:${targetId}`) || [];
    },
  };
}

function nodesForEdges(edges = [], nodesById = new Map(), key = "target") {
  return edges.map((edge) => nodesById.get(edge[key])).filter(Boolean).sort(compareCanonicalNodes);
}

function compareCanonicalNodes(left = {}, right = {}) {
  const leftKind = String(left.kind || "");
  const rightKind = String(right.kind || "");
  if (leftKind !== rightKind) return leftKind.localeCompare(rightKind);
  return String(left.label || left.id).localeCompare(String(right.label || right.id), "en", { numeric: true });
}

function firstOrNull(list = []) {
  return list.length ? list[0] : null;
}

function directPortNodesForInterface(indexes, interfaceNode) {
  const refs = graphValueList(interfaceNode.attributes?.portRefs);
  const nodes = refs
    .map((ref) => indexes.portByName.get(canonicalizePortName(ref)))
    .filter(Boolean);
  return [...new Map(nodes.map((node) => [node.id, node])).values()].sort(compareCanonicalNodes);
}

function directLagNodesForInterface(indexes, interfaceNode) {
  const refs = graphValueList(interfaceNode.attributes?.lagRefs);
  const nodes = refs
    .map((ref) => indexes.lagByName.get(canonicalizeLagNumber(ref)))
    .filter(Boolean);
  return [...new Map(nodes.map((node) => [node.id, node])).values()].sort(compareCanonicalNodes);
}

function buildInterfaceRows({ side, interfaceNode, indexes }) {
  const hasInterfaceEdges = indexes.incoming(RelationKind.HAS_INTERFACE, interfaceNode.id);
  const lagNodes = nodesForEdges(hasInterfaceEdges, indexes.nodesById, "source");
  const fallbackLagNodes = lagNodes.length ? [] : directLagNodesForInterface(indexes, interfaceNode);
  const upstream = [];

  const upstreamLagNodes = lagNodes.length ? lagNodes : fallbackLagNodes;

  if (!upstreamLagNodes.length) {
    const directPortNodes = directPortNodesForInterface(indexes, interfaceNode);
    if (directPortNodes.length) {
      for (const portNode of directPortNodes) upstream.push({ portNode, lagNode: null });
    } else {
      upstream.push({ portNode: null, lagNode: null });
    }
  }

  for (const lagNode of upstreamLagNodes) {
    const memberEdges = indexes.incoming(RelationKind.MEMBER_OF, lagNode.id);
    const portNodes = nodesForEdges(memberEdges, indexes.nodesById, "source");
    if (!portNodes.length) {
      upstream.push({ portNode: null, lagNode });
    } else {
      for (const portNode of portNodes) upstream.push({ portNode, lagNode });
    }
  }

  const peerEdges = indexes.outgoing(RelationKind.HAS_PEER, interfaceNode.id);
  const peerNodes = nodesForEdges(peerEdges, indexes.nodesById, "target");
  const pimEdges = indexes.outgoing(RelationKind.HAS_PIM, interfaceNode.id);
  const pimNodes = nodesForEdges(pimEdges, indexes.nodesById, "target");
  const peers = peerNodes.length ? peerNodes : [null];

  return upstream.flatMap((upstreamEntry) =>
    peers.map((peerNode) => ({
      side,
      portNode: upstreamEntry.portNode,
      lagNode: upstreamEntry.lagNode,
      interfaceNode,
      peerNode,
      pimNode: firstOrNull(pimNodes),
    }))
  );
}

function buildRowsForGraph({ side, graph }) {
  const indexes = buildIndexes(graph);
  const rows = [];
  const usedNodeIds = new Set();

  const interfaces = (graph.nodes || [])
    .filter((node) => node.kind === NodeKind.L3_INTERFACE)
    .sort(compareCanonicalNodes);

  for (const interfaceNode of interfaces) {
    const interfaceRows = buildInterfaceRows({ side, interfaceNode, indexes });
    for (const row of interfaceRows) {
      [row.portNode, row.lagNode, row.interfaceNode, row.peerNode, row.pimNode]
        .filter(Boolean)
        .forEach((node) => usedNodeIds.add(node.id));
      rows.push(enrichRow({ row, indexes }));
    }
  }

  for (const node of (graph.nodes || []).sort(compareCanonicalNodes)) {
    if (usedNodeIds.has(node.id)) continue;
    if ([NodeKind.STATIC_ROUTE, NodeKind.BGP_NEIGHBOR, NodeKind.PIM_NEIGHBOR].includes(node.kind)) continue;
    const row = { side };
    if (node.kind === NodeKind.PORT) row.portNode = node;
    else if (node.kind === NodeKind.LAG) row.lagNode = node;
    else if (node.kind === NodeKind.L3_INTERFACE) row.interfaceNode = node;
    else if (node.kind === NodeKind.PEER_NH) row.peerNode = node;
    else if (node.kind === NodeKind.PIM) row.pimNode = node;
    else continue;
    rows.push(enrichRow({ row, indexes }));
    usedNodeIds.add(node.id);
  }

  return { rows, indexes };
}

function staticRouteNodesForPeer(indexes, peerNode) {
  if (!peerNode) return [];
  return nodesForEdges(indexes.outgoing(RelationKind.USED_BY_STATIC, peerNode.id), indexes.nodesById, "target");
}

function bgpNodesForPeer(indexes, peerNode) {
  if (!peerNode) return [];
  return nodesForEdges(indexes.outgoing(RelationKind.USED_BY_BGP, peerNode.id), indexes.nodesById, "target");
}

function vrfEquivalentForView(left = "", right = "") {
  const leftVrf = String(left || "default").toLowerCase();
  const rightVrf = String(right || "default").toLowerCase();
  if (leftVrf === rightVrf) return true;
  return new Set([leftVrf, rightVrf]).size === 2 &&
    ["base", "default"].includes(leftVrf) &&
    ["base", "default"].includes(rightVrf);
}

function graphNodeScopeMatches(left = null, right = null) {
  if (!left || !right) return false;
  return left.deviceId === right.deviceId && vrfEquivalentForView(left.vrf, right.vrf);
}

function hostStaticPrefix(staticNode = null) {
  const prefix = String(staticNode?.attributes?.prefix || staticNode?.label || "").trim();
  const cidr = parseIPv4Cidr(prefix);
  return cidr?.prefixLength === 32 ? prefix : "";
}

function uniqueSortedNodes(nodes = []) {
  return [...new Map((nodes || []).filter(Boolean).map((node) => [node.id, node])).values()]
    .sort(compareCanonicalNodes);
}

function bgpNodesForStaticRoutes(indexes, staticNodes = [], scopeNode = null) {
  const result = [];
  for (const staticNode of staticNodes || []) {
    const prefix = hostStaticPrefix(staticNode);
    if (!prefix) continue;
    for (const [neighborIp, bgpNodes] of indexes.bgpByNeighborIp.entries()) {
      if (!prefixContainsIp(prefix, neighborIp)) continue;
      for (const bgpNode of bgpNodes) {
        if (scopeNode && !graphNodeScopeMatches(scopeNode, bgpNode)) continue;
        result.push(bgpNode);
      }
    }
  }
  return uniqueSortedNodes(result);
}

function pimNeighborNodesForPeer(indexes, peerNode) {
  if (!peerNode) return [];
  return nodesForEdges(indexes.outgoing(RelationKind.USED_BY_PIM, peerNode.id), indexes.nodesById, "target");
}

function findEdge(indexes, relation, sourceNode, targetNode) {
  if (!sourceNode || !targetNode) return null;
  return indexes.outgoing(relation, sourceNode.id).find((edge) => edge.target === targetNode.id) || null;
}

function enrichRow({ row, indexes }) {
  const staticNodes = staticRouteNodesForPeer(indexes, row.peerNode);
  const bgpNodes = uniqueSortedNodes([
    ...bgpNodesForPeer(indexes, row.peerNode),
    ...bgpNodesForStaticRoutes(indexes, staticNodes, row.peerNode || row.interfaceNode),
  ]);
  const pimNeighborNodes = pimNeighborNodesForPeer(indexes, row.peerNode);
  const pimNodes = [
    row.pimNode,
    ...pimNeighborNodes,
  ].filter(Boolean);
  return {
    ...row,
    staticNodes,
    bgpNodes,
    pimNeighborNodes,
    pimNodes,
    serviceCounts: {
      static: staticNodes.length,
      bgp: bgpNodes.length,
      pim: pimNodes.length,
    },
  };
}

function rowServiceCount(row = {}) {
  return Math.max(
    row.staticNodes?.length || 0,
    row.bgpNodes?.length || 0,
    row.pimNodes?.length || 0,
    1
  );
}

function rowHeightForMode(row = {}, viewMode = ViewMode.SUMMARY) {
  if (viewMode === ViewMode.SUMMARY) return ROW_HEIGHT;
  return Math.max(ROW_HEIGHT, rowServiceCount(row) * ROW_HEIGHT + (rowServiceCount(row) - 1) * SERVICE_ITEM_GAP);
}

function columnsForRows(rows = [], viewMode = ViewMode.SUMMARY) {
  if (viewMode === ViewMode.SUMMARY) return SUMMARY_COLUMNS;

  const columns = [...DETAIL_BASE_COLUMNS];
  if (rows.some((row) => row.staticNodes?.length)) columns.push(NodeKind.STATIC_ROUTE);
  if (rows.some((row) => row.bgpNodes?.length)) columns.push(NodeKind.BGP_NEIGHBOR);
  if (rows.some((row) => row.pimNodes?.length)) columns.push(NodeKind.PIM);
  return columns;
}

function chainEdgesForRow(row = {}, indexes) {
  const edges = [
    findEdge(indexes, RelationKind.MEMBER_OF, row.portNode, row.lagNode),
    findEdge(indexes, RelationKind.HAS_INTERFACE, row.lagNode, row.interfaceNode),
    findEdge(indexes, RelationKind.HAS_PEER, row.interfaceNode, row.peerNode),
    ...((row.staticNodes || []).map((node) => findEdge(indexes, RelationKind.USED_BY_STATIC, row.peerNode, node))),
    ...((row.bgpNodes || []).map((node) => findEdge(indexes, RelationKind.USED_BY_BGP, row.peerNode, node))),
  ].filter(Boolean);

  if (row.pimNode) {
    edges.push(findEdge(indexes, RelationKind.HAS_PIM, row.interfaceNode, row.pimNode));
  }
  for (const node of row.pimNeighborNodes || []) {
    edges.push(findEdge(indexes, RelationKind.USED_BY_PIM, row.peerNode, node));
  }
  return edges.filter(Boolean);
}

function confidenceSummary(edges = []) {
  const values = edges.map((edge) => Number(edge.confidence)).filter(Number.isFinite);
  if (!values.length) return { min: null, average: null, count: 0 };
  const sum = values.reduce((acc, value) => acc + value, 0);
  return {
    min: Math.min(...values),
    average: Math.round(sum / values.length),
    count: values.length,
  };
}

function summarizeNode(node = null) {
  if (!node) return null;
  return {
    id: node.id,
    kind: node.kind,
    label: nodeLabel(node),
    attributes: node.attributes || {},
    evidence: node.evidence || [],
  };
}

function buildChainDetail({ row, indexes, chainId, rowIndex, viewMode }) {
  const edges = chainEdgesForRow(row, indexes);
  const evidence = edges.flatMap((edge) => edge.evidence || []).slice(0, 16);
  const confidence = confidenceSummary(edges);
  return {
    chainId,
    rowIndex,
    side: row.side || "",
    viewMode,
    port: summarizeNode(row.portNode),
    lag: summarizeNode(row.lagNode),
    interface: summarizeNode(row.interfaceNode),
    peer: summarizeNode(row.peerNode),
    staticRoutes: (row.staticNodes || []).map(summarizeNode),
    bgpNeighbors: (row.bgpNodes || []).map(summarizeNode),
    pim: (row.pimNodes || []).map(summarizeNode),
    serviceCounts: row.serviceCounts || { static: 0, bgp: 0, pim: 0 },
    confidence,
    evidence,
    problem: confidence.min != null && confidence.min < 100,
  };
}

function serviceSummaryLabel(row = {}) {
  const counts = row.serviceCounts || { static: 0, bgp: 0, pim: 0 };
  return `Static ${counts.static} | BGP ${counts.bgp} | PIM ${counts.pim}`;
}

function addPathEdges({ viewEdges, viewEdgeIds, nodeIds, row, indexes, side, chainId, chainDetail }) {
  addEdge(viewEdges, viewEdgeIds, {
    source: nodeIds.port,
    target: nodeIds.lag,
    relation: RelationKind.MEMBER_OF,
    side,
    chainId,
    chainDetail,
    original: findEdge(indexes, RelationKind.MEMBER_OF, row.portNode, row.lagNode),
  });
  addEdge(viewEdges, viewEdgeIds, {
    source: nodeIds.lag,
    target: nodeIds.interface,
    relation: RelationKind.HAS_INTERFACE,
    side,
    chainId,
    chainDetail,
    original: findEdge(indexes, RelationKind.HAS_INTERFACE, row.lagNode, row.interfaceNode),
  });
  if (!nodeIds.lag && nodeIds.port && nodeIds.interface) {
    addEdge(viewEdges, viewEdgeIds, {
      source: nodeIds.port,
      target: nodeIds.interface,
      relation: DIRECT_PORT_INTERFACE_RELATION,
      side,
      chainId,
      chainDetail,
      type: "canonical-port-interface",
      canonicalSourceId: row.portNode?.id || "",
      canonicalTargetId: row.interfaceNode?.id || "",
    });
  }
  addEdge(viewEdges, viewEdgeIds, {
    source: nodeIds.interface,
    target: nodeIds.peer,
    relation: RelationKind.HAS_PEER,
    side,
    chainId,
    chainDetail,
    original: findEdge(indexes, RelationKind.HAS_PEER, row.interfaceNode, row.peerNode),
  });
}

function addSummaryRow({
  viewNodes,
  viewEdges,
  viewNodeIds,
  viewEdgeIds,
  side,
  row,
  rowIndex,
  y,
  rowHeight,
  indexes,
  columnsByKind,
  layout,
  xOffset = 0,
}) {
  const chainId = chainIdForRow(side, row, rowIndex);
  const chainDetail = buildChainDetail({ row, indexes, chainId, rowIndex, viewMode: ViewMode.SUMMARY });
  addRowBand(viewNodes, viewNodeIds, { chainId, chainDetail, y, rowHeight, layout, viewMode: ViewMode.SUMMARY, xOffset });

  const nodeIds = {
    port: addNode(viewNodes, viewNodeIds, { side, canonicalNode: row.portNode, rowIndex, y, columnsByKind, xOffset, chainId, chainDetail }),
    lag: addNode(viewNodes, viewNodeIds, { side, canonicalNode: row.lagNode, rowIndex, y, columnsByKind, xOffset, chainId, chainDetail }),
    interface: addNode(viewNodes, viewNodeIds, { side, canonicalNode: row.interfaceNode, rowIndex, y, columnsByKind, xOffset, chainId, chainDetail }),
    peer: addNode(viewNodes, viewNodeIds, { side, canonicalNode: row.peerNode, rowIndex, y, columnsByKind, xOffset, chainId, chainDetail }),
  };
  const servicesId = addNode(viewNodes, viewNodeIds, {
    side,
    rowIndex,
    y,
    columnKind: COLUMN_SERVICES,
    columnsByKind,
    xOffset,
    chainId,
    chainDetail,
    canonicalId: `services:${chainId}`,
    canonicalKind: COLUMN_SERVICES,
    objectType: "services",
    label: serviceSummaryLabel(row),
    serviceAggregate: true,
    serviceCounts: row.serviceCounts,
    status: chainDetail.problem ? "modified" : "unchanged",
  });

  addPathEdges({ viewEdges, viewEdgeIds, nodeIds, row, indexes, side, chainId, chainDetail });
  addEdge(viewEdges, viewEdgeIds, {
    source: nodeIds.peer || nodeIds.interface,
    target: servicesId,
    relation: "SERVICES",
    side,
    chainId,
    chainDetail,
    type: "canonical-summary-services",
    canonicalSourceId: row.peerNode?.id || row.interfaceNode?.id || "",
    canonicalTargetId: `services:${chainId}`,
  });
}

function addServiceNodes({
  viewNodes,
  viewEdges,
  viewNodeIds,
  viewEdgeIds,
  side,
  row,
  rowIndex,
  y,
  indexes,
  columnsByKind,
  xOffset = 0,
  chainId,
  chainDetail,
  nodeIds,
}) {
  (row.staticNodes || []).forEach((staticNode, index) => {
    const nodeY = y + index * (ROW_HEIGHT + SERVICE_ITEM_GAP);
    const id = addNode(viewNodes, viewNodeIds, {
      side,
      canonicalNode: staticNode,
      rowIndex,
      y: nodeY,
      columnsByKind,
      xOffset,
      chainId,
      chainDetail,
      suffix: `static-${index}`,
    });
    const edge = findEdge(indexes, RelationKind.USED_BY_STATIC, row.peerNode, staticNode);
    addEdge(viewEdges, viewEdgeIds, {
      source: nodeIds.peer,
      target: id,
      relation: RelationKind.USED_BY_STATIC,
      side,
      chainId,
      chainDetail,
      original: edge,
    });
  });

  (row.bgpNodes || []).forEach((bgpNode, index) => {
    const nodeY = y + index * (ROW_HEIGHT + SERVICE_ITEM_GAP);
    const id = addNode(viewNodes, viewNodeIds, {
      side,
      canonicalNode: bgpNode,
      rowIndex,
      y: nodeY,
      columnsByKind,
      xOffset,
      chainId,
      chainDetail,
      suffix: `bgp-${index}`,
    });
    const edge = findEdge(indexes, RelationKind.USED_BY_BGP, row.peerNode, bgpNode);
    addEdge(viewEdges, viewEdgeIds, {
      source: nodeIds.peer,
      target: id,
      relation: RelationKind.USED_BY_BGP,
      side,
      chainId,
      chainDetail,
      original: edge,
    });
  });

  (row.pimNodes || []).forEach((pimNode, index) => {
    const nodeY = y + index * (ROW_HEIGHT + SERVICE_ITEM_GAP);
    const id = addNode(viewNodes, viewNodeIds, {
      side,
      canonicalNode: pimNode,
      rowIndex,
      y: nodeY,
      columnsByKind,
      xOffset,
      chainId,
      chainDetail,
      suffix: `pim-${index}`,
    });
    if (pimNode.kind === NodeKind.PIM_NEIGHBOR) {
      const edge = findEdge(indexes, RelationKind.USED_BY_PIM, row.peerNode, pimNode);
      addEdge(viewEdges, viewEdgeIds, {
        source: nodeIds.peer,
        target: id,
        relation: RelationKind.USED_BY_PIM,
        side,
        chainId,
        chainDetail,
        original: edge,
      });
    } else {
      const edge = findEdge(indexes, RelationKind.HAS_PIM, row.interfaceNode, pimNode);
      addEdge(viewEdges, viewEdgeIds, {
        source: nodeIds.interface,
        target: id,
        relation: RelationKind.HAS_PIM,
        side,
        chainId,
        chainDetail,
        original: edge,
      });
    }
  });
}

function addDetailRow({
  viewNodes,
  viewEdges,
  viewNodeIds,
  viewEdgeIds,
  side,
  row,
  rowIndex,
  y,
  rowHeight,
  indexes,
  columnsByKind,
  layout,
  xOffset = 0,
  viewMode,
}) {
  const chainId = chainIdForRow(side, row, rowIndex);
  const chainDetail = buildChainDetail({ row, indexes, chainId, rowIndex, viewMode });
  addRowBand(viewNodes, viewNodeIds, { chainId, chainDetail, y, rowHeight, layout, viewMode, xOffset });
  const centeredY = y + Math.max(0, (rowHeight - ROW_HEIGHT) / 2);
  const nodeIds = {
    port: addNode(viewNodes, viewNodeIds, { side, canonicalNode: row.portNode, rowIndex, y: centeredY, columnsByKind, xOffset, chainId, chainDetail }),
    lag: addNode(viewNodes, viewNodeIds, { side, canonicalNode: row.lagNode, rowIndex, y: centeredY, columnsByKind, xOffset, chainId, chainDetail }),
    interface: addNode(viewNodes, viewNodeIds, { side, canonicalNode: row.interfaceNode, rowIndex, y: centeredY, columnsByKind, xOffset, chainId, chainDetail }),
    peer: addNode(viewNodes, viewNodeIds, { side, canonicalNode: row.peerNode, rowIndex, y: centeredY, columnsByKind, xOffset, chainId, chainDetail }),
  };

  addPathEdges({ viewEdges, viewEdgeIds, nodeIds, row, indexes, side, chainId, chainDetail });
  addServiceNodes({
    viewNodes,
    viewEdges,
    viewNodeIds,
    viewEdgeIds,
    side,
    row,
    rowIndex,
    y,
    indexes,
    columnsByKind,
    xOffset,
    chainId,
    chainDetail,
    nodeIds,
  });
}

function buildViewForMode(sideGraphData = [], viewMode = ViewMode.SUMMARY) {
  const allRows = sideGraphData.flatMap((entry) => entry.rows);
  const columns = columnsForRows(allRows, viewMode);
  const layout = computeColumnLayout(columns);
  const columnsByKind = new Map(layout.columns.map((column) => [column.kind, column]));
  const viewNodes = [];
  const viewEdges = [];
  const viewNodeIds = new Set();
  const viewEdgeIds = new Set();
  let rowIndex = 0;
  let maxY = ROW_Y_START;
  const sideLayouts = [];

  for (const [sideIndex, sideGraph] of sideGraphData.entries()) {
    const side = sideGraph.side || "config";
    const xOffset = sideIndex * (layout.width + SIDE_X_GAP);
    let y = ROW_Y_START;
    sideLayouts.push({
      side,
      label: sideLabel(side),
      x: xOffset,
      width: layout.width,
    });
    addSideHeaderNode(viewNodes, viewNodeIds, { side, layout, viewMode, xOffset });
    addHeaderNodes(viewNodes, viewNodeIds, { side, columns, layout, viewMode, xOffset });

    for (const row of sideGraph.rows) {
      const rowHeight = rowHeightForMode(row, viewMode);
      const rowArgs = {
        viewNodes,
        viewEdges,
        viewNodeIds,
        viewEdgeIds,
        side,
        row,
        rowIndex,
        y,
        rowHeight,
        indexes: sideGraph.indexes,
        columnsByKind,
        layout,
        xOffset,
      };
      if (viewMode === ViewMode.SUMMARY) {
        addSummaryRow(rowArgs);
      } else {
        addDetailRow({ ...rowArgs, viewMode });
      }
      rowIndex += 1;
      y += rowHeight + ROW_GAP;
    }
    maxY = Math.max(maxY, y);
  }

  return {
    nodes: viewNodes,
    edges: viewEdges,
    fixedView: true,
    viewLayout: "trace-matrix",
    viewMode,
    columnOrder: columns,
    columns: layout.columns,
    columnX: layout.xByColumn,
    sideLayouts,
    sideGap: SIDE_X_GAP,
    width: sideLayouts.length ? sideLayouts[sideLayouts.length - 1].x + layout.width : layout.width,
    height: Math.max(ROW_Y_START + ROW_HEIGHT, maxY),
    rowHeight: ROW_HEIGHT,
    rowGap: ROW_GAP,
  };
}

export function buildCanonicalViewGraph(sideGraphs = [], options = {}) {
  const requestedMode = normalizeViewMode(options.viewMode || (options.detail ? ViewMode.DETAIL : ViewMode.SUMMARY));
  const sideGraphData = (sideGraphs || []).map((sideGraph) => {
    const side = sideGraph.side || "config";
    const graph = sideGraph.graph || sideGraph;
    const { rows, indexes } = buildRowsForGraph({ side, graph });
    return { side, graph, rows, indexes };
  });

  const views = {
    [ViewMode.SUMMARY]: buildViewForMode(sideGraphData, ViewMode.SUMMARY),
    [ViewMode.DETAIL]: buildViewForMode(sideGraphData, ViewMode.DETAIL),
    [ViewMode.FULL]: buildViewForMode(sideGraphData, ViewMode.FULL),
  };
  const active = views[requestedMode] || views[ViewMode.SUMMARY];

  return {
    ...active,
    views,
    activeViewMode: requestedMode,
  };
}
