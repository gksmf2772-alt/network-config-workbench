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
  getSemanticStateLabel,
} from "../src/core/semanticTheme.js";
import {
  activeSemanticPolicyViolations,
  applySemanticPlanVisualStatusToDiffRows,
  semanticLineRelationState,
  semanticObjectVisualState,
  shouldRenderSemanticCleanMatch,
} from "../src/core/compareVisualStatus.js";

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

function readGlobalStyles() {
  const entry = fs.readFileSync("src/styles/global.css", "utf8");
  return entry.replace(/^@import "\.\/(.+)";$/gm, (_, file) =>
    fs.readFileSync(`src/styles/${file}`, "utf8")
  );
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
  const css = readGlobalStyles();

  assert.match(html, /semantic-state-unmatched/);
  assert.match(html, /data-match-status="old-only"/);
  assert.match(html, /data-match-status="new-only"/);
  assert.match(css, /--status-unmatched-bg/);
  assert.match(css, /semantic-object-card\.semantic-state-unmatched/);
});

test("semantic line comparison layout prevents source text overflow", () => {
  const css = readGlobalStyles();

  assert.match(css, /\.semantic-compare-result\s*\{[\s\S]*width:\s*100%/);
  assert.match(css, /\.semantic-compare-result\s*\{[\s\S]*max-width:\s*none/);
  assert.match(css, /\.semantic-object-card\s*\{[\s\S]*max-width:\s*none/);
  assert.match(css, /\.semantic-line-row\s*\{[\s\S]*grid-template-columns:\s*72px minmax\(0,\s*1fr\) 24px minmax\(0,\s*1fr\)/);
  assert.match(css, /\.semantic-line-cell\s*\{[\s\S]*white-space:\s*pre-wrap/);
  assert.match(css, /\.semantic-line-cell\s*\{[\s\S]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.semantic-line-reason\s*\{[\s\S]*max-width:\s*150px/);
});

test("compare object mapping background uses separate under-text layer", () => {
  const css = readGlobalStyles();
  const shell = fs.readFileSync("src/components/ConfigInputPanel.jsx", "utf8");
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");

  assert.match(shell, /id="diffObjectBackgroundSvg" className="diff-object-background-overlay"/);
  assert.match(legacy, /renderDiffObjectBackgroundLayers/);
  assert.match(legacy, /backgroundMarkup:\s*`<path class="diff-object-region/);
  assert.match(legacy, /class="diff-object-flow-spine/);
  assert.match(css, /\.diff-object-background-overlay\s*\{[\s\S]*z-index:\s*4/);
  assert.match(css, /\.diff-object-region\s*\{[\s\S]*stroke:\s*none/);
  assert.match(css, /\.diff-object-region\s*\{[\s\S]*stroke-width:\s*0/);
  assert.match(css, /\.diff-connector-overlay\s*\{[\s\S]*z-index:\s*30/);
  assert.match(css, /editor-grid\.diff-connectors-active article\.ncw-editor-card:first-of-type/);
  assert.match(css, /editor-grid\.diff-connectors-active article\.ncw-editor-card:nth-of-type\(2\)/);
  assert.match(css, /editor-grid\.diff-connectors-active \.ncw-editor-card\s*\{[\s\S]*z-index:\s*10/);
  assert.match(css, /editor-grid\.diff-connectors-active \.semantic-diff-object-block[\s\S]*background:\s*transparent !important/);
  assert.match(css, /editor-grid\.diff-connectors-active \.semantic-diff-config-line\.is-matched,[\s\S]*background:\s*transparent !important/);
  assert.match(css, /editor-grid\.diff-connectors-active \.semantic-diff-config-line\.is-unmatched,[\s\S]*background:\s*transparent !important/);
  assert.match(css, /editor-grid\.diff-connectors-active \.diff-line\.object-matched,[\s\S]*background:\s*transparent !important/);
  assert.match(css, /editor-grid\.diff-connectors-active \.semantic-diff-object-block[\s\S]*border:\s*0 !important/);
  assert.match(css, /editor-grid\.diff-connectors-active \.diff-line-number,[\s\S]*border-left:\s*0 !important/);
  assert.match(css, /#compareTab\.active \.diff-object-flow,[\s\S]*display:\s*none !important/);
  assert.match(css, /#compareTab\.active \.diff-object-flow-spine\s*\{[\s\S]*display:\s*block !important/);
  assert.match(css, /#compareTab\.active \.diff-object-flow-spine\s*\{[\s\S]*stroke:\s*transparent !important/);
  assert.match(css, /editor-grid\.diff-connectors-active \.semantic-object-block-wrapper,[\s\S]*border-left:\s*0 !important/);
  assert.match(css, /editor-grid\.diff-connectors-active \.embedded-diff\s*\{[\s\S]*scrollbar-gutter:\s*stable/);
  assert.match(legacy, /function paneClientBounds/);
  assert.match(legacy, /oldRegionLeft/);
  assert.match(legacy, /newRegionRight/);
});

test("line mapping anchors use full visible command text bounds before token fallback", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");

  assert.match(legacy, /const LINE_MAPPING_TEXT_OFFSET = 6/);
  assert.match(legacy, /function getLineTextAnchorRect/);
  assert.match(legacy, /getVisibleLineTextGroupRect\(lineElement, bounds\)[\s\S]*getLineContentTextRect\(lineElement, bounds\)[\s\S]*getRelationTokenGroupRect\(sourceElement, lineElement, bounds\)[\s\S]*getVisibleLineTokenGroupRect\(lineElement, bounds\)/);
  assert.match(legacy, /function getVisibleLineTextGroupRect/);
  assert.match(legacy, /getActualLineTextRect\(contentElement\)[\s\S]*querySelectorAll\("\.diff-token-match"\)/);
  assert.match(legacy, /function lineTextAnchorX/);
  assert.match(legacy, /edge \+ offset/);
  assert.doesNotMatch(legacy, /function lineMappingRailX/);
});

test("compare pane line relation infers Nokia port scheduler policy source lines", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");

  assert.match(legacy, /function inferPortLineField/);
  assert.match(legacy, /\^egress-scheduler-policy\\b[\s\S]*ethernet\.egress\.scheduler-policy/);
  assert.match(legacy, /\^port-scheduler-policy\\b[\s\S]*ethernet\.egress\.scheduler-policy/);
  assert.match(legacy, /\^policy-name\\b[\s\S]*port-scheduler-policy[\s\S]*ethernet\.egress\.scheduler-policy/);
  assert.match(legacy, /buildSemanticLineMatchIndex[\s\S]*lineMatchIndexLinesForSide\(lineMatch, side\)/);
});

test("legacy compare path merges MD-CLI one-line port settings before paired row rendering", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");

  assert.match(legacy, /function extractPortNameFromLine/);
  assert.match(legacy, /objectType === "port"[\s\S]*setField\("port", extractPortNameFromLine\(normalized\)\)/);
  assert.match(legacy, /setField\("ethernet\.mode"[\s\S]*ethernet\\s\+mode/);
  assert.match(legacy, /setField\("ethernet\.mtu"[\s\S]*ethernet\\s\+mtu/);
  assert.match(legacy, /setField\("ethernet\.crc-monitor\.signal-degrade\.threshold"/);
  assert.match(legacy, /setField\("ethernet\.egress\.scheduler-policy"/);
  assert.match(legacy, /mergeObjectsByCanonicalKey[\s\S]*target\.rawLines\.push\(\.\.\.safeObject\.rawLines\)/);
  assert.match(legacy, /getObjectDisplayLines\(object\)[\s\S]*object\.rawLines/);
  assert.match(legacy, /const diffRows = buildPairedObjectDiffRows\(oldMap, newMap, comparedObjectKeys\)/);
  assert.match(legacy, /function logMdCliOneLinePortGroupingDebug/);
  assert.match(legacy, /console\.table\(parserRows\)/);
  assert.match(legacy, /console\.table\(matchedRows\)/);
  assert.match(legacy, /newSourceLineCount/);
});

test("diff connector overlay is clipped to current compare viewport", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const css = readGlobalStyles();
  const renderer = fs.readFileSync("src/core/diffRenderer.js", "utf8");

  assert.match(legacy, /function buildDiffConnectorViewportClipRect/);
  assert.match(legacy, /function paneViewportClientRect/);
  assert.match(legacy, /const connectorClipRect = buildDiffConnectorViewportClipRect/);
  assert.match(legacy, /buildVisibleLineConnectorPaths\(grid, oldPaneRect, newPaneRect, connectorClipRect\)/);
  assert.match(legacy, /function lineMappingConnectorIntersectsClip/);
  assert.match(legacy, /clipRect: connectorClipRect/);
  assert.match(renderer, /clipPath id="\$\{escapeHtml\(id\)\}"/);
  assert.match(renderer, /clip-path="url\(#\$\{clipId\}\)"/);
  assert.match(css, /\.diff-object-background-overlay,[\s\S]*\.diff-connector-overlay\s*\{[\s\S]*overflow:\s*hidden/);
});

test("diff block status and color tokens target config panes", () => {
  const css = readGlobalStyles();

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

  const cleanSemanticItem = {
    id: "bgp:198.51.100.1",
    status: "matched",
    reason: "semantic-compare",
    score: 100,
    oldObject: setting({ side: "old", key: "198.51.100.1" }),
    newObject: setting({ side: "new", key: "198.51.100.1" }),
    fieldStats: { changedFields: 1 },
    fieldSummary: {
      group: {
        status: "changed",
        effectiveStatus: "ignored",
        ignored: true,
      },
    },
  };
  const rows = applySemanticPlanVisualStatusToDiffRows([{
    oldRow: { objectKey: "bgp:198.51.100.1", objectStatus: "changed", objectMatched: true },
    newRow: { objectKey: "bgp:198.51.100.1", objectStatus: "changed", objectMatched: true },
  }], [cleanSemanticItem]);

  assert.equal(shouldRenderSemanticCleanMatch(cleanSemanticItem), true);
  assert.equal(semanticObjectVisualState(cleanSemanticItem), "matched");
  assert.equal(semanticLineRelationState({ status: "changed" }, "group", cleanSemanticItem), "equal");
  assert.equal(rows[0].oldRow.objectStatus, "matched");
  assert.equal(rows[0].newRow.objectStatus, "matched");
  assert.deepEqual(activeSemanticPolicyViolations({
    policyViolations: [{ field: "state" }],
    fieldSummary: {
      "admin-state": {
        violation: false,
        effectiveStatus: "ignored",
      },
    },
  }), []);

  assert.match(css, /\.line-mapping-connector\.clean-matched/);
  assert.match(css, /\.line-mapping-shine\.clean-matched/);
  assert.match(css, /--diff-unmatched-bg:\s*#fff7ed/);
  assert.match(css, /object-status-changed[\s\S]*rgba\(245, 158, 11, 0\.14\)/);
  assert.match(css, /object-status-partial[\s\S]*var\(--status-review-bg\)/);
  assert.match(css, /\.embedded-diff [\s\S]*semantic-object-block-wrapper\.object-status-old-only[\s\S]*var\(--diff-unmatched-bg\)/);
  assert.match(css, /semantic-diff-object-excluded/);
  assert.doesNotMatch(css, /summary-issue-row\.summary-issue-old-only[\s\S]{0,160}var\(--diff-unmatched-bg\)/);
  assert.doesNotMatch(css, /summary-issue-row\.summary-issue-old-only[\s\S]{0,160}var\(--status-unmatched-bg\)/);
});

test("semantic state labels use MVP operator taxonomy", () => {
  assert.equal(getSemanticStateLabel({ status: "matched" }), "동일");
  assert.equal(getSemanticStateLabel({
    status: "matched",
    fieldSummary: {
      "admin-state": { status: "changed", effectiveStatus: "changed" },
    },
  }), "변경");
  assert.equal(getSemanticStateLabel({ status: "candidate" }), "검토 필요");
  assert.equal(getSemanticStateLabel({ status: "old-only" }), "누락");
  assert.equal(getSemanticStateLabel({ status: "new-only" }), "추가");
  assert.equal(getSemanticStateLabel({ status: "unmatched" }), "미매칭");
  assert.equal(getSemanticStateLabel({ status: "ignored", suppressed: true }), "예외 처리");
  assert.equal(getSemanticStateLabel({ status: "comparison-excluded", excluded: true }), "비교 제외");

  const html = renderComparisonPlanHtml([
    { status: "candidate", reason: "ambiguous-candidates", oldObject: setting({ side: "old", key: "192.0.2.10" }), newObject: setting({ side: "new", key: "192.0.2.11" }) },
    { status: "old-only", reason: "unmatched", oldObject: setting({ side: "old", key: "192.0.2.12" }), newObject: null },
    { status: "new-only", reason: "unmatched", oldObject: null, newObject: setting({ side: "new", key: "192.0.2.13" }) },
    {
      status: "matched",
      oldObject: setting({ side: "old", key: "192.0.2.14" }),
      newObject: setting({ side: "new", key: "192.0.2.14" }),
      fieldSummary: {
        "admin-state": { status: "changed", effectiveStatus: "changed" },
      },
    },
  ]);

  assert.match(html, />검토 필요<\/span>/);
  assert.match(html, />누락<\/span>/);
  assert.match(html, />추가<\/span>/);
  assert.match(html, />변경<\/span>/);
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
  assert.match(html, />추가<\/span>/);
  assert.match(html, /누락\/추가/);
  assert.doesNotMatch(html, /객체/);
  assert.doesNotMatch(html, /연결 안 됨/);
  assert.doesNotMatch(html, /후보/);
  assert.doesNotMatch(html, /불명확/);
  assert.doesNotMatch(html, />ADDED</);
});
