import test from "node:test";
import assert from "node:assert/strict";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
} from "../src/core/comparator.js";
import {
  applySemanticPlanVisualStatusToDiffRows,
  semanticLineRelationState,
} from "../src/core/compareVisualStatus.js";
import {
  connectorLabelText,
  objectConnectorState,
  objectConnectorTypeClass,
  renderDiffConnectorLayers,
} from "../src/core/diffRenderer.js";
import { buildSummaryDashboardData } from "../src/core/summaryAnalytics.js";

function buildStaticRouteGolden() {
  const oldConfig = [
    "static-route-entry 10.10.10.0/24",
    "    next-hop 192.0.2.1",
    "    tag 100",
    "    no shutdown",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { router "Base" static-routes route 10.10.10.0/24 route-type unicast next-hop 192.0.2.1 admin-state enable }',
    '/configure { router "Base" static-routes route 10.10.10.0/24 route-type unicast next-hop 192.0.2.1 tag 100 }',
  ].join("\n");

  const oldResult = normalizeConfig({ vendor: "nokia-classic", configText: oldConfig, side: "old" });
  const newResult = normalizeConfig({ vendor: "nokia-md-cli", configText: newConfig, side: "new" });
  const matches = matchNormalizedObjects({
    oldObjects: oldResult.objects,
    newObjects: newResult.objects,
  });

  return {
    oldResult,
    newResult,
    matches,
    plan: createComparisonPlan(matches, {}),
  };
}

function buildManualBgpGolden() {
  const oldConfig = [
    "router bgp 65000",
    " neighbor 192.0.2.1 peer-as 65001",
  ].join("\n");
  const newConfig = [
    '/configure { router "Base" bgp neighbor "198.51.100.1" peer-as 65001 }',
  ].join("\n");

  const oldResult = normalizeConfig({ vendor: "cisco-ios-xe", configText: oldConfig, side: "old" });
  const newResult = normalizeConfig({ vendor: "nokia-md-cli", configText: newConfig, side: "new" });
  const oldBgp = oldResult.objects.find((object) => object.normalizedType === "bgp");
  const newBgp = newResult.objects.find((object) => object.normalizedType === "bgp");
  const manualMap = { [oldBgp.id]: newBgp.id };
  const autoMatches = matchNormalizedObjects({
    oldObjects: oldResult.objects,
    newObjects: newResult.objects,
    manualMap: {},
  });
  const manualMatches = matchNormalizedObjects({
    oldObjects: oldResult.objects,
    newObjects: newResult.objects,
    manualMap,
  });

  return {
    oldResult,
    newResult,
    manualMap,
    autoMatches,
    manualMatches,
    plan: createComparisonPlan(manualMatches, { manualMap }),
  };
}

function pickCounts(dashboard) {
  const {
    matched,
    oldOnly,
    newOnly,
    excluded,
    suppressed,
    ambiguous,
    lowConfidence,
    abnormal,
    manual,
  } = dashboard.counts;
  return {
    matched,
    oldOnly,
    newOnly,
    excluded,
    suppressed,
    ambiguous,
    lowConfidence,
    abnormal,
    manual,
  };
}

function relationKeyFromLineMatch(item, lineMatch, index) {
  const field =
    lineMatch.field ||
    lineMatch.semanticField ||
    lineMatch.fieldMatches?.[0]?.field ||
    `line-${index}`;
  const oldValue = lineMatch.oldValue ?? lineMatch.oldLines?.[0] ?? "";
  const newValue = lineMatch.newValue ?? lineMatch.newLines?.[0] ?? "";
  return `${item.id}:${cssSafeClassName(field)}:${index}:${canonicalizeComparableLine(oldValue)}:${canonicalizeComparableLine(newValue)}`;
}

