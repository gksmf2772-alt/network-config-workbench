import { getSemanticStateLabel } from "./semanticTheme.js";
import { createFixtureUnmatchedClassifier } from "./summaryAnalytics.js";

export const EXCEL_REPORT_COLUMNS = [
  { key: "section", label: "section" },
  { key: "oldObject", label: "old object" },
  { key: "newObject", label: "new object" },
  { key: "status", label: "status" },
  { key: "field", label: "field" },
  { key: "oldValue", label: "old value" },
  { key: "newValue", label: "new value" },
  { key: "reason", label: "reason" },
  { key: "matchReason", label: "match reason" },
  { key: "unmatchedCategory", label: "unmatched category" },
  { key: "diagnosticReason", label: "diagnostic reason" },
  { key: "matchKeyFields", label: "match key fields" },
  { key: "scoreReasons", label: "score reasons" },
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
  fixtureScope = null,
} = {}) {
  const rows = [];
  const planItems = Array.isArray(plan) ? plan : [];
  const context = {
    classifyUnmatched: createFixtureUnmatchedClassifier(planItems, fixtureScope),
  };

  for (const item of planItems) {
    if (!item || (!includeSuppressed && isExcludedPlanItem(item))) continue;
    if (!includeSuppressed && isSuppressedOnlyPlanItem(item)) continue;

    if (isObjectLevelExportItem(item)) {
      rows.push(buildObjectLevelRow(item, {}, context));
      continue;
    }

    const fieldRows = buildFieldLevelRows(item, includeSuppressed, context);
    rows.push(...fieldRows);
    rows.push(...buildRelationshipRows(item, context));

    if (!fieldRows.length && isLowConfidenceMatch(item)) {
      rows.push(buildObjectLevelRow(item, {
        status: "검토 필요",
        reason: "낮은 매칭 신뢰도",
        severity: "보통",
        actionNeeded: "매칭 근거 확인",
      }, context));
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

export function buildExcelReportXlsx(rows = [], columns = EXCEL_REPORT_COLUMNS) {
  const sheets = buildExcelReportSheets(rows, columns);
  const worksheetFiles = sheets.map((sheet, index) => ({
    path: `xl/worksheets/sheet${index + 1}.xml`,
    content: buildWorksheetXml(sheet.rows, columns),
  }));

  return buildZipArchive([
    { path: "[Content_Types].xml", content: buildContentTypesXml(sheets.length) },
    { path: "_rels/.rels", content: buildRootRelationshipsXml() },
    { path: "xl/workbook.xml", content: buildWorkbookXml(sheets) },
    { path: "xl/_rels/workbook.xml.rels", content: buildWorkbookRelationshipsXml(sheets.length) },
    ...worksheetFiles,
  ]);
}

export function buildExcelReportSheets(rows = [], columns = EXCEL_REPORT_COLUMNS) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const groups = [
    { name: "All", rows: safeRows },
    { name: "Interface", rows: safeRows.filter((row) => row?.section === "interface") },
    { name: "Static Route", rows: safeRows.filter((row) => row?.section === "static-route") },
    { name: "BGP", rows: safeRows.filter((row) => row?.section === "bgp") },
    { name: "Port LAG", rows: safeRows.filter((row) => ["port", "lag"].includes(row?.section)) },
    { name: "Service", rows: safeRows.filter((row) =>
      ["pim", "sap", "subscriber-interface", "group-interface"].includes(row?.section)
    ) },
    { name: "Other", rows: safeRows.filter((row) =>
      row?.section &&
      !["interface", "static-route", "bgp", "port", "lag", "pim", "sap", "subscriber-interface", "group-interface"].includes(row.section)
    ) },
  ];
  const names = new Set();

  return groups
    .filter((sheet) => sheet.name === "All" || sheet.rows.length)
    .map((sheet) => ({
      name: uniqueSheetName(sheet.name, names),
      rows: sheet.rows,
      columns,
    }));
}

export function buildExcelReportFilename({ comparedAt = Date.now() } = {}) {
  const date = new Date(comparedAt);
  const stamp = Number.isNaN(date.getTime())
    ? "unknown"
    : date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `network-config-report-${stamp}.csv`;
}

export function buildExcelReportXlsxFilename({ comparedAt = Date.now() } = {}) {
  const date = new Date(comparedAt);
  const stamp = Number.isNaN(date.getTime())
    ? "unknown"
    : date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `network-config-report-${stamp}.xlsx`;
}

function buildObjectLevelRow(item = {}, override = {}, context = {}) {
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
    ...itemDiagnosticColumns(item, context),
    severity: override.severity || severityForStatus(status),
    actionNeeded: override.actionNeeded || actionForStatus(status),
  };
}

function buildFieldLevelRows(item = {}, includeSuppressed = false, context = {}) {
  return Object.entries(item.fieldSummary || {})
    .map(([field, summary]) => buildFieldLevelRow(item, field, summary, includeSuppressed, context))
    .filter(Boolean)
    .sort((left, right) => left.field.localeCompare(right.field));
}

function buildFieldLevelRow(item = {}, rawField = "", summary = {}, includeSuppressed = false, context = {}) {
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
    ...itemDiagnosticColumns(item, context),
    severity: severityForStatus(label, field),
    actionNeeded: actionForStatus(label, field),
  };
}

