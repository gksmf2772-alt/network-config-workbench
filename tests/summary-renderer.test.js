import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

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

test("app shell exposes separated summary review compare profile and report tabs without graph tab", () => {
  const shell = fs.readFileSync("src/components/AppShell.jsx", "utf8");
  const selectors = fs.readFileSync("src/core/legacySelectors.js", "utf8");
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");

  assert.match(shell, /summaryPageTabBtn/);
  assert.match(shell, /objectsPageTabBtn/);
  assert.match(shell, /compareTabBtn/);
  assert.match(shell, /profilesTabBtn/);
  assert.match(shell, /reportPageTabBtn/);
  assert.match(shell, /id="objectsTab"/);
  assert.match(shell, /id="reportTab"/);
  assert.doesNotMatch(shell, /graphPageTabBtn/);
  assert.doesNotMatch(shell, /id="graphTab"/);
  assert.doesNotMatch(selectors, /graphPageTabBtn/);
  assert.doesNotMatch(selectors, /graphReport/);
  assert.match(legacy, /selectors\.objectsPageTabBtn\?\.addEventListener\("click", \(\) => setActiveTab\("objects"\)\)/);
  assert.match(legacy, /selectors\.reportPageTabBtn\?\.addEventListener\("click", \(\) => setActiveTab\("report"\)\)/);
  assert.doesNotMatch(legacy, /setActiveTab\("graph"\)/);
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

test("report tab keeps review/subscriber tables and removes graph UI", () => {
  const panel = fs.readFileSync("src/components/ReportPanel.jsx", "utf8");
  const selectors = fs.readFileSync("src/core/legacySelectors.js", "utf8");
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const main = fs.readFileSync("src/main.jsx", "utf8");
  const packageJson = fs.readFileSync("package.json", "utf8");
  const css = fs.readFileSync("src/styles/global-report.css", "utf8");
  const compareCss = fs.readFileSync("src/styles/global-compare-settings.css", "utf8");
  const summaryCss = fs.readFileSync("src/styles/global-summary.css", "utf8");

  assert.match(panel, /reportQuickActions/);
  assert.match(panel, /reportQuickContext/);
  assert.match(panel, /data-report-action="summary"/);
  assert.match(panel, /data-report-action="review"/);
  assert.match(panel, /data-report-action="export"/);
  assert.doesNotMatch(panel, /data-report-action="graph"/);
  assert.match(selectors, /reportQuickActions: doc\.querySelector\("#reportQuickActions"\)/);
  assert.match(selectors, /reportQuickContext: doc\.querySelector\("#reportQuickContext"\)/);

  assert.match(legacy, /handleReportQuickAction/);
  assert.match(legacy, /renderReportQuickContext/);
  assert.match(legacy, /renderReportReviewTable/);
  assert.match(legacy, /renderReportSubscriberTable/);
  assert.match(legacy, /scrollToReportSection/);
  assert.match(legacy, /data-report-section="review"/);
  assert.match(legacy, /data-report-subscriber-root/);
  assert.match(legacy, /openReportObjectInCompare/);
  assert.match(legacy, /source: "report-review"/);
  assert.match(legacy, /REPORT_REVIEW_FILTER_STORAGE_KEY/);
  assert.match(legacy, /REPORT_SUBSCRIBER_FILTER_STORAGE_KEY/);
  assert.doesNotMatch(legacy, /renderStandaloneGraphPage/);
  assert.doesNotMatch(legacy, /renderRelationshipGraph/);
  assert.doesNotMatch(legacy, /renderDependencyGraphView/);
  assert.doesNotMatch(legacy, /renderSankeyPoc/);
  assert.doesNotMatch(legacy, /mountRelationship/);
  assert.doesNotMatch(legacy, /data-graph-root/);
  assert.doesNotMatch(legacy, /data-relationship-graph-view/);
  assert.doesNotMatch(legacy, /returnToReportGraphTarget/);
  assert.doesNotMatch(legacy, /returnSection: "graph"/);

  assert.doesNotMatch(main, /registerLegacyRelationshipGraphRenderer/);
  assert.doesNotMatch(packageJson, /"@xyflow\/react"/);
  assert.doesNotMatch(packageJson, /"dagre"/);
  assert.doesNotMatch(packageJson, /"echarts"/);
  assert.doesNotMatch(packageJson, /"echarts-for-react"/);

  assert.match(css, /\.report-quick-actions/);
  assert.match(css, /\.report-quick-context/);
  assert.match(css, /\.report-review-table-wrap[\s\S]*max-height:\s*clamp\(320px,\s*48vh,\s*620px\)/);
  assert.match(css, /\.report-subscriber-table-wrap[\s\S]*max-height:\s*clamp\(300px,\s*44vh,\s*580px\)/);
  assert.doesNotMatch(css, /\.dependency-graph-shell/);
  assert.doesNotMatch(css, /\.sankey-poc-shell/);
  assert.doesNotMatch(css, /\.react-flow__minimap/);
  assert.doesNotMatch(css, /\.report-graph-flow-root/);
  assert.doesNotMatch(compareCss, /report-graph/);
  assert.doesNotMatch(summaryCss, /report-graph/);
});
test("report tab exposes isolated subscriber path table", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const state = fs.readFileSync("src/core/legacyState.js", "utf8");
  const css = fs.readFileSync("src/styles/global-report.css", "utf8");

  assert.match(legacy, /function renderReportSubscriberTable\(graph = \{\}\)/);
  assert.match(legacy, /data-report-section="subscriber-paths"/);
  assert.match(legacy, /data-report-subscriber-root/);
  assert.match(legacy, /function buildReportSubscriberRows\(graph = \{\}\)/);
  assert.match(legacy, /graph\?\.viewGraph\?\.views\?\.summary/);
  assert.match(legacy, /REPORT_SUBSCRIBER_FILTER_STORAGE_KEY/);
  assert.match(legacy, /REPORT_SUBSCRIBER_VIEW_STORAGE_KEY/);
  assert.match(legacy, /bindReportSubscriberTableInteractions/);
  assert.match(legacy, /data-report-subscriber-column-search/);
  assert.match(legacy, /data-report-subscriber-column-filter/);
  assert.match(legacy, /Serial IP/);
  assert.doesNotMatch(legacy, /title: "Peer\/NH"/);
  assert.match(legacy, /data-subscriber-serial-ip/);
  assert.match(legacy, /data-report-subscriber-view="compact"/);
  assert.match(legacy, /data-report-subscriber-view="full"/);
  assert.match(legacy, /data-subscriber-static/);
  assert.match(legacy, /data-subscriber-bgp/);
  assert.match(legacy, /data-subscriber-pim/);
  assert.match(legacy, /source: "report-subscriber"/);
  assert.match(state, /reportSubscriberRows: \[\]/);
  assert.match(state, /reportSubscriberRenderMode: "compact"/);
  assert.match(css, /\.report-subscriber-table-wrap[\s\S]*max-height:\s*clamp\(300px,\s*44vh,\s*580px\)/);
  assert.match(css, /\.report-subscriber-table[\s\S]*table-layout:\s*fixed/);
  assert.match(css, /\.report-subscriber-main,[\s\S]*text-overflow:\s*ellipsis/);
  assert.match(css, /data-report-subscriber-view-mode="compact"/);
});

test("report tables expose sortable headers and explicit total counts", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const state = fs.readFileSync("src/core/legacyState.js", "utf8");
  const css = fs.readFileSync("src/styles/global-report.css", "utf8");

  assert.match(legacy, /data-report-review-sort/);
  assert.match(legacy, /data-report-subscriber-sort/);
  assert.match(legacy, /function formatReportTableCount/);
  assert.match(legacy, /표시 \$\{Number\(visibleCount\) \|\| 0\} \/ 전체 \$\{Number\(totalCount\) \|\| 0\}/);
  assert.match(legacy, /applyReportReviewTableSort\(root, rows\)/);
  assert.match(legacy, /applyReportSubscriberTableSort\(root, rows\)/);
  assert.match(legacy, /state\.reportReviewSort = nextReportTableSortState/);
  assert.match(legacy, /state\.reportSubscriberSort = nextReportTableSortState/);
  assert.match(legacy, /data-subscriber-static-count/);
  assert.match(legacy, /data-subscriber-bgp-count/);
  assert.match(legacy, /data-subscriber-pim-count/);
  assert.match(legacy, /data-report-subscriber-column-count/);
  assert.match(legacy, /function updateReportSubscriberColumnCounts/);
  assert.match(legacy, /function reportSubscriberColumnHasValue/);
  assert.match(state, /reportReviewSort: null/);
  assert.match(state, /reportSubscriberSort: null/);
  assert.match(css, /\.report-review-sort-toggle/);
  assert.match(css, /\.report-table-count/);
  assert.match(css, /\.report-column-count/);
});

