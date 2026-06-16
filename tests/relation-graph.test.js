import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCanonicalGraph,
  buildCanonicalViewGraph,
  canonicalBgpNeighborId,
  canonicalLagId,
  canonicalL3InterfaceId,
  canonicalPeerNhId,
  canonicalPimId,
  canonicalPimNeighborId,
  canonicalPortId,
  canonicalStaticRouteId,
  canonicalizeInterfaceName,
  canonicalizeLagNumber,
  createGraphEdge,
  COLUMN_SERVICES,
  DiagnosticKind,
  NodeKind,
  RelationKind,
  ViewMode,
} from "../src/core/relationGraph/index.js";

function object({ id, type, identity, sourceName = identity, fields = {}, rawLines = [] }) {
  return {
    id,
    normalizedType: type,
    normalizedIdentity: identity,
    sourceName,
    fields,
    rawLines,
  };
}

function edgeKinds(graph) {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  return graph.edges.map((edge) => ({
    relation: edge.relation,
    sourceKind: nodesById.get(edge.source)?.kind,
    targetKind: nodesById.get(edge.target)?.kind,
  }));
}

test("canonical ids and interface names are stable", () => {
  assert.equal(canonicalizeInterfaceName(' interface "To-Core" create '), "to-core");
  assert.equal(canonicalizeLagNumber("lag-11:100"), "11");
  assert.equal(canonicalPortId({ deviceId: "PE-1", name: "1/1/1" }), "PORT|pe-1|1/1/1");
  assert.equal(canonicalLagId({ deviceId: "PE-1", lag: "lag-11" }), "LAG|pe-1|11");
  assert.equal(
    canonicalL3InterfaceId({ deviceId: "PE-1", vrf: "Base", name: "to-core" }),
    "L3_INTERFACE|pe-1|base|to-core"
  );
  assert.equal(canonicalPeerNhId({ deviceId: "PE-1", vrf: "Base", ip: "10.0.0.2" }), "PEER_NH|pe-1|base|10.0.0.2");
  assert.equal(canonicalStaticRouteId({ deviceId: "PE-1", vrf: "Base", prefix: "0.0.0.0/0", nextHop: "10.0.0.2" }), "STATIC_ROUTE|pe-1|base|0.0.0.0/0|10.0.0.2");
  assert.equal(canonicalBgpNeighborId({ deviceId: "PE-1", vrf: "Base", neighborIp: "10.0.0.2" }), "BGP_NEIGHBOR|pe-1|base|10.0.0.2");
  assert.equal(canonicalPimId({ deviceId: "PE-1", vrf: "Base", interfaceName: "to-core" }), "PIM|pe-1|base|to-core|enabled");
});

test("canonical graph keeps original display casing while matching with normalized keys", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({
        id: "port-upper",
        type: "port",
        identity: "1/1/C17/1",
        fields: { port: "1/1/c17/1", "channel-group": "lag-A-6109" },
      }),
      object({
        id: "lag-upper",
        type: "lag",
        identity: "lag-A-6109",
        fields: { lag: "lag-a-6109" },
      }),
      object({
        id: "if-upper",
        type: "interface",
        identity: "To-Dobong-TOU-FB03",
        fields: { interface: "to-dobong-tou-fb03", vrf: "Base", sap: "lag-a-6109:100", address: "10.0.0.1/30" },
      }),
      object({
        id: "pim-upper",
        type: "pim",
        identity: "To-Dobong-TOU-FB03",
        fields: { interface: "to-dobong-tou-fb03", vrf: "Base" },
      }),
    ],
  });
  const portId = canonicalPortId({ deviceId: "PE-1", name: "1/1/c17/1" });
  const lagId = canonicalLagId({ deviceId: "PE-1", lag: "lag-a-6109" });
  const interfaceId = canonicalL3InterfaceId({ deviceId: "PE-1", vrf: "Base", name: "to-dobong-tou-fb03" });
  const pimId = canonicalPimId({ deviceId: "PE-1", vrf: "Base", interfaceName: "to-dobong-tou-fb03" });
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));

  assert.equal(nodes.get(portId)?.label, "1/1/C17/1");
  assert.equal(nodes.get(portId)?.attributes.name, "1/1/C17/1");
  assert.equal(nodes.get(portId)?.attributes.normalizedName, "1/1/c17/1");
  assert.equal(nodes.get(lagId)?.label, "lag-A-6109");
  assert.equal(nodes.get(lagId)?.attributes.lag, "lag-A-6109");
  assert.equal(nodes.get(lagId)?.attributes.normalizedLag, "a-6109");
  assert.equal(nodes.get(interfaceId)?.label, "To-Dobong-TOU-FB03");
  assert.equal(nodes.get(interfaceId)?.attributes.name, "To-Dobong-TOU-FB03");
  assert.equal(nodes.get(interfaceId)?.attributes.normalizedName, "to-dobong-tou-fb03");
  assert.equal(nodes.get(pimId)?.label, "To-Dobong-TOU-FB03");
  assert.equal(nodes.get(pimId)?.attributes.interface, "To-Dobong-TOU-FB03");
  assert.equal(nodes.get(pimId)?.attributes.normalizedInterface, "to-dobong-tou-fb03");
  assert.equal(graph.edges.some((edge) => edge.source === portId && edge.target === lagId), true);
  assert.equal(graph.edges.some((edge) => edge.source === lagId && edge.target === interfaceId), true);
  assert.equal(graph.edges.some((edge) => edge.source === interfaceId && edge.target === pimId), true);

  const view = buildCanonicalViewGraph([{ side: "old", graph }], { viewMode: ViewMode.SUMMARY });
  const portView = view.nodes.find((node) => node.canonicalId === portId);
  const interfaceView = view.nodes.find((node) => node.canonicalId === interfaceId);

  assert.equal(portView?.fullLabel, "1/1/C17/1");
  assert.equal(interfaceView?.fullLabel, "To-Dobong-TOU-FB03");
  assert.equal(interfaceView?.chainDetail.port.label, "1/1/C17/1");
  assert.equal(interfaceView?.chainDetail.interface.label, "To-Dobong-TOU-FB03");
  assert.equal(interfaceView?.chainDetail.pim[0]?.label, "To-Dobong-TOU-FB03");
});

