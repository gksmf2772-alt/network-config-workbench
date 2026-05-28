import { getSemanticStateLabel } from "./semanticTheme.js";

export const EXCEL_REPORT_COLUMNS = [
  { key: "section", label: "section" },
  { key: "oldObject", label: "old object" },
  { key: "newObject", label: "new object" },
  { key: "status", label: "status" },
  { key: "field", label: "field" },
  { key: "oldValue", label: "old value" },
  { key: "newValue", label: "new value" },
  { key: "reason", label: "reason" },
  { key: "severity", label: "severity" },
  { key: "actionNeeded", label: "action needed" },
];

const SAME_FIELD_STATUSES = new Set(["same", "equal", "present"]);
const MISSING_FIELD_STATUSES = new Set(["missing", "missing-new", "old-only", "unmatched-old", "source-only", "no-target"]);
const ADDED_FIELD_STATUSES = new Set(["added", "missing-old", "new-only", "unmatched-new", "target-only", "no-source"]);
const REVIEW_FIELD_STATUSES = new Set(["candidate", "manual-review", "low-confidence", "inheritance-unresolved"]);
const SUPPRESSED_FIELD_STATUSES = new Set(["ignored", "structure-converted", "inheritance-unresolved"]);
const EXCLUDED_FIELD_STATUSES = new Set(["comparison-excluded", "excluded"]);

export function buildExcelReportRows({
  plan = [],
  auditFindings = [],
  includeSuppressed = false,
} = {}) {
  const rows = [];

  for (const item of Array.isArray(plan) ? plan : []) {
    if (!item || (!includeSuppressed && isExcludedPlanItem(item))) continue;
    if (!includeSuppressed && isSuppressedOnlyPlanItem(item)) continue;

    if (isObjectLevelExportItem(item)) {
      rows.push(buildObjectLevelRow(item));
      continue;
    }

    const fieldRows = buildFieldLevelRows(item, includeSuppressed);
    rows.push(...fieldRows);
    rows.push(...buildRelationshipRows(item));

    if (!fieldRows.length && isLowConfidenceMatch(item)) {
      rows.push(buildObjectLevelRow(item, {
        status: "검토 필요",
        reason: "낮은 매칭 신뢰도",
        severity: "보통",
        actionNeeded: "매칭 근거 확인",
      }));
    }
  }

  rows.push(...buildAuditFindingRows(auditFindings));
  return rows;
}

export function buildExcelReportCsv(rows = [], columns = EXCEL_REPORT_COLUMNS) {
  const lines = [
    columns.map((column) => escapeCsvCell(column.label)).join(","),
    ...(Array.isArray(rows) ? rows : []).map((row) =>
      columns.map((column) => escapeCsvCell(row?.[column.key] ?? "")).join(",")
    ),
  ];
  return `\ufeff${lines.join("\r\n")}\r\n`;
}

export function buildExcelReportFilename({ comparedAt = Date.now() } = {}) {
  const date = new Date(comparedAt);
  const stamp = Number.isNaN(date.getTime())
    ? "unknown"
    : date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `network-config-report-${stamp}.csv`;
}

function buildObjectLevelRow(item = {}, override = {}) {
  const objectType = planItemObjectType(item);
  const status = override.status || getSemanticStateLabel(item);
  return {
    section: objectType,
    oldObject: objectIdentity(item.oldObject),
    newObject: objectIdentity(item.newObject),
    status,
    field: "",
    oldValue: "",
    newValue: "",
    reason: override.reason || objectReason(item, status),
    severity: override.severity || severityForStatus(status),
    actionNeeded: override.actionNeeded || actionForStatus(status),
  };
}

function buildFieldLevelRows(item = {}, includeSuppressed = false) {
  return Object.entries(item.fieldSummary || {})
    .map(([field, summary]) => buildFieldLevelRow(item, field, summary, includeSuppressed))
    .filter(Boolean)
    .sort((left, right) => left.field.localeCompare(right.field));
}

