// src/core/compareRenderer.js

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

function getFieldIcon(fieldSummary) {
  if (fieldSummary?.ignored) return "⚪";
  if (fieldSummary?.violation) return "❌";
  if (fieldSummary?.status === "equal") return "✅";
  if (fieldSummary?.status === "changed") return "⚠️";
  if (fieldSummary?.status === "missing") return "❌";
  if (fieldSummary?.status === "added") return "➕";
  return "•";
}

function getFieldDisplayStatus(fieldSummary) {
  if (fieldSummary?.violation) {
    if (fieldSummary.violationReason === "required-field-absent") {
      return "required missing";
    }

    if (fieldSummary.violationReason === "field-changed") {
      return "changed";
    }

    if (fieldSummary.violationReason === "field-missing") {
      return "missing";
    }

    return "violation";
  }

  if (fieldSummary?.ignored) return "ignored";

  if (fieldSummary?.effectiveStatus === "present") return "present";

  return fieldSummary?.effectiveStatus || fieldSummary?.status || "unknown";
}

function getFieldCompactValue(fieldSummary) {
  const oldValues = Array.isArray(fieldSummary?.oldValues)
    ? fieldSummary.oldValues
    : [];

  const newValues = Array.isArray(fieldSummary?.newValues)
    ? fieldSummary.newValues
    : [];

  const oldText = oldValues.length ? oldValues.map(escapeHtml).join(", ") : "-";
  const newText = newValues.length ? newValues.map(escapeHtml).join(", ") : "-";

  if (oldText === newText) {
    return oldText;
  }

  return `${oldText} → ${newText}`;
}

function formatValues(values = []) {
  if (!Array.isArray(values) || values.length === 0) return "-";
  return values.map(escapeHtml).join(", ");
}