test("canonical display casing can be recovered from raw new config lines", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({
        id: "if-new-raw",
        type: "interface",
        identity: "to-dobong-tou-fb01",
        sourceName: "",
        fields: { interface: "to-dobong-tou-fb01", vrf: "Base", address: "112.188.23.57/30" },
        rawLines: ['/configure { service vprn "Base" interface "To-Dobong-TOU-FB01" ipv4 primary address 112.188.23.57 prefix-length 30 }'],
      }),
      object({
        id: "pim-new-raw",
        type: "pim",
        identity: "to-dobong-tou-fb01",
        sourceName: "",
        fields: { interface: "to-dobong-tou-fb01", vrf: "Base" },
        rawLines: ['/configure { router "Base" pim interface "To-Dobong-TOU-FB01" }'],
      }),
    ],
  });
  const interfaceId = canonicalL3InterfaceId({ deviceId: "PE-1", vrf: "Base", name: "to-dobong-tou-fb01" });
  const pimId = canonicalPimId({ deviceId: "PE-1", vrf: "Base", interfaceName: "to-dobong-tou-fb01" });
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));

  assert.equal(nodes.get(interfaceId)?.label, "To-Dobong-TOU-FB01");
  assert.equal(nodes.get(interfaceId)?.attributes.name, "To-Dobong-TOU-FB01");
  assert.equal(nodes.get(pimId)?.label, "To-Dobong-TOU-FB01");
  assert.equal(nodes.get(pimId)?.attributes.interface, "To-Dobong-TOU-FB01");
});

test("canonical graph combines split interface address and prefix-length for peer mapping", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({
        id: "if-split-prefix",
        type: "interface",
        identity: "to-dobong-tou-fd04",
        sourceName: "to-Dobong-TOU-FD04",
        fields: {
          interface: "to-dobong-tou-fd04",
          vrf: "Base",
          address: "112.188.23.49",
          "prefix-length": "30",
        },
        rawLines: [
          'interface "to-Dobong-TOU-FD04" {',
          "  ipv4 {",
          "    primary {",
          "      address 112.188.23.49",
          "      prefix-length 30",
          "    }",
          "  }",
          "}",
        ],
      }),
    ],
  });
  const interfaceId = canonicalL3InterfaceId({ deviceId: "PE-1", vrf: "Base", name: "to-dobong-tou-fd04" });
  const peerId = canonicalPeerNhId({ deviceId: "PE-1", vrf: "Base", ip: "112.188.23.50" });
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));

  assert.equal(nodes.get(interfaceId)?.attributes.address, "112.188.23.49/30");
  assert.equal(nodes.get(interfaceId)?.attributes.ipAddress, "112.188.23.49");
  assert.equal(nodes.get(peerId)?.label, "112.188.23.50");
  assert.equal(graph.edges.some((edge) =>
    edge.relation === RelationKind.HAS_PEER &&
    edge.source === interfaceId &&
    edge.target === peerId
  ), true);
});

test("canonical graph keeps real interface data when wrapper duplicate and maps static BGP PIM services", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "port-fn20", type: "port", identity: "2/2/c2/1", fields: { port: "2/2/c2/1", "channel-group": "lag-B-2202" } }),
      object({ id: "lag-fn20", type: "lag", identity: "lag-B-2202", fields: { lag: "lag-B-2202" } }),
      object({
        id: "if-fn20-real",
        type: "interface",
        identity: "to-Nowon-TOU-FN20",
        fields: {
          interface: "to-nowon-tou-fn20",
          vrf: "Base",
          sap: "lag-b-2202",
          address: "112.188.27.137/30",
        },
      }),
      object({
        id: "if-fn20-wrapper",
        type: "interface",
        identity: "to-Nowon-TOU-FN20",
        fields: {
          interface: "to-nowon-tou-fn20",
          vrf: "Base",
        },
        rawLines: [
          'interface "to-Nowon-TOU-FN20" {',
          "}",
        ],
      }),
      object({
        id: "route-fn20-bgp",
        type: "static-route",
        identity: "112.188.30.71/32",
        fields: {
          route: "112.188.30.71/32",
          "next-hop": "112.188.27.138",
          vrf: "Base",
        },
      }),
      object({
        id: "bgp-fn20",
        type: "bgp",
        identity: "112.188.30.71",
        fields: {
          neighbor: "112.188.30.71",
          vrf: "Base",
        },
      }),
      object({
        id: "pim-fn20",
        type: "pim",
        identity: "to-Nowon-TOU-FN20",
        fields: {
          interface: "to-nowon-tou-fn20",
          vrf: "Base",
        },
      }),
    ],
  });
  const summary = buildCanonicalViewGraph([{ side: "new", graph }], { viewMode: ViewMode.SUMMARY });
  const interfaceId = canonicalL3InterfaceId({ deviceId: "PE-1", vrf: "Base", name: "to-nowon-tou-fn20" });
  const peerId = canonicalPeerNhId({ deviceId: "PE-1", vrf: "Base", ip: "112.188.27.138" });
  const staticId = canonicalStaticRouteId({ deviceId: "PE-1", vrf: "Base", prefix: "112.188.30.71/32", nextHop: "112.188.27.138" });
  const bgpId = canonicalBgpNeighborId({ deviceId: "PE-1", vrf: "Base", neighborIp: "112.188.30.71" });
  const pimId = canonicalPimId({ deviceId: "PE-1", vrf: "Base", interfaceName: "to-nowon-tou-fn20" });
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const rowNode = summary.nodes.find((node) => node.canonicalId === interfaceId);

  assert.equal(nodes.get(interfaceId)?.attributes.address, "112.188.27.137/30");
  assert.equal(nodes.get(interfaceId)?.attributes.ipAddress, "112.188.27.137");
  assert.deepEqual(nodes.get(interfaceId)?.attributes.lagRefs, ["lag-b-2202"]);
  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.HAS_PEER && edge.source === interfaceId && edge.target === peerId), true);
  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.USED_BY_STATIC && edge.source === peerId && edge.target === staticId), true);
  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.USED_BY_BGP && edge.source === peerId && edge.target === bgpId), true);
  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.HAS_PIM && edge.source === interfaceId && edge.target === pimId), true);
  assert.equal(rowNode?.chainDetail.port.label, "2/2/c2/1");
  assert.equal(rowNode?.chainDetail.lag.label, "lag-B-2202");
  assert.equal(rowNode?.chainDetail.interface.attributes.address, "112.188.27.137/30");
  assert.deepEqual(rowNode?.chainDetail.staticRoutes.map((route) => route.label), ["112.188.30.71/32"]);
  assert.deepEqual(rowNode?.chainDetail.bgpNeighbors.map((bgp) => bgp.label), ["112.188.30.71"]);
  assert.deepEqual(rowNode?.chainDetail.pim.map((pim) => pim.label), ["to-Nowon-TOU-FN20"]);
});

