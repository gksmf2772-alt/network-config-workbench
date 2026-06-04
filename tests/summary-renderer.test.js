import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildOperatorAlerts,
  renderFieldHotList,
  renderHiddenDiagnosticsLinks,
  renderMetricCard,
  renderSectionSummaryCards,
} from "../src/core/summaryRenderer.js";

test("summary metric card keeps action and escaping contract", () => {
  const html = renderMetricCard({
    label: "위험 <항목>",
    value: 2,
    detail: "상세",
    state: "warning",
    action: "audit-warning",
  });

  assert.match(html, /<button type="button" data-summary-filter="audit-warning"/);
  assert.match(html, /summary-metric-warning/);
  assert.match(html, /위험 &lt;항목&gt;/);
});

test("summary renderer builds operator alerts from dashboard counts", () => {
  const alerts = buildOperatorAlerts({
    dashboard: {
      review: { relationshipChanges: [{}], abnormal: [] },
      counts: { oldOnly: 1, newOnly: 0, ambiguous: 2, lowConfidence: 0 },
      context: { support: { state: "partial" } },
    },
    semanticSummary: { coveragePercent: 55 },
    report: { summary: { required: 3 } },
  });

  assert.deepEqual(alerts, [
    "기존 설정에만 있는 항목 1개",
    "매핑 후보 여러 개 2개",
    "연결/참조 관계 변경 1개",
    "분석된 라인 비율 55%",
    "필수 규칙 위반 3건",
    "부분 지원 벤더 포함",
  ]);
});

test("summary renderer keeps hidden diagnostics and hotlist markup", () => {
  const diagnostics = renderHiddenDiagnosticsLinks({}, { auditSuppressed: 4 });
  const hotlist = renderFieldHotList([{ field: "state", different: 1, missingOld: 2, missingNew: 3 }]);

  assert.match(diagnostics, /data-summary-filter="standards-audit"/);
  assert.match(diagnostics, /예외\/숨김 항목 4개/);
  assert.match(hotlist, /summary-field-hotlist/);
  assert.match(hotlist, /state <strong>6<\/strong>/);
});

test("summary renderer builds MVP section summary cards", () => {
  const html = renderSectionSummaryCards([
    {
      objectType: "interface",
      label: "Interface",
      total: 4,
      matched: 3,
      reviewNeeded: 1,
      changed: 1,
      missing: 0,
      added: 0,
      averageOverlap: 92,
    },
    {
      objectType: "static-route",
      label: "Static-route",
      total: 3,
      matched: 2,
      reviewNeeded: 2,
      changed: 1,
      missing: 1,
      added: 0,
      averageOverlap: 71,
    },
    {
      objectType: "bgp",
      label: "BGP neighbor",
      total: 5,
      matched: 5,
      reviewNeeded: 0,
      changed: 0,
      missing: 0,
      added: 0,
      averageOverlap: 100,
    },
  ]);

  assert.match(html, /summary-core-section-overview/);
  assert.match(html, /data-field-type-filter="interface"/);
  assert.match(html, /Interface/);
  assert.match(html, /Static-route/);
  assert.match(html, /BGP neighbor/);
  assert.match(html, /검토 필요 2/);
  assert.match(html, /누락 1/);
});

test("summary section cards are bound to object list filtering", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");

  assert.match(legacy, /selectors\.summaryCards\?\.querySelectorAll\("\[data-field-type-filter\]"\)/);
  assert.match(legacy, /setObjectSectionScope\(getSectionFilterForObjectType\(button\.dataset\.fieldTypeFilter \|\| ""\)\.scope\)/);
  assert.match(legacy, /renderObjectNavigator\(\);/);
  assert.match(legacy, /setResultTab\("objects"\);/);
});

test("summary issue workspace supports grouped violation filtering and bounded detail scroll", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const css = fs.readFileSync("src/styles/global-summary.css", "utf8");

  assert.match(legacy, /buildSummaryIssueTypeGroups/);
  assert.match(legacy, /data-summary-issue-type-groups/);
  assert.match(legacy, /data-summary-issue-type-filter/);
  assert.match(legacy, /root\.dataset\.issueTypeFilter/);
  assert.match(legacy, /data-summary-issue-empty/);
  assert.match(legacy, /selectSummaryIssue\(firstVisibleTarget\)/);
  assert.match(css, /\.summary-issue-type-groups/);
  assert.match(css, /\.summary-issue-list[\s\S]*max-height:\s*clamp\(360px,\s*64vh,\s*680px\)/);
  assert.match(css, /\.summary-issue-detail-card[\s\S]*max-height:\s*clamp\(420px,\s*68vh,\s*780px\)/);
  assert.match(css, /\.summary-object-issue-section-body[\s\S]*max-height:\s*clamp\(180px,\s*32vh,\s*340px\)/);
});

