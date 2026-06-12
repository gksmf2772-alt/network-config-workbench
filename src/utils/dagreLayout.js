import dagre from "dagre";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 44;
const LARGE_GRAPH_NODE_THRESHOLD = 42;
const COLUMN_GAP = 180;
const ROW_GAP = 74;
const SIDE_GROUP_GAP = 34;
const LANE_GAP = 24;
const LANE_MARGIN_X = 48;
const LANE_MARGIN_Y = 48;
const SIDE_ORDER = new Map([
  ["old", 0],
  ["new", 1],
  ["relation", 2],
]);
const LAYOUT_TOPOLOGY_EDGE_TYPES = new Set([
  "internal-port-lag",
  "internal-lag-interface",
  "internal-port-interface",
  "internal-interface-static-route",
  "internal-static-route-bgp",
  "internal-interface-pim",
  "internal-service-sap",
  "internal-lag-sap",
  "internal-port-sap",
]);

export function applyDagreLayout(nodes, edges, direction = "LR", options = {}) {
  if (!nodes.length) return nodes;
  if (options.preferReadable || nodes.length > LARGE_GRAPH_NODE_THRESHOLD) {
    return applyReadableColumnLayout(nodes, edges, options);
  }

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    ranksep: 100,
    nodesep: 24,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));

  const nodeIds = new Set(nodes.map((node) => node.id));
  edges.forEach((edge) => {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const position = graph.node(node.id);
    if (!position) return node;
    return {
      ...node,
      position: {
        x: Math.round(position.x - NODE_WIDTH / 2),
        y: Math.round(position.y - NODE_HEIGHT / 2),
      },
    };
  });
}

export function applyReadableColumnLayout(nodes = [], edges = [], options = {}) {
  const columns = groupBy(nodes, (node) => String(node.data?.columnRank ?? 99));
  const columnKeys = [...columns.keys()].sort((left, right) => Number(left) - Number(right));
  const columnIndexByKey = buildReadableColumnIndex(columnKeys, nodes, options.visibleTypes);
  const visibleTypes = normalizeReadableVisibleTypes(options.visibleTypes);
  const layoutNodes = visibleTypes?.size
    ? nodes.filter((node) => readableNodeVisibleForTypeFilter(node, visibleTypes))
    : nodes;
  const components = buildTopologyComponents(layoutNodes, edges);
  const componentsBySide = groupBy(components, (component) => component.side);
  const laidOut = new Map();
  let yCursor = LANE_MARGIN_Y;
  const sideKeys = ["old", "new", "relation", ...[...componentsBySide.keys()].filter((side) => !["old", "new", "relation"].includes(side))]
    .filter((side, index, list) => componentsBySide.has(side) && list.indexOf(side) === index);

  sideKeys.forEach((side) => {
    const sideComponents = [...(componentsBySide.get(side) || [])].sort(compareTopologyComponents);
    sideComponents.forEach((component) => {
      const byColumn = groupBy(component.nodes, (node) => String(node.data?.columnRank ?? 99));
      let laneHeight = ROW_GAP;
      byColumn.forEach((list) => {
        laneHeight = Math.max(laneHeight, Math.max(1, list.length) * ROW_GAP);
      });

      byColumn.forEach((list, columnKey) => {
        const columnIndex = columnIndexByKey.get(columnKey) ?? columnKeys.length;
        [...list].sort(compareGraphNodes).forEach((node, rowIndex) => {
          laidOut.set(node.id, {
            ...node,
            position: {
              x: LANE_MARGIN_X + columnIndex * COLUMN_GAP,
              y: yCursor + rowIndex * ROW_GAP,
            },
          });
        });
      });

      yCursor += laneHeight + LANE_GAP;
    });
    yCursor += SIDE_GROUP_GAP;
  });

  const hiddenNodes = nodes.filter((node) => !laidOut.has(node.id));
  hiddenNodes.sort(compareGraphNodes).forEach((node, index) => {
    const columnKey = String(node.data?.columnRank ?? 99);
    const columnIndex = columnIndexByKey.get(columnKey) ?? columnKeys.length;
    laidOut.set(node.id, {
      ...node,
      position: {
        x: LANE_MARGIN_X + columnIndex * COLUMN_GAP,
        y: Math.max(LANE_MARGIN_Y, yCursor) + index * 4,
      },
    });
  });

  return nodes.map((node) => laidOut.get(node.id) || node);
}

function normalizeReadableVisibleTypes(visibleTypes = null) {
  if (!Array.isArray(visibleTypes)) return null;
  const normalized = new Set(visibleTypes.map((type) => String(type || "").trim()).filter(Boolean));
  return normalized.size ? normalized : null;
}