test("physical port channel-group 11 creates only PORT to LAG 11 edge", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "port-1", type: "port", identity: "1/1/1", fields: { port: "1/1/1", "channel-group": "11" } }),
      object({ id: "lag-11", type: "lag", identity: "11", fields: { lag: "11" } }),
      object({ id: "lag-12", type: "lag", identity: "12", fields: { lag: "12" } }),
    ],
  });

  const memberEdges = graph.edges.filter((edge) => edge.relation === RelationKind.MEMBER_OF);

  assert.equal(memberEdges.length, 1);
  assert.equal(memberEdges[0].source, canonicalPortId({ deviceId: "PE-1", name: "1/1/1" }));
  assert.equal(memberEdges[0].target, canonicalLagId({ deviceId: "PE-1", lag: "11" }));
  assert.equal(graph.diagnostics.some((item) => item.kind === DiagnosticKind.CONFLICT), false);
});

test("same physical port mapped to multiple LAGs is conflict and auto edge is not created", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "port-1", type: "port", identity: "1/1/1", fields: { port: "1/1/1" } }),
      object({ id: "lag-11", type: "lag", identity: "11", fields: { lag: "11", members: ["1/1/1"] } }),
      object({ id: "lag-12", type: "lag", identity: "12", fields: { lag: "12", members: ["1/1/1"] } }),
    ],
  });

  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.MEMBER_OF), false);
  assert.equal(graph.diagnostics.length, 1);
  assert.equal(graph.diagnostics[0].kind, DiagnosticKind.CONFLICT);
  assert.equal(graph.diagnostics[0].relation, RelationKind.MEMBER_OF);
  assert.deepEqual(new Set(graph.diagnostics[0].candidateNodeIds), new Set([
    canonicalLagId({ deviceId: "PE-1", lag: "11" }),
    canonicalLagId({ deviceId: "PE-1", lag: "12" }),
  ]));
});

test("LAG to L3 interface uses explicit SAP/LAG references only", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "port-1", type: "port", identity: "1/1/1", fields: { port: "1/1/1", "channel-group": "11" } }),
      object({ id: "lag-11", type: "lag", identity: "11", fields: { lag: "11" } }),
      object({
        id: "if-1",
        type: "interface",
        identity: "to-core",
        fields: { interface: "to-core", vrf: "Base", sap: "lag-11:100", address: "10.0.0.1/30" },
      }),
    ],
  });

  const hasInterface = graph.edges.find((edge) => edge.relation === RelationKind.HAS_INTERFACE);

  assert.ok(hasInterface);
  assert.equal(hasInterface.source, canonicalLagId({ deviceId: "PE-1", lag: "11" }));
  assert.equal(hasInterface.target, canonicalL3InterfaceId({ deviceId: "PE-1", vrf: "Base", name: "to-core" }));
  assert.equal(hasInterface.confidence, 100);
});

test("summary view attaches direct port references when interface has no LAG", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "port-direct", type: "port", identity: "1/1/C17/1", fields: { port: "1/1/c17/1" } }),
      object({
        id: "if-direct",
        type: "interface",
        identity: "to-direct",
        fields: { interface: "to-direct", vrf: "Base", port: "1/1/c17/1", address: "10.0.0.1/30" },
      }),
    ],
  });
  const view = buildCanonicalViewGraph([{ side: "old", graph }], { viewMode: ViewMode.SUMMARY });
  const portId = canonicalPortId({ deviceId: "PE-1", name: "1/1/c17/1" });
  const interfaceId = canonicalL3InterfaceId({ deviceId: "PE-1", vrf: "Base", name: "to-direct" });
  const interfaceView = view.nodes.find((node) => node.canonicalId === interfaceId);

  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.HAS_INTERFACE), false);
  assert.equal(interfaceView?.chainDetail.port.id, portId);
  assert.equal(interfaceView?.chainDetail.lag, null);
  assert.equal(view.edges.some((edge) =>
    edge.relation === "DIRECT_PORT_INTERFACE" &&
    edge.canonicalSourceId === portId &&
    edge.canonicalTargetId === interfaceId
  ), true);
});

