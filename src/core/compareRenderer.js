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

  return `
    <div class="semantic-compare-result">
      ${plan
        .map((item) => {
          const violationClass =
            item.policyViolationCount > 0 ? "has-violation" : "no-violation";

          return `
            <section class="semantic-object-card ${violationClass}">
              <header class="semantic-object-header">
                <div>
                  <div class="semantic-object-type">${escapeHtml(item.objectType)}</div>
                  <h3>${escapeHtml(getObjectTitle(item))}</h3>
                </div>
                <div class="semantic-object-status">
                  <span>${getStatusLabel(item.status)}</span>
                  <span>reason: ${escapeHtml(item.reason)}</span>
                  <span>score: ${item.score ?? "-"}</span>
                </div>
              </header>

              <div class="semantic-object-meta">
                <span>match key: ${escapeHtml((item.matchKeyFields || []).join(", ") || "-")}</span>
                <span>violations: ${item.policyViolationCount || 0}</span>
                <span>fields: ${item.fieldStats?.totalFields ?? 0}</span>
              </div>

              ${renderFieldSummary(item.fieldSummary)}
              ${renderLineMatches(item.lineMatches)}
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}