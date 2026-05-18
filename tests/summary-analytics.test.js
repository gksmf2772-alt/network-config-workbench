import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

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

test("common field analysis excludes suppressed fields from policy-applied rate", () => {
  const oldFields = {};
  const newFields = {};
  const fieldSummary = {};

  for (let index = 0; index < 10; index += 1) {
    const field = `same-${index}`;
    oldFields[field] = "same";
    newFields[field] = "same";
    fieldSummary[field] = { field, status: "equal", oldValues: ["same"], newValues: ["same"] };
  }
  for (let index = 0; index < 5; index += 1) {
    const field = `diff-${index}`;
    oldFields[field] = "old";
    newFields[field] = "new";
    fieldSummary[field] = { field, status: "changed", oldValues: ["old"], newValues: ["new"] };
  }
  for (let index = 0; index < 3; index += 1) {
    const field = `diff-${index}`;
    fieldSummary[field] = {
      ...fieldSummary[field],
      ignored: true,
      effectiveStatus: "ignored",
      policyHits: [{ sourcePolicy: "profile-exception" }],
    };
  }

  const analysis = buildFieldOverlapAnalysis([{
    id: "policy-rate",
    status: "matched",
    objectType: "bgp",
    score: 100,
    oldObject: { normalizedType: "bgp", normalizedIdentity: "peer", fields: oldFields },
    newObject: { normalizedType: "bgp", normalizedIdentity: "peer", fields: newFields },
    fieldSummary,
  }]);

  assert.equal(analysis.aggregate.sameFields, 10);
  assert.equal(analysis.aggregate.differentFields, 2);
  assert.equal(analysis.aggregate.suppressedFields, 3);
  assert.equal(analysis.aggregate.totalComparableFields, 12);
  assert.equal(analysis.aggregate.rawTotalComparableFields, 15);
  assert.equal(analysis.aggregate.rawDifferentFields, 5);
  assert.equal(analysis.aggregate.rawOverlapPercent, 67);
  assert.equal(analysis.aggregate.overlapPercent, 83);
});

test("profile exception changes common field analysis and type breakdown", () => {
  const exceptionPlan = [{
    id: "bgp-profile-exception",
    status: "matched",
    objectType: "bgp",
    score: 100,
    oldObject: {
      normalizedType: "bgp",
      normalizedIdentity: "peer",
      fields: { neighbor: "192.0.2.1", group: "old-group", "admin-state": "disable" },
    },
    newObject: {
      normalizedType: "bgp",
      normalizedIdentity: "peer",
      fields: { neighbor: "192.0.2.1", group: "new-group", "admin-state": "enable" },
    },
    fieldSummary: {
      neighbor: { field: "neighbor", status: "equal", oldValues: ["192.0.2.1"], newValues: ["192.0.2.1"] },
      group: {
        field: "group",
        status: "changed",
        effectiveStatus: "ignored",
        ignored: true,
        oldValues: ["old-group"],
        newValues: ["new-group"],
        policyHits: [{ sourcePolicy: "profile-exception" }],
      },
      "admin-state": {
        field: "admin-state",
        status: "changed",
        oldValues: ["disable"],
        newValues: ["enable"],
      },
    },
  }];
  const analysis = buildFieldOverlapAnalysis(exceptionPlan);
  const review = buildReviewItems(exceptionPlan);
  const bgp = analysis.aggregateByType.find((row) => row.objectType === "bgp");

  assert.equal(analysis.aggregate.rawOverlapPercent, 33);
  assert.equal(analysis.aggregate.overlapPercent, 50);
  assert.equal(analysis.aggregate.suppressedFields, 1);
  assert.equal(analysis.aggregate.differentFields, 1);
  assert.equal(bgp.changedFields, 1);
  assert.equal(bgp.suppressedFields, 1);
  assert.deepEqual(
    review.abnormal[0].fieldRows
      .filter((row) => !["same", "equal", "present"].includes(row.status))
      .map((row) => row.field),
    ["state"]
  );
});

test("integrated report uses summary field analysis object", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [{
      id: "report-rate",
      status: "matched",
      objectType: "interface",
      score: 100,
      oldObject: { normalizedType: "interface", normalizedIdentity: "lag-1", fields: { name: "lag-1", description: "old" } },
      newObject: { normalizedType: "interface", normalizedIdentity: "lag-1", fields: { name: "lag-1", description: "new" } },
      fieldSummary: {
        name: { field: "name", status: "equal", oldValues: ["lag-1"], newValues: ["lag-1"] },
        description: {
          field: "description",
          status: "changed",
          ignored: true,
          effectiveStatus: "ignored",
          policyHits: [{ sourcePolicy: "user-exception" }],
        },
      },
    }],
    semanticSummary: {},
  });
  const source = fs.readFileSync("src/core/legacyCore.js", "utf8");

  assert.equal(dashboard.fieldAnalysis.aggregate.rawOverlapPercent, 50);
  assert.equal(dashboard.fieldAnalysis.aggregate.overlapPercent, 100);
  assert.equal((source.match(/renderFieldOverlapSummary\(fieldAnalysis\)/g) || []).length >= 2, true);
});

test("integrated report rebuilds dashboard instead of reusing stale exception cache", () => {
  const source = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const body = source.match(/function renderOverviewReport\(report\) \{([\s\S]*?)\n\}/)?.[1] || "";

  assert.match(body, /const dashboard = buildCurrentDashboardData\(report\);/);
  assert.doesNotMatch(body, /lastDashboardData\s*\|\|/);
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
