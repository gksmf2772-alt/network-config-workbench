import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFieldOverlapAnalysis,
  buildGraphData,
  buildReviewItems,
  buildSummaryDashboardData,
} from "../src/core/summaryAnalytics.js";

const plan = [
  {
    id: "route-1",
    status: "matched",
    reason: "auto",
    objectType: "static-route",
    score: 92,
    oldObject: {
      id: "old-route",
      normalizedType: "static-route",
      normalizedIdentity: "10.0.0.0/24",
      fields: {
        route: "10.0.0.0/24",
        gateway: "192.0.2.1",
        tag: "100",
      },
    },
    newObject: {
      id: "new-route",
      normalizedType: "static-route",
      normalizedIdentity: "10.0.0.0/24",
      fields: {
        route: "10.0.0.0/24",
        "next-hop": "192.0.2.1",
        tag: "200",
      },
    },
    fieldSummary: {
      route: { status: "equal" },
      gateway: { status: "equal" },
      tag: { status: "changed" },
    },
  },
  {
    id: "bgp-old",
    status: "old-only",
    objectType: "bgp",
    oldObject: {
      id: "old-bgp",
      normalizedType: "bgp",
      normalizedIdentity: "65000:192.0.2.2",
      fields: { neighbor: "192.0.2.2" },
    },
  },
  {
    id: "sap-new",
    status: "new-only",
    objectType: "sap",
    newObject: {
      id: "new-sap",
      normalizedType: "sap",
      normalizedIdentity: "1/1/1:100",
      fields: { sap: "1/1/1:100" },
    },
  },
  {
    id: "if-low",
    status: "matched",
    reason: "auto",
    objectType: "interface",
    score: 58,
    oldObject: {
      normalizedType: "interface",
      normalizedIdentity: "to-core",
      fields: { address: "10.0.0.1/31", description: "old" },
    },
    newObject: {
      normalizedType: "interface",
      normalizedIdentity: "to-core",
      fields: { address: "10.0.0.2/31", mtu: "9216" },
    },
    fieldSummary: {
      address: { status: "changed" },
      description: { status: "missing" },
      mtu: { status: "added" },
    },
    ambiguousAlternatives: [
      { id: "if-candidate", normalizedIdentity: "to-core-2", score: 55 },
    ],
    relationshipSummary: [
      { status: "changed", type: "parent", target: "lag-10" },
    ],
  },
];

test("field overlap aggregates aliases and changed fields", () => {
  const analysis = buildFieldOverlapAnalysis(plan);
  const route = analysis.pairs.find((pair) => pair.objectType === "static-route");

  assert.equal(route.sameFields, 2);
  assert.equal(route.differentFields, 1);
  assert.equal(route.aliasMatches.includes("next-hop"), true);
  assert.equal(analysis.aggregateByType.some((row) => row.objectType === "interface"), true);
});

test("review items expose unmatched, ambiguous, low confidence, and relationship changes", () => {
  const review = buildReviewItems(plan);

  assert.equal(review.unmatchedOld.length, 1);
  assert.equal(review.unmatchedNew.length, 1);
  assert.equal(review.ambiguous.length, 1);
  assert.equal(review.lowConfidence.length, 1);
  assert.equal(review.relationshipChanges.length, 1);
  assert.ok(review.critical.length >= 2);
});

test("graph data creates mapping and relationship edges", () => {
  const graph = buildGraphData({ plan });

  assert.ok(graph.nodes.some((node) => node.side === "old"));
  assert.ok(graph.nodes.some((node) => node.side === "new"));
  assert.ok(graph.edges.some((edge) => edge.type === "mapping"));
  assert.ok(graph.edges.some((edge) => edge.type === "relationship"));
});

test("dashboard data derives operator severity and line metrics", () => {
  const dashboard = buildSummaryDashboardData({
    report: {
      summary: { total: 3, changed: 1, missing: 1, added: 1 },
      diffRows: [
        { oldState: "equal", newState: "equal" },
        { oldState: "missing", newState: "placeholder" },
        { oldState: "placeholder", newState: "added" },
      ],
    },
    plan,
    semanticSummary: {
      totalObjects: plan.length,
      matchPercent: 50,
      coveragePercent: 25,
      lineCovered: 1,
      lineTotal: 4,
    },
    support: { state: "supported", label: "지원됨" },
  });

  assert.equal(dashboard.lineSummary.removed, 1);
  assert.equal(dashboard.lineSummary.added, 1);
  assert.equal(dashboard.lowCoverage, true);
  assert.equal(dashboard.severity.level, "critical");
});
