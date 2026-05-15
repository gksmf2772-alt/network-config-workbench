// src/core/compareRenderer.js
import {
  getSemanticStateClass,
  getSemanticStateLabel,
} from "./semanticTheme.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getStatusLabel(status) {
  if (status === "matched") return "연결됨";
  if (status === "candidate") return "확인 필요 후보";
  if (status === "old-only") return "기존 설정에만 있음";
  if (status === "new-only") return "신규 설정에만 있음";
  return String(status || "알 수 없음").toUpperCase();
}

function getFieldDisplayStatus(fieldSummary) {
  if (fieldSummary?.violation) return fieldSummary.violationReason || "정책 위반";
  if (fieldSummary?.ignored) return "무시";
  const status = fieldSummary?.effectiveStatus || fieldSummary?.status || "unknown";
  return ({
    equal: "동일",
    matched: "연결됨",
    changed: "변경",
    present: "존재",
    missing: "누락",
    added: "추가",
    candidate: "후보",
    conflict: "충돌",
    ambiguous: "확인 필요",
    unknown: "알 수 없음",
  })[status] || status;
}

function getFieldCompactValue(fieldSummary) {
  const oldValues = Array.isArray(fieldSummary?.oldValues) ? fieldSummary.oldValues : [];
  const newValues = Array.isArray(fieldSummary?.newValues) ? fieldSummary.newValues : [];
  const oldText = oldValues.length ? oldValues.map(escapeHtml).join(", ") : "-";
  const newText = newValues.length ? newValues.map(escapeHtml).join(", ") : "-";
  return oldText === newText ? oldText : `${oldText} -> ${newText}`;
}