test("summary view attaches direct SAP physical port references when interface has no LAG", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "port-mn", type: "port", identity: "1/1/C17/1", fields: { port: "1/1/c17/1" } }),
      object({
        id: "if-mn",
        type: "interface",
        identity: "To-MNT#1",
        fields: { interface: "to-mnt#1", vrf: "Base", sap: "1/1/c17/1:100", address: "112.188.16.26/30" },
      }),
    ],
  });
  const view = buildCanonicalViewGraph([{ side: "old", graph }], { viewMode: ViewMode.SUMMARY });
  const portId = canonicalPortId({ deviceId: "PE-1", name: "1/1/c17/1" });
  const interfaceId = canonicalL3InterfaceId({ deviceId: "PE-1", vrf: "Base", name: "to-mnt#1" });
  const interfaceView = view.nodes.find((node) => node.canonicalId === interfaceId);

  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.HAS_INTERFACE), false);
  assert.equal(interfaceView?.chainDetail.port.id, portId);
  assert.equal(interfaceView?.chainDetail.lag, null);
});

test("ambiguous LAG to interface candidate does not create HAS_INTERFACE edge", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "port-1", type: "port", identity: "1/1/1", fields: { port: "1/1/1", "channel-group": "11" } }),
      object({ id: "port-2", type: "port", identity: "1/1/2", fields: { port: "1/1/2", "channel-group": "12" } }),
      object({ id: "lag-11", type: "lag", identity: "11", fields: { lag: "11" } }),
      object({ id: "lag-12", type: "lag", identity: "12", fields: { lag: "12" } }),
      object({
        id: "if-1",
        type: "interface",
        identity: "to-core",
        fields: { interface: "to-core", vrf: "Base", lag: "11", sap: "lag-12:100" },
      }),
    ],
  });

  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.HAS_INTERFACE), false);
  assert.equal(graph.diagnostics.some((item) =>
    item.kind === DiagnosticKind.AMBIGUOUS &&
    item.relation === RelationKind.HAS_INTERFACE
  ), true);
});

test("canonical builder creates no forbidden transitive edges", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "port-1", type: "port", identity: "1/1/1", fields: { port: "1/1/1", "channel-group": "11" } }),
      object({ id: "lag-11", type: "lag", identity: "11", fields: { lag: "11" } }),
      object({ id: "if-1", type: "interface", identity: "to-core", fields: { interface: "to-core", vrf: "Base", sap: "lag-11:100", address: "10.0.0.1/30" } }),
      object({ id: "route-1", type: "static-route", identity: "0.0.0.0/0", fields: { route: "0.0.0.0/0", "next-hop": "10.0.0.2", vrf: "Base" } }),
      object({ id: "bgp-1", type: "bgp", identity: "10.0.0.2", fields: { neighbor: "10.0.0.2", vrf: "Base" } }),
      object({ id: "pim-1", type: "pim", identity: "to-core", fields: { interface: "to-core", vrf: "Base" } }),
    ],
  });

  const forbidden = edgeKinds(graph).filter((edge) =>
    [NodeKind.PORT, NodeKind.LAG].includes(edge.sourceKind) &&
    [NodeKind.STATIC_ROUTE, NodeKind.BGP_NEIGHBOR, NodeKind.PIM].includes(edge.targetKind)
  );

  assert.deepEqual(forbidden, []);
});

test("every canonical edge has relation confidence and evidence", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "port-1", type: "port", identity: "1/1/1", fields: { port: "1/1/1", "channel-group": "11" } }),
      object({ id: "lag-11", type: "lag", identity: "11", fields: { lag: "11" } }),
      object({ id: "if-1", type: "interface", identity: "to-core", fields: { interface: "to-core", sap: "lag-11:100" } }),
    ],
  });

  assert.ok(graph.edges.length > 0);
  for (const edge of graph.edges) {
    assert.ok(edge.relation);
    assert.equal(Number.isFinite(edge.confidence), true);
    assert.ok(Array.isArray(edge.evidence));
    assert.ok(edge.evidence.length > 0);
    assert.ok(edge.evidence.every((item) => item.source));
  }
});

test("static route maps through explicit outgoing interface with confidence 100", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-1", type: "interface", identity: "to-core", fields: { interface: "to-core", vrf: "Base", address: "10.0.0.1/30" } }),
      object({
        id: "route-1",
        type: "static-route",
        identity: "192.0.2.0/24",
        fields: { route: "192.0.2.0/24", "next-hop": "203.0.113.1", "outgoing-interface": "to-core", vrf: "Base" },
      }),
    ],
  });

  const routeEdge = graph.edges.find((edge) => edge.relation === RelationKind.USED_BY_STATIC);

  assert.ok(routeEdge);
  assert.equal(routeEdge.source, canonicalPeerNhId({ deviceId: "PE-1", vrf: "Base", ip: "203.0.113.1" }));
  assert.equal(routeEdge.target, canonicalStaticRouteId({ deviceId: "PE-1", vrf: "Base", prefix: "192.0.2.0/24", nextHop: "203.0.113.1" }));
  assert.equal(routeEdge.confidence, 100);
});

