const REVIEW_SOURCES = [
  ["unmatched-old", "unmatchedOld"],
  ["unmatched-new", "unmatchedNew"],
  ["ambiguous", "ambiguous"],
  ["low-confidence", "lowConfidence"],
  ["abnormal", "abnormal"],
  ["relationship", "relationshipChanges"],
];

export const REVIEW_SOURCE_LABELS = {
  "unmatched-old": "기존 설정에만 있음",
  "unmatched-new": "신규 설정에만 있음",
  ambiguous: "매핑 후보 여러 개",
  "low-confidence": "낮은 신뢰도",
  abnormal: "검토 필요",
  relationship: "관계 변경",
};

export function buildObjectReviewGroups({
  review = {},
  plan = [],
  includeSuppressedOnly = false,
} = {}) {
  const groups = new Map();

  for (const [panelKey, reviewKey] of REVIEW_SOURCES) {
    const items = Array.isArray(review[reviewKey]) ? review[reviewKey] : [];
    for (const item of items) {
      const group = ensureGroup(groups, groupSeedFromReviewItem(item, panelKey));
      const issues = activeIssuesFromReviewItem(item, panelKey);
      for (const issue of issues) addIssue(group, issue, "active");
    }
  }

  for (const issue of suppressedIssuesFromPlan(plan)) {
    const group = ensureGroup(groups, groupSeedFromSuppressedIssue(issue));
    addIssue(group, issue, "suppressed");
  }

  for (const issue of excludedIssuesFromPlan(plan)) {
    const group = ensureGroup(groups, groupSeedFromSuppressedIssue(issue));
    addIssue(group, issue, "excluded");
  }

  return [...groups.values()]
    .filter((group) =>
      includeSuppressedOnly ||
      group.activeIssues.length > 0 ||
      group.suppressedIssues.length > 0 ||
      group.excludedIssues.length > 0
    )
    .map(finalizeGroup)
    .sort((left, right) => {
      const bySeverity = right.activeIssueCount - left.activeIssueCount;
      if (bySeverity) return bySeverity;
      return String(left.displayName).localeCompare(String(right.displayName));
    });
}

export function buildObjectFieldReviewRows(object = {}, activeIssuesArg = null, suppressedIssuesArg = null) {
  const activeIssues = Array.isArray(activeIssuesArg) ? activeIssuesArg : (Array.isArray(object.activeIssues) ? object.activeIssues : []);
  const suppressedIssues = Array.isArray(suppressedIssuesArg) ? suppressedIssuesArg : (Array.isArray(object.suppressedIssues) ? object.suppressedIssues : []);
  const excludedIssues = Array.isArray(object.excludedIssues) ? object.excludedIssues : [];
  const rows = new Map();

  for (const issue of activeIssues) {
    const row = ensureFieldReviewRow(rows, issue);
    addFieldIssue(row, issue, "active");
  }

  for (const issue of suppressedIssues) {
    const row = ensureFieldReviewRow(rows, issue);
    addFieldIssue(row, issue, "suppressed");
  }

  for (const issue of excludedIssues) {
    const row = ensureFieldReviewRow(rows, issue);
    addFieldIssue(row, issue, "excluded");
  }

  return [...rows.values()].map(finalizeFieldReviewRow).sort((left, right) => {
    const byActive = right.activeCount - left.activeCount;
    if (byActive) return byActive;
    const bySuppressed = right.suppressedCount - left.suppressedCount;
    if (bySuppressed) return bySuppressed;
    return String(left.fieldPath).localeCompare(String(right.fieldPath));
  });
}

export function splitObjectFieldReviewRows(object = {}) {
  const rows = buildObjectFieldReviewRows(object);
  return {
    rows,
    activeRows: rows.filter((row) => row.activeCount > 0),
    suppressedOnlyRows: rows.filter((row) => row.activeCount === 0 && row.suppressedCount > 0),
  };
}

function ensureFieldReviewRow(rows, issue = {}) {
  const canonicalField = normalizeField(issue.fieldPath || issue.field || "object") || "object";
  if (!rows.has(canonicalField)) {
    rows.set(canonicalField, {
      fieldPath: issue.fieldPath || issue.field || "object",
      canonicalField,
      activeIssues: [],
      suppressedIssues: [],
      excludedIssues: [],
      oldValue: "",
      newValue: "",
      representativeReason: "",
      suppressionReason: "",
    });
  }
  return rows.get(canonicalField);
}

