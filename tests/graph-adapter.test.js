import test from "node:test";
import assert from "node:assert/strict";

import {
  toReactFlowData,
  validateReactFlowData,
} from "../src/utils/graphAdapter.js";
import {
  applyChainFocusToEdges,
  applyChainFocusToNodes,
} from "../src/components/graph/graphFocus.js";
import {
  applyDagreLayout,
  applyRadialLayout,
  applyReadableColumnLayout,
  applyScatterLayout,
} from "../src/utils/dagreLayout.js";

test("graph adapter converts analytics graph into React Flow nodes and hidden edges", () => {
  const { nodes, edges } = toReactFlowData([
    {
      id: "old:port:2/1/1",
      objectType: "port",
      label: "2/1/1",
      key: "old-port-key",
      side: "old",
      status: "changed",
      confidence: 85,
    },
    {
      id: "new:lag:11",
      objectType: "lag",
      label: "lag-11",
      key: "new-lag-key",
      side: "new",
      status: "added",
    },
  ], [
    {
      id: "edge-1",
      source: "old:port:2/1/1",
      target: "new:lag:11",
      type: "manual-match",
      graphMode: "comparison",
      confidence: 85,
    },
  ]);

  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].type, "configNode");
  assert.deepEqual(nodes[0].position, { x: 0, y: 0 });
  assert.equal(nodes[0].data.nodeType, "port");
  assert.equal(nodes[0].data.status, "modified");
  assert.equal(nodes[0].data.matchScore, 85);
  assert.equal(edges.length, 1);
  assert.equal(edges[0].type, "configEdge");
  assert.equal(edges[0].hidden, true);
  assert.equal(edges[0].data.edgeType, "compare");
  assert.equal(validateReactFlowData(nodes, edges).valid, true);
});

test("graph adapter validation reports duplicate ids and missing endpoints", () => {
  const nodes = [
    { id: "node-a" },
    { id: "node-a" },
  ];
  const edges = [
    { id: "edge-a", source: "node-a", target: "node-b" },
    { id: "edge-a", source: "node-c", target: "node-a" },
  ];

  const validation = validateReactFlowData(nodes, edges);

  assert.equal(validation.valid, false);
  assert.deepEqual(validation.duplicateNodeIds, ["node-a"]);
  assert.deepEqual(validation.duplicateEdgeIds, ["edge-a"]);
  assert.equal(validation.missingEndpoints.length, 2);
  assert.equal(validation.missingEndpoints[0].missingTarget, true);
  assert.equal(validation.missingEndpoints[1].missingSource, true);
});

test("graph adapter preserves fixed view positions and canonical metadata", () => {
  const { nodes, edges } = toReactFlowData([
    {
      id: "view:old:0:PORT",
      canonicalId: "PORT|pe-1|1/1/1",
      canonicalKind: "PORT",
      objectType: "port",
      label: "1/1/1",
      side: "old",
      position: { x: 0, y: 40 },
      viewLayout: "fixed-column",
    },
    {
      id: "view:old:0:LAG",
      canonicalId: "LAG|pe-1|11",
      canonicalKind: "LAG",
      objectType: "lag",
      label: "11",
      side: "old",
      position: { x: 260, y: 40 },
      viewLayout: "fixed-column",
    },
  ], [
    {
      id: "edge-1",
      source: "view:old:0:PORT",
      target: "view:old:0:LAG",
      type: "canonical-port-lag",
      graphMode: "internal",
      canonicalSourceId: "PORT|pe-1|1/1/1",
      canonicalTargetId: "LAG|pe-1|11",
    },
  ]);

  assert.deepEqual(nodes[0].position, { x: 0, y: 40 });
  assert.deepEqual(nodes[1].position, { x: 260, y: 40 });
  assert.equal(nodes[0].data.canonicalId, "PORT|pe-1|1/1/1");
  assert.equal(nodes[0].data.viewLayout, "fixed-column");
  assert.equal(edges[0].data.canonicalSourceId, "PORT|pe-1|1/1/1");
  assert.equal(edges[0].data.canonicalTargetId, "LAG|pe-1|11");
});