test("static route peer IP and connected subnet candidates use requested confidence levels", () => {
  const peerGraph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-peer", type: "interface", identity: "to-peer", fields: { interface: "to-peer", vrf: "Base", address: "10.0.0.1/30" } }),
      object({ id: "route-peer", type: "static-route", identity: "198.51.100.0/24", fields: { route: "198.51.100.0/24", "next-hop": "10.0.0.2", vrf: "Base" } }),
    ],
  });
  const subnetGraph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-subnet", type: "interface", identity: "access", fields: { interface: "access", vrf: "Base", address: "10.0.0.1/29" } }),
      object({ id: "route-subnet", type: "static-route", identity: "203.0.113.0/24", fields: { route: "203.0.113.0/24", "next-hop": "10.0.0.6", vrf: "Base" } }),
    ],
  });

  assert.equal(peerGraph.edges.find((edge) => edge.relation === RelationKind.USED_BY_STATIC)?.confidence, 95);
  assert.equal(subnetGraph.edges.find((edge) => edge.relation === RelationKind.USED_BY_STATIC)?.confidence, 70);
});

test("static route with tied top interface candidates is ambiguous and creates no route edge", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-a", type: "interface", identity: "a", fields: { interface: "a", vrf: "Base", address: "10.0.0.1/29" } }),
      object({ id: "if-b", type: "interface", identity: "b", fields: { interface: "b", vrf: "Base", address: "10.0.0.9/28" } }),
      object({ id: "route-1", type: "static-route", identity: "203.0.113.0/24", fields: { route: "203.0.113.0/24", "next-hop": "10.0.0.6", vrf: "Base" } }),
    ],
  });

  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.USED_BY_STATIC), false);
  assert.equal(graph.diagnostics.some((item) =>
    item.kind === DiagnosticKind.AMBIGUOUS &&
    item.relation === RelationKind.USED_BY_STATIC
  ), true);
});

test("BGP neighbor maps through connected peer and multihop uses static reachability only", () => {
  const directGraph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-1", type: "interface", identity: "to-bgp", fields: { interface: "to-bgp", vrf: "Base", address: "10.0.0.1/30" } }),
      object({ id: "bgp-1", type: "bgp", identity: "10.0.0.2", fields: { neighbor: "10.0.0.2", vrf: "Base" } }),
    ],
  });
  const multihopGraph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-2", type: "interface", identity: "to-core", fields: { interface: "to-core", vrf: "Base", address: "10.0.0.1/30" } }),
      object({ id: "route-2", type: "static-route", identity: "192.0.2.2/32", fields: { route: "192.0.2.2/32", "next-hop": "10.0.0.2", vrf: "Base" } }),
      object({ id: "bgp-2", type: "bgp", identity: "192.0.2.2", fields: { neighbor: "192.0.2.2", "ebgp-multihop": "true", vrf: "Base" } }),
    ],
  });

  const directEdge = directGraph.edges.find((edge) => edge.relation === RelationKind.USED_BY_BGP);
  const multihopEdge = multihopGraph.edges.find((edge) => edge.relation === RelationKind.USED_BY_BGP);

  assert.ok(directEdge);
  assert.equal(directEdge.source, canonicalPeerNhId({ deviceId: "PE-1", vrf: "Base", ip: "10.0.0.2" }));
  assert.equal(directEdge.confidence, 95);
  assert.ok(multihopEdge);
  assert.equal(multihopEdge.source, canonicalPeerNhId({ deviceId: "PE-1", vrf: "Base", ip: "10.0.0.2" }));
  assert.equal(multihopEdge.target, canonicalBgpNeighborId({ deviceId: "PE-1", vrf: "Base", neighborIp: "192.0.2.2" }));
  assert.equal(multihopEdge.reason, "bgp-static-reachability");
});

test("BGP neighbor can be resolved from raw config when normalized fields miss neighbor", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-raw-bgp", type: "interface", identity: "to-bgp", fields: { interface: "to-bgp", vrf: "Base", address: "112.188.23.57/30" } }),
      object({
        id: "bgp-raw",
        type: "bgp",
        identity: "",
        sourceName: "",
        fields: { vrf: "Base" },
        rawLines: ['/configure { router "Base" bgp neighbor "112.188.23.58" group "SER-PEER" }'],
      }),
    ],
  });

  assert.equal(graph.edges.some((edge) =>
    edge.relation === RelationKind.USED_BY_BGP &&
    edge.source === canonicalPeerNhId({ deviceId: "PE-1", vrf: "Base", ip: "112.188.23.58" }) &&
    edge.target === canonicalBgpNeighborId({ deviceId: "PE-1", vrf: "Base", neighborIp: "112.188.23.58" })
  ), true);
});

test("Base and default VRF are equivalent for static BGP and PIM table services", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-base", type: "interface", identity: "to-core", fields: { interface: "to-core", router: "Base", address: "10.0.0.1/30" } }),
      object({ id: "route-default", type: "static-route", identity: "192.0.2.0/24", fields: { route: "192.0.2.0/24", "next-hop": "10.0.0.2" } }),
      object({ id: "bgp-default", type: "bgp", identity: "10.0.0.2", fields: { neighbor: "10.0.0.2" } }),
      object({ id: "pim-default", type: "pim", identity: "to-core", fields: { interface: "to-core" } }),
    ],
  });
  const summary = buildCanonicalViewGraph([{ side: "new", graph }], { viewMode: ViewMode.SUMMARY });
  const servicesNode = summary.nodes.find((node) => node.serviceAggregate);

  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.USED_BY_STATIC), true);
  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.USED_BY_BGP), true);
  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.HAS_PIM), true);
  assert.equal(servicesNode?.label, "Static 1 | BGP 1 | PIM 1");
});

test("unreachable BGP multihop neighbor is unresolved", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-1", type: "interface", identity: "to-core", fields: { interface: "to-core", vrf: "Base", address: "10.0.0.1/30" } }),
      object({ id: "bgp-1", type: "bgp", identity: "192.0.2.2", fields: { neighbor: "192.0.2.2", "ebgp-multihop": "true", vrf: "Base" } }),
    ],
  });

  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.USED_BY_BGP), false);
  assert.equal(graph.diagnostics.some((item) =>
    item.kind === DiagnosticKind.UNRESOLVED &&
    item.relation === RelationKind.USED_BY_BGP
  ), true);
});