function buildFieldLevelRow(item = {}, rawField = "", summary = {}, includeSuppressed = false) {
  const policyState = policyAppliedFieldState(summary);
  if (!includeSuppressed && policyState !== "active") return null;

  const status = normalizeStatus(summary?.effectiveStatus || summary?.status);
  if (!status || SAME_FIELD_STATUSES.has(status)) return null;

  const field = normalizeFieldName(summary?.field || rawField);
  const label = fieldStatusLabel(status, item);
  return {
    section: planItemObjectType(item),
    oldObject: objectIdentity(item.oldObject),
    newObject: objectIdentity(item.newObject),
    status: label,
    field,
    oldValue: fieldValue(summary, item.oldObject, field, "oldValues"),
    newValue: fieldValue(summary, item.newObject, field, "newValues"),
    reason: fieldReason(summary, status, item),
    severity: severityForStatus(label, field),
    actionNeeded: actionForStatus(label, field),
  };
}

function buildRelationshipRows(item = {}) {
  return (item.relationshipSummary || [])
    .filter((relationship) => {
      const status = normalizeStatus(relationship?.status);
      return status && !SAME_FIELD_STATUSES.has(status) && status !== "matched";
    })
    .map((relationship) => ({
      section: planItemObjectType(item),
      oldObject: objectIdentity(item.oldObject),
      newObject: objectIdentity(item.newObject),
      status: "검토 필요",
      field: `relationship:${normalizeFieldName(relationship.type || relationship.field || "reference")}`,
      oldValue: compactValues([relationship.source || relationship.from]),
      newValue: compactValues([relationship.target || relationship.to || relationship.value]),
      reason: relationship.reason || relationship.changeType || "참조 관계 변경",
      severity: "보통",
      actionNeeded: "참조 관계 확인",
    }));
}

function buildAuditFindingRows(auditFindings = []) {
  return (Array.isArray(auditFindings) ? auditFindings : [])
    .filter((finding) => finding && !finding.suppressed)
    .map((finding) => ({
      section: finding.objectType || finding.category || "audit",
      oldObject: finding.objectKey || finding.objectName || "",
      newObject: finding.objectKey || finding.objectName || "",
      status: "검토 필요",
      field: finding.fieldPath || finding.field || "",
      oldValue: compactValues([finding.currentValue, finding.actualValue]),
      newValue: compactValues([finding.expectedValue]),
      reason: finding.titleKo || finding.descriptionKo || finding.ruleId || "표준 점검",
      severity: severityLabel(finding.severity),
      actionNeeded: finding.actionKo || finding.recommendationKo || "표준 점검 결과 확인",
    }));
}

function isObjectLevelExportItem(item = {}) {
  const status = normalizeStatus(item.status);
  return [
    "old-only",
    "new-only",
    "candidate",
    "unmatched",
    "unmatched-old",
    "unmatched-new",
    "source-only",
    "target-only",
    "no-target",
    "no-source",
  ].includes(status);
}

function isLowConfidenceMatch(item = {}) {
  const score = Number(item.score);
  return item.oldObject && item.newObject && Number.isFinite(score) && score > 0 && score < 80;
}

function isExcludedPlanItem(item = {}) {
  return Boolean(item?.comparisonExcluded || item?.excluded || item?.exclusionIssue);
}

function isSuppressedOnlyPlanItem(item = {}) {
  if (!item?.policySuppressed) return false;
  return !Object.values(item.fieldSummary || {}).some((summary) => policyAppliedFieldState(summary) === "active");
}

function policyAppliedFieldState(summary = {}) {
  const status = normalizeStatus(summary?.effectiveStatus || summary?.status);
  const sourcePolicy = String(summary?.sourcePolicy || summary?.policySource || "").toLowerCase();
  const policyHitSources = (summary?.policyHits || [])
    .map((hit) => String(hit?.sourcePolicy || hit?.policySource || "").toLowerCase());
  const sources = [sourcePolicy, ...policyHitSources];

  if (sources.includes("comparison-exclusion") || EXCLUDED_FIELD_STATUSES.has(status)) return "excluded";
  if (
    summary?.ignored ||
    summary?.suppressed ||
    SUPPRESSED_FIELD_STATUSES.has(status) ||
    sources.includes("profile-exception") ||
    sources.includes("user-exception") ||
    sources.includes("advanced-policy")
  ) {
    return "suppressed";
  }
  return "active";
}