function addFieldIssue(row, issue = {}, bucket = "active") {
  const list = bucket === "excluded" ? (row.excludedIssues ||= []) : bucket === "suppressed" ? row.suppressedIssues : row.activeIssues;
  const dedupeKey = [
    issue.id || "",
    normalizeField(issue.fieldPath || issue.field || ""),
    issue.status || "",
    issue.ruleId || "",
    issue.reason || "",
    issue.oldValue || "",
    issue.newValue || "",
  ].join("|");
  if (list.some((item) => item.__fieldReviewDedupeKey === dedupeKey)) return;
  list.push({ ...issue, __fieldReviewDedupeKey: dedupeKey });
}

function finalizeFieldReviewRow(row) {
  const active = row.activeIssues[0] || {};
  const suppressed = row.suppressedIssues[0] || {};
  const excluded = row.excludedIssues?.[0] || {};
  const representative = active.id ? active : (suppressed.id ? suppressed : excluded);
  const activeCount = row.activeIssues.length;
  const suppressedCount = row.suppressedIssues.length;
  const excludedCount = row.excludedIssues?.length || 0;
  return {
    ...row,
    displayStatus: activeCount && suppressedCount
      ? "active-and-suppressed"
      : activeCount
        ? "active"
        : excludedCount
          ? "excluded"
          : "suppressed",
    activeCount,
    suppressedCount,
    excludedCount,
    oldValue: active.oldValue || suppressed.oldValue || excluded.oldValue || "",
    newValue: active.newValue || suppressed.newValue || excluded.newValue || "",
    representativeReason: active.reason || suppressed.reason || excluded.reason || "",
    suppressionReason: suppressed.reason || excluded.reason || "",
    status: active.status || suppressed.status || excluded.status || "",
    statusLabel: active.statusLabel || suppressed.statusLabel || excluded.statusLabel || "",
    classification: active.classification || suppressed.classification || excluded.classification || "",
    ruleId: representative.ruleId || "",
    issueType: representative.issueType || "",
    sourcePolicy: suppressed.sourcePolicy || excluded.sourcePolicy || "",
    policyId: suppressed.policyId || excluded.policyId || "",
  };
}

function activeIssuesFromReviewItem(item = {}, panelKey = "") {
  const rows = Array.isArray(item.fieldRows) ? item.fieldRows.filter(isActionableFieldRow) : [];
  if (rows.length && ["abnormal", "relationship", "low-confidence"].includes(panelKey)) {
    return rows.map((row) => ({
      id: `${item.planId || objectGroupKey(item)}:${normalizeField(row.field)}:${normalizeChangeType(row.status || panelKey)}`,
      panelKey,
      sourceItem: item,
      fieldRow: row,
      fieldPath: normalizeField(row.field),
      status: normalizeChangeType(row.status || panelKey),
      statusLabel: statusLabel(row.status),
      reason: reasonForField(panelKey, row, item),
      oldValue: stringify(row.oldValue),
      newValue: stringify(row.newValue),
      ruleId: semanticRuleId(item.objectType, row.field, row.status),
      issueType: "field-difference",
      classification: classificationForIssue(panelKey, row),
      suppressed: false,
    }));
  }

  return [{
    id: `${item.planId || objectGroupKey(item)}:${panelKey}`,
    panelKey,
    sourceItem: item,
    fieldRow: null,
    fieldPath: "",
    status: normalizeChangeType(item.status || panelKey),
    statusLabel: REVIEW_SOURCE_LABELS[panelKey] || panelKey,
    reason: readableReason(panelKey, item.reason),
    oldValue: "",
    newValue: "",
    ruleId: item.ruleId || "",
    issueType: "object-difference",
    classification: classificationForPanel(panelKey),
    suppressed: false,
  }];
}

