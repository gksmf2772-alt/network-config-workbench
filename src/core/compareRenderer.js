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
  if (status === "matched") return "매칭";
  if (status === "candidate") return "후보";
  if (status === "old-only") return "기존 설정에만 있음";
  if (status === "new-only") return "신규 설정에만 있음";
  if (status === "excluded") return "비교 제외됨";
  return String(status || "알 수 없음").toUpperCase();
}

function getFieldDisplayStatus(fieldSummary) {
  if (fieldSummary?.violation) return fieldSummary.violationReason || "정책 위반";
  if (Array.isArray(fieldSummary?.policyHits) && fieldSummary.policyHits.some((hit) => hit?.sourcePolicy === "comparison-exclusion")) return "비교 제외됨";
  if (fieldSummary?.ignored || fieldSummary?.effectiveStatus === "ignored") return "예외 처리됨";
  const status = fieldSummary?.effectiveStatus || fieldSummary?.status || "unknown";
  if (status === "structure-converted") return "구조 전환";
  if (status === "group-inherited") return "그룹 상속";
  if (status === "inheritance-unresolved") return "상속 확인 필요";
  return ({
    equal: "동일",
    matched: "매칭",
    changed: "변경",
    present: "존재",
    missing: "누락",
    added: "추가",
    candidate: "후보",
    conflict: "충돌",
    ambiguous: "불명확",
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

function isFieldExceptionActionable(field = {}) {
  const status = String(field.effectiveStatus || field.status || "").toLowerCase();
  return Boolean(field.field) && status && !["equal", "matched", "present", "ignored"].includes(status);
}

function getFieldAppliedPolicyId(field = {}) {
  const hit = Array.isArray(field.policyHits) ? field.policyHits.find((item) => item?.policyId) : null;
  return hit?.policyId || "";
}

function renderFieldExceptionActions(item = {}, field = {}, options = {}) {
  const status = String(field.effectiveStatus || field.status || "").toLowerCase();
  if (field.ignored || status === "ignored") {
    const policyId = getFieldAppliedPolicyId(field);
    return `
      <div class="semantic-field-actions semantic-field-actions-suppressed">
        <span>예외 처리됨${field.policyReason ? ` · ${escapeHtml(field.policyReason)}` : ""}</span>
        ${policyId ? `<button type="button" data-remove-exception="${escapeHtml(policyId)}">예외 해제</button>` : ""}
      </div>
    `;
  }
  if (!isFieldExceptionActionable(field)) return "";
  const targetId = typeof options.getFieldExceptionTargetId === "function"
    ? options.getFieldExceptionTargetId(item, field)
    : "";
  if (!targetId) return "";
  return `
    <div class="semantic-field-actions">
      <button type="button" data-add-exception="${escapeHtml(targetId)}" data-exception-fixed-scope="object">이 항목만 예외</button>
      <button type="button" data-add-exception="${escapeHtml(targetId)}" data-exception-fixed-scope="profile">프로파일 예외</button>
    </div>
  `;
}

function renderFieldSummary(fieldSummary = {}, item = {}, options = {}) {
  const fields = Object.entries(fieldSummary).map(([fieldName, field]) => ({
    ...(field || {}),
    field: field?.field || fieldName,
  }));
  if (!fields.length) return `<div class="semantic-empty">비교 가능한 설정 항목 없음</div>`;

  return `
    <div class="semantic-field-list">
      ${fields.map((field) => `
        <div class="semantic-field semantic-field-${escapeHtml(field.effectiveStatus || field.status)}">
          <div class="semantic-field-head">
            <strong>${escapeHtml(field.field)}</strong>
            <span class="semantic-field-status">${escapeHtml(getFieldDisplayStatus(field))}</span>
          </div>
          <div class="semantic-field-values compact">${getFieldCompactValue(field)}</div>
          ${renderFieldSourceBadges(field)}
          ${field.violation ? `<div class="semantic-violation">위반: ${escapeHtml(field.violationReason)}</div>` : ""}
          ${renderFieldExceptionActions(item, field, options)}
        </div>
      `).join("")}
    </div>
  `;
}

function renderFieldSourceBadges(field = {}) {
  const labels = [
    ...(Array.isArray(field.oldSourceLabels) ? field.oldSourceLabels.map((label) => `기존: ${label}`) : []),
    ...(Array.isArray(field.newSourceLabels) ? field.newSourceLabels.map((label) => `신규: ${label}`) : []),
  ].filter(Boolean);
  if (!labels.length) return "";
  return `<div class="semantic-field-source">${labels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}</div>`;
}

function getLineDisplayStatus(lineMatch) {
  if (lineMatch?.semanticCovered) return "의미 동일";
  const status = String(lineMatch?.status || "unknown").toLowerCase();
  return ({
    equal: "동일",
    changed: "변경",
    candidate: "후보",
    "old-only": "기존 설정에만 있음",
    "new-only": "신규 설정에만 있음",
    conflict: "충돌",
    ambiguous: "불명확",
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
              <span>점수: ${escapeHtml(candidate.score ?? "-")}</span>
              <span>사유: ${escapeHtml(candidate.reason || "-")}</span>
              <button type="button" class="semantic-candidate-select-btn" data-old-object-id="${escapeHtml(ids.oldObjectId)}" data-new-object-id="${escapeHtml(ids.newObjectId)}">선택</button>
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

function isUnmatchedSettingItem(item = {}) {
  const status = String(item.status || "").toLowerCase();
  return status === "old-only" || status === "new-only" || (!item.oldObject || !item.newObject);
}

function renderSettingExclusionActions(item = {}, options = {}) {
  if (!isUnmatchedSettingItem(item)) return "";
  if (item.comparisonExcluded || item.excluded) {
    const policyId = item.exclusionPolicyId || item.exclusionRule?.id || "";
    return `
      <div class="semantic-setting-exclusion-actions semantic-setting-exclusion-actions-applied">
        <span>비교 제외됨${item.exclusionReason ? ` · ${escapeHtml(item.exclusionReason)}` : ""}</span>
        ${policyId ? `<button type="button" data-remove-exception="${escapeHtml(policyId)}">비교 제외 해제</button>` : ""}
      </div>
    `;
  }
  const targetId = typeof options.getSettingExclusionTargetId === "function"
    ? options.getSettingExclusionTargetId(item)
    : "";
  if (!targetId) return "";
  return `
    <div class="semantic-setting-exclusion-actions">
      <button type="button" data-add-exclusion="${escapeHtml(targetId)}" data-exclusion-fixed-scope="setting">이 설정만 비교 제외</button>
      <button type="button" data-add-exclusion="${escapeHtml(targetId)}" data-exclusion-fixed-scope="profile">현재 프로파일에서 같은 조건 비교 제외</button>
    </div>
  `;
}

function getStateDisplayLabel(state) {
  return ({
    matched: "매칭",
    partial: "부분 일치",
    ambiguous: "불명확",
    unmatched: "연결 안 됨",
    manual: "수동",
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

function isDescriptionField(field = "") {
  const normalized = String(field || "").trim().toLowerCase();
  return normalized === "description" || normalized.endsWith(".description");
}

function collectDescriptionValues(fields = {}) {
  const values = [];
  Object.entries(fields || {}).forEach(([field, value]) => {
    if (!isDescriptionField(field)) return;
    const list = Array.isArray(value) ? value : [value];
    list.forEach((entry) => {
      const text = String(entry ?? "").trim().replace(/\s+/g, " ");
      if (text) values.push(text);
    });
  });
  return values;
}

function uniqueDescriptionValues(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function getObjectDescriptionLabel(object = null) {
  if (!object) return "";
  const values = uniqueDescriptionValues([
    object.description,
    ...collectDescriptionValues(object.fields),
    ...collectDescriptionValues(object.canonicalFields),
  ]);
  return values.join(" / ");
}

function getFieldSummaryDescriptionLabel(field = null, side = "") {
  if (!field) return "";
  const key = side === "old" ? "oldValues" : side === "new" ? "newValues" : "";
  const values = key ? field[key] : [...(field.oldValues || []), ...(field.newValues || [])];
  return uniqueDescriptionValues(Array.isArray(values) ? values : [values]).join(" / ");
}

function getItemDescriptionLabel(item = {}) {
  const oldDescription = getObjectDescriptionLabel(item.oldObject) ||
    getFieldSummaryDescriptionLabel(item.fieldSummary?.description, "old");
  const newDescription = getObjectDescriptionLabel(item.newObject) ||
    getFieldSummaryDescriptionLabel(item.fieldSummary?.description, "new");
  if (oldDescription && newDescription && oldDescription !== newDescription) {
    return `${oldDescription} -> ${newDescription}`;
  }
  return oldDescription || newDescription || getFieldSummaryDescriptionLabel(item.fieldSummary?.description);
}

function renderObjectDescriptionMeta(item = {}) {
  const oldDescription = getObjectDescriptionLabel(item.oldObject) ||
    getFieldSummaryDescriptionLabel(item.fieldSummary?.description, "old") ||
    "-";
  const newDescription = getObjectDescriptionLabel(item.newObject) ||
    getFieldSummaryDescriptionLabel(item.fieldSummary?.description, "new") ||
    "-";
  return `
    <span>old description: ${escapeHtml(oldDescription)}</span>
    <span>new description: ${escapeHtml(newDescription)}</span>
  `;
}

function relationshipIssueCount(relationships = []) {
  return relationships.filter((item) => {
    const status = String(item?.status || "").toLowerCase();
    return status && !["matched", "equal", "present"].includes(status);
  }).length;
}

function auditSeverityLabel(severity = "") {
  return ({
    critical: "위험",
    warning: "경고",
    "manual-review": "수동 검토",
    unsupported: "미지원",
    suppressed: "예외 처리됨",
    info: "정보",
  })[severity] || severity || "표준 점검";
}

function renderAuditBadges(item = {}) {
  const findings = Array.isArray(item.auditFindings) ? item.auditFindings : [];
  if (!findings.length) return "";
  const active = findings.filter((finding) => !finding.suppressed);
  const severity = item.auditSeverity || (active[0]?.severity) || (findings.some((finding) => finding.suppressed) ? "suppressed" : "info");
  const count = active.length || findings.length;
  return `<span class="semantic-object-metric audit-badge audit-badge-${escapeHtml(severity)}">${escapeHtml(auditSeverityLabel(severity))} ${escapeHtml(count)}</span>`;
}

function renderAuditFindingDetails(item = {}) {
  const findings = Array.isArray(item.auditFindings) ? item.auditFindings : [];
  if (!findings.length) return "";
  return `
    <details class="semantic-detail-block semantic-audit-detail">
      <summary>표준 점검 (${findings.length})</summary>
      <div class="semantic-audit-list">
        ${findings.map((finding) => {
          const severity = finding.suppressed ? "suppressed" : finding.severity || "info";
          const source = (finding.sourceLines || []).slice(0, 4).map((line) => `${line.line || "-"}: ${line.text || ""}`).join("\n");
          return `
            <article class="semantic-audit-item audit-badge-${escapeHtml(severity)}">
              <strong>${escapeHtml(auditSeverityLabel(severity))} · ${escapeHtml(finding.titleKo || "검토 항목")}</strong>
              <span>설정 항목: ${escapeHtml(finding.fieldPath || "-")}</span>
              <span>현재값: ${escapeHtml(finding.actualValue || "-")}</span>
              <span>표준값: ${escapeHtml(finding.expectedValue || "-")}</span>
              <p>${escapeHtml(finding.descriptionKo || "")}</p>
              <p>권장 조치: ${escapeHtml(finding.recommendationKo || "-")}</p>
              ${source ? `<pre>${escapeHtml(source)}</pre>` : ""}
            </article>
          `;
        }).join("")}
      </div>
    </details>
  `;
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
    if (item.comparisonExcluded || item.excluded) {
      acc.excluded += 1;
      return acc;
    }
    const state = getSemanticStateLabel(item);
    if (state === "matched" || state === "manual") acc.matched += 1;
    else if (state === "ambiguous") acc.ambiguous += 1;
    else acc.unmatched += 1;
    acc.violations += (item.policyViolationCount || 0) + (item.auditFindingCount || 0);
    return acc;
  }, { total: 0, matched: 0, unmatched: 0, ambiguous: 0, violations: 0, excluded: 0 });
}

export function renderComparisonPlanHtml(plan = [], options = {}) {
  if (!Array.isArray(plan) || plan.length === 0) {
    return `<div class="semantic-empty">비교 결과 없음</div>`;
  }

  const summary = summarizePlan(plan);

  return `
    <div class="semantic-compare-result">
      <div class="semantic-state-legend">
        <span class="semantic-status-badge semantic-state-matched">매칭</span>
        <span class="semantic-status-badge semantic-state-partial">부분 일치</span>
        <span class="semantic-status-badge semantic-state-ambiguous">불명확</span>
        <span class="semantic-status-badge semantic-state-unmatched">연결 안 됨</span>
        <span class="semantic-status-badge semantic-state-manual">수동</span>
      </div>
      <div class="semantic-preview-summary">
        <div class="semantic-summary-item"><div class="semantic-summary-label">설정</div><div class="semantic-summary-value">${summary.total}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">매칭</div><div class="semantic-summary-value">${summary.matched}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">연결 안 됨</div><div class="semantic-summary-value">${summary.unmatched}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">비교 제외</div><div class="semantic-summary-value">${summary.excluded}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">불명확</div><div class="semantic-summary-value">${summary.ambiguous}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">위반</div><div class="semantic-summary-value">${summary.violations}</div></div>
      </div>

      ${plan.map((item) => {
        const stateClass = getSemanticStateClass(item);
        const stateLabel = getSemanticStateLabel(item);
        const violations = item.policyViolationCount || 0;
        const auditFindings = item.auditFindingCount || 0;
        const relationshipIssues = relationshipIssueCount(item.relationshipSummary || []);
        const changedFields = fieldChangedCount(item.fieldSummary || {});
        const excludedClass = item.comparisonExcluded || item.excluded ? " semantic-object-excluded" : "";
        const descriptionLabel = getItemDescriptionLabel(item);

        return `
          <details class="semantic-object-card ${violations ? "has-violation" : "no-violation"} ${stateClass}${excludedClass}" data-match-status="${escapeHtml(item.status || "")}">
            <summary class="semantic-object-summary-row">
              <span class="semantic-status-badge ${stateClass}">${escapeHtml(getStateDisplayLabel(stateLabel))}</span>
              <span class="semantic-object-title">
                <span class="semantic-object-key-label">${escapeHtml(item.objectType)} ${escapeHtml(getCompactObjectName(item))}</span>
                ${descriptionLabel ? `<span class="semantic-object-description" title="${escapeHtml(descriptionLabel)}">${escapeHtml(descriptionLabel)}</span>` : ""}
              </span>
              <span class="semantic-object-map">
                <span class="semantic-object-side old">${escapeHtml(getObjectSideLabel(item.oldObject))}</span>
                <span class="semantic-object-arrow">↔</span>
                <span class="semantic-object-side new">${escapeHtml(getObjectSideLabel(item.newObject))}</span>
              </span>
              <span class="semantic-object-metric">점수 ${item.score ?? "-"}</span>
              <span class="semantic-object-metric">위반 ${violations}</span>
              ${renderAuditBadges(item)}
              <span class="semantic-object-metric">관계 ${relationshipIssues}</span>
              <span class="semantic-object-metric">설정 항목 ${changedFields}/${item.fieldStats?.totalFields ?? 0}</span>
            </summary>
            <div class="semantic-object-details">
              <div class="semantic-object-meta">
                <span>기존: ${escapeHtml(item.oldObject?.sourceName || item.oldObject?.id || "-")}</span>
                <span>신규: ${escapeHtml(item.newObject?.sourceName || item.newObject?.id || "-")}</span>
                <span>기존 식별값: ${escapeHtml(item.oldObject?.normalizedIdentity || "-")}</span>
                <span>신규 식별값: ${escapeHtml(item.newObject?.normalizedIdentity || "-")}</span>
                ${renderObjectDescriptionMeta(item)}
                <span>매칭 키: ${escapeHtml((item.matchKeyFields || []).join(", ") || "-")}</span>
                <span>방식: ${escapeHtml(item.reason || "-")}</span>
                <span>상태: ${escapeHtml(getStatusLabel(item.status))}</span>
                <span>점수 사유: ${escapeHtml((item.scoreReasons || []).join(", ") || "-")}</span>
              </div>
              <div class="semantic-object-actions">${renderManualMatchActions(item)}${renderSettingExclusionActions(item, options)}</div>
              ${item.ambiguousAlternatives?.length ? `<details class="semantic-detail-block"><summary>대체 후보 (${item.ambiguousAlternatives.length})</summary>${renderAmbiguousAlternatives(item)}</details>` : ""}
              ${item.manualCandidates?.length ? `<details class="semantic-detail-block" open><summary>수동 매핑 후보 (${item.manualCandidates.length})</summary>${renderManualCandidates(item)}</details>` : ""}
              <details class="semantic-detail-block"><summary>설정 항목 비교 (${item.fieldStats?.totalFields ?? 0})</summary>${renderFieldSummary(item.fieldSummary, item, options)}</details>
              ${auditFindings ? renderAuditFindingDetails(item) : ""}
              ${renderRelationshipSummary(item.relationshipSummary)}
              ${renderLineMatches(item.lineMatches)}
            </div>
          </details>
        `;
      }).join("")}
    </div>
  `;
}
