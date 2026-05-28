import test from "node:test";
import assert from "node:assert/strict";

import {
  buildOperatorAlerts,
  renderFieldHotList,
  renderHiddenDiagnosticsLinks,
  renderMetricCard,
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