function suppressedIssuesFromPlan(plan = []) {
  return plan.filter((item) => !(item?.comparisonExcluded || item?.excluded || item?.exclusionIssue)).flatMap((item) => {
    const objectType = item.objectType || item.oldObject?.normalizedType || item.newObject?.normalizedType || "";
    const object = item.oldObject || item.newObject || {};
    const itemSeed = {
      planId: item.id || "",
      objectType,
      objectKey: objectKey(object, objectType),
      oldKey: item.oldObject ? objectKey(item.oldObject, objectType) : "",
      newKey: item.newObject ? objectKey(item.newObject, objectType) : "",
      label: objectIdentity(object),
      status: item.status || "",
      score: item.score || "",
      fieldRows: [],
    };
    return Object.entries(item.fieldSummary || {})
      .filter(([, summary]) => isSuppressedFieldSummary(summary))
      .map(([field, summary]) => {
        const hit = Array.isArray(summary.policyHits) ? summary.policyHits[0] : null;
        const status = suppressedFieldStatus(summary);
        return {
          id: `${item.id || objectKey(object, objectType)}:${normalizeField(field)}:suppressed`,
          panelKey: "suppressed",
          sourceItem: itemSeed,
          fieldRow: null,
          objectType,
          objectKey: itemSeed.objectKey,
          oldKey: itemSeed.oldKey,
          newKey: itemSeed.newKey,
          displayName: displayNameFromPlanObject(object, objectType),
          fieldPath: normalizeField(field),
          status,
          statusLabel: statusLabel(status),
          reason: summary.policyReason || hit?.reason || reasonForSuppressedField(field, summary, objectType),
          oldValue: compactValues(summary.oldValues),
          newValue: compactValues(summary.newValues),
          ruleId: hit?.rule?.match?.ruleId || hit?.rule?.target?.ruleId || hit?.ruleId || semanticRuleId(objectType, field, summary.status),
          issueType: "field-difference",
          classification: classificationForSuppressedField(field, status),
          suppressed: true,
          sourcePolicy: hit?.sourcePolicy || summary.sourcePolicy || summary.policySource || sourceForSuppressedField(status),
          policyId: hit?.policyId || "",
          policySource: hit?.source || summary.policySource || "",
        };
      });
  });
}

function excludedIssuesFromPlan(plan = []) {
  return plan
    .filter((item) => item?.comparisonExcluded || item?.excluded || item?.exclusionIssue)
    .map((item) => {
      if (item.exclusionIssue) return item.exclusionIssue;
      const objectType = item.objectType || item.oldObject?.normalizedType || item.newObject?.normalizedType || "";
      const object = item.oldObject || item.newObject || {};
      const key = objectKey(object, objectType);
      return {
        id: `${item.id || key}:excluded`,
        panelKey: "excluded",
        sourceItem: {
          planId: item.id || "",
          objectType,
          objectKey: key,
          oldKey: item.oldObject ? objectKey(item.oldObject, objectType) : "",
          newKey: item.newObject ? objectKey(item.newObject, objectType) : "",
          label: objectIdentity(object),
          status: item.status || "",
          score: item.score || "",
          fieldRows: [],
        },
        fieldRow: null,
        objectType,
        objectKey: key,
        oldKey: item.oldObject ? objectKey(item.oldObject, objectType) : "",
        newKey: item.newObject ? objectKey(item.newObject, objectType) : "",
        displayName: displayNameFromPlanObject(object, objectType),
        fieldPath: "",
        status: "excluded",
        statusLabel: "비교 제외됨",
        reason: item.exclusionReason || "비교 제외 규칙 적용",
        oldValue: "",
        newValue: "",
        ruleId: item.exclusionRule?.match?.ruleId || "semantic-compare.unmatched-setting",
        issueType: "object-difference",
        classification: "비교 제외됨",
        suppressed: true,
        excluded: true,
        sourcePolicy: "comparison-exclusion",
        policyId: item.exclusionPolicyId || item.exclusionRule?.id || "",
        policySource: "comparison-exclusion",
      };
    });
}