test("subscriber path table merges static-route next-hop rows by interface", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const start = legacy.indexOf("function buildReportSubscriberRows");
  const end = legacy.indexOf("function buildReportReviewRows");
  assert.ok(start > 0);
  assert.ok(end > start);
  const buildReportSubscriberRows = vm.runInNewContext(
    `${legacy.slice(start, end)}\nbuildReportSubscriberRows;`
  );
  const baseInterface = {
    id: "L3_INTERFACE|old|base|to-nowon-tou-fn20",
    kind: "L3_INTERFACE",
    label: "to-Nowon-TOU-FN20",
    attributes: { address: "112.188.27.105/30" },
  };
  const details = [
    {
      chainId: "chain-a",
      side: "old",
      rowIndex: 0,
      interface: baseInterface,
      peer: { id: "PEER_NH|old|112.188.21.90", kind: "PEER_NH", label: "112.188.21.90" },
      staticRoutes: [{ id: "route-a", kind: "STATIC_ROUTE", label: "112.188.30.64/32" }],
      bgpNeighbors: [{ id: "bgp-a", kind: "BGP_NEIGHBOR", label: "112.188.21.90" }],
      confidence: { min: 95 },
      evidence: [],
    },
    {
      chainId: "chain-b",
      side: "old",
      rowIndex: 1,
      interface: baseInterface,
      peer: { id: "PEER_NH|old|112.188.21.130", kind: "PEER_NH", label: "112.188.21.130" },
      staticRoutes: [{ id: "route-b", kind: "STATIC_ROUTE", label: "112.188.30.184/32" }],
      confidence: { min: 95 },
      evidence: [],
    },
    {
      chainId: "chain-new",
      side: "new",
      rowIndex: 2,
      interface: { ...baseInterface, id: "L3_INTERFACE|new|base|to-nowon-tou-fn20" },
      peer: { id: "PEER_NH|new|112.188.21.90", kind: "PEER_NH", label: "112.188.21.90" },
      staticRoutes: [{ id: "route-c", kind: "STATIC_ROUTE", label: "112.188.30.64/32" }],
      confidence: { min: 95 },
      evidence: [],
    },
    {
      chainId: "orphan-port",
      side: "old",
      rowIndex: 3,
      port: { id: "PORT|old|1/1/1", kind: "PORT", label: "1/1/1" },
      confidence: { min: 100 },
      evidence: [],
    },
  ];
  const graph = {
    viewGraph: {
      views: {
        summary: {
          nodes: details.map((chainDetail) => ({
            id: `node-${chainDetail.chainId}`,
            canonicalKind: chainDetail.interface ? "L3_INTERFACE" : "PORT",
            key: chainDetail.interface?.id || chainDetail.port?.id || "",
            chainDetail,
          })),
        },
      },
    },
  };

  const rows = buildReportSubscriberRows(graph);
  const pairedRow = rows.find((row) => row.side === "both");

  assert.equal(rows.length, 1);
  assert.equal(pairedRow.sideLabel, "기존→신규");
  assert.equal(pairedRow.subscriber, "to-Nowon-TOU-FN20");
  assert.equal(pairedRow.serialIp, "112.188.27.105/30");
  assert.equal(pairedRow.staticCount, 2);
  assert.equal(pairedRow.staticSummary, "기존 2 → 신규 1");
  assert.equal(pairedRow.bgpCount, 1);
  assert.equal(pairedRow.bgpSummary, "기존 1 → 신규 -");
  assert.match(pairedRow.peerSearch, /112\.188\.21\.130/);
});