test("app shell exposes separated summary review compare profile and report tabs", () => {
  const shell = fs.readFileSync("src/components/AppShell.jsx", "utf8");
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");

  assert.match(shell, /summaryPageTabBtn/);
  assert.match(shell, /objectsPageTabBtn/);
  assert.match(shell, /compareTabBtn/);
  assert.match(shell, /profilesTabBtn/);
  assert.match(shell, /reportPageTabBtn/);
  assert.match(shell, /id="objectsTab"/);
  assert.match(shell, /id="reportTab"/);
  assert.match(legacy, /selectors\.objectsPageTabBtn\?\.addEventListener\("click", \(\) => setActiveTab\("objects"\)\)/);
  assert.match(legacy, /selectors\.reportPageTabBtn\?\.addEventListener\("click", \(\) => setActiveTab\("report"\)\)/);
});

test("object review has muted section tabs and compact quick actions", () => {
  const table = fs.readFileSync("src/components/ObjectMatchTable.jsx", "utf8");
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const css = fs.readFileSync("src/styles/global-summary.css", "utf8");

  assert.match(table, /objectSectionTabs/);
  assert.match(table, /objectQuickActions/);
  assert.match(table, /objectQuickContext/);
  assert.match(table, /data-object-action="add-exception"/);
  assert.match(table, /data-object-action="exclude-setting"/);
  assert.match(table, /비교 보기/);
  assert.match(table, /내보내기/);
  assert.match(table, /필터 초기화/);
  assert.match(legacy, /const OBJECT_SECTION_FILTERS = \[/);
  assert.match(legacy, /scope: "port", label: "Port", types: \["port"\]/);
  assert.match(legacy, /scope: "lag", label: "LAG", types: \["lag"\]/);
  assert.doesNotMatch(legacy, /scope: "port-lag"/);
  assert.match(legacy, /function objectMatchesActiveSection/);
  assert.match(legacy, /function renderPlanReviewItem/);
  assert.match(legacy, /function planItemMatchesSearch/);
  assert.match(legacy, /data-plan-review-select/);
  assert.match(legacy, /openSelectedObjectReviewInCompare/);
  assert.match(legacy, /addExceptionForSelectedObjectReview/);
  assert.match(legacy, /addExclusionForSelectedObjectReview/);
  assert.match(legacy, /registerObjectReviewExceptionTarget/);
  assert.match(css, /\.section-filter-tab\.active/);
  assert.match(css, /scroll-snap-type: x proximity/);
  assert.match(css, /overscroll-behavior-x: contain/);
  assert.match(css, /\.plan-review-item\.selected/);
  assert.match(css, /\.object-quick-context/);
  assert.match(css, /background: #f3f7fb/);
});

test("compare tab exposes dedicated section scope controls", () => {
  const panel = fs.readFileSync("src/components/ConfigInputPanel.jsx", "utf8");
  const selectors = fs.readFileSync("src/core/legacySelectors.js", "utf8");
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const css = fs.readFileSync("src/styles/global-compare-settings.css", "utf8");

  assert.match(panel, /compareScopeSummary/);
  assert.match(panel, /compareSectionTabs/);
  assert.match(panel, /compareExpandBtn/);
  assert.match(panel, /data-compare-expanded-label/);
  assert.match(selectors, /compareSectionTabs: doc\.querySelector\("#compareSectionTabs"\)/);
  assert.match(selectors, /compareScopeSummary: doc\.querySelector\("#compareScopeSummary"\)/);
  assert.match(selectors, /compareExpandBtn: doc\.querySelector\("#compareExpandBtn"\)/);
  assert.match(legacy, /handleCompareSectionTabClick/);
  assert.match(legacy, /renderCompareSectionTabs/);
  assert.match(legacy, /renderSectionFilterTabs\(selectors\.compareSectionTabs, \{ disableEmpty: true \}\)/);
  assert.match(legacy, /focusFirstCompareObjectInSection/);
  assert.match(legacy, /COMPARE_EXPANDED_VIEW_STORAGE_KEY/);
  assert.match(legacy, /toggleCompareExpandedView/);
  assert.match(legacy, /setCompareExpandedView/);
  assert.match(legacy, /handleSectionTabsWheel/);
  assert.match(legacy, /refreshSectionTabsOverflowState/);
  assert.match(legacy, /updateSectionTabsOverflowState/);
  assert.match(legacy, /scrollActiveSectionTabIntoView/);
  assert.match(css, /compare-scope-shell/);
  assert.match(css, /compare-expanded-view/);
  assert.match(css, /compare-expanded-toggle/);
  assert.match(css, /section-filter-tabs-overflowing/);
  assert.match(css, /mask-image: linear-gradient/);
  assert.match(css, /#compareTab\.active \.compare-area \.editor-grid/);
  assert.match(css, /#compareTab\.active \.editor-grid\.diff-connectors-active/);
  assert.match(css, /display: none !important/);
  assert.match(css, /grid-template-rows: auto auto minmax\(0, 1fr\)/);
});

test("report tab has quick actions for summary review graph and export", () => {
  const panel = fs.readFileSync("src/components/RelationshipGraphPanel.jsx", "utf8");
  const selectors = fs.readFileSync("src/core/legacySelectors.js", "utf8");
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const css = fs.readFileSync("src/styles/global-report.css", "utf8");
  const compareCss = fs.readFileSync("src/styles/global-compare-settings.css", "utf8");
  const summaryCss = fs.readFileSync("src/styles/global-summary.css", "utf8");

  assert.match(panel, /reportQuickActions/);
  assert.match(panel, /reportQuickContext/);
  assert.match(panel, /data-report-action="summary"/);
  assert.match(panel, /data-report-action="review"/);
  assert.match(panel, /data-report-action="graph"/);
  assert.match(panel, /data-report-action="export"/);
  assert.match(selectors, /reportQuickActions: doc\.querySelector\("#reportQuickActions"\)/);
  assert.match(selectors, /reportQuickContext: doc\.querySelector\("#reportQuickContext"\)/);
  assert.match(legacy, /handleReportQuickAction/);
  assert.match(legacy, /renderReportQuickContext/);
  assert.match(legacy, /scrollToReportSection/);
  assert.match(legacy, /data-report-section="review"/);
  assert.match(legacy, /data-report-review-jump/);
  assert.match(legacy, /openReportObjectInCompare/);
  assert.match(legacy, /source: "report-review"/);
  assert.match(legacy, /REPORT_REVIEW_FILTER_STORAGE_KEY/);
  assert.match(legacy, /restoreReportReviewFilterState/);
  assert.match(legacy, /saveReportReviewFilterState/);
  assert.match(legacy, /setReportReviewSaveState/);
  assert.match(legacy, /saveMessage: "필터 초기화됨"/);
  assert.match(legacy, /data-report-review-save-state/);
  assert.match(legacy, /REPORT_REVIEW_VIEW_STORAGE_KEY/);
  assert.match(legacy, /data-report-review-view="compact"/);
  assert.match(legacy, /data-report-review-view="full"/);
  assert.match(legacy, /data-report-review-view-current/);
  assert.match(legacy, /전체 옵션 \$\{escapeHtml\(fieldColumns\.length\)\}개/);
  assert.match(legacy, /setReportReviewViewMode/);
  assert.match(legacy, /renderReportReviewFieldSummaryHeader/);
  assert.match(legacy, /renderReportReviewDetailRow/);
  assert.match(legacy, /renderReportReviewDetailActions/);
  assert.match(legacy, /data-add-report-field-rule/);
  assert.match(legacy, /data-report-field-rule-action/);
  assert.match(legacy, /data-report-field-rule-scope/);
  assert.match(legacy, /data-report-field-rule-required/);
  assert.match(legacy, /data-report-field-rule-popover/);
  assert.match(legacy, /renderRulePopoverIcon/);
  assert.match(legacy, /renderRuleRemoveIcon/);
  assert.match(legacy, /function isImportantExceptionField[\s\S]*"ingress-filter"/);
  assert.match(legacy, /function isImportantExceptionField[\s\S]*"egress-filter"/);
  assert.match(legacy, /function isImportantExceptionField[\s\S]*"ingress-qos"/);
  assert.match(legacy, /function isImportantExceptionField[\s\S]*"egress-qos"/);
  assert.match(legacy, /findReportReviewFieldSavedException/);
  assert.match(legacy, /profileExceptionMatchesContext\(exception/);
  assert.match(legacy, /reportReviewFieldRuleApplied/);
  assert.match(legacy, /report-review-detail-field-applied/);
  assert.match(legacy, /class="report-review-rule-remove"/);
  assert.match(legacy, /closeOtherReportFieldRulePopovers/);
  assert.match(legacy, /buildReportFieldRuleValueMatch/);
  assert.match(legacy, /findingType:\s*changeType/);
  assert.match(legacy, /valueMode:\s*"exact"/);
  assert.match(legacy, /oldValuePattern/);
  assert.match(legacy, /newValuePattern/);
  assert.match(legacy, /addReportFieldRuleFromTarget/);
  assert.match(legacy, /buildReportRequiredPolicyFromTarget/);
  assert.match(legacy, /confirmReportFieldRuleCreate/);
  assert.match(legacy, /confirmRerunAfterProfileRuleChange/);
  assert.match(legacy, /validationPolicyAppliesToObject/);
  assert.match(legacy, /data-add-exclusion/);
  assert.match(legacy, /data-exception-fixed-scope="object"/);
  assert.match(legacy, /refreshAfterProfileRuleChange/);
  assert.match(legacy, /getProfileRuleReturnDestination/);
  assert.match(legacy, /source\.startsWith\("report-"\)/);
  assert.match(legacy, /scrollToReportSection\(destination\.section/);
  assert.match(legacy, /pendingReportReviewAction/);
  assert.match(legacy, /highlightReportReviewActionResult/);
  assert.match(legacy, /data-review-object-key/);
  assert.match(legacy, /aria-controls/);
  assert.match(legacy, /event\.key !== "Escape"/);
  assert.match(legacy, /data-report-detail-toggle/);
  assert.match(legacy, /toggleReportReviewDetail/);
  assert.match(legacy, /data-review-field-summary/);
  assert.match(legacy, /compareIssueSource/);
  assert.match(legacy, /data-return-issue-source/);
  assert.match(legacy, /returnToCompareIssueSource/);
  assert.match(legacy, /getCompareIssueReturnLabel/);
  assert.match(legacy, /returnToObjectReviewTarget/);
  assert.match(legacy, /returnToReportReviewTarget/);
  assert.match(legacy, /returnToReportGraphTarget/);
  assert.match(legacy, /returnTab: "objects"/);
  assert.match(legacy, /returnSection: "review"/);
  assert.match(legacy, /returnSection: "graph"/);
  assert.match(css, /\.report-quick-actions/);
  assert.match(css, /\.report-quick-context/);
  assert.match(css, /\.report-review-save-state/);
  assert.match(css, /\.report-review-view-toggle/);
  assert.match(css, /\.report-review-view-control/);
  assert.match(css, /\.report-review-view-current/);
  assert.match(css, /data-report-view-mode="full"/);
  assert.match(css, /\.report-review-table-wrap[\s\S]*max-height:\s*clamp\(320px,\s*48vh,\s*620px\)/);
  assert.match(css, /\.report-review-table-wrap[\s\S]*overscroll-behavior:\s*contain/);
  assert.match(css, /report-review-option-column/);
  assert.match(css, /\.report-review-field-summary-cell/);
  assert.match(css, /\.report-review-detail-row/);
  assert.match(css, /\.report-review-detail-actions/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+68px\s+24px/);
  assert.match(css, /\.report-review-detail-field-applied/);
  assert.match(css, /\.report-review-rule-popover/);
  assert.match(css, /\.report-review-rule-remove/);
  assert.match(css, /\.report-review-rule-applied-marker/);
  assert.match(css, /\.report-review-rule-builder/);
  assert.match(css, /\.report-review-required-toggle/);
  assert.match(css, /position:\s*absolute/);
  assert.match(css, /report-review-action-highlight/);
  assert.match(css, /\.report-graph-tools label[\s\S]*white-space:\s*nowrap/);
  assert.match(css, /\.report-graph-tools label[\s\S]*min-width:\s*64px/);
  assert.match(css, /data-state="applied"/);
  assert.match(css, /\[data-report-review-row\]/);
  assert.match(compareCss, /semantic-object-block-wrapper\.object-active/);
  assert.match(summaryCss, /data-compare-issue-source\^="report"/);
  assert.match(summaryCss, /\.compare-issue-context-actions/);
  assert.match(summaryCss, /\.compare-issue-context-return/);
});
