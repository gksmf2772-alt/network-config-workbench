import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { applyDagreLayout, applyRadialLayout } from "../../utils/dagreLayout.js";
import ConfigNode from "./ConfigNode.jsx";
import ConfigEdge from "./ConfigEdge.jsx";
import { applyChainFocusToEdges, applyChainFocusToNodes } from "./graphFocus.js";

const nodeTypes = { configNode: ConfigNode };
const edgeTypes = { configEdge: ConfigEdge };
const READABLE_GRAPH_NODE_THRESHOLD = 42;
const FOCUS_MAX_DEPTH = 6;
const DEFAULT_VISIBLE_NODE_TYPES = ["port", "lag", "interface", "peer", "services", "static", "bgp", "pim"];
const PRIMARY_TOPOLOGY_EDGE_TYPES = new Set([
  "internal-port-lag",
  "internal-lag-interface",
  "internal-port-interface",
  "internal-interface-static-route",
  "internal-static-route-bgp",
  "internal-interface-pim",
  "canonical-port-lag",
  "canonical-lag-interface",
  "canonical-interface-peer",
  "canonical-peer-static",
  "canonical-peer-bgp",
  "canonical-interface-pim",
  "canonical-peer-pim",
  "canonical-summary-services",
]);

function buildVisibleTypeSet(visibleTypes) {
  if (!Array.isArray(visibleTypes)) return new Set(DEFAULT_VISIBLE_NODE_TYPES);
  return new Set(visibleTypes.map((type) => String(type || "").trim()).filter(Boolean));
}

function nodeFilterTypes(node = {}) {
  const nodeType = node.data?.nodeType || "";
  if (nodeType !== "more") return [nodeType];

  const columnKey = node.data?.original?.columnKey || node.data?.columnKey || "";
  if (columnKey === "route") return ["static", "pim"];
  if (columnKey === "service") return ["sap", "service"];
  if (columnKey === "policy") return ["filter", "qos", "policy"];
  return [columnKey || nodeType];
}

function nodeTypeVisible(node = {}, visibleTypes = new Set(DEFAULT_VISIBLE_NODE_TYPES)) {
  if (node.data?.isRowBand || node.data?.isColumnHeader) return true;
  const types = nodeFilterTypes(node);
  return types.some((type) => visibleTypes.has(type));
}

function nodeCanonicalId(node = {}) {
  return node.data?.canonicalId || node.id;
}

function edgeCanonicalEndpoints(edge = {}, nodeById = new Map()) {
  const sourceNode = nodeById.get(edge.source);
  const targetNode = nodeById.get(edge.target);
  return {
    source: edge.data?.canonicalSourceId || nodeCanonicalId(sourceNode),
    target: edge.data?.canonicalTargetId || nodeCanonicalId(targetNode),
  };
}

function isFixedColumnView(nodes = [], controls = {}) {
  return ["fixed-column", "trace-matrix"].includes(controls.viewLayout) ||
    nodes.some((node) => ["fixed-column", "trace-matrix"].includes(node.data?.viewLayout));
}

function applyControlsToNodes(nodes = [], controls = {}, expandedAggregateIds = new Set()) {
  const search = String(controls.search || "").trim().toLowerCase();
  const visibleTypes = buildVisibleTypeSet(controls.visibleTypes);
  const problemOnly = controls.problemOnly === true;
  return nodes.map((node) => {
    const matchesSearch = !search || String(node.data?.searchText || "").includes(search) || String(node.data?.chainDetail?.interface?.label || "").toLowerCase().includes(search);
    const collapsed = node.data?.collapsedByDefault === true && !expandedAggregateIds.has(node.data?.aggregateParentId || "");
    const problemFiltered = problemOnly && !node.data?.problem && !node.data?.isColumnHeader;
    const filteredOut = !nodeTypeVisible(node, visibleTypes) || collapsed || problemFiltered;
    return {
      ...node,
      hidden: !matchesSearch,
      data: {
        ...node.data,
        dimmed: false,
        hoverRelated: false,
        filteredOut,
        showLabel: controls.showLabels !== false,
      },
    };
  });
}