test("subscriber path table pairs old and new rows by interface label when serial subnet changes", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const start = legacy.indexOf("function buildReportSubscriberRows");
  const end = legacy.indexOf("function buildReportReviewRows");
  const buildReportSubscriberRows = vm.runInNewContext(
    `${legacy.slice(start, end)}\nbuildReportSubscriberRows;`
  );
  const oldDetail = {
    chainId: "old-lag-a",
    side: "old",
    rowIndex: 0,
    port: { id: "PORT|old|7/2/4", kind: "PORT", label: "7/2/4" },
    lag: { id: "LAG|old|174", kind: "LAG", label: "174" },
    interface: {
      id: "L3_INTERFACE|old|base|to-dobong-tou-fb03",
      kind: "L3_INTERFACE",
      label: "to-Dobong-TOU-FB03",
      attributes: { address: "112.188.21.53/30" },
    },
    peer: { id: "PEER_NH|old|112.188.21.54", kind: "PEER_NH", label: "112.188.21.54" },
    confidence: { min: 95 },
    evidence: [],
  };
  const newDetail = {
    chainId: "new-lag-a",
    side: "new",
    rowIndex: 1,
    port: { id: "PORT|new|6/1/c9/1", kind: "PORT", label: "6/1/c9/1" },
    lag: { id: "LAG|new|lag-a-6109", kind: "LAG", label: "lag-A-6109" },
    interface: {
      id: "L3_INTERFACE|new|base|to-dobong-tou-fb03",
      kind: "L3_INTERFACE",
      label: "to-Dobong-TOU-FB03",
      attributes: { address: "112.188.23.49/30" },
    },
    peer: { id: "PEER_NH|new|112.188.23.50", kind: "PEER_NH", label: "112.188.23.50" },
    bgpNeighbors: [{ id: "BGP|new|112.188.30.112", kind: "BGP_NEIGHBOR", label: "112.188.30.112" }],
    confidence: { min: 95 },
    evidence: [],
  };
  const graph = {
    viewGraph: {
      views: {
        summary: {
          nodes: [oldDetail, newDetail].map((chainDetail) => ({
            id: `node-${chainDetail.chainId}`,
            canonicalKind: "L3_INTERFACE",
            key: chainDetail.interface.id,
            chainDetail,
          })),
        },
      },
    },
  };

  const rows = buildReportSubscriberRows(graph);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].side, "both");
  assert.equal(rows[0].subscriber, "to-Dobong-TOU-FB03");
  assert.match(rows[0].port, /7\/2\/4/);
  assert.match(rows[0].port, /6\/1\/c9\/1/);
  assert.match(rows[0].lag, /174/);
  assert.match(rows[0].lag, /lag-A-6109/);
  assert.equal(rows[0].bgpCount, 1);
});