test("PIM interface enable and neighbor are represented as separate direct relations", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-1", type: "interface", identity: "to-pim", fields: { interface: "to-pim", vrf: "Base", address: "10.0.0.1/30" } }),
      object({ id: "pim-1", type: "pim", identity: "to-pim", fields: { interface: "to-pim", neighbor: "10.0.0.2", vrf: "Base" } }),
    ],
  });

  const enableEdge = graph.edges.find((edge) => edge.relation === RelationKind.HAS_PIM);
  const neighborEdge = graph.edges.find((edge) => edge.relation === RelationKind.USED_BY_PIM);

  assert.ok(enableEdge);
  assert.equal(enableEdge.source, canonicalL3InterfaceId({ deviceId: "PE-1", vrf: "Base", name: "to-pim" }));
  assert.equal(enableEdge.target, canonicalPimId({ deviceId: "PE-1", vrf: "Base", interfaceName: "to-pim" }));
  assert.ok(neighborEdge);
  assert.equal(neighborEdge.source, canonicalPeerNhId({ deviceId: "PE-1", vrf: "Base", ip: "10.0.0.2" }));
  assert.equal(neighborEdge.target, canonicalPimNeighborId({ deviceId: "PE-1", vrf: "Base", interfaceName: "to-pim", neighborIp: "10.0.0.2" }));
});

test("PIM enable without neighbor does not create PIM neighbor edge", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-1", type: "interface", identity: "to-pim", fields: { interface: "to-pim", vrf: "Base", address: "10.0.0.1/30" } }),
      object({ id: "pim-1", type: "pim", identity: "to-pim", fields: { interface: "to-pim", vrf: "Base" } }),
    ],
  });

  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.HAS_PIM), true);
  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.USED_BY_PIM), false);
  assert.equal(graph.nodes.some((node) => node.kind === NodeKind.PIM_NEIGHBOR), false);
});

test("subscriber-interface aliases group-interface so PIM appears on the subscriber path row", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "port-fb03", type: "port", identity: "6/1/c9/1", fields: { port: "6/1/c9/1" } }),
      object({ id: "lag-fb03", type: "lag", identity: "lag-A-6109", fields: { lag: "lag-A-6109", members: ["6/1/c9/1"] } }),
      object({
        id: "sub-fb03",
        type: "subscriber-interface",
        identity: "to-Dobong-TOU-FB03",
        fields: {
          "subscriber-interface": "to-dobong-tou-fb03",
          "group-interface": "g-to-dobong-tou-fb03",
          sap: "lag-a-6109",
          address: "112.188.21.53/30",
          vrf: "Base",
        },
      }),
      object({ id: "pim-fb03", type: "pim", identity: "g-to-Dobong-TOU-FB03", fields: { interface: "g-to-dobong-tou-fb03", vrf: "Base" } }),
    ],
  });
  const summary = buildCanonicalViewGraph([{ side: "new", graph }], { viewMode: ViewMode.SUMMARY });
  const interfaceId = canonicalL3InterfaceId({ deviceId: "PE-1", vrf: "Base", name: "to-dobong-tou-fb03" });
  const rowNode = summary.nodes.find((node) => node.canonicalId === interfaceId);

  assert.equal(graph.edges.some((edge) =>
    edge.relation === RelationKind.HAS_PIM &&
    edge.source === interfaceId &&
    edge.target === canonicalPimId({ deviceId: "PE-1", vrf: "Base", interfaceName: "g-to-dobong-tou-fb03" })
  ), true);
  assert.equal(rowNode?.chainDetail.port.label, "6/1/c9/1");
  assert.equal(rowNode?.chainDetail.lag.label, "lag-A-6109");
  assert.equal(rowNode?.chainDetail.interface.label, "to-Dobong-TOU-FB03");
  assert.equal(rowNode?.chainDetail.pim[0]?.label, "g-to-Dobong-TOU-FB03");
});

test("summary view restores LAG and PORT from interface SAP refs when HAS_INTERFACE is ambiguous", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "port-11", type: "port", identity: "2/1/1", fields: { port: "2/1/1" } }),
      object({ id: "port-12", type: "port", identity: "2/1/2", fields: { port: "2/1/2" } }),
      object({ id: "lag-11", type: "lag", identity: "lag-A-11", fields: { lag: "lag-A-11", members: ["2/1/1"] } }),
      object({ id: "lag-12", type: "lag", identity: "lag-A-12", fields: { lag: "lag-A-12", members: ["2/1/2"] } }),
      object({
        id: "sub-ambiguous",
        type: "subscriber-interface",
        identity: "to-branch",
        fields: {
          "subscriber-interface": "to-branch",
          sap: "lag-a-11, lag-a-12",
          address: "10.0.0.1/30",
          vrf: "Base",
        },
      }),
    ],
  });
  const summary = buildCanonicalViewGraph([{ side: "old", graph }], { viewMode: ViewMode.SUMMARY });
  const interfaceId = canonicalL3InterfaceId({ deviceId: "PE-1", vrf: "Base", name: "to-branch" });
  const rows = summary.nodes
    .filter((node) => node.canonicalId === interfaceId)
    .map((node) => node.chainDetail);

  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.HAS_INTERFACE), false);
  assert.deepEqual(new Set(rows.map((row) => row.lag?.label)), new Set(["lag-A-11", "lag-A-12"]));
  assert.deepEqual(new Set(rows.map((row) => row.port?.label)), new Set(["2/1/1", "2/1/2"]));
});