function buildReadableColumnIndex(columnKeys = [], nodes = [], visibleTypes = null) {
  const normalizedVisibleTypes = normalizeReadableVisibleTypes(visibleTypes);
  if (!normalizedVisibleTypes?.size) return new Map(columnKeys.map((key, index) => [key, index]));

  const visibleColumnKeys = new Set();
  nodes.forEach((node) => {
    if (readableNodeVisibleForTypeFilter(node, normalizedVisibleTypes)) {
      visibleColumnKeys.add(String(node.data?.columnRank ?? 99));
    }
  });

  const sortedVisibleKeys = columnKeys.filter((key) => visibleColumnKeys.has(key));
  const sortedHiddenKeys = columnKeys.filter((key) => !visibleColumnKeys.has(key));
  return new Map([...sortedVisibleKeys, ...sortedHiddenKeys].map((key, index) => [key, index]));
}

function readableNodeVisibleForTypeFilter(node = {}, visibleTypes = new Set()) {
  const nodeType = String(node.data?.nodeType || "");
  if (nodeType === "more") {
    const columnKey = node.data?.original?.columnKey || node.data?.columnKey || "";
    if (columnKey === "route") return visibleTypes.has("static") || visibleTypes.has("pim");
    if (columnKey === "service") return visibleTypes.has("sap") || visibleTypes.has("service");
    if (columnKey === "policy") return visibleTypes.has("filter") || visibleTypes.has("qos") || visibleTypes.has("policy");
    return visibleTypes.has(columnKey);
  }
  return visibleTypes.has(nodeType);
}

function compareGraphNodes(left, right) {
  const leftSide = SIDE_ORDER.get(left.data?.side || "relation") ?? 9;
  const rightSide = SIDE_ORDER.get(right.data?.side || "relation") ?? 9;
  if (leftSide !== rightSide) return leftSide - rightSide;
  const leftType = String(left.data?.nodeType || "");
  const rightType = String(right.data?.nodeType || "");
  if (leftType !== rightType) return leftType.localeCompare(rightType);
  return String(left.data?.label || left.id).localeCompare(String(right.data?.label || right.id), "en", { numeric: true });
}

function buildTopologyComponents(nodes = [], edges = []) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map(nodes.map((node) => [node.id, []]));

  edges.forEach((edge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) return;
    if ((source.data?.side || "") !== (target.data?.side || "")) return;
    if (!isLayoutTopologyEdge(edge)) return;
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  });

  const visited = new Set();
  const components = [];
  [...nodes].sort(compareGraphNodes).forEach((node) => {
    if (visited.has(node.id)) return;
    const queue = [node.id];
    const componentNodes = [];
    visited.add(node.id);

    while (queue.length) {
      const id = queue.shift();
      const current = nodeById.get(id);
      if (current) componentNodes.push(current);
      for (const next of adjacency.get(id) || []) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }

    components.push(buildTopologyComponent(componentNodes));
  });

  return components;
}

function buildTopologyComponent(componentNodes = []) {
  const nodes = [...componentNodes].sort(compareGraphNodes);
  const minRank = Math.min(...nodes.map((node) => Number(node.data?.columnRank ?? 99)));
  const anchor = nodes.find((node) => Number(node.data?.columnRank ?? 99) === minRank) || nodes[0];
  const side = anchor?.data?.side || "relation";
  return {
    side,
    minRank,
    anchorLabel: String(anchor?.data?.label || anchor?.id || ""),
    nodes,
  };
}

function compareTopologyComponents(left, right) {
  const leftSide = SIDE_ORDER.get(left.side || "relation") ?? 9;
  const rightSide = SIDE_ORDER.get(right.side || "relation") ?? 9;
  if (leftSide !== rightSide) return leftSide - rightSide;
  if (left.minRank !== right.minRank) return left.minRank - right.minRank;
  return left.anchorLabel.localeCompare(right.anchorLabel, "en", { numeric: true });
}

function isLayoutTopologyEdge(edge = {}) {
  const type = edge.data?.original?.type || edge.data?.label || edge.type || "";
  return LAYOUT_TOPOLOGY_EDGE_TYPES.has(type);
}

