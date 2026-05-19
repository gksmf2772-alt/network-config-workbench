import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  createComparisonPlan,
  renderComparisonPlanHtml,
} from "../src/core/comparator.js";
import { buildSummaryDashboardData } from "../src/core/summaryAnalytics.js";
import {
  getSemanticDiffBlockState,
  getSemanticStateClass,
} from "../src/core/semanticTheme.js";

function setting({
  side = "new",
  type = "bgp",
  key = "198.51.100.1",
  fields = {},
  rawLines = [],
} = {}) {
  const objectKey = `${type}:${key}`;
  return {
    id: `${side}-${type}-${key}`,
    source: side,
    type,
    normalizedType: type,
    name: key,
    sourceName: key,
    normalizedIdentity: key,
    identity: key,
    key: objectKey,
    fields: Object.keys(fields).length ? fields : { neighbor: key },
    canonicalFields: Object.keys(fields).length ? fields : { neighbor: key },
    rawLines: rawLines.length ? rawLines : [`${type} ${key}`],
  };
}

function exactSettingExclusion({
  id = "exclude-one",
  type = "bgp",
  key = "198.51.100.1",
  side = "new",
  status = "new-only",
} = {}) {
  return {
    id,
    type: "comparison-exclusion",
    scope: "setting",
    enabled: true,
    reasonKo: `exclude ${type} ${key}`,
    match: {
      mode: "exact-setting",
      objectType: type,
      settingType: type,
      objectKey: `${type}:${key}`,
      settingKey: `${type}:${key}`,
      side,
      matchStatus: status,
      ruleId: "semantic-compare.unmatched-setting",
    },
  };
}

function profileSettingExclusion({
  id = "exclude-profile",
  type = "bgp",
  side = "new",
  status = "new-only",
} = {}) {
  return {
    id,
    type: "comparison-exclusion",
    scope: "profile",
    enabled: true,
    reasonKo: `exclude profile ${type} ${status}`,
    match: {
      mode: "profile-setting-status",
      objectType: type,
      settingType: type,
      side,
      matchStatus: status,
      ruleId: "semantic-compare.unmatched-setting",
    },
  };
}

function dashboard(plan) {
  return buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan,
    semanticSummary: {},
  });
}

test("unmatched setting visual status uses unmatched class and color token", () => {
  assert.equal(getSemanticStateClass({ status: "old-only" }), "semantic-state-unmatched");
  assert.equal(getSemanticStateClass({ status: "new-only" }), "semantic-state-unmatched");
  assert.equal(getSemanticStateClass({ status: "unmatched-source" }), "semantic-state-unmatched");
  assert.equal(getSemanticStateClass({ status: "unmatched-target" }), "semantic-state-unmatched");

  const plan = createComparisonPlan([
    { status: "old-only", reason: "unmatched", oldObject: setting({ side: "old", key: "192.0.2.1" }), newObject: null },
    { status: "new-only", reason: "unmatched", oldObject: null, newObject: setting({ side: "new", key: "192.0.2.2" }) },
  ]);
  const html = renderComparisonPlanHtml(plan);
  const css = fs.readFileSync("src/styles/global.css", "utf8");

  assert.match(html, /semantic-state-unmatched/);
  assert.match(html, /data-match-status="old-only"/);
  assert.match(html, /data-match-status="new-only"/);
  assert.match(css, /--status-unmatched-bg/);
  assert.match(css, /semantic-object-card\.semantic-state-unmatched/);
});

