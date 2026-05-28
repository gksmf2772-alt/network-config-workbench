import { VENDOR_SUPPORT_STATE } from "./vendorPresets.js";

export function renderMetricCard({ label, value, detail = "", state = "", action = "", help = "" }) {
  const tag = action ? "button" : "div";
  const attrs = action
    ? ` type="button" data-summary-filter="${escapeHtml(action)}" title="${escapeHtml(help || detail || label)}"`
    : "";
  return `
    <${tag}${attrs} class="summary-card summary-metric ${action ? "summary-metric-action" : ""} ${state ? `summary-metric-${escapeHtml(state)}` : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${detail ? `<small>${escapeHtml(detail)}</small>` : ""}
    </${tag}>
  `;
}

export function renderSectionSummaryCards(sections = []) {
  const rows = Array.isArray(sections) ? sections.filter((row) => row && row.objectType) : [];
  if (!rows.length) return "";

  return `
    <section class="summary-section summary-core-section-overview" data-review-panel="section-summary">
      <div class="summary-section-head">
        <h3>핵심 섹션 요약</h3>
      </div>
      <div class="summary-core-section-grid">
        ${rows.map((row) => renderSectionSummaryCard(row)).join("")}
      </div>
    </section>
  `;
}

function renderSectionSummaryCard(row = {}) {
  const state = Number(row.reviewNeeded || 0) > 0 ? "warning" : "ok";
  const detail = [
    `연결 ${row.matched || 0}`,
    `검토 필요 ${row.reviewNeeded || 0}`,
    `변경 ${row.changed || 0}`,
    `누락 ${row.missing || 0}`,
    `추가 ${row.added || 0}`,
  ].join(" · ");
  return `
    <button type="button" class="summary-core-section-card summary-core-section-${escapeHtml(state)}" data-field-type-filter="${escapeHtml(row.objectType)}" title="${escapeHtml(detail)}">
      <span>${escapeHtml(row.label || row.objectType)}</span>
      <strong>${escapeHtml(row.total || 0)}</strong>
      <small>연결 ${escapeHtml(row.matched || 0)} · 검토 필요 ${escapeHtml(row.reviewNeeded || 0)}</small>
      <div class="summary-core-section-meta">
        <span>변경 ${escapeHtml(row.changed || 0)}</span>
        <span>누락 ${escapeHtml(row.missing || 0)}</span>
        <span>추가 ${escapeHtml(row.added || 0)}</span>
        <span>공통률 ${escapeHtml(row.averageOverlap || 0)}%</span>
      </div>
    </button>
  `;
}

export function buildOperatorAlerts({ dashboard, semanticSummary, report }) {
  const { review, counts, context } = dashboard;
  return [
    counts.oldOnly ? `기존 설정에만 있는 항목 ${counts.oldOnly}개` : "",
    counts.newOnly ? `신규 설정에만 있는 항목 ${counts.newOnly}개` : "",
    counts.ambiguous ? `매핑 후보 여러 개 ${counts.ambiguous}개` : "",
    counts.lowConfidence ? `낮은 신뢰도 설정 ${counts.lowConfidence}개` : "",
    review.relationshipChanges.length ? `연결/참조 관계 변경 ${review.relationshipChanges.length}개` : "",
    review.abnormal.length ? `비정상/검토 필요 값 ${review.abnormal.length}개` : "",
    Number(semanticSummary.coveragePercent || 0) < 60 ? `분석된 라인 비율 ${semanticSummary.coveragePercent || 0}%` : "",
    report.summary?.required ? `필수 규칙 위반 ${report.summary.required}건` : "",
    context.support?.state === VENDOR_SUPPORT_STATE.PARTIAL ? "부분 지원 벤더 포함" : "",
  ].filter(Boolean);
}

export function renderHiddenDiagnosticsLinks(context = {}, counts = {}) {
  if (context.standardsAuditVisible || context.migrationReadinessVisible || context.debugDiagnosticsVisible) return "";
  return `
    <section class="summary-section summary-hidden-diagnostics">
      <div class="summary-section-head">
        <h3>고급 결과</h3>
      </div>
      <div class="summary-action-grid">
        <button type="button" data-summary-filter="standards-audit">표준 점검 결과 보기</button>
        <button type="button" data-summary-filter="audit-migration">전환 준비도 보기</button>
        <button type="button" data-summary-filter="coverage">고급 진단 보기</button>
        <button type="button" data-summary-filter="audit-suppressed">예외/숨김 처리된 항목</button>
      </div>
      <p class="small-note">현재 모드에서는 표준 점검, 전환 준비도, 고급 진단을 활성 이슈로 표시하지 않음. 예외/숨김 항목 ${escapeHtml(counts.auditSuppressed || 0)}개.</p>
    </section>
  `;
}

export function renderFieldHotList(fields = []) {
  if (!fields.length) return "";
  return `
    <div class="summary-field-hotlist">
      ${fields.slice(0, 10).map((field) => `
        <span title="다른 값 ${escapeHtml(field.different)} / 기존 누락 ${escapeHtml(field.missingOld)} / 신규 누락 ${escapeHtml(field.missingNew)}">
          ${escapeHtml(field.field)} <strong>${escapeHtml(field.different + field.missingOld + field.missingNew)}</strong>
        </span>
      `).join("")}
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