test("subscriber path table displays old to new topology values on the same serial subnet row", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const start = legacy.indexOf("function buildReportSubscriberRows");
  const end = legacy.indexOf("function buildReportReviewRows");
  const buildReportSubscriberRows = vm.runInNewContext(
    `${legacy.slice(start, end)}\nbuildReportSubscriberRows;`
  );
  const oldDetail = {
    chainId: "old-chain",
    side: "old",
    rowIndex: 0,
    port: { id: "PORT|old|7/2/4", kind: "PORT", label: "7/2/4" },
    lag: { id: "LAG|old|174", kind: "LAG", label: "174" },
    interface: {
      id: "L3_INTERFACE|old|base|to-dobong-tou-fb01",
      kind: "L3_INTERFACE",
      label: "to-Dobong-TOU-FB01",
      attributes: { address: "112.188.23.57/30" },
    },
    peer: { id: "PEER_NH|old|112.188.23.58", kind: "PEER_NH", label: "112.188.23.58" },
    staticRoutes: [{ id: "old-route", kind: "STATIC_ROUTE", label: "112.188.30.110/32" }],
    pim: [{ id: "old-pim", kind: "PIM", label: "to-Dobong-TOU-FB01" }],
    confidence: { min: 95 },
    evidence: [],
  };
  const newDetail = {
    chainId: "new-chain",
    side: "new",
    rowIndex: 1,
    port: { id: "PORT|new|2/2/c6/1", kind: "PORT", label: "2/2/c6/1" },
    lag: { id: "LAG|new|lag-b-2206", kind: "LAG", label: "lag-B-2206" },
    interface: {
      id: "L3_INTERFACE|new|base|to-dobong-tou-fb01",
      kind: "L3_INTERFACE",
      label: "to-Dobong-TOU-FB01",
      attributes: { address: "112.188.23.58/30" },
    },
    peer: { id: "PEER_NH|new|112.188.23.57", kind: "PEER_NH", label: "112.188.23.57" },
    bgpNeighbors: [{ id: "new-bgp", kind: "BGP_NEIGHBOR", label: "112.188.23.57" }],
    confidence: { min: 95 },
    evidence: [],
  };
  const graph = {
    viewGraph: {
      views: {
        summary: {
          nodes: [oldDetail, newDetail].map((chainDetail) => ({
            id: `node-${chainDetail.chainId}`,
            canonicalKind: "L3_INTERFACE",
            key: chainDetail.interface.id,
            chainDetail,
          })),
        },
      },
    },
  };

  const rows = buildReportSubscriberRows(graph);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].side, "both");
  assert.equal(rows[0].port, "7/2/4 → 2/2/c6/1");
  assert.equal(rows[0].lag, "174 → lag-B-2206");
  assert.equal(rows[0].serialIp, "112.188.23.57/30 → 112.188.23.58/30");
  assert.equal(rows[0].staticSummary, "기존 1 → 신규 -");
  assert.equal(rows[0].bgpSummary, "기존 - → 신규 1");
  assert.equal(rows[0].pimSummary, "기존 1 → 신규 -");
});