function edgeOriginalType(edge = {}) {
  return edge.data?.original?.type || edge.data?.label || "";
}

function isPrimaryTopologyEdge(edge = {}) {
  return PRIMARY_TOPOLOGY_EDGE_TYPES.has(edgeOriginalType(edge));
}

function resetEdges(edges = [], enabledModes = new Set(["comparison", "internal"]), currentVisibleNodeIds = null) {
  return edges.map((edge) => {
    const defaultVisible = isPrimaryTopologyEdge(edge) && edgeModeEnabled(edge, enabledModes);
    const filteredOut = currentVisibleNodeIds instanceof Set
      ? (!currentVisibleNodeIds.has(edge.source) || !currentVisibleNodeIds.has(edge.target))
      : false;
    return {
      ...edge,
      hidden: !defaultVisible,
      data: {
        ...edge.data,
        filteredOut,
        focused: false,
        hoverRelated: false,
        primaryTopology: isPrimaryTopologyEdge(edge),
      },
    };
  });
}

function edgeModeEnabled(edge, enabledModes) {
  if (!enabledModes?.size) return true;
  return enabledModes.has(edge.data?.graphMode || "comparison");
}

function visibleNodeIds(nodes = []) {
  return new Set(nodes
    .filter((node) => !node.hidden && node.data?.filteredOut !== true)
    .map((node) => node.id));
}

function buildEnabledModes(modes = []) {
  const enabled = new Set(modes || []);
  if (!enabled.size) {
    enabled.add("comparison");
    enabled.add("internal");
  }
  return enabled;
}

function buildFocusNeighborhood({ nodeId, nodes = [], edges = [], enabledModes, maxDepth = FOCUS_MAX_DEPTH, aggregateId = "" }) {
  const currentVisible = visibleNodeIds(nodes);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const startNode = nodeById.get(nodeId);
  const startCanonicalId = nodeCanonicalId(startNode);
  const adjacency = new Map();
  edges.forEach((edge) => {
    if (!edgeModeEnabled(edge, enabledModes)) return;
    const edgeInAggregate = aggregateId && edge.data?.aggregateId === aggregateId;
    if (!edgeInAggregate && (!currentVisible.has(edge.source) || !currentVisible.has(edge.target))) return;
    const endpoints = edgeCanonicalEndpoints(edge, nodeById);
    if (!endpoints.source || !endpoints.target) return;
    if (!adjacency.has(endpoints.source)) adjacency.set(endpoints.source, []);
    if (!adjacency.has(endpoints.target)) adjacency.set(endpoints.target, []);
    adjacency.get(endpoints.source).push({ edge, next: endpoints.target });
    adjacency.get(endpoints.target).push({ edge, next: endpoints.source });
  });

  const canonicalIds = new Set([startCanonicalId].filter(Boolean));
  const edgeIds = new Set();
  const distanceByCanonicalId = new Map([[startCanonicalId, 0]]);
  const queue = [{ id: startCanonicalId, depth: 0 }];

  while (queue.length) {
    const current = queue.shift();
    if (current.depth >= maxDepth) continue;
    for (const item of adjacency.get(current.id) || []) {
      edgeIds.add(item.edge.id);
      if (distanceByCanonicalId.has(item.next)) continue;
      const nextDepth = current.depth + 1;
      distanceByCanonicalId.set(item.next, nextDepth);
      canonicalIds.add(item.next);
      queue.push({ id: item.next, depth: nextDepth });
    }
  }

  const nodeIds = new Set(nodes
    .filter((node) => canonicalIds.has(nodeCanonicalId(node)) || (aggregateId && node.data?.aggregateParentId === aggregateId))
    .map((node) => node.id));

  return { nodeIds, canonicalIds, edgeIds, distanceByCanonicalId };
}

function layoutNodes(nodes = [], edges = [], layoutMode = "flow", controls = {}) {
  if (layoutMode === "flow" && isFixedColumnView(nodes, controls)) return nodes;
  if (layoutMode === "free") return nodes;
  if (layoutMode === "radial") return applyRadialLayout(nodes, edges);
  return applyDagreLayout(nodes, edges, "LR", {
    visibleTypes: Array.isArray(controls.visibleTypes) ? controls.visibleTypes : DEFAULT_VISIBLE_NODE_TYPES,
    preferReadable: true,
  });
}