function fieldStatusLabel(status = "", item = {}) {
  if (MISSING_FIELD_STATUSES.has(status)) return "누락";
  if (ADDED_FIELD_STATUSES.has(status)) return "추가";
  if (REVIEW_FIELD_STATUSES.has(status) || normalizeStatus(item.status) === "candidate" || isLowConfidenceMatch(item)) {
    return "검토 필요";
  }
  if (status === "ignored") return "예외 처리";
  if (status === "comparison-excluded" || status === "excluded") return "비교 제외";
  return "변경";
}

function objectReason(item = {}, statusLabel = "") {
  const status = normalizeStatus(item.status);
  if (status === "old-only" || status === "source-only" || status === "no-target" || status === "unmatched-old") {
    return "기존 설정에서만 발견됨";
  }
  if (status === "new-only" || status === "target-only" || status === "no-source" || status === "unmatched-new") {
    return "신규 설정에서만 발견됨";
  }
  if (status === "candidate" || statusLabel === "검토 필요") return "매칭 후보 확인 필요";
  return item.reason || statusLabel || "비교 결과 확인";
}

function fieldReason(summary = {}, status = "", item = {}) {
  if (summary.reason || summary.message) return summary.reason || summary.message;
  if (MISSING_FIELD_STATUSES.has(status)) return "신규 설정에서 field 누락";
  if (ADDED_FIELD_STATUSES.has(status)) return "신규 설정에 field 추가";
  if (REVIEW_FIELD_STATUSES.has(status) || normalizeStatus(item.status) === "candidate") return "자동 판단 보류";
  return "field 값 변경";
}

function severityForStatus(statusLabel = "", field = "") {
  if (statusLabel === "누락") return "높음";
  if (statusLabel === "추가") return "보통";
  if (statusLabel === "검토 필요") return "보통";
  if (/peer-as|next-hop|address|route|neighbor|admin-state|import|export/i.test(field)) return "보통";
  return "낮음";
}

function actionForStatus(statusLabel = "", field = "") {
  if (statusLabel === "누락") return "신규 설정 확인";
  if (statusLabel === "추가") return "추가 설정 확인";
  if (statusLabel === "검토 필요") return "수동 검토";
  if (/peer-as|next-hop|address|route|neighbor|admin-state|import|export/i.test(field)) return "변경 영향 검토";
  return "변경 확인";
}

function severityLabel(severity = "") {
  return ({
    critical: "높음",
    warning: "보통",
    "manual-review": "보통",
    unsupported: "높음",
    info: "낮음",
  })[String(severity || "").toLowerCase()] || "보통";
}

function fieldValue(summary = {}, object = {}, field = "", summaryKey = "") {
  const summaryValue = compactValues(summary?.[summaryKey]);
  if (summaryValue) return maskSensitiveValue(field, summaryValue);
  const fields = object?.fields || object?.canonicalFields || {};
  const value = fields[field] ?? fields[summary?.field] ?? fields[denormalizeAdminStateField(field)] ?? "";
  return maskSensitiveValue(field, compactValues(value));
}

function maskSensitiveValue(field = "", value = "") {
  if (!value) return "";
  if (/auth|password|secret|key|hash|certificate/i.test(field)) return "값 있음";
  return value;
}

function compactValues(values = []) {
  const list = Array.isArray(values) ? values : [values];
  return [...new Set(list.map((value) => String(value ?? "").trim()).filter(Boolean))].join(", ");
}

function objectIdentity(object = null) {
  if (!object) return "";
  return String(
    object.normalizedIdentity ||
    object.identity ||
    object.name ||
    object.sourceName ||
    object.key ||
    object.id ||
    "",
  ).trim();
}

function planItemObjectType(item = {}) {
  return item.objectType || item.oldObject?.normalizedType || item.newObject?.normalizedType || "object";
}

function normalizeFieldName(field = "") {
  return String(field || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function denormalizeAdminStateField(field = "") {
  return field === "admin-state" ? "state" : field;
}

function normalizeStatus(status = "") {
  return String(status || "").trim().toLowerCase();
}

function escapeCsvCell(value = "") {
  const raw = String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const text = protectExcelFormula(raw);
  if (text !== raw || /[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function protectExcelFormula(value = "") {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}