function ensureGroup(groups, seed) {
  const key = seed.objectId || seed.objectKey || `${seed.objectType}:${seed.displayName}`;
  if (!groups.has(key)) {
    groups.set(key, {
      objectId: key,
      objectType: seed.objectType || "",
      objectKey: seed.objectKey || "",
      displayName: seed.displayName || seed.objectKey || "-",
      oldKey: seed.oldKey || "",
      newKey: seed.newKey || "",
      matchStatus: seed.matchStatus || "",
      score: seed.score || "",
      activeIssues: [],
      suppressedIssues: [],
      excludedIssues: [],
    });
  }
  const group = groups.get(key);
  if (!group.displayName || group.displayName === "-") group.displayName = seed.displayName || group.displayName;
  if (!group.objectKey) group.objectKey = seed.objectKey || "";
  if (!group.oldKey) group.oldKey = seed.oldKey || "";
  if (!group.newKey) group.newKey = seed.newKey || "";
  if (!group.matchStatus) group.matchStatus = seed.matchStatus || "";
  if (!group.score) group.score = seed.score || "";
  return group;
}

function addIssue(group, issue, bucket) {
  const list = bucket === "excluded" ? group.excludedIssues : bucket === "suppressed" ? group.suppressedIssues : group.activeIssues;
  const dedupeKey = [
    issue.panelKey,
    issue.fieldPath,
    issue.status,
    issue.ruleId,
    issue.oldValue,
    issue.newValue,
  ].join("|");
  if (list.some((item) => item.dedupeKey === dedupeKey)) return;
  list.push({ ...issue, dedupeKey });
}

function finalizeGroup(group) {
  const activeFields = unique(group.activeIssues.map((issue) => issue.fieldPath).filter(Boolean));
  const suppressedFields = unique(group.suppressedIssues.map((issue) => issue.fieldPath).filter(Boolean));
  const excludedFields = unique(group.excludedIssues.map((issue) => issue.fieldPath).filter(Boolean));
  const issueFields = activeFields.length ? activeFields : (suppressedFields.length ? suppressedFields : excludedFields);
  const representative = group.activeIssues[0] || group.suppressedIssues[0] || group.excludedIssues[0] || {};
  return {
    ...group,
    activeIssueCount: group.activeIssues.length,
    suppressedIssueCount: group.suppressedIssues.length,
    excludedIssueCount: group.excludedIssues.length,
    issueCount: group.activeIssues.length + group.suppressedIssues.length + group.excludedIssues.length,
    issueFields,
    severitySummary: severitySummary(group.activeIssues),
    representativeReason: representativeReason(group.activeIssues),
  };
}

function groupSeedFromReviewItem(item = {}, panelKey = "") {
  return {
    objectId: objectGroupKey(item),
    objectType: item.objectType || "",
    objectKey: item.oldKey || item.newKey || item.objectKey || "",
    oldKey: item.oldKey || "",
    newKey: item.newKey || "",
    displayName: buildDisplayName(item),
    matchStatus: item.status || panelKey,
    score: item.score || "",
  };
}

function groupSeedFromSuppressedIssue(issue = {}) {
  const item = issue.sourceItem || {};
  return {
    objectId: issue.objectKey || item.objectKey || objectGroupKey(item),
    objectType: issue.objectType || item.objectType || "",
    objectKey: issue.objectKey || item.objectKey || "",
    oldKey: issue.oldKey || item.oldKey || "",
    newKey: issue.newKey || item.newKey || "",
    displayName: issue.displayName || buildDisplayName(item),
    matchStatus: item.status || "suppressed",
    score: item.score || "",
  };
}

function objectGroupKey(item = {}) {
  return item.oldKey || item.newKey || item.objectKey || `${item.objectType || "object"}:${item.label || item.planId || "unknown"}`;
}

function buildDisplayName(item = {}) {
  const rows = Array.isArray(item.fieldRows) ? item.fieldRows : [];
  const description = descriptionFromRows(rows) ||
    descriptionFromPlanObject(item.oldObject) ||
    descriptionFromPlanObject(item.newObject);
  const label = stringify(item.label || item.objectKey || item.oldKey || item.newKey).trim();
  if (description && label && !description.includes(label)) return `${description} - ${label}`;
  return description || label || "-";
}

function displayNameFromPlanObject(object = {}, objectType = "") {
  const description = descriptionFromPlanObject(object);
  const label = objectIdentity(object);
  if (description && label && !description.includes(label)) return `${description} - ${label}`;
  return description || label || objectKey(object, objectType);
}