function firstChainDetail(nodes = [], chainId = "") {
  if (!chainId) return null;
  return nodes.find((node) => node.data?.chainId === chainId && node.data?.chainDetail)?.data?.chainDetail || null;
}

function formatPanelValue(value) {
  if (value == null || value === "") return "-";
  return String(value);
}

function DetailLine({ label, value }) {
  return (
    <div className="rf-chain-detail-line">
      <span>{label}</span>
      <strong title={formatPanelValue(value)}>{formatPanelValue(value)}</strong>
    </div>
  );
}

function DetailList({ label, items = [] }) {
  return (
    <div className="rf-chain-detail-list">
      <span>{label}</span>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item.id || item.label} title={item.label}>{item.label}</li>
          ))}
        </ul>
      ) : (
        <strong>-</strong>
      )}
    </div>
  );
}

function evidenceLabel(item = {}, index = 0) {
  const source = item.source || "evidence";
  const reason = item.reason || item.message || item.field || "";
  const line = item.line || item.lineNo || item.lineNumber || "";
  return [source, reason, line ? `line ${line}` : ""].filter(Boolean).join(" / ") || `evidence ${index + 1}`;
}

function ChainDetailPanel({ detail, onClose }) {
  if (!detail) return null;
  return (
    <aside className="rf-chain-detail-panel" aria-label="선택 경로 상세">
      <div className="rf-chain-detail-panel-head">
        <strong>선택 경로 상세</strong>
        <button type="button" onClick={onClose} aria-label="상세 닫기">닫기</button>
      </div>
      <DetailLine label="PORT" value={detail.port?.label} />
      <DetailLine label="LAG" value={detail.lag?.label} />
      <DetailLine label="Interface" value={detail.interface?.label} />
      <DetailLine label="Peer/NH" value={detail.peer?.label} />
      <DetailList label="Static routes" items={detail.staticRoutes || []} />
      <DetailList label="BGP neighbors" items={detail.bgpNeighbors || []} />
      <DetailList label="PIM" items={detail.pim || []} />
      <DetailLine label="Mapping confidence" value={detail.confidence?.min == null ? "-" : `${detail.confidence.min}% min / ${detail.confidence.average}% avg`} />
      <div className="rf-chain-detail-list">
        <span>Evidence</span>
        {detail.evidence?.length ? (
          <ul>
            {detail.evidence.slice(0, 6).map((item, index) => (
              <li key={`${evidenceLabel(item, index)}-${index}`} title={evidenceLabel(item, index)}>
                {evidenceLabel(item, index)}
              </li>
            ))}
          </ul>
        ) : (
          <strong>-</strong>
        )}
      </div>
    </aside>
  );
}