function cssSafeClassName(value = "") {
  return String(value || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function canonicalizeComparableLine(value = "") {
  return String(value || "").toLowerCase().replace(/"/g, "").replace(/\s+/g, " ").trim();
}

test("semantic object match golden remains stable", () => {
  const { oldResult, newResult, matches, plan } = buildStaticRouteGolden();
  const [match] = matches;
  const [item] = plan;

  assert.equal(oldResult.objects.length, 1);
  assert.equal(newResult.objects.length, 1);
  assert.deepEqual({
    status: match.status,
    reason: match.reason,
    score: match.score,
    matchKeyFields: match.matchKeyFields,
    scoreReasons: match.scoreReasons,
  }, {
    status: "matched",
    reason: "prefix-next-hop",
    score: 100,
    matchKeyFields: ["prefix", "next-hop"],
    scoreReasons: ["prefix", "next-hop", "static-route-exact-identity"],
  });
  assert.deepEqual(item.fieldStats, {
    totalFields: 4,
    equalFields: 4,
    changedFields: 0,
    missingFields: 0,
    addedFields: 0,
  });
  assert.equal(item.relationshipSummary[0].status, "matched");
});

test("manual mapping golden remains stable", () => {
  const { autoMatches, manualMatches, manualMap, plan } = buildManualBgpGolden();
  const [item] = plan;

  assert.deepEqual(autoMatches.map((match) => match.status), ["old-only", "new-only"]);
  assert.deepEqual(manualMatches.map((match) => ({
    status: match.status,
    reason: match.reason,
    score: match.score,
    matchKeyFields: match.matchKeyFields,
  })), [{
    status: "matched",
    reason: "manual",
    score: 100,
    matchKeyFields: ["manual"],
  }]);
  assert.equal(Object.keys(manualMap).length, 1);
  assert.equal(item.reason, "manual");
});

test("line relation key source data remains stable", () => {
  const { plan } = buildStaticRouteGolden();
  const [item] = plan;
  const keys = item.lineMatches.slice(0, 4).map((lineMatch, index) =>
    relationKeyFromLineMatch(item, lineMatch, index)
  );

  assert.deepEqual(keys, [
    "compare-plan-0-old-static-route-10.10.10.0/24__nokia-md-oneline-static-route-0-10.10.10.0/24:route:0:route 10.10.10.0/24:route 10.10.10.0/24",
    "compare-plan-0-old-static-route-10.10.10.0/24__nokia-md-oneline-static-route-0-10.10.10.0/24:next-hop:1:next-hop 192.0.2.1:next-hop 192.0.2.1",
    "compare-plan-0-old-static-route-10.10.10.0/24__nokia-md-oneline-static-route-0-10.10.10.0/24:tag:2:tag 100:tag 100",
    "compare-plan-0-old-static-route-10.10.10.0/24__nokia-md-oneline-static-route-0-10.10.10.0/24:state:3:state enabled:state enabled",
  ]);
  assert.equal(semanticLineRelationState(item.lineMatches[1], "next-hop", item), "equal");
});

test("connector rendering target data remains stable", () => {
  const { plan } = buildStaticRouteGolden();
  const [item] = plan;
  const diffRows = applySemanticPlanVisualStatusToDiffRows([{
    oldRow: {
      objectKey: "static-route:10.10.10.0/24",
      objectIdentity: "10.10.10.0/24",
      objectStatus: "changed",
      objectMatched: false,
    },
    newRow: {
      objectKey: "static-route:10.10.10.0/24",
      objectIdentity: "10.10.10.0/24",
      objectStatus: "changed",
      objectMatched: false,
    },
  }], plan);
  const oldGroup = {
    type: item.objectType,
    identity: item.oldObject.normalizedIdentity,
    status: diffRows[0].oldRow.objectStatus,
    reason: diffRows[0].oldRow.objectReason,
    score: diffRows[0].oldRow.objectScore,
    state: "equal",
  };
  const newGroup = {
    type: item.objectType,
    identity: item.newObject.normalizedIdentity,
    status: diffRows[0].newRow.objectStatus,
    reason: diffRows[0].newRow.objectReason,
    score: diffRows[0].newRow.objectScore,
    state: "equal",
  };

  assert.equal(diffRows[0].oldRow.semanticPairKey, item.id);
  assert.equal(diffRows[0].newRow.semanticPairKey, item.id);
  assert.equal(objectConnectorState(oldGroup, newGroup), "matched");
  assert.equal(objectConnectorTypeClass(oldGroup, newGroup), "type-static-route");
  assert.equal(connectorLabelText(oldGroup, newGroup), "static-route 10.10.10.0...");
  assert.match(renderDiffConnectorLayers({
    objectPaths: ['<path data-kind="object" />'],
    fieldPaths: ['<path data-kind="line" />'],
  }), /object-mapping-overlay[\s\S]*semantic-line-overlay/);
});

test("summary count golden remains stable", () => {
  const staticDashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: buildStaticRouteGolden().plan,
    semanticSummary: {},
  });
  const manual = buildManualBgpGolden();
  const manualDashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: manual.plan,
    semanticSummary: {},
    manualMap: manual.manualMap,
  });

  assert.deepEqual(pickCounts(staticDashboard), {
    matched: 1,
    oldOnly: 0,
    newOnly: 0,
    excluded: 0,
    suppressed: 0,
    ambiguous: 0,
    lowConfidence: 0,
    abnormal: 0,
    manual: 0,
  });
  assert.deepEqual(pickCounts(manualDashboard), {
    matched: 1,
    oldOnly: 0,
    newOnly: 0,
    excluded: 0,
    suppressed: 0,
    ambiguous: 0,
    lowConfidence: 0,
    abnormal: 1,
    manual: 1,
  });
});