test("chain focus highlights only nodes and edges with the selected chainId", () => {
  const nodes = [
    { id: "header", data: { isColumnHeader: true } },
    { id: "a-port", data: { chainId: "chain-a" } },
    { id: "a-lag", data: { chainId: "chain-a" } },
    { id: "b-port", data: { chainId: "chain-b" } },
  ];
  const edges = [
    { id: "a-edge", data: { chainId: "chain-a" } },
    { id: "b-edge", data: { chainId: "chain-b" } },
  ];

  const focusedNodes = applyChainFocusToNodes(nodes, "chain-a");
  const focusedEdges = applyChainFocusToEdges(edges, "chain-a");

  assert.equal(focusedNodes.find((node) => node.id === "a-port").data.selectedChain, true);
  assert.equal(focusedNodes.find((node) => node.id === "a-lag").data.dimmed, false);
  assert.equal(focusedNodes.find((node) => node.id === "b-port").data.dimmed, true);
  assert.equal(focusedNodes.find((node) => node.id === "header").data.dimmed, false);
  assert.equal(focusedEdges.find((edge) => edge.id === "a-edge").data.focused, true);
  assert.equal(focusedEdges.find((edge) => edge.id === "b-edge").data.dimmed, true);
});

test("dagre scatter and radial layouts assign finite React Flow positions", () => {
  const { nodes, edges } = toReactFlowData([
    { id: "old:interface:1", objectType: "interface", label: "10.0.0.1/30", side: "old" },
    { id: "new:bgp:1", objectType: "bgp", label: "61.78.43.28", side: "new" },
    { id: "relation:policy:1", objectType: "route-policy", label: "policy-a", side: "relation" },
  ], [
    { id: "edge-1", source: "old:interface:1", target: "new:bgp:1", graphMode: "comparison" },
    { id: "edge-2", source: "new:bgp:1", target: "relation:policy:1", type: "internal-reference" },
  ]);

  for (const node of applyDagreLayout(nodes, edges, "LR")) {
    assert.equal(Number.isFinite(node.position.x), true);
    assert.equal(Number.isFinite(node.position.y), true);
  }

  for (const node of applyScatterLayout(nodes)) {
    assert.equal(Number.isFinite(node.position.x), true);
    assert.equal(Number.isFinite(node.position.y), true);
  }

  for (const node of applyRadialLayout(nodes, edges)) {
    assert.equal(Number.isFinite(node.position.x), true);
    assert.equal(Number.isFinite(node.position.y), true);
  }
});

test("readable column layout aligns topology-connected circuit nodes on one lane", () => {
  const { nodes, edges } = toReactFlowData([
    { id: "old:port:2/2/3", objectType: "port", label: "2/2/3", side: "old" },
    { id: "old:lag:11", objectType: "lag", label: "11", side: "old" },
    { id: "old:if:10.31.1.90/30", objectType: "interface", label: "10.31.1.90/30", side: "old" },
    { id: "old:static:0.0.0.0/0", objectType: "static-route", label: "0.0.0.0/0", side: "old" },
    { id: "old:bgp:61.78.43.28", objectType: "bgp", label: "61.78.43.28", side: "old" },
    { id: "old:port:2/2/4", objectType: "port", label: "2/2/4", side: "old" },
    { id: "old:lag:12", objectType: "lag", label: "12", side: "old" },
  ], [
    { id: "edge-port-lag", source: "old:port:2/2/3", target: "old:lag:11", type: "internal-port-lag", graphMode: "internal" },
    { id: "edge-lag-if", source: "old:lag:11", target: "old:if:10.31.1.90/30", type: "internal-lag-interface", graphMode: "internal" },
    { id: "edge-if-static", source: "old:if:10.31.1.90/30", target: "old:static:0.0.0.0/0", type: "internal-interface-static-route", graphMode: "internal" },
    { id: "edge-static-bgp", source: "old:static:0.0.0.0/0", target: "old:bgp:61.78.43.28", type: "internal-static-route-bgp", graphMode: "internal" },
    { id: "edge-other", source: "old:port:2/2/4", target: "old:lag:12", type: "internal-port-lag", graphMode: "internal" },
  ]);

  const laidOut = applyReadableColumnLayout(nodes, edges);
  const byId = new Map(laidOut.map((node) => [node.id, node]));
  const firstLaneY = byId.get("old:port:2/2/3").position.y;

  assert.equal(byId.get("old:lag:11").position.y, firstLaneY);
  assert.equal(byId.get("old:if:10.31.1.90/30").position.y, firstLaneY);
  assert.equal(byId.get("old:static:0.0.0.0/0").position.y, firstLaneY);
  assert.equal(byId.get("old:bgp:61.78.43.28").position.y, firstLaneY);
  assert.notEqual(byId.get("old:port:2/2/4").position.y, firstLaneY);
});