export default function RelationshipGraph({
  initialNodes,
  initialEdges,
  controls = {},
  bridge = {},
  layoutMode = "flow",
}) {
  const flowRef = useRef(null);
  const [expandedAggregateIds, setExpandedAggregateIds] = useState(() => new Set());
  const enabledModes = useMemo(() => buildEnabledModes(controls.enabledModes), [controls.enabledModes]);
  const layoutedNodes = useMemo(
    () => layoutNodes(initialNodes, initialEdges, layoutMode, controls),
    [initialNodes, initialEdges, layoutMode, controls]
  );
  const controlledNodes = useMemo(
    () => applyControlsToNodes(layoutedNodes, controls, expandedAggregateIds),
    [layoutedNodes, controls, expandedAggregateIds]
  );
  const controlledVisibleNodeIds = useMemo(
    () => visibleNodeIds(controlledNodes),
    [controlledNodes]
  );
  const controlledEdges = useMemo(
    () => resetEdges(initialEdges, enabledModes, controlledVisibleNodeIds),
    [initialEdges, enabledModes, controlledVisibleNodeIds]
  );
  const viewportNodeRefs = useMemo(
    () => [...controlledVisibleNodeIds].map((id) => ({ id })),
    [controlledVisibleNodeIds]
  );
  const shouldFitView = controlledNodes.length <= READABLE_GRAPH_NODE_THRESHOLD;
  const shouldAutoFitVisible = shouldFitView && viewportNodeRefs.length <= READABLE_GRAPH_NODE_THRESHOLD;
  const defaultViewport = useMemo(
    () => ({ x: 28, y: 28, zoom: controlledNodes.length > READABLE_GRAPH_NODE_THRESHOLD ? 0.82 : 1 }),
    [controlledNodes.length]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(controlledNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(controlledEdges);
  const [selectedCanonicalId, setSelectedCanonicalId] = useState(null);
  const [selectedChainId, setSelectedChainId] = useState(null);

  useEffect(() => {
    setNodes(controlledNodes);
    setEdges(controlledEdges);
  }, [controlledNodes, controlledEdges, setNodes, setEdges]);

  const fitToVisibleNodes = useCallback((instance = flowRef.current) => {
    if (!instance || !viewportNodeRefs.length) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    window.requestAnimationFrame(() => {
      instance.fitView?.({
        nodes: viewportNodeRefs,
        padding: 0.18,
        duration: reducedMotion ? 0 : 180,
        includeHiddenNodes: false,
        minZoom: 0.35,
        maxZoom: 1.25,
      });
    });
  }, [viewportNodeRefs]);

  useEffect(() => {
    if (shouldAutoFitVisible) fitToVisibleNodes();
  }, [fitToVisibleNodes, shouldAutoFitVisible]);

  const resetSelection = useCallback(() => {
    setSelectedCanonicalId(null);
    setSelectedChainId(null);
    setExpandedAggregateIds(new Set());
    setNodes((currentNodes) => applyChainFocusToNodes(currentNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        hoverRelated: false,
        filteredOut: node.data?.collapsedByDefault === true ? true : node.data?.filteredOut,
      },
    })), ""));
    setEdges((currentEdges) => applyChainFocusToEdges(resetEdges(currentEdges, enabledModes, visibleNodeIds(nodes)), ""));
  }, [enabledModes, nodes, setNodes, setEdges]);

  const handleNodeClick = useCallback((_, node) => {
    if (node.data?.cluster) {
      bridge.onClusterOpen?.(node);
      return;
    }

    const chainId = node.data?.chainId || "";
    const canonicalId = nodeCanonicalId(node);
    const isServiceAggregate = node.data?.serviceAggregate === true;
    if (isServiceAggregate && typeof bridge.onServicesOpen === "function") {
      bridge.onServicesOpen(node);
      return;
    }
    if (!isServiceAggregate && ((chainId && selectedChainId === chainId) || (!chainId && selectedCanonicalId === canonicalId))) {
      resetSelection();
      return;
    }

    const aggregateId = node.data?.staticAggregate ? node.id : "";
    setSelectedChainId(chainId || null);
    setSelectedCanonicalId(canonicalId);
    const nextNodes = nodes.map((item) => (
      aggregateId && item.data?.aggregateParentId === aggregateId
        ? {
          ...item,
          hidden: false,
          data: { ...item.data, filteredOut: false },
        }
        : item
    ));

    if (chainId) {
      const visibleIds = visibleNodeIds(nextNodes);
      const baseEdges = resetEdges(edges, enabledModes, visibleIds);
      const chainNodeIds = new Set(nextNodes
        .filter((item) => item.data?.chainId === chainId && !item.hidden && item.data?.filteredOut !== true)
        .map((item) => item.id));
      setNodes(applyChainFocusToNodes(nextNodes, chainId));
      setEdges(applyChainFocusToEdges(baseEdges, chainId));

      window.requestAnimationFrame(() => {
        flowRef.current?.fitView?.({
          nodes: [...chainNodeIds].map((id) => ({ id })),
          padding: 0.32,
          duration: 220,
          includeHiddenNodes: false,
          minZoom: 0.5,
          maxZoom: 1.35,
        });
      });
      return;
    }

    const focus = buildFocusNeighborhood({ nodeId: node.id, nodes: nextNodes, edges, enabledModes, aggregateId });

    setNodes((currentNodes) => currentNodes.map((item) => ({
      ...item,
      data: {
        ...item.data,
        filteredOut: aggregateId && item.data?.aggregateParentId === aggregateId ? false : item.data.filteredOut,
        dimmed: !focus.canonicalIds.has(nodeCanonicalId(item)) && !(aggregateId && item.data?.aggregateParentId === aggregateId),
        focusDistance: focus.distanceByCanonicalId.get(nodeCanonicalId(item)) ?? null,
      },
    })));
    setEdges((currentEdges) => currentEdges.map((edge) => ({
      ...edge,
      hidden: !focus.edgeIds.has(edge.id) && !(aggregateId && edge.data?.aggregateId === aggregateId),
      data: {
        ...edge.data,
        focused: focus.edgeIds.has(edge.id) || Boolean(aggregateId && edge.data?.aggregateId === aggregateId),
      },
    })));

    window.requestAnimationFrame(() => {
      flowRef.current?.fitView?.({
        nodes: [...focus.nodeIds].map((id) => ({ id })),
        padding: 0.28,
        duration: 220,
        includeHiddenNodes: false,
        minZoom: 0.35,
        maxZoom: 1.15,
      });
    });
  }, [bridge, edges, enabledModes, nodes, resetSelection, selectedCanonicalId, selectedChainId, setEdges, setNodes]);

  const handleNodeDoubleClick = useCallback((_, node) => {
    if (node.data?.cluster) return;
    bridge.onNodeOpen?.(node);
  }, [bridge]);

  const handleNodeMouseEnter = useCallback((_, node) => {
    const canonicalId = nodeCanonicalId(node);
    const chainId = node.data?.chainId || "";
    setNodes((currentNodes) => currentNodes.map((item) => ({
      ...item,
      data: {
        ...item.data,
        hoverRelated: nodeCanonicalId(item) === canonicalId || Boolean(chainId && item.data?.chainId === chainId),
      },
    })));
    setEdges((currentEdges) => {
      const nodeById = new Map(nodes.map((item) => [item.id, item]));
      return currentEdges.map((edge) => {
        const endpoints = edgeCanonicalEndpoints(edge, nodeById);
        const related = endpoints.source === canonicalId || endpoints.target === canonicalId || Boolean(chainId && edge.data?.chainId === chainId);
        return {
          ...edge,
          data: {
            ...edge.data,
            hoverRelated: related,
          },
        };
      });
    });
  }, [nodes, setEdges, setNodes]);

  const handleNodeMouseLeave = useCallback(() => {
    setNodes((currentNodes) => currentNodes.map((item) => ({
      ...item,
      data: {
        ...item.data,
        hoverRelated: false,
      },
    })));
    setEdges((currentEdges) => currentEdges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        hoverRelated: false,
      },
    })));
  }, [setEdges, setNodes]);

  const handlePaneClick = useCallback(() => {
    resetSelection();
  }, [resetSelection]);

  const selectedChainDetail = useMemo(
    () => firstChainDetail(nodes, selectedChainId),
    [nodes, selectedChainId]
  );

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 600, position: "relative" }}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onNodeDoubleClick={handleNodeDoubleClick}
      onNodeMouseEnter={handleNodeMouseEnter}
      onNodeMouseLeave={handleNodeMouseLeave}
      onPaneClick={handlePaneClick}
      onInit={(instance) => {
        flowRef.current = instance;
        if (shouldAutoFitVisible) fitToVisibleNodes(instance);
      }}
      fitView={shouldFitView}
      fitViewOptions={{
        padding: 0.18,
        includeHiddenNodes: false,
        minZoom: 0.35,
        maxZoom: 1.5,
      }}
      defaultViewport={defaultViewport}
      minZoom={0.35}
      maxZoom={2}
      defaultEdgeOptions={{ hidden: true }}
      onlyRenderVisibleElements
      nodesDraggable={!isFixedColumnView(nodes, controls)}
      panOnDrag
      zoomOnScroll
      zoomOnPinch
    >
      <Background variant="dots" gap={16} size={1} color="#e0e0e0" />
      <MiniMap nodeStrokeWidth={3} zoomable pannable />
      <Controls />
    </ReactFlow>
    <ChainDetailPanel detail={selectedChainDetail} onClose={resetSelection} />
    </div>
  );
}