function renderFieldSummary(fieldSummary = {}) {
  const fields = Object.values(fieldSummary);

  if (!fields.length) {
    return `<div class="semantic-empty">No comparable fields</div>`;
  }

  return `
    <div class="semantic-field-list">
      ${fields
        .map((field) => {
          const icon = getFieldIcon(field);
          const displayStatus = getFieldDisplayStatus(field);
          const compactValue = getFieldCompactValue(field);

          return `
            <div class="semantic-field semantic-field-${escapeHtml(field.effectiveStatus || field.status)}">
              <div class="semantic-field-head">
                <span class="semantic-field-icon">${icon}</span>
                <strong>${escapeHtml(field.field)}</strong>
                <span class="semantic-field-status">${escapeHtml(displayStatus)}</span>
              </div>
              <div class="semantic-field-values compact">
                ${compactValue}
              </div>
              ${
                field.violation
                  ? `<div class="semantic-violation">Violation: ${escapeHtml(field.violationReason)}</div>`
                  : ""
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function getLineDisplayStatus(lineMatch) {
  if (lineMatch?.semanticCovered) {
    return "SEMANTIC EQUAL";
  }

  return String(lineMatch?.status || "unknown").toUpperCase();
}

function getLineStatusIcon(lineMatch) {
  if (lineMatch?.semanticCovered) return "🧠";

  const status = lineMatch?.status;

  if (status === "equal") return "✅";
  if (status === "changed") return "⚠️";
  if (status === "missing") return "❌";
  if (status === "added") return "➕";
  if (status === "ignored") return "⚪";
  return "•";
}

function formatLineText(lines = []) {
  if (!Array.isArray(lines) || lines.length === 0) return "";

  return lines
    .map((line) => escapeHtml(line))
    .join("<br />");
}

function renderLineMatches(lineMatches = []) {
  if (!Array.isArray(lineMatches) || lineMatches.length === 0) {
    return `<div class="semantic-empty">No line comparison</div>`;
  }

  return `
    <details class="semantic-line-section" open>
      <summary>Line compare (${lineMatches.length})</summary>

      <div class="semantic-line-grid">
        ${lineMatches
          .map((lineMatch) => {
            const icon = getLineStatusIcon(lineMatch);
            const oldText = formatLineText(lineMatch.oldLines);
            const newText = formatLineText(lineMatch.newLines);

            return `
              <div class="
                semantic-line-row
                semantic-line-${escapeHtml(lineMatch.status)}
                ${lineMatch.semanticCovered ? "semantic-line-covered" : ""}
              ">
                <div class="semantic-line-status">
                  <span>${icon}</span>
                  <span>${escapeHtml(getLineDisplayStatus(lineMatch))}</span>
                </div>

                <pre class="semantic-line-cell old">${oldText || "&nbsp;"}</pre>

                <div class="semantic-line-arrow">↔</div>

                <pre class="semantic-line-cell new">${newText || "&nbsp;"}</pre>

                <div class="semantic-line-reason">${escapeHtml(lineMatch.reason || "")}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    </details>
  `;
}

function renderAmbiguousAlternatives(item = {}) {
  const alternatives = Array.isArray(item.ambiguousAlternatives)
    ? item.ambiguousAlternatives
    : [];

  if (!alternatives.length) return "";

  const oldObjectId = item.oldObject?.id || "";

  return `
    <div class="semantic-candidate-box">
      <strong>Candidate alternatives</strong>
      <ul>
        ${alternatives
          .map((alternative) => {
            const alternativeId = alternative.id || "";

            return `
              <li class="semantic-candidate-option">
                <span>${escapeHtml(alternative.sourceName || alternative.id || "-")}</span>
                <span>score: ${escapeHtml(alternative.score ?? "-")}</span>
                <span>reason: ${escapeHtml(alternative.reason || "-")}</span>
                <button
                  type="button"
                  class="semantic-candidate-select-btn"
                  data-old-object-id="${escapeHtml(oldObjectId)}"
                  data-new-object-id="${escapeHtml(alternativeId)}"
                >
                  Select
                </button>
              </li>
            `;
          })
          .join("")}
      </ul>
    </div>
  `;
}

function renderManualCandidates(item = {}) {
  const candidates = Array.isArray(item.manualCandidates)
    ? item.manualCandidates
    : [];

  if (!candidates.length) return "";

  const oldObject = item.oldObject || {};
  const newObject = item.newObject || {};

  const currentObjectId =
    item.status === "old-only"
      ? oldObject.id || oldObject.objectId || oldObject.sourceName || ""
      : newObject.id || newObject.objectId || newObject.sourceName || "";

  return `
    <div class="semantic-candidate-box">
      <strong>Manual match candidates</strong>
      <ul>
        ${candidates
          .map((candidate) => {
            const candidateId = candidate.id || "";

            const oldObjectId =
              item.status === "old-only" ? currentObjectId : candidateId;

            const newObjectId =
              item.status === "old-only" ? candidateId : currentObjectId;

            return `
              <li class="semantic-candidate-option">
                <span>${escapeHtml(candidate.sourceName || candidate.id || "-")}</span>
                <span>score: ${escapeHtml(candidate.score ?? "-")}</span>
                <span>reason: ${escapeHtml(candidate.reason || "-")}</span>
                <button
                  type="button"
                  class="semantic-candidate-select-btn"
                  data-old-object-id="${escapeHtml(oldObjectId)}"
                  data-new-object-id="${escapeHtml(newObjectId)}"
                >
                  Select
                </button>
              </li>
            `;
          })
          .join("")}
      </ul>
    </div>
  `;
}

function renderRelationshipSummary(relationships = []) {
  if (!Array.isArray(relationships) || !relationships.length) {
    return "";
  }

  return `
    <details class="semantic-detail-block">
      <summary>Relationship Compare (${relationships.length})</summary>

      <div class="semantic-relationship-list">
        ${relationships.map((item) => `
          <div class="semantic-relationship-item">
            <div>
              <strong>${escapeHtml(item.label || item.type)}</strong>
            </div>

            <div>
              old: ${escapeHtml(String(item.oldValue || "-"))}
            </div>

            <div>
              new: ${escapeHtml(String(item.newValue || "-"))}
            </div>

            <div>
              status: ${escapeHtml(item.status || "-")}
            </div>

            <div>
              reason: ${escapeHtml(item.reason || "-")}
            </div>
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

  const oldObjectId =
    item.oldObject?.id ||
    item.oldObject?.objectId ||
    item.oldObject?.sourceName ||
    "";

  if (!oldObjectId) return "";

  return `
    <button
      type="button"
      class="semantic-manual-remove-btn"
      data-old-object-id="${escapeHtml(oldObjectId)}"
    >
      Remove manual match
    </button>
  `;
}

function getObjectTitle(item) {
  const oldName = item.oldObject?.sourceName;
  const newName = item.newObject?.sourceName;

  if (oldName && newName) return `${oldName} ↔ ${newName}`;
  if (oldName) return `${oldName}`;
  if (newName) return `${newName}`;
  return item.id;
}

export function renderComparisonPlanHtml(plan = []) {
  if (!Array.isArray(plan) || plan.length === 0) {
    return `<div class="semantic-empty">No comparison result</div>`;
  }

  const summary = plan.reduce(
    (acc, item) => {
      acc.total += 1;

      const status = String(item.status || "").toLowerCase();

      if (status.includes("match")) acc.matched += 1;
      else if (status.includes("ambiguous")) acc.ambiguous += 1;
      else acc.unmatched += 1;

      acc.violations += item.policyViolationCount || 0;

      return acc;
    },
    {
      total: 0,
      matched: 0,
      unmatched: 0,
      ambiguous: 0,
      violations: 0,
    }
  );

  return `
    <style>
      .semantic-compare-result {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 12px 0;
        font-size: 13px;
      }

      .semantic-preview-summary {
        display: grid;
        grid-template-columns: repeat(5, minmax(120px, 1fr));
        gap: 8px;
        padding: 12px;
        border: 1px solid #d0d7de;
        border-radius: 8px;
        background: #f6f8fa;
      }

      .semantic-summary-item {
        padding: 10px;
        border: 1px solid #d0d7de;
        border-radius: 8px;
        background: #ffffff;
      }

      .semantic-summary-label {
        color: #57606a;
        font-size: 12px;
        margin-bottom: 4px;
      }

      .semantic-summary-value {
        font-size: 18px;
        font-weight: 700;
      }

      .semantic-object-card {
        border: 1px solid #d0d7de;
        border-radius: 8px;
        background: #ffffff;
        overflow: hidden;
      }

      .semantic-object-card.has-violation {
        border-color: #cf222e;
      }

      .semantic-object-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 12px;
        border-bottom: 1px solid #d8dee4;
        background: #f6f8fa;
      }

      .semantic-object-type {
        display: inline-block;
        margin-bottom: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        background: #ddf4ff;
        color: #0969da;
        font-size: 12px;
        font-weight: 700;
      }

      .semantic-object-header h3 {
        margin: 0;
        font-size: 14px;
      }

      .semantic-object-status {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
        gap: 6px;
        min-width: 280px;
      }

      .semantic-status-badge {
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
      }

      .semantic-status-matched {
        background: #dafbe1;
        color: #116329;
      }

      .semantic-status-ambiguous {
        background: #fff8c5;
        color: #7d4e00;
      }

      .semantic-status-unmatched {
        background: #ffebe9;
        color: #cf222e;
      }

      .semantic-status-neutral {
        background: #eaeef2;
        color: #57606a;
      }

      .semantic-object-meta {
        display: grid;
        grid-template-columns: repeat(4, minmax(160px, 1fr));
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid #d8dee4;
        color: #57606a;
      }

      .semantic-object-meta span {
        overflow-wrap: anywhere;
      }

      .semantic-detail-block {
        padding: 10px 12px;
      }

      details.semantic-detail-block summary {
        cursor: pointer;
        font-weight: 700;
      }
    </style>

    <div class="semantic-compare-result">
      <div class="semantic-preview-summary">
        <div class="semantic-summary-item">
          <div class="semantic-summary-label">Total Objects</div>
          <div class="semantic-summary-value">${summary.total}</div>
        </div>
        <div class="semantic-summary-item">
          <div class="semantic-summary-label">Matched</div>
          <div class="semantic-summary-value">${summary.matched}</div>
        </div>
        <div class="semantic-summary-item">
          <div class="semantic-summary-label">Unmatched</div>
          <div class="semantic-summary-value">${summary.unmatched}</div>
        </div>
        <div class="semantic-summary-item">
          <div class="semantic-summary-label">Ambiguous</div>
          <div class="semantic-summary-value">${summary.ambiguous}</div>
        </div>
        <div class="semantic-summary-item">
          <div class="semantic-summary-label">Policy Violations</div>
          <div class="semantic-summary-value">${summary.violations}</div>
        </div>
      </div>

      ${plan
        .map((item) => {
          const violationClass =
            item.policyViolationCount > 0 ? "has-violation" : "no-violation";

          const statusText = getStatusLabel(item.status);
          const rawStatus = String(item.status || "").toLowerCase();

          let statusClass = "semantic-status-neutral";
          if (rawStatus.includes("match")) statusClass = "semantic-status-matched";
          else if (rawStatus.includes("ambiguous")) statusClass = "semantic-status-ambiguous";
          else if (rawStatus.includes("unmatch") || rawStatus.includes("missing")) {
            statusClass = "semantic-status-unmatched";
          }

          return `
            <section class="semantic-object-card ${violationClass}">
              <header class="semantic-object-header">
                <div>
                  <div class="semantic-object-type">${escapeHtml(item.objectType)}</div>
                  <h3>${escapeHtml(getObjectTitle(item))}</h3>
                </div>
                <div class="semantic-object-status">
                  <span class="semantic-status-badge ${statusClass}">${escapeHtml(statusText)}</span>
                  <span>method: ${escapeHtml(item.reason || "-")}</span>
                  <span>score: ${item.score ?? "-"}</span>
                  ${renderManualMatchActions(item)}
                </div>
              </header>

              <div class="semantic-object-meta">
                <span>old: ${escapeHtml(item.oldObject?.sourceName || item.oldObject?.id || "-")}</span>
                <span>new: ${escapeHtml(item.newObject?.sourceName || item.newObject?.id || "-")}</span>
                <span>match key: ${escapeHtml((item.matchKeyFields || []).join(", ") || "-")}</span>
                <span>violations: ${item.policyViolationCount || 0}</span>
                <span>score reason: ${escapeHtml((item.scoreReasons || []).join(", ") || "-")}</span>
                <span>fields: ${item.fieldStats?.totalFields ?? 0}</span>
              </div>

              ${
                item.ambiguousAlternatives?.length
                  ? `<details class="semantic-detail-block">
                      <summary>Candidate Alternatives (${item.ambiguousAlternatives.length})</summary>
                      ${renderAmbiguousAlternatives(item)}
                    </details>`
                  : ""
              }
              ${
                item.manualCandidates?.length
                  ? `<details class="semantic-detail-block" open>
                      <summary>Manual Match Candidates (${item.manualCandidates.length})</summary>
                      ${renderManualCandidates(item)}
                    </details>`
                  : ""
              }
              ${renderFieldSummary(item.fieldSummary)}
              ${renderRelationshipSummary(item.relationshipSummary)}
              ${renderLineMatches(item.lineMatches)}
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}