test("summary view uses trace matrix columns and service aggregate", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "port-1", type: "port", identity: "1/1/1", fields: { port: "1/1/1", "channel-group": "11" } }),
      object({ id: "lag-11", type: "lag", identity: "11", fields: { lag: "11" } }),
      object({ id: "if-1", type: "interface", identity: "to-core", fields: { interface: "to-core", vrf: "Base", sap: "lag-11:100", address: "10.0.0.1/30" } }),
      object({ id: "route-1", type: "static-route", identity: "192.0.2.0/24", fields: { route: "192.0.2.0/24", "next-hop": "10.0.0.2", vrf: "Base" } }),
      object({ id: "bgp-1", type: "bgp", identity: "10.0.0.2", fields: { neighbor: "10.0.0.2", vrf: "Base" } }),
      object({ id: "pim-1", type: "pim", identity: "to-core", fields: { interface: "to-core", vrf: "Base" } }),
    ],
  });
  const view = buildCanonicalViewGraph([{ side: "old", graph }], { viewMode: ViewMode.SUMMARY });
  const byCanonical = new Map(view.nodes.map((node) => [node.canonicalId, node]));
  const servicesNode = view.nodes.find((node) => node.serviceAggregate);

  assert.equal(view.fixedView, true);
  assert.equal(view.viewLayout, "trace-matrix");
  assert.deepEqual(view.columnOrder, [
    NodeKind.PORT,
    NodeKind.LAG,
    NodeKind.L3_INTERFACE,
    NodeKind.PEER_NH,
    COLUMN_SERVICES,
  ]);
  assert.equal(byCanonical.get(canonicalPortId({ deviceId: "PE-1", name: "1/1/1" })).position.x, view.columnX[NodeKind.PORT]);
  assert.equal(byCanonical.get(canonicalLagId({ deviceId: "PE-1", lag: "11" })).position.x, view.columnX[NodeKind.LAG]);
  assert.equal(byCanonical.get(canonicalL3InterfaceId({ deviceId: "PE-1", vrf: "Base", name: "to-core" })).position.x, view.columnX[NodeKind.L3_INTERFACE]);
  assert.equal(byCanonical.get(canonicalPeerNhId({ deviceId: "PE-1", vrf: "Base", ip: "10.0.0.2" })).position.x, view.columnX[NodeKind.PEER_NH]);
  assert.equal(servicesNode?.position.x, view.columnX[COLUMN_SERVICES]);
  assert.equal(servicesNode?.label, "Static 1 | BGP 1 | PIM 1");
  assert.equal(view.nodes.some((node) => node.canonicalKind === NodeKind.STATIC_ROUTE), false);
  assert.equal(view.nodes.some((node) => node.canonicalKind === NodeKind.BGP_NEIGHBOR), false);
  assert.equal(view.nodes.some((node) => node.canonicalKind === NodeKind.PIM), false);
});

test("summary view labels multiple static routes as Static N and detail unfolds them", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-1", type: "interface", identity: "to-core", fields: { interface: "to-core", vrf: "Base", address: "10.0.0.1/30" } }),
      object({ id: "route-1", type: "static-route", identity: "192.0.2.0/24", fields: { route: "192.0.2.0/24", "next-hop": "10.0.0.2", vrf: "Base" } }),
      object({ id: "route-2", type: "static-route", identity: "198.51.100.0/24", fields: { route: "198.51.100.0/24", "next-hop": "10.0.0.2", vrf: "Base" } }),
    ],
  });
  const summary = buildCanonicalViewGraph([{ side: "old", graph }], { viewMode: ViewMode.SUMMARY });
  const detail = buildCanonicalViewGraph([{ side: "old", graph }], { viewMode: ViewMode.DETAIL });
  const aggregate = summary.nodes.find((node) => node.serviceAggregate);
  const detailStaticNodes = detail.nodes.filter((node) => node.canonicalKind === NodeKind.STATIC_ROUTE);

  assert.ok(aggregate);
  assert.match(aggregate.label, /Static 2/);
  assert.equal(summary.nodes.some((node) => node.canonicalKind === NodeKind.STATIC_ROUTE), false);
  assert.deepEqual(new Set(detailStaticNodes.map((node) => node.canonicalId)), new Set([
    canonicalStaticRouteId({ deviceId: "PE-1", vrf: "Base", prefix: "192.0.2.0/24", nextHop: "10.0.0.2" }),
    canonicalStaticRouteId({ deviceId: "PE-1", vrf: "Base", prefix: "198.51.100.0/24", nextHop: "10.0.0.2" }),
  ]));
  assert.equal(detailStaticNodes.length, 2);
});

test("summary view places old config on the left and new config on the right", () => {
  const oldGraph = buildCanonicalGraph({
    deviceId: "old",
    objects: [
      object({ id: "old-port", type: "port", identity: "1/1/1", fields: { port: "1/1/1", "channel-group": "11" } }),
      object({ id: "old-lag", type: "lag", identity: "11", fields: { lag: "11" } }),
      object({ id: "old-if", type: "interface", identity: "to-old", fields: { interface: "to-old", sap: "lag-11:100", address: "10.0.0.1/30" } }),
    ],
  });
  const newGraph = buildCanonicalGraph({
    deviceId: "new",
    objects: [
      object({ id: "new-port", type: "port", identity: "2/1/1", fields: { port: "2/1/1", "channel-group": "22" } }),
      object({ id: "new-lag", type: "lag", identity: "22", fields: { lag: "22" } }),
      object({ id: "new-if", type: "interface", identity: "to-new", fields: { interface: "to-new", sap: "lag-22:100", address: "10.0.0.5/30" } }),
    ],
  });

  const view = buildCanonicalViewGraph([
    { side: "old", graph: oldGraph },
    { side: "new", graph: newGraph },
  ], { viewMode: ViewMode.SUMMARY });
  const oldPort = view.nodes.find((node) => node.side === "old" && node.canonicalKind === NodeKind.PORT);
  const newPort = view.nodes.find((node) => node.side === "new" && node.canonicalKind === NodeKind.PORT);
  const oldHeader = view.nodes.find((node) => node.id === "side-header:summary:old");
  const newHeader = view.nodes.find((node) => node.id === "side-header:summary:new");

  assert.ok(oldPort);
  assert.ok(newPort);
  assert.ok(oldHeader);
  assert.ok(newHeader);
  assert.equal(oldPort.position.x, view.sideLayouts[0].x + view.columnX[NodeKind.PORT]);
  assert.equal(newPort.position.x, view.sideLayouts[1].x + view.columnX[NodeKind.PORT]);
  assert.ok(newPort.position.x > oldPort.position.x);
  assert.ok(view.sideLayouts[1].x >= view.sideLayouts[0].x + view.sideLayouts[0].width);
  assert.equal(oldHeader.label, "기존 설정");
  assert.equal(newHeader.label, "신규 설정");
});