test("readable column layout compacts columns around visible topology types", () => {
  const { nodes, edges } = toReactFlowData([
    { id: "old:port:2/2/3", objectType: "port", label: "2/2/3", side: "old" },
    { id: "old:lag:11", objectType: "lag", label: "11", side: "old" },
    { id: "old:if:10.31.1.90/30", objectType: "interface", label: "10.31.1.90/30", side: "old" },
    { id: "old:sap:lag-11", objectType: "sap", label: "lag-11", side: "old" },
    { id: "old:static:0.0.0.0/0", objectType: "static-route", label: "0.0.0.0/0", side: "old" },
    { id: "old:bgp:61.78.43.28", objectType: "bgp", label: "61.78.43.28", side: "old" },
    { id: "old:pim:g-to-core", objectType: "pim", label: "g-to-core", side: "old" },
  ], [
    { id: "edge-port-lag", source: "old:port:2/2/3", target: "old:lag:11", type: "internal-port-lag", graphMode: "internal" },
    { id: "edge-lag-if", source: "old:lag:11", target: "old:if:10.31.1.90/30", type: "internal-lag-interface", graphMode: "internal" },
    { id: "edge-lag-sap", source: "old:lag:11", target: "old:sap:lag-11", type: "internal-lag-sap", graphMode: "internal" },
    { id: "edge-if-static", source: "old:if:10.31.1.90/30", target: "old:static:0.0.0.0/0", type: "internal-interface-static-route", graphMode: "internal" },
    { id: "edge-static-bgp", source: "old:static:0.0.0.0/0", target: "old:bgp:61.78.43.28", type: "internal-static-route-bgp", graphMode: "internal" },
    { id: "edge-if-pim", source: "old:if:10.31.1.90/30", target: "old:pim:g-to-core", type: "internal-interface-pim", graphMode: "internal" },
  ]);

  const laidOut = applyReadableColumnLayout(nodes, edges, {
    visibleTypes: ["port", "lag", "interface", "static", "bgp", "pim"],
  });
  const byId = new Map(laidOut.map((node) => [node.id, node]));

  assert.equal(byId.get("old:lag:11").position.x - byId.get("old:port:2/2/3").position.x, 180);
  assert.equal(byId.get("old:if:10.31.1.90/30").position.x - byId.get("old:lag:11").position.x, 180);
  assert.equal(byId.get("old:static:0.0.0.0/0").position.x - byId.get("old:if:10.31.1.90/30").position.x, 180);
  assert.equal(byId.get("old:bgp:61.78.43.28").position.x - byId.get("old:static:0.0.0.0/0").position.x, 180);
  assert.equal(byId.get("old:pim:g-to-core").position.x - byId.get("old:bgp:61.78.43.28").position.x, 180);
  assert.ok(byId.get("old:sap:lag-11").position.y > byId.get("old:pim:g-to-core").position.y);
});