function buildRelationshipRows(item = {}, context = {}) {
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

function itemDiagnosticColumns(item = {}, context = {}) {
  const status = normalizeStatus(item.status);
  const unmatchedClassification = isOldOnlyExportItem(status)
    ? context.classifyUnmatched?.(item)
    : null;

  return {
    matchReason: item.reason || "",
    unmatchedCategory: unmatchedClassification?.category || "",
    diagnosticReason: unmatchedClassification?.reason || "",
    matchKeyFields: compactValues(item.matchKeyFields || []),
    scoreReasons: compactValues(item.scoreReasons || []),
  };
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

function isOldOnlyExportItem(status = "") {
  return ["old-only", "source-only", "no-target", "unmatched-old"].includes(status);
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

function buildWorksheetXml(rows = [], columns = EXCEL_REPORT_COLUMNS) {
  const headerCells = columns.map((column) => column.label);
  const dataRows = [
    headerCells,
    ...(Array.isArray(rows) ? rows : []).map((row) => columns.map((column) => row?.[column.key] ?? "")),
  ];
  const sheetRows = dataRows.map((values, rowIndex) =>
    `<row r="${rowIndex + 1}">${values.map((value, columnIndex) =>
      buildCellXml(rowIndex + 1, columnIndex + 1, value)
    ).join("")}</row>`
  ).join("");

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    '<sheetViews><sheetView workbookViewId="0"/></sheetViews>',
    '<sheetFormatPr defaultRowHeight="15"/>',
    '<sheetData>',
    sheetRows,
    '</sheetData>',
    '</worksheet>',
  ].join("");
}

function buildCellXml(rowNumber, columnNumber, value = "") {
  const cellRef = `${columnName(columnNumber)}${rowNumber}`;
  const text = protectExcelFormula(String(value ?? ""));
  return `<c r="${cellRef}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
}

function columnName(index) {
  let value = Number(index) || 1;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function buildContentTypesXml(sheetCount = 1) {
  const sheetOverrides = Array.from({ length: sheetCount }, (_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join("");

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    sheetOverrides,
    '</Types>',
  ].join("");
}

function buildRootRelationshipsXml() {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
    '</Relationships>',
  ].join("");
}

function buildWorkbookXml(sheets = []) {
  const sheetXml = sheets.map((sheet, index) =>
    `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
  ).join("");

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    '<sheets>',
    sheetXml,
    '</sheets>',
    '</workbook>',
  ].join("");
}

function buildWorkbookRelationshipsXml(sheetCount = 1) {
  const relationships = Array.from({ length: sheetCount }, (_, index) =>
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  ).join("");

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    relationships,
    '</Relationships>',
  ].join("");
}

function uniqueSheetName(name = "Sheet", used = new Set()) {
  const base = sanitizeSheetName(name) || "Sheet";
  let candidate = base;
  let suffix = 2;

  while (used.has(candidate.toLowerCase())) {
    const suffixText = ` ${suffix}`;
    candidate = `${base.slice(0, 31 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  used.add(candidate.toLowerCase());
  return candidate;
}

function sanitizeSheetName(name = "") {
  return String(name || "")
    .replace(/[\[\]:*?/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31);
}

function escapeXml(value = "") {
  return String(value ?? "")
    .replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildZipArchive(files = []) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.path);
    const data = file.content instanceof Uint8Array
      ? file.content
      : encoder.encode(String(file.content ?? ""));
    const crc = crc32(data);
    const localHeader = buildZipLocalHeader({ nameBytes, data, crc });
    const centralHeader = buildZipCentralHeader({ nameBytes, data, crc, offset });

    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = buildZipEndRecord({
    fileCount: files.length,
    centralSize,
    centralOffset: offset,
  });

  return concatUint8Arrays([...localParts, ...centralParts, endRecord]);
}

function buildZipLocalHeader({ nameBytes, data, crc }) {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, data.length, true);
  view.setUint32(22, data.length, true);
  view.setUint16(26, nameBytes.length, true);
  header.set(nameBytes, 30);
  return header;
}

function buildZipCentralHeader({ nameBytes, data, crc, offset }) {
  const header = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, data.length, true);
  view.setUint32(24, data.length, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint32(42, offset, true);
  header.set(nameBytes, 46);
  return header;
}

function buildZipEndRecord({ fileCount, centralSize, centralOffset }) {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return record;
}

function concatUint8Arrays(parts = []) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

const CRC32_TABLE = buildCrc32Table();

function buildCrc32Table() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });
}

function crc32(data = new Uint8Array()) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}
