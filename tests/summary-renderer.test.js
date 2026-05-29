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
  assert.match(legacy, /state\.activeObjectSectionScope = getSectionFilterForObjectType\(button\.dataset\.fieldTypeFilter \|\| ""\)\.scope/);
  assert.match(legacy, /renderObjectNavigator\(\);/);
  assert.match(legacy, /setResultTab\("objects"\);/);
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
  assert.match(table, /비교 보기/);
  assert.match(table, /내보내기/);
  assert.match(table, /필터 초기화/);
  assert.match(legacy, /const OBJECT_SECTION_FILTERS = \[/);
  assert.match(legacy, /scope: "port-lag"/);
  assert.match(legacy, /function objectMatchesActiveSection/);
  assert.match(css, /\.section-filter-tab\.active/);
  assert.match(css, /background: #f3f7fb/);
});