function renderFieldSummary(fieldSummary = {}) {
  const fields = Object.values(fieldSummary);
  if (!fields.length) return `<div class="semantic-empty">비교 가능한 필드 없음</div>`;

  return `
    <div class="semantic-field-list">
      ${fields.map((field) => `
        <div class="semantic-field semantic-field-${escapeHtml(field.effectiveStatus || field.status)}">
          <div class="semantic-field-head">
            <strong>${escapeHtml(field.field)}</strong>
            <span class="semantic-field-status">${escapeHtml(getFieldDisplayStatus(field))}</span>
          </div>
          <div class="semantic-field-values compact">${getFieldCompactValue(field)}</div>
          ${field.violation ? `<div class="semantic-violation">위반: ${escapeHtml(field.violationReason)}</div>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function getLineDisplayStatus(lineMatch) {
  if (lineMatch?.ignored || lineMatch?.suppressed) return "숨김 처리";
  if (lineMatch?.semanticCovered) return "의미상 동일";
  const status = String(lineMatch?.status || "unknown").toLowerCase();
  return ({
    equal: "동일",
    changed: "변경",
    candidate: "확인 필요 후보",
    "old-only": "기존 설정에만 있음",
    "new-only": "신규 설정에만 있음",
    conflict: "충돌",
    ambiguous: "확인 필요",
    unknown: "알 수 없음",
  })[status] || status.toUpperCase();
}

function formatLineText(lines = []) {
  if (!Array.isArray(lines) || lines.length === 0) return "";
  return lines.map((line) => escapeHtml(line)).join("<br />");
}

function renderLineMatches(lineMatches = []) {
  if (!Array.isArray(lineMatches) || lineMatches.length === 0) {
    return `<div class="semantic-empty">라인 비교 없음</div>`;
  }

  return `
    <details class="semantic-line-section">
      <summary>라인 비교 (${lineMatches.length})</summary>
      <div class="semantic-line-grid">
        ${lineMatches.map((lineMatch) => `
          <div class="semantic-line-row semantic-line-${escapeHtml(lineMatch.status)} ${lineMatch.semanticCovered ? "semantic-line-covered" : ""}">
            <div class="semantic-line-status">${escapeHtml(getLineDisplayStatus(lineMatch))}</div>
            <pre class="semantic-line-cell old">${formatLineText(lineMatch.oldLines) || "&nbsp;"}</pre>
            <div class="semantic-line-arrow">-></div>
            <pre class="semantic-line-cell new">${formatLineText(lineMatch.newLines) || "&nbsp;"}</pre>
            <div class="semantic-line-reason">${escapeHtml(lineMatch.reason || "")}</div>
          </div>
        `).join("")}
      </div>
    </details>
  `;
}

function renderCandidateList(candidates = [], getIds) {
  if (!candidates.length) return "";

  return `
    <div class="semantic-candidate-box">
      <ul>
        ${candidates.map((candidate) => {
          const ids = getIds(candidate);
          return `
            <li class="semantic-candidate-option">
              <span>${escapeHtml(candidate.sourceName || candidate.id || "-")}</span>
              <span>일치도: ${escapeHtml(candidate.score ?? "-")}</span>
              <span>사유: ${escapeHtml(candidate.reason || "-")}</span>
              <button type="button" class="semantic-candidate-select-btn" data-old-object-id="${escapeHtml(ids.oldObjectId)}" data-new-object-id="${escapeHtml(ids.newObjectId)}">직접 연결</button>
            </li>
          `;
        }).join("")}
      </ul>
    </div>
  `;
}

function renderAmbiguousAlternatives(item = {}) {
  const alternatives = Array.isArray(item.ambiguousAlternatives) ? item.ambiguousAlternatives : [];
  if (!alternatives.length) return "";
  const oldObjectId = item.oldObject?.id || "";
  return renderCandidateList(alternatives, (candidate) => ({
    oldObjectId,
    newObjectId: candidate.id || "",
  }));
}

function renderManualCandidates(item = {}) {
  const candidates = Array.isArray(item.manualCandidates) ? item.manualCandidates : [];
  if (!candidates.length) return "";

  const oldObject = item.oldObject || {};
  const newObject = item.newObject || {};
  const currentObjectId = item.status === "old-only"
    ? oldObject.id || oldObject.objectId || oldObject.sourceName || ""
    : newObject.id || newObject.objectId || newObject.sourceName || "";

  return renderCandidateList(candidates, (candidate) => ({
    oldObjectId: item.status === "old-only" ? currentObjectId : candidate.id || "",
    newObjectId: item.status === "old-only" ? candidate.id || "" : currentObjectId,
  }));
}

function renderRelationshipSummary(relationships = []) {
  if (!Array.isArray(relationships) || !relationships.length) return "";

  return `
    <details class="semantic-detail-block">
      <summary>관계 비교 (${relationships.length})</summary>
      <div class="semantic-relationship-list">
        ${relationships.map((item) => `
          <div class="semantic-relationship-item">
            <strong>${escapeHtml(item.label || item.type)}</strong>
            <span>기존: ${escapeHtml(String(item.oldValue || "-"))}</span>
            <span>신규: ${escapeHtml(String(item.newValue || "-"))}</span>
            <span>상태: ${escapeHtml(getStatusLabel(item.status))}</span>
            <span>사유: ${escapeHtml(item.reason || "-")}</span>
          </div>
        `).join("")}
      </div>
    </details>
  `;
}

function renderManualMatchActions(item = {}) {
  const reason = String(item.reason || "").toLowerCase();
  const status = String(item.status || "").toLowerCase();
  if (status !== "matched" || reason !== "manual") return "";

  const oldObjectId = item.oldObject?.id || item.oldObject?.objectId || item.oldObject?.sourceName || "";
  if (!oldObjectId) return "";

  return `<button type="button" class="semantic-manual-remove-btn" data-old-object-id="${escapeHtml(oldObjectId)}">수동 매핑 삭제</button>`;
}

function getStateDisplayLabel(state) {
  return ({
    matched: "연결됨",
    partial: "부분 일치",
    ambiguous: "확인 필요",
    unmatched: "미연결",
    manual: "직접 연결",
  })[state] || state || "-";
}

function getCompactObjectName(item = {}) {
  return (
    item.oldObject?.sourceName ||
    item.newObject?.sourceName ||
    item.oldObject?.normalizedIdentity ||
    item.newObject?.normalizedIdentity ||
    item.id ||
    "-"
  );
}

function getObjectSideLabel(object = null) {
  if (!object) return "-";
  return (
    object.sourceName ||
    object.normalizedIdentity ||
    object.id ||
    "-"
  );
}

function relationshipIssueCount(relationships = []) {
  return relationships.filter((item) => {
    const status = String(item?.status || "").toLowerCase();
    return status && !["matched", "equal", "present"].includes(status);
  }).length;
}

function fieldChangedCount(fieldSummary = {}) {
  return Object.values(fieldSummary || {}).filter((item) => {
    const status = String(item?.effectiveStatus || item?.status || "").toLowerCase();
    return status && !["equal", "present", "ignored"].includes(status);
  }).length;
}

function summarizePlan(plan = []) {
  return plan.reduce((acc, item) => {
    acc.total += 1;
    const state = getSemanticStateLabel(item);
    if (state === "matched" || state === "manual") acc.matched += 1;
    else if (state === "ambiguous") acc.ambiguous += 1;
    else acc.unmatched += 1;
    acc.violations += item.policyViolationCount || 0;
    return acc;
  }, { total: 0, matched: 0, unmatched: 0, ambiguous: 0, violations: 0 });
}

export function renderComparisonPlanHtml(plan = []) {
  if (!Array.isArray(plan) || plan.length === 0) {
    return `<div class="semantic-empty">비교 결과 없음</div>`;
  }

  const summary = summarizePlan(plan);

  return `
    <div class="semantic-compare-result">
      <div class="semantic-state-legend">
        <span class="semantic-status-badge semantic-state-matched">연결됨</span>
        <span class="semantic-status-badge semantic-state-partial">부분 일치</span>
        <span class="semantic-status-badge semantic-state-ambiguous">확인 필요</span>
        <span class="semantic-status-badge semantic-state-unmatched">미연결</span>
        <span class="semantic-status-badge semantic-state-manual">직접 연결</span>
      </div>
      <div class="semantic-preview-summary">
        <div class="semantic-summary-item"><div class="semantic-summary-label">객체</div><div class="semantic-summary-value">${summary.total}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">연결됨</div><div class="semantic-summary-value">${summary.matched}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">미연결</div><div class="semantic-summary-value">${summary.unmatched}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">확인 필요</div><div class="semantic-summary-value">${summary.ambiguous}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">위반</div><div class="semantic-summary-value">${summary.violations}</div></div>
      </div>

      ${plan.map((item) => {
        const stateClass = getSemanticStateClass(item);
        const stateLabel = getSemanticStateLabel(item);
        const violations = item.policyViolationCount || 0;
        const relationshipIssues = relationshipIssueCount(item.relationshipSummary || []);
        const changedFields = fieldChangedCount(item.fieldSummary || {});

        return `
          <details class="semantic-object-card ${violations ? "has-violation" : "no-violation"} ${stateClass}">
            <summary class="semantic-object-summary-row">
              <span class="semantic-status-badge ${stateClass}">${escapeHtml(getStateDisplayLabel(stateLabel))}</span>
              <span class="semantic-object-title">${escapeHtml(item.objectType)} ${escapeHtml(getCompactObjectName(item))}</span>
              <span class="semantic-object-map">
                <span class="semantic-object-side old">${escapeHtml(getObjectSideLabel(item.oldObject))}</span>
                <span class="semantic-object-arrow">↔</span>
                <span class="semantic-object-side new">${escapeHtml(getObjectSideLabel(item.newObject))}</span>
              </span>
              <span class="semantic-object-metric">일치도 ${item.score ?? "-"}</span>
              <span class="semantic-object-metric">위반 ${violations}</span>
              <span class="semantic-object-metric">관계 ${relationshipIssues}</span>
              <span class="semantic-object-metric">필드 ${changedFields}/${item.fieldStats?.totalFields ?? 0}</span>
            </summary>
            <div class="semantic-object-details">
              <div class="semantic-object-meta">
                <span>기존: ${escapeHtml(item.oldObject?.sourceName || item.oldObject?.id || "-")}</span>
                <span>신규: ${escapeHtml(item.newObject?.sourceName || item.newObject?.id || "-")}</span>
                <span>기존 식별값: ${escapeHtml(item.oldObject?.normalizedIdentity || "-")}</span>
                <span>신규 식별값: ${escapeHtml(item.newObject?.normalizedIdentity || "-")}</span>
                <span>매칭 키: ${escapeHtml((item.matchKeyFields || []).join(", ") || "-")}</span>
                <span>방식: ${escapeHtml(item.reason || "-")}</span>
                <span>상태: ${escapeHtml(getStatusLabel(item.status))}</span>
                <span>일치도 근거: ${escapeHtml((item.scoreReasons || []).join(", ") || "-")}</span>
              </div>
              <div class="semantic-object-actions">${renderManualMatchActions(item)}</div>
              ${item.ambiguousAlternatives?.length ? `<details class="semantic-detail-block"><summary>확인 필요 후보 (${item.ambiguousAlternatives.length})</summary>${renderAmbiguousAlternatives(item)}</details>` : ""}
              ${item.manualCandidates?.length ? `<details class="semantic-detail-block" open><summary>직접 연결 후보 (${item.manualCandidates.length})</summary>${renderManualCandidates(item)}</details>` : ""}
              <details class="semantic-detail-block"><summary>필드 비교 (${item.fieldStats?.totalFields ?? 0})</summary>${renderFieldSummary(item.fieldSummary)}</details>
              ${renderRelationshipSummary(item.relationshipSummary)}
              ${renderLineMatches(item.lineMatches)}
            </div>
          </details>
        `;
      }).join("")}
    </div>
  `;
}