test("diff block status and color tokens target config panes", () => {
  const css = fs.readFileSync("src/styles/global.css", "utf8");
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");

  assert.equal(getSemanticDiffBlockState({ status: "old-only" }), "unmatched");
  assert.equal(getSemanticDiffBlockState({ status: "new-only" }), "unmatched");
  assert.equal(getSemanticDiffBlockState({ status: "matched" }), "matched");
  assert.equal(getSemanticDiffBlockState({ status: "matched", fieldStats: { changedFields: 1 } }), "partial");
  assert.equal(getSemanticDiffBlockState({
    status: "matched",
    fieldStats: { changedFields: 1 },
    fieldSummary: {
      description: {
        status: "changed",
        effectiveStatus: "ignored",
        ignored: true,
      },
    },
  }), "matched");
  assert.equal(getSemanticDiffBlockState({ status: "matched", policyViolationCount: 1 }), "partial");
  assert.equal(getSemanticDiffBlockState({ status: "matched", score: 85 }), "matched");
  assert.equal(getSemanticDiffBlockState({ status: "old-only", comparisonExcluded: true }), "excluded");
  assert.equal(getSemanticStateClass({ status: "partial" }), "semantic-state-partial");

  assert.match(legacy, /const objectStatus = pairedObjectStatus\(oldObject, newObject\);/);
  assert.match(legacy, /function hasPairedObjectDifference\(oldObject = null, newObject = null\)/);
  assert.match(legacy, /const visualStatus = getSemanticDiffBlockState\(item\);/);
  assert.match(legacy, /score:\s*row\?\.objectScore/);
  assert.match(legacy, /score > 0 && score < 100/);
  assert.match(legacy, /\["port", "lag", "bgp", "pim"\]\.includes\(object\.type\)/);
  assert.match(legacy, /Object\.entries\(extractFieldsFromLine\(line, profile, object\.type\)\)/);
  assert.match(legacy, /oldObject \? "old-only" : "new-only"/);
  assert.match(legacy, /buildPairedObjectLineRow\(oldObject[\s\S]*objectStatus[\s\S]*objectMatched/);
  assert.match(css, /--diff-unmatched-bg:\s*#fff7ed/);
  assert.match(css, /object-status-changed[\s\S]*rgba\(245, 158, 11, 0\.14\)/);
  assert.match(css, /object-status-partial[\s\S]*var\(--status-review-bg\)/);
  assert.match(css, /\.embedded-diff [\s\S]*semantic-object-block-wrapper\.object-status-old-only[\s\S]*var\(--diff-unmatched-bg\)/);
  assert.match(css, /semantic-diff-object-excluded/);
  assert.doesNotMatch(css, /summary-issue-row\.summary-issue-old-only[\s\S]{0,160}var\(--diff-unmatched-bg\)/);
  assert.doesNotMatch(css, /summary-issue-row\.summary-issue-old-only[\s\S]{0,160}var\(--status-unmatched-bg\)/);
});

test("legacy compare aligns migrated objects by description endpoint before diff rows", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const alignCallIndex = legacy.indexOf('alignObjectMapsByDescriptionEndpoint(oldMap, newMap, ["lag", "port", "interface"]);');
  const keyBuildIndex = legacy.indexOf("const keys = [...new Set([...oldMap.keys(), ...newMap.keys()])]");

  assert.ok(alignCallIndex > 0);
  assert.ok(keyBuildIndex > alignCallIndex);
  assert.match(legacy, /function isEndpointAlignedObject\(object = \{\}, targetTypes = new Set\(\)\)/);
  assert.match(legacy, /targetTypes\.has\(objectType\)/);
  assert.match(legacy, /newMap\.delete\(newKey\);[\s\S]*newMap\.set\(oldKey/);
  assert.match(legacy, /const rule = \{ mode: \["port", "interface"\]\.includes\(type\) \? "description" : "header"/);
  assert.match(legacy, /if \(object\?\.type === "lag"\) return inferObjectIdentityFromLines\(object\);/);
  assert.match(legacy, /function extractLagNameFromLine\(line = ""\)[\s\S]*\^configure\\s\+lag/);
  assert.match(legacy, /function inferLagLineFields\(line = ""\)[\s\S]*lacp\.administrative-key/);
  assert.match(legacy, /objectType === "lag"[\s\S]*inferLagLineFields\(text\)/);
  assert.match(legacy, /collectVisibleFlatSemanticLines[\s\S]*inferRelationFieldsFromRenderedLine\(line\)/);
  assert.match(legacy, /token: "administrative-key", field: "lacp\.administrative-key"[\s\S]*token: stripTrailingSyntax\(lacpKey\[1\]\), field: "lacp\.administrative-key"/);
  assert.match(legacy, /function descriptionEndpointCandidates\(description = ""\)[\s\S]*flatMap\(\(segment\)/);
  assert.match(legacy, /cleanSegment\.split\(\/\\s\+\/\)/);

  assert.match(legacy, /const oldEndpoints = new Set\(objectDescriptionEndpoints\(oldObject\)\);/);
  assert.match(legacy, /objectDescriptionEndpoints\(newObject\)\.some\(\(endpoint\) => oldEndpoints\.has\(endpoint\)\)/);

  const endpointFunction = legacy.slice(legacy.indexOf("function objectDescriptionEndpoints"));
  const rawDescriptionIndex = endpointFunction.indexOf("[...(object.rawLines || []), ...(object.lines || [])]");
  const canonicalDescriptionIndex = endpointFunction.indexOf("object.canonicalFields?.description");
  assert.ok(rawDescriptionIndex > 0);
  assert.ok(canonicalDescriptionIndex > rawDescriptionIndex);
});

test("setting exclusion removes new-only setting from active analysis", () => {
  const profile = {
    exceptions: [exactSettingExclusion({ key: "198.51.100.1", side: "new", status: "new-only" })],
  };
  const plan = createComparisonPlan([
    { status: "new-only", reason: "unmatched", oldObject: null, newObject: setting({ side: "new", key: "198.51.100.1" }) },
  ], profile);
  const data = dashboard(plan);

  assert.equal(plan[0].comparisonExcluded, true);
  assert.equal(plan[0].policySuppressed, true);
  assert.equal(data.counts.newOnly, 0);
  assert.equal(data.counts.excluded, 1);
  assert.equal(data.review.unmatchedNew.length, 0);
  assert.equal(data.excludedIssues.length, 1);
  assert.equal(data.graph.nodes.length, 0);
});

test("setting exclusion removes old-only setting from active analysis", () => {
  const profile = {
    exceptions: [exactSettingExclusion({ key: "203.0.113.1", side: "old", status: "old-only" })],
  };
  const plan = createComparisonPlan([
    { status: "old-only", reason: "unmatched", oldObject: setting({ side: "old", key: "203.0.113.1" }), newObject: null },
  ], profile);
  const data = dashboard(plan);

  assert.equal(plan[0].comparisonExcluded, true);
  assert.equal(data.counts.oldOnly, 0);
  assert.equal(data.counts.excluded, 1);
  assert.equal(data.review.unmatchedOld.length, 0);
});

test("profile-wide setting exclusion applies by type side status without hiding field changes", () => {
  const profile = {
    exceptions: [profileSettingExclusion({ type: "bgp", side: "new", status: "new-only" })],
  };
  const plan = createComparisonPlan([
    { status: "new-only", reason: "unmatched", oldObject: null, newObject: setting({ side: "new", key: "198.51.100.10" }) },
    { status: "new-only", reason: "unmatched", oldObject: null, newObject: setting({ side: "new", key: "198.51.100.11" }) },
    {
      status: "matched",
      reason: "identity",
      score: 100,
      oldObject: setting({ side: "old", key: "198.51.100.12", fields: { neighbor: "198.51.100.12", "admin-state": "disable" } }),
      newObject: setting({ side: "new", key: "198.51.100.12", fields: { neighbor: "198.51.100.12", "admin-state": "enable" } }),
    },
  ], profile);
  const data = dashboard(plan);

  assert.equal(plan.filter((item) => item.comparisonExcluded).length, 2);
  assert.equal(data.counts.newOnly, 0);
  assert.equal(data.counts.excluded, 2);
  assert.equal(data.review.abnormal.length, 1);
});

test("deleting setting exclusion restores active counts", () => {
  const match = {
    status: "new-only",
    reason: "unmatched",
    oldObject: null,
    newObject: setting({ side: "new", key: "198.51.100.20" }),
  };
  const excludedPlan = createComparisonPlan([match], {
    exceptions: [exactSettingExclusion({ key: "198.51.100.20" })],
  });
  const restoredPlan = createComparisonPlan([match], { exceptions: [] });
  const excludedData = dashboard(excludedPlan);
  const restoredData = dashboard(restoredPlan);

  assert.equal(excludedData.counts.excluded, 1);
  assert.equal(excludedData.counts.newOnly, 0);
  assert.equal(restoredData.counts.excluded, 0);
  assert.equal(restoredData.counts.newOnly, 1);
  assert.equal(restoredData.review.unmatchedNew.length, 1);
});

test("common field analysis and graph ignore excluded plan items", () => {
  const activePlan = createComparisonPlan([
    {
      status: "matched",
      reason: "identity",
      score: 100,
      oldObject: setting({ side: "old", key: "198.51.100.30", fields: { neighbor: "198.51.100.30", "admin-state": "disable" } }),
      newObject: setting({ side: "new", key: "198.51.100.30", fields: { neighbor: "198.51.100.30", "admin-state": "enable" } }),
    },
  ]);
  const excludedPlan = [{
    ...activePlan[0],
    comparisonExcluded: true,
    excluded: true,
    policySuppressed: true,
    exclusionPolicyId: "exclude-matched-test",
    exclusionIssue: {
      id: "exclude-matched-test",
      reason: "비교 제외 규칙 적용",
    },
  }];
  const activeData = dashboard(activePlan);
  const excludedData = dashboard(excludedPlan);

  assert.equal(activeData.fieldAnalysis.aggregate.reviewNeeded, 1);
  assert.equal(excludedData.fieldAnalysis.aggregate.reviewNeeded, 0);
  assert.equal(excludedData.counts.excluded, 1);
  assert.equal(excludedData.graph.nodes.length, 0);
});

test("bottom manual mapping panel is not rendered by default", () => {
  const source = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const body = source.match(/function renderDiffObjectToolbars\(\) \{([\s\S]*?)\n\}/)?.[1] || "";

  assert.doesNotMatch(body, /renderDiffObjectToolbar/);
  assert.doesNotMatch(body, /data-diff-object-up/);
  assert.doesNotMatch(body, /data-diff-object-down/);
});

test("main comparison renderer uses operator terminology", () => {
  const plan = createComparisonPlan([
    { status: "new-only", reason: "unmatched", oldObject: null, newObject: setting({ side: "new", key: "198.51.100.40" }) },
  ]);
  const html = renderComparisonPlanHtml(plan);

  assert.match(html, /설정/);
  assert.match(html, /연결 안 됨/);
  assert.doesNotMatch(html, /객체/);
  assert.doesNotMatch(html, /미매칭/);
});