function isDescriptionField(field = "") {
  const normalized = normalizeField(field);
  return normalized === "description" || normalized.endsWith(".description");
}

function uniqueDescriptionValues(values = []) {
  return [...new Set(values.map((value) => stringify(value).trim().replace(/\s+/g, " ")).filter(Boolean))];
}

function descriptionFromRows(rows = []) {
  const values = [];
  rows.forEach((row) => {
    if (!isDescriptionField(row.field)) return;
    values.push(row.newValue || row.oldValue || "");
  });
  return uniqueDescriptionValues(values).join(" / ");
}

function descriptionFromPlanObject(object = {}) {
  const values = [object?.description];
  [object?.fields, object?.canonicalFields].forEach((fields = {}) => {
    Object.entries(fields || {}).forEach(([field, value]) => {
      if (!isDescriptionField(field)) return;
      values.push(value);
    });
  });
  return uniqueDescriptionValues(values).join(" / ");
}

function objectIdentity(object = {}) {
  return stringify(object.normalizedIdentity || object.identity || object.sourceName || object.name || object.id || "");
}

function objectKey(object = {}, objectType = "") {
  return object.key || `${objectType}:${objectIdentity(object)}`;
}

function isActionableFieldRow(row = {}) {
  const status = normalizeChangeType(row.status);
  return Boolean(row.field) && !["same", "equal", "present", "ignored", "inheritance-unresolved", "structure-converted", "comparison-excluded", "suppressed"].includes(status);
}

function isSuppressedFieldSummary(summary = {}) {
  const status = normalizeChangeType(summary.effectiveStatus || summary.status || "");
  const sourcePolicy = stringify(summary.sourcePolicy || summary.policySource).toLowerCase();
  const policyHitSources = (summary.policyHits || [])
    .map((hit) => stringify(hit?.sourcePolicy || hit?.policySource || hit?.source).toLowerCase());
  return Boolean(
    summary.ignored ||
    summary.suppressed ||
    ["ignored", "inheritance-unresolved", "structure-converted"].includes(status) ||
    ["profile-exception", "user-exception", "advanced-policy"].includes(sourcePolicy) ||
    policyHitSources.some((source) => ["profile-exception", "user-exception", "advanced-policy"].includes(source))
  );
}

function suppressedFieldStatus(summary = {}) {
  const status = normalizeChangeType(summary.effectiveStatus || summary.status || "");
  if (["ignored", "inheritance-unresolved", "structure-converted", "comparison-excluded"].includes(status)) return status;
  return "ignored";
}

function reasonForSuppressedField(field = "", summary = {}, objectType = "") {
  const status = suppressedFieldStatus(summary);
  if (objectType === "bgp" && normalizeField(field) === "group" && status === "structure-converted") {
    return "MD-CLI BGP group 참조 구조 전환";
  }
  if (status === "structure-converted") return "구조 전환";
  if (status === "inheritance-unresolved") return "MD-CLI group 정의 미확인으로 상속값 비교 보류";
  return "예외/정책으로 제외";
}

function classificationForSuppressedField(field = "", status = "") {
  const normalizedStatus = normalizeChangeType(status);
  if (normalizeField(field) === "group" && normalizedStatus === "structure-converted") return "단순 구조 전환";
  if (normalizedStatus === "inheritance-unresolved") return "상속 해석 보류";
  if (normalizedStatus === "comparison-excluded") return "비교 제외됨";
  return "예외 처리됨";
}

function sourceForSuppressedField(status = "") {
  return ["inheritance-unresolved", "structure-converted"].includes(normalizeChangeType(status))
    ? "semantic-normalization"
    : "";
}

function representativeReason(issues = []) {
  if (!issues.length) return "예외 처리됨";
  const first = issues[0].reason || "검토 필요";
  const rest = issues.length - 1;
  return rest > 0 ? `${first} 외 ${rest}개` : first;
}

function severitySummary(issues = []) {
  const byStatus = new Map();
  for (const issue of issues) {
    const label = issue.statusLabel || issue.status || "검토";
    byStatus.set(label, (byStatus.get(label) || 0) + 1);
  }
  return [...byStatus.entries()].map(([label, count]) => `${label} ${count}개`).join(" · ");
}