test("detail view does not reserve BGP column when BGP nodes are absent", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-1", type: "interface", identity: "to-core", fields: { interface: "to-core", vrf: "Base", address: "10.0.0.1/30" } }),
      object({ id: "route-1", type: "static-route", identity: "192.0.2.0/24", fields: { route: "192.0.2.0/24", "next-hop": "10.0.0.2", vrf: "Base" } }),
      object({ id: "pim-1", type: "pim", identity: "to-core", fields: { interface: "to-core", vrf: "Base" } }),
    ],
  });
  const detail = buildCanonicalViewGraph([{ side: "old", graph }], { viewMode: ViewMode.DETAIL });

  assert.equal(detail.columnOrder.includes(NodeKind.STATIC_ROUTE), true);
  assert.equal(detail.columnOrder.includes(NodeKind.BGP_NEIGHBOR), false);
  assert.equal(detail.columnOrder.includes(NodeKind.PIM), true);
  assert.equal(detail.columnX[NodeKind.BGP_NEIGHBOR], undefined);
  assert.equal(detail.columnX[NodeKind.PIM], detail.columnX[NodeKind.STATIC_ROUTE] + 160 + 80);
});

test("PIM branches from interface or peer and is never connected as static child", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-1", type: "interface", identity: "to-core", fields: { interface: "to-core", vrf: "Base", address: "10.0.0.1/30" } }),
      object({ id: "route-1", type: "static-route", identity: "192.0.2.0/24", fields: { route: "192.0.2.0/24", "next-hop": "10.0.0.2", vrf: "Base" } }),
      object({ id: "pim-1", type: "pim", identity: "to-core", fields: { interface: "to-core", vrf: "Base", neighbor: "10.0.0.2" } }),
    ],
  });
  const detail = buildCanonicalViewGraph([{ side: "old", graph }], { viewMode: ViewMode.DETAIL });
  const staticNodeIds = new Set(detail.nodes.filter((node) => node.canonicalKind === NodeKind.STATIC_ROUTE).map((node) => node.id));
  const pimNodeIds = new Set(detail.nodes.filter((node) => [NodeKind.PIM, NodeKind.PIM_NEIGHBOR].includes(node.canonicalKind)).map((node) => node.id));

  assert.equal(detail.edges.some((edge) => staticNodeIds.has(edge.source) && pimNodeIds.has(edge.target)), false);
  assert.equal(detail.edges.some((edge) => edge.relation === RelationKind.HAS_PIM || edge.relation === RelationKind.USED_BY_PIM), true);
});

test("view rows show BGP neighbors reached through ambiguous host static routes", () => {
  const graph = buildCanonicalGraph({
    deviceId: "PE-1",
    objects: [
      object({ id: "if-1", type: "interface", identity: "To-PE#1-1", fields: { interface: "To-PE#1-1", vrf: "Base", address: "14.59.4.66/30" } }),
      object({ id: "if-2", type: "interface", identity: "To-PE#1-2", fields: { interface: "To-PE#1-2", vrf: "Base", address: "14.59.4.70/30" } }),
      object({ id: "route-1", type: "static-route", identity: "125.144.1.97/32", fields: { route: "125.144.1.97/32", "next-hop": ["14.59.4.65", "14.59.4.69"], vrf: "Base" } }),
      object({ id: "bgp-1", type: "bgp", identity: "125.144.1.97", fields: { neighbor: "125.144.1.97", vrf: "Base" } }),
    ],
  });
  const view = buildCanonicalViewGraph([{ side: "new", graph }], { viewMode: ViewMode.SUMMARY });
  const rows = view.nodes
    .map((node) => node.chainDetail)
    .filter((detail, index, list) => detail?.interface && list.findIndex((item) => item?.chainId === detail.chainId) === index);
  const targetRows = rows.filter((detail) => /^To-PE#1-[12]$/.test(detail.interface.label));

  assert.equal(graph.edges.some((edge) => edge.relation === RelationKind.USED_BY_BGP), false);
  assert.equal(targetRows.length, 2);
  assert.deepEqual(targetRows.map((detail) => detail.bgpNeighbors.map((node) => node.label)), [
    ["125.144.1.97"],
    ["125.144.1.97"],
  ]);
});

test("invalid transitive edge is rejected by graph edge factory", () => {
  assert.throws(() => createGraphEdge({
    source: "port",
    target: "route",
    sourceKind: NodeKind.PORT,
    targetKind: NodeKind.STATIC_ROUTE,
    relation: RelationKind.USED_BY_STATIC,
    confidence: 100,
    evidence: { source: "config", reason: "invalid-test" },
  }), /Transitive or invalid relation/);
});
