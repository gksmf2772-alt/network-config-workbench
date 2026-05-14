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
  if (status === "matched") return "MATCHED";
  if (status === "candidate") return "CANDIDATE";
  if (status === "old-only") return "OLD ONLY";
  if (status === "new-only") return "NEW ONLY";
  return String(status || "UNKNOWN").toUpperCase();
}

function getFieldDisplayStatus(fieldSummary) {
  if (fieldSummary?.violation) return fieldSummary.violationReason || "violation";
  if (fieldSummary?.ignored) return "ignored";
  if (fieldSummary?.effectiveStatus === "present") return "present";
  return fieldSummary?.effectiveStatus || fieldSummary?.status || "unknown";
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
  if (!fields.length) return `<div class="semantic-empty">No comparable fields</div>`;

  return `
    <div class="semantic-field-list">
      ${fields.map((field) => `
        <div class="semantic-field semantic-field-${escapeHtml(field.effectiveStatus || field.status)}">
          <div class="semantic-field-head">
            <strong>${escapeHtml(field.field)}</strong>
            <span class="semantic-field-status">${escapeHtml(getFieldDisplayStatus(field))}</span>
          </div>
          <div class="semantic-field-values compact">${getFieldCompactValue(field)}</div>
          ${field.violation ? `<div class="semantic-violation">Violation: ${escapeHtml(field.violationReason)}</div>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function getLineDisplayStatus(lineMatch) {
  return lineMatch?.semanticCovered ? "SEMANTIC EQUAL" : String(lineMatch?.status || "unknown").toUpperCase();
}

function formatLineText(lines = []) {
  if (!Array.isArray(lines) || lines.length === 0) return "";
  return lines.map((line) => escapeHtml(line)).join("<br />");
}

function renderLineMatches(lineMatches = []) {
  if (!Array.isArray(lineMatches) || lineMatches.length === 0) {
    return `<div class="semantic-empty">No line comparison</div>`;
  }

  return `
    <details class="semantic-line-section">
      <summary>Line compare (${lineMatches.length})</summary>
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
              <span>score: ${escapeHtml(candidate.score ?? "-")}</span>
              <span>reason: ${escapeHtml(candidate.reason || "-")}</span>
              <button type="button" class="semantic-candidate-select-btn" data-old-object-id="${escapeHtml(ids.oldObjectId)}" data-new-object-id="${escapeHtml(ids.newObjectId)}">Select</button>
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
      <summary>Relationship Compare (${relationships.length})</summary>
      <div class="semantic-relationship-list">
        ${relationships.map((item) => `
          <div class="semantic-relationship-item">
            <strong>${escapeHtml(item.label || item.type)}</strong>
            <span>old: ${escapeHtml(String(item.oldValue || "-"))}</span>
            <span>new: ${escapeHtml(String(item.newValue || "-"))}</span>
            <span>status: ${escapeHtml(item.status || "-")}</span>
            <span>reason: ${escapeHtml(item.reason || "-")}</span>
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

  return `<button type="button" class="semantic-manual-remove-btn" data-old-object-id="${escapeHtml(oldObjectId)}">Remove manual match</button>`;
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
    return `<div class="semantic-empty">No comparison result</div>`;
  }

  const summary = summarizePlan(plan);

  return `
    <div class="semantic-compare-result">
      <div class="semantic-state-legend">
        <span class="semantic-status-badge semantic-state-matched">matched</span>
        <span class="semantic-status-badge semantic-state-partial">partial</span>
        <span class="semantic-status-badge semantic-state-ambiguous">ambiguous</span>
        <span class="semantic-status-badge semantic-state-unmatched">unmatched</span>
        <span class="semantic-status-badge semantic-state-manual">manual</span>
      </div>
      <div class="semantic-preview-summary">
        <div class="semantic-summary-item"><div class="semantic-summary-label">Objects</div><div class="semantic-summary-value">${summary.total}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">Matched</div><div class="semantic-summary-value">${summary.matched}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">Unmatched</div><div class="semantic-summary-value">${summary.unmatched}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">Ambiguous</div><div class="semantic-summary-value">${summary.ambiguous}</div></div>
        <div class="semantic-summary-item"><div class="semantic-summary-label">Violations</div><div class="semantic-summary-value">${summary.violations}</div></div>
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
              <span class="semantic-status-badge ${stateClass}">${escapeHtml(stateLabel)}</span>
              <span class="semantic-object-title">${escapeHtml(item.objectType)} ${escapeHtml(getCompactObjectName(item))}</span>
              <span class="semantic-object-map">
                <span class="semantic-object-side old">${escapeHtml(getObjectSideLabel(item.oldObject))}</span>
                <span class="semantic-object-arrow">↔</span>
                <span class="semantic-object-side new">${escapeHtml(getObjectSideLabel(item.newObject))}</span>
              </span>
              <span class="semantic-object-metric">score ${item.score ?? "-"}</span>
              <span class="semantic-object-metric">viol ${violations}</span>
              <span class="semantic-object-metric">rel ${relationshipIssues}</span>
              <span class="semantic-object-metric">fields ${changedFields}/${item.fieldStats?.totalFields ?? 0}</span>
            </summary>
            <div class="semantic-object-details">
              <div class="semantic-object-meta">
                <span>old: ${escapeHtml(item.oldObject?.sourceName || item.oldObject?.id || "-")}</span>
                <span>new: ${escapeHtml(item.newObject?.sourceName || item.newObject?.id || "-")}</span>
                <span>old identity: ${escapeHtml(item.oldObject?.normalizedIdentity || "-")}</span>
                <span>new identity: ${escapeHtml(item.newObject?.normalizedIdentity || "-")}</span>
                <span>match key: ${escapeHtml((item.matchKeyFields || []).join(", ") || "-")}</span>
                <span>method: ${escapeHtml(item.reason || "-")}</span>
                <span>status: ${escapeHtml(getStatusLabel(item.status))}</span>
                <span>score reason: ${escapeHtml((item.scoreReasons || []).join(", ") || "-")}</span>
              </div>
              <div class="semantic-object-actions">${renderManualMatchActions(item)}</div>
              ${item.ambiguousAlternatives?.length ? `<details class="semantic-detail-block"><summary>Candidate Alternatives (${item.ambiguousAlternatives.length})</summary>${renderAmbiguousAlternatives(item)}</details>` : ""}
              ${item.manualCandidates?.length ? `<details class="semantic-detail-block" open><summary>Manual Match Candidates (${item.manualCandidates.length})</summary>${renderManualCandidates(item)}</details>` : ""}
              <details class="semantic-detail-block"><summary>Field Compare (${item.fieldStats?.totalFields ?? 0})</summary>${renderFieldSummary(item.fieldSummary)}</details>
              ${renderRelationshipSummary(item.relationshipSummary)}
              ${renderLineMatches(item.lineMatches)}
            </div>
          </details>
        `;
      }).join("")}
    </div>
  `;
}