function reasonForField(panelKey = "", row = {}, item = {}) {
  const field = normalizeField(row.field);
  const status = normalizeChangeType(row.status);
  if (field === "group" && item.objectType === "bgp") {
    return `MD-CLI에서 BGP neighbor가 group ${stringify(row.newValue) || "값"} 참조 구조로 전환됨`;
  }
  if (status === "structure-converted") return "구조 전환";
  if (status === "added" || status === "missing-old") return "신규값 추가 확인";
  if (status === "missing" || status === "missing-new") return "신규 설정 누락 확인";
  if (status === "changed" || status === "different") return "값 변경 확인";
  return readableReason(panelKey, item.reason);
}

function readableReason(panelKey = "", reason = "") {
  const fallback = {
    "unmatched-old": "기존 설정에만 있어 누락 여부 확인 필요",
    "unmatched-new": "신규 설정에만 있어 추가 여부 확인 필요",
    ambiguous: "매핑 후보가 여러 개 있어 확인 필요",
    "low-confidence": "일치도가 낮아 수동 검토 필요",
    abnormal: "중요 설정 항목 값 변경",
    relationship: "연결/참조 관계 변경",
  };
  const text = stringify(reason).trim();
  if (!text || /[?�]/.test(text)) return fallback[panelKey] || "검토 필요";
  return text;
}

function classificationForIssue(panelKey = "", row = {}) {
  const field = normalizeField(row.field);
  const status = normalizeChangeType(row.status);
  if (field === "group" && status === "structure-converted") return "단순 구조 전환";
  if (panelKey === "abnormal") return "검토 필요";
  if (panelKey === "relationship") return "관계 검토";
  if (panelKey === "low-confidence") return "매핑 검토";
  return "단순 차이";
}

function classificationForPanel(panelKey = "") {
  return {
    "unmatched-old": "누락 검토",
    "unmatched-new": "추가 검토",
    ambiguous: "매핑 검토",
    "low-confidence": "매핑 검토",
    relationship: "관계 검토",
  }[panelKey] || "검토 필요";
}

function semanticRuleId(objectType = "", field = "", status = "") {
  const normalizedField = normalizeField(field);
  if (isImportantField(objectType, normalizedField)) return "semantic-compare.important-field-change";
  const changeType = normalizeChangeType(status);
  if (changeType === "added") return "semantic-compare.field-added";
  if (changeType === "missing") return "semantic-compare.field-missing";
  return "semantic-compare.field-difference";
}

function isImportantField(objectType = "", field = "") {
  if (objectType === "bgp") {
    return [
      "neighbor",
      "peerip",
      "group",
      "peer-as",
      "import.policy",
      "export.policy",
      "state",
      "admin-state",
      "description",
      "authentication-key",
    ].includes(field);
  }
  return [
    "route",
    "next-hop",
    "gateway",
    "tag",
    "metric",
    "state",
    "admin-state",
    "description",
    "sap",
    "port",
    "lag",
    "interface",
  ].includes(field);
}

function statusLabel(status = "") {
  const key = normalizeChangeType(status);
  return {
    same: "동일",
    equal: "동일",
    different: "차이",
    changed: "차이",
    "structure-converted": "구조 전환",
    "inheritance-unresolved": "상속 미확인",
    "comparison-excluded": "비교 제외",
    "missing-old": "기존 누락",
    "missing-new": "신규 누락",
    added: "추가",
    missing: "누락",
    ignored: "예외 처리",
  }[key] || stringify(status || "-");
}

function normalizeChangeType(status = "") {
  const value = stringify(status).toLowerCase();
  if (value === "missing-old") return "added";
  if (value === "missing-new") return "missing";
  if (value === "different") return "changed";
  return value || "changed";
}

function normalizeField(field = "") {
  return stringify(field).trim().toLowerCase().replace(/\s+/g, "-");
}

function compactValues(values = []) {
  const list = Array.isArray(values) ? values : [values];
  return unique(list.map(stringify).map((value) => value.trim()).filter(Boolean)).join(", ");
}

function unique(values = []) {
  return [...new Set(values)];
}

function stringify(value = "") {
  return String(value ?? "");
}