export function applyScatterLayout(nodes = []) {
  const groups = groupBy(nodes, (node) => node.data?.side || "relation");
  const maxSideSize = Math.max(1, ...[...groups.values()].map((list) => list.length));
  const columnsPerSide = 4;
  const zoneWidth = 760;
  const zoneHeight = Math.max(560, Math.ceil(maxSideSize / columnsPerSide) * 142 + 120);
  const zones = {
    old: { x1: 0, x2: zoneWidth, y1: 0, y2: zoneHeight },
    new: { x1: zoneWidth + 100, x2: zoneWidth * 2 + 100, y1: 0, y2: zoneHeight },
    relation: { x1: zoneWidth * 2 + 200, x2: zoneWidth * 3 + 200, y1: 0, y2: zoneHeight },
  };
  const occupied = [];

  return nodes.map((node, index) => {
    const side = node.data?.side || "relation";
    const zone = zones[side] || zones.relation;
    const point = findScatterPoint({ node, index, zone, occupied });
    occupied.push(point);
    return {
      ...node,
      position: point,
    };
  });
}

export function applyRadialLayout(nodes = []) {
  const groups = groupBy(nodes, (node) => node.data?.side || "relation");
  const sideKeys = ["old", "new", "relation", ...[...groups.keys()].filter((key) => !["old", "new", "relation"].includes(key))]
    .filter((key, index, list) => groups.has(key) && list.indexOf(key) === index);
  const zoneWidth = 980;
  const zoneHeight = 760;
  const centerY = zoneHeight / 2;

  return sideKeys.flatMap((side, sideIndex) => {
    const sideNodes = [...(groups.get(side) || [])].sort(compareGraphNodes);
    const byRank = groupBy(sideNodes, (node) => String(node.data?.columnRank ?? 99));
    const rankKeys = [...byRank.keys()].sort((left, right) => Number(left) - Number(right));
    const centerX = 160 + sideIndex * zoneWidth + zoneWidth / 2;

    const rankCount = Math.max(1, rankKeys.length);

    return rankKeys.flatMap((rankKey, ringIndex) => {
      const ringNodes = [...(byRank.get(rankKey) || [])].sort(compareGraphNodes);
      const slots = Math.min(12, Math.max(1, ringNodes.length));
      const baseRadius = 72 + ringIndex * 112;
      const rankRatio = rankCount === 1 ? 0.5 : ringIndex / (rankCount - 1);
      const rankAngle = -Math.PI * 0.82 + Math.PI * 1.64 * rankRatio;
      const siblingSpread = Math.min(Math.PI * 0.72, Math.max(Math.PI * 0.18, ringNodes.length * 0.14));
      return ringNodes.map((node, nodeIndex) => {
        const ringOffset = Math.floor(nodeIndex / 12) * 82;
        const slot = nodeIndex % slots;
        const siblingRatio = slots === 1 ? 0.5 : slot / (slots - 1);
        const angle = rankAngle + (siblingRatio - 0.5) * siblingSpread;
        const radius = baseRadius + ringOffset;
        return {
          ...node,
          position: {
            x: Math.round(centerX + Math.cos(angle) * radius),
            y: Math.round(centerY + Math.sin(angle) * radius),
          },
        };
      });
    });
  });
}

function findScatterPoint({ node, index, zone, occupied }) {
  const nodeWidth = 188;
  const nodeHeight = 82;
  const seedBase = hashValue(node.id || `${node.data?.side || "node"}:${index}`);
  const width = Math.max(nodeWidth + 24, zone.x2 - zone.x1);
  const height = Math.max(nodeHeight + 24, zone.y2 - zone.y1);

  for (let attempt = 0; attempt < 180; attempt += 1) {
    const point = {
      x: zone.x1 + seededUnit(seedBase + attempt * 7919) * Math.max(1, width - nodeWidth),
      y: zone.y1 + seededUnit(seedBase + attempt * 104729) * Math.max(1, height - nodeHeight),
    };
    if (!overlaps(point, occupied, nodeWidth, nodeHeight)) return point;
  }

  const columns = Math.max(1, Math.floor(width / nodeWidth));
  const maxRows = Math.ceil(height / 132) + 4;
  for (let row = 0; row < maxRows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const point = {
        x: zone.x1 + column * nodeWidth + (row % 2 ? 42 : 0),
        y: zone.y1 + row * 132,
      };
      if (!overlaps(point, occupied, nodeWidth, nodeHeight)) return point;
    }
  }

  return { x: zone.x1, y: zone.y1 + index * 132 };
}

function overlaps(point, occupied, nodeWidth, nodeHeight) {
  return occupied.some((other) => (
    Math.abs(point.x - other.x) < nodeWidth
    && Math.abs(point.y - other.y) < nodeHeight
  ));
}

function groupBy(items, keyFn) {
  return (items || []).reduce((result, item) => {
    const key = keyFn(item);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(item);
    return result;
  }, new Map());
}

function hashValue(value = "") {
  return String(value || "").split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 2166136261);
}

function seededUnit(seed = 0) {
  const value = Math.sin(seed || 1) * 10000;
  return value - Math.floor(value);
}
