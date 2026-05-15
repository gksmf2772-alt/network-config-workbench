const IMPORTANT_FIELDS = new Set([
  "route",
  "next-hop",
  "gateway",
  "address",
  "prefix-length",
  "neighbor",
  "peer-as",
  "state",
  "admin-state",
  "metric",
  "tag",
  "sap",
  "port",
  "lag",
  "interface",
  "ingress-filter",
  "egress-filter",
  "ingress-qos",
  "egress-qos",
  "sub-profile",
  "sla-profile",
  "static-host",
  "default-host",
]);

const FIELD_ALIASES = {
  "admin-state": "state",
  shutdown: "state",
  "no shutdown": "state",
  nexthop: "next-hop",
  gateway: "next-hop",
  "ip-address": "address",
  ipv4: "address",
  ipv6: "address",
  "static-route-entry": "route",
  "remote-as": "peer-as",
  "auth-key": "authentication-key",
};

export function buildLineSummary(report = {}) {
  const rows = Array.isArray(report.diffRows) ? report.diffRows : [];
  const metrics = {
    total: rows.length,
    changed: 0,
    added: 0,
    removed: 0,
    unchanged: 0,
    suppressed: 0,
  };

  rows.forEach((row) => {
    const oldState = row.oldState || "";
    const newState = row.newState || "";
    if (oldState === "equal" && newState === "equal") metrics.unchanged += 1;
    else if (oldState === "missing" || (row.oldRow && !row.newRow)) metrics.removed += 1;
    else if (newState === "added" || (!row.oldRow && row.newRow)) metrics.added += 1;
    else if (oldState !== "placeholder" || newState !== "placeholder") metrics.changed += 1;

    const reason = String(row.semanticReason || row.reason || "");
    if (row.semanticCovered || /ignored|suppressed|noop|structural/i.test(reason)) {
      metrics.suppressed += 1;
    }
  });

  return metrics;
}

export function buildSummaryDashboardData({
  report = {},
  plan = [],
  semanticSummary = {},
  manualMap = {},
  vendorPair = {},
  support = {},
  profileName = "",
  sessionName = "",
  comparedAt = "",
} = {}) {
  const lineSummary = buildLineSummary(report);
  const fieldAnalysis = buildFieldOverlapAnalysis(plan);
  const review = buildReviewItems(plan);
  const graph = buildGraphData({ plan });
  const severity = deriveSeverity({
    report,
    semanticSummary,
    lineSummary,
    review,
    support,
  });

  const counts = {
    matched: countByStatus(plan, "matched"),
    oldOnly: countByStatus(plan, "old-only"),
    newOnly: countByStatus(plan, "new-only"),
    ambiguous: review.ambiguous.length,
    lowConfidence: review.lowConfidence.length,
    relationshipDiffs: review.relationshipChanges.length,
    abnormal: review.abnormal.length,
    manual: countManualMappings(plan, manualMap, semanticSummary),
  };

  const parsedObjectCount = plan.filter((item) => item.oldObject || item.newObject).length;
  const topChangedTypes = topTypeCounts(plan.filter((item) => hasChangedFields(item) || hasRelationshipChange(item)));
  const topUnmatchedTypes = topTypeCounts(plan.filter((item) => item.status === "old-only" || item.status === "new-only"));
  const lowCoverage = Number(semanticSummary.coveragePercent || 0) < 60;

  return {
    lineSummary,
    fieldAnalysis,
    review,
    graph,
    severity,
    counts,
    topChangedTypes,
    topUnmatchedTypes,
    lowCoverage,
    context: {
      oldVendor: vendorPair.oldVendor || semanticSummary.oldVendor || "",
      newVendor: vendorPair.newVendor || semanticSummary.newVendor || "",
      support,
      profileName,
      sessionName,
      comparedAt,
      parsedObjectCount,
    },
  };
}

export function buildFieldOverlapAnalysis(plan = []) {
  const pairs = plan
    .filter((item) => item.oldObject && item.newObject)
    .map((item) => buildFieldOverlapPair(item));

  const aggregateByType = [...groupBy(pairs, (pair) => pair.objectType).entries()]
    .map(([objectType, list]) => {
      const totals = list.reduce((result, pair) => {
        result.matchedObjects += 1;
        result.commonFields += pair.sameFields;
        result.changedFields += pair.differentFields;
        result.missingOldFields += pair.missingOldFields;
        result.missingNewFields += pair.missingNewFields;
        result.aliasMatches += pair.aliasMatches.length;
        result.reviewNeeded += pair.reviewNeeded ? 1 : 0;
        result.overlapTotal += pair.overlapPercent;
        return result;
      }, {
        matchedObjects: 0,
        commonFields: 0,
        changedFields: 0,
        missingOldFields: 0,
        missingNewFields: 0,
        aliasMatches: 0,
        reviewNeeded: 0,
        overlapTotal: 0,
      });

      return {
        objectType,
        ...totals,
        averageOverlap: totals.matchedObjects
          ? Math.round(totals.overlapTotal / totals.matchedObjects)
          : 0,
      };
    })
    .sort((left, right) => right.reviewNeeded - left.reviewNeeded || right.changedFields - left.changedFields || left.objectType.localeCompare(right.objectType));

  const aggregate = pairs.reduce((result, pair) => {
    result.totalPairs += 1;
    result.totalComparableFields += pair.totalComparableFields;
    result.sameFields += pair.sameFields;
    result.differentFields += pair.differentFields;
    result.missingOldFields += pair.missingOldFields;
    result.missingNewFields += pair.missingNewFields;
    result.aliasMatches += pair.aliasMatches.length;
    result.reviewNeeded += pair.reviewNeeded ? 1 : 0;
    return result;
  }, {
    totalPairs: 0,
    totalComparableFields: 0,
    sameFields: 0,
    differentFields: 0,
    missingOldFields: 0,
    missingNewFields: 0,
    aliasMatches: 0,
    reviewNeeded: 0,
  });

  aggregate.overlapPercent = aggregate.totalComparableFields
    ? Math.round((aggregate.sameFields / aggregate.totalComparableFields) * 100)
    : 0;

  const byField = [...groupBy(pairs.flatMap((pair) => pair.fieldRows), (row) => row.field).entries()]
    .map(([field, list]) => ({
      field,
      total: list.length,
      same: list.filter((row) => row.status === "same").length,
      different: list.filter((row) => row.status === "different").length,
      missingOld: list.filter((row) => row.status === "missing-old").length,
      missingNew: list.filter((row) => row.status === "missing-new").length,
      aliasMatch: list.filter((row) => row.aliasMatched).length,
    }))
    .sort((left, right) => (right.different + right.missingOld + right.missingNew) - (left.different + left.missingOld + left.missingNew) || left.field.localeCompare(right.field))
    .slice(0, 24);

  return {
    aggregate,
    aggregateByType,
    pairs,
    byField,
  };
}

export function buildReviewItems(plan = []) {
  const review = {
    critical: [],
    unmatchedOld: [],
    unmatchedNew: [],
    abnormal: [],
    ambiguous: [],
    lowConfidence: [],
    relationshipChanges: [],
    aliasOnly: [],
  };

  plan.forEach((item) => {
    const base = buildReviewBase(item);
    if (item.status === "old-only") {
      review.unmatchedOld.push({
        ...base,
        side: "old",
        reason: "기존 설정에서만 발견됨",
        action: "비교 위치로 이동",
      });
    }
    if (item.status === "new-only") {
      review.unmatchedNew.push({
        ...base,
        side: "new",
        reason: "신규 설정에서만 발견됨",
        action: "비교 위치로 이동",
      });
    }

    if (Array.isArray(item.ambiguousAlternatives) && item.ambiguousAlternatives.length) {
      review.ambiguous.push({
        ...base,
        reason: "매핑 후보가 여러 개 있음",
        candidates: item.ambiguousAlternatives.map((candidate) => ({
          key: candidate.objectKey || candidate.id || candidate.normalizedIdentity || candidate.sourceName || "-",
          score: toScore(candidate.score),
          reason: candidate.reason || candidate.matchReason || "",
        })).slice(0, 6),
      });
    }

    const score = Number(item.score || 0);
    if (score > 0 && score < 80 && item.oldObject && item.newObject) {
      review.lowConfidence.push({
        ...base,
        reason: "일치도가 낮아 수동 검토 필요",
        score,
        fields: changedFieldNames(item).slice(0, 6),
      });
    }

    const relationChanges = relationshipChanges(item);
    if (relationChanges.length) {
      review.relationshipChanges.push({
        ...base,
        reason: "연결/참조 관계 변경",
        relationships: relationChanges.slice(0, 5),
      });
    }

    if (Number(item.policyViolationCount || 0) > 0 || hasImportantChangedField(item)) {
      review.abnormal.push({
        ...base,
        reason: Number(item.policyViolationCount || 0) > 0
          ? "정책/필수 값 위반 가능성"
          : "중요 설정 항목 값 변경",
        fields: changedFieldNames(item).filter((field) => IMPORTANT_FIELDS.has(normalizeFieldName(field))).slice(0, 6),
      });
    }

    const overlap = item.oldObject && item.newObject ? buildFieldOverlapPair(item) : null;
    if (overlap?.aliasMatches?.length && !overlap.differentFields && !overlap.missingOldFields && !overlap.missingNewFields) {
      review.aliasOnly.push({
        ...base,
        reason: "표현만 다르고 같은 의미로 연결됨",
        fields: overlap.aliasMatches.slice(0, 6),
      });
    }
  });

  review.critical = [
    ...review.unmatchedOld.filter((item) => isCoreObjectType(item.objectType)),
    ...review.unmatchedNew.filter((item) => isCoreObjectType(item.objectType)),
    ...review.relationshipChanges.filter((item) => isCoreObjectType(item.objectType)),
    ...review.lowConfidence.filter((item) => item.score < 50),
  ].slice(0, 12);

  return review;
}

export function buildGraphData({ plan = [] } = {}) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const limitedPlan = plan.slice(0, 140);

  limitedPlan.forEach((item, index) => {
    const oldNode = item.oldObject ? graphNodeFromObject(item.oldObject, item, "old", index) : null;
    const newNode = item.newObject ? graphNodeFromObject(item.newObject, item, "new", index) : null;
    [oldNode, newNode].forEach((node) => {
      if (!node || nodeIds.has(node.id)) return;
      nodeIds.add(node.id);
      nodes.push(node);
    });

    if (oldNode && newNode) {
      edges.push({
        id: `map:${item.id || index}`,
        source: oldNode.id,
        target: newNode.id,
        type: item.reason === "manual" ? "manual" : "mapping",
        label: item.reason === "manual" ? "직접 연결" : "자동 연결",
        confidence: toScore(item.score),
        status: item.status || "matched",
        changed: hasChangedFields(item) || hasRelationshipChange(item),
      });
    }

    relationshipChanges(item).forEach((relationship, relationIndex) => {
      const anchor = newNode || oldNode;
      if (!anchor) return;
      const relationId = `rel:${item.id || index}:${relationIndex}`;
      nodes.push({
        id: relationId,
        side: "relation",
        objectType: "relation",
        label: relationship.label || relationship.target || relationship.field || "참조 관계",
        key: relationId,
        status: "relationship",
        confidence: 0,
        fieldOverlap: 0,
        changedFields: 0,
        virtual: true,
      });
      edges.push({
        id: `rel-edge:${item.id || index}:${relationIndex}`,
        source: anchor.id,
        target: relationId,
        type: "relationship",
        label: "참조 관계",
        confidence: 0,
        status: relationship.status || "changed",
        changed: true,
      });
    });
  });

  return {
    nodes,
    edges,
    truncated: plan.length > limitedPlan.length,
    totalPlanItems: plan.length,
  };
}

export function deriveSeverity({
  report = {},
  semanticSummary = {},
  lineSummary = {},
  review = {},
  support = {},
} = {}) {
  const criticalCount =
    (review.critical?.length || 0) +
    (Number(semanticSummary.coveragePercent || 0) > 0 && Number(semanticSummary.coveragePercent || 0) < 40 ? 1 : 0);
  if (support?.state === "planned" || support?.state === "unsupported") {
    return { level: "critical", label: "검토 우선순위 높음", reason: "선택한 벤더 지원 상태가 미완성" };
  }
  if (criticalCount || Number(report.summary?.required || 0)) {
    return { level: "critical", label: "검토 우선순위 높음", reason: "핵심 객체 누락 또는 낮은 분석 비율" };
  }
  if ((review.unmatchedOld?.length || 0) || (review.unmatchedNew?.length || 0) || (review.ambiguous?.length || 0)) {
    return { level: "warning", label: "확인 필요", reason: "미연결 객체 또는 매핑 후보 확인 필요" };
  }
  if ((review.lowConfidence?.length || 0) || (review.relationshipChanges?.length || 0) || lineSummary.changed) {
    return { level: "attention", label: "변경 검토", reason: "낮은 일치도 또는 참조 관계 변경 있음" };
  }
  return { level: "ok", label: "안정", reason: "주요 검토 항목 낮음" };
}

function buildFieldOverlapPair(item = {}) {
  const objectType = item.objectType || item.oldObject?.normalizedType || item.newObject?.normalizedType || "object";
  const oldFields = normalizeFields(item.oldObject?.fields || item.oldObject?.canonicalFields || {});
  const newFields = normalizeFields(item.newObject?.fields || item.newObject?.canonicalFields || {});
  const fields = new Set([...Object.keys(oldFields), ...Object.keys(newFields)]);
  const fieldRows = [...fields].sort().map((field) => {
    const hasOld = Object.prototype.hasOwnProperty.call(oldFields, field);
    const hasNew = Object.prototype.hasOwnProperty.call(newFields, field);
    const oldValue = hasOld ? normalizeFieldValue(oldFields[field]) : "";
    const newValue = hasNew ? normalizeFieldValue(newFields[field]) : "";
    const aliasMatched = hasAliasSource(field, item);
    let status = "same";
    if (!hasOld) status = "missing-old";
    else if (!hasNew) status = "missing-new";
    else if (oldValue !== newValue) status = "different";
    return {
      field,
      status,
      oldValue,
      newValue,
      aliasMatched,
    };
  });

  const sameFields = fieldRows.filter((row) => row.status === "same").length;
  const differentFields = fieldRows.filter((row) => row.status === "different").length;
  const missingOldFields = fieldRows.filter((row) => row.status === "missing-old").length;
  const missingNewFields = fieldRows.filter((row) => row.status === "missing-new").length;
  const totalComparableFields = fieldRows.length;
  const overlapPercent = totalComparableFields ? Math.round((sameFields / totalComparableFields) * 100) : 0;

  return {
    planId: item.id || "",
    objectType,
    oldKey: objectKey(item.oldObject, objectType),
    newKey: objectKey(item.newObject, objectType),
    label: `${objectType} ${objectIdentity(item.oldObject || item.newObject)}`,
    score: toScore(item.score),
    totalComparableFields,
    sameFields,
    differentFields,
    missingOldFields,
    missingNewFields,
    overlapPercent,
    highImpactChangedFields: fieldRows
      .filter((row) => row.status !== "same" && IMPORTANT_FIELDS.has(normalizeFieldName(row.field)))
      .map((row) => row.field),
    aliasMatches: fieldRows.filter((row) => row.aliasMatched).map((row) => row.field),
    reviewNeeded: differentFields > 0 || missingOldFields > 0 || missingNewFields > 0 || toScore(item.score) < 80,
    fieldRows,
  };
}

function buildReviewBase(item = {}) {
  const object = item.oldObject || item.newObject || {};
  const objectType = item.objectType || object.normalizedType || object.type || "object";
  const overlap = item.oldObject && item.newObject ? buildFieldOverlapPair(item) : null;
  return {
    planId: item.id || "",
    objectType,
    objectKey: objectKey(object, objectType),
    oldKey: item.oldObject ? objectKey(item.oldObject, objectType) : "",
    newKey: item.newObject ? objectKey(item.newObject, objectType) : "",
    label: objectIdentity(object),
    status: item.status || "",
    score: toScore(item.score),
    commonFields: overlap?.sameFields || 0,
    differentFields: overlap?.differentFields || 0,
    missingOldFields: overlap?.missingOldFields || 0,
    missingNewFields: overlap?.missingNewFields || 0,
  };
}

function graphNodeFromObject(object, item, side, index) {
  const objectType = item.objectType || object.normalizedType || object.type || "object";
  const overlap = item.oldObject && item.newObject ? buildFieldOverlapPair(item) : null;
  return {
    id: `${side}:${objectKey(object, objectType)}:${index}`,
    side,
    objectType,
    label: objectIdentity(object),
    key: objectKey(object, objectType),
    status: item.status || "",
    confidence: toScore(item.score),
    fieldOverlap: overlap?.overlapPercent || 0,
    changedFields: overlap?.differentFields || 0,
    manual: item.reason === "manual",
  };
}

function normalizeFields(fields = {}) {
  return Object.entries(fields || {}).reduce((result, [field, value]) => {
    const key = normalizeFieldName(field);
    if (!key) return result;
    result[key] = value;
    return result;
  }, {});
}

function normalizeFieldName(field = "") {
  const normalized = String(field || "").trim().toLowerCase().replace(/\s+/g, "-");
  return FIELD_ALIASES[normalized] || normalized;
}

function normalizeFieldValue(value) {
  if (Array.isArray(value)) return value.map(normalizeFieldValue).join(",");
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function objectIdentity(object = {}) {
  return String(
    object.normalizedIdentity ||
    object.identity ||
    object.name ||
    object.sourceName ||
    object.id ||
    "-",
  );
}

function objectKey(object = {}, objectType = "object") {
  return String(object.key || `${objectType}:${objectIdentity(object)}`);
}

function toScore(score) {
  const value = Number(score);
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function countByStatus(plan = [], status) {
  return plan.filter((item) => item.status === status).length;
}

function countManualMappings(plan = [], manualMap = {}, semanticSummary = {}) {
  const manualByReason = plan.filter((item) => String(item.reason || "").toLowerCase() === "manual").length;
  return Math.max(
    manualByReason,
    Number(semanticSummary.manual || 0),
    Object.keys(manualMap || {}).length,
  );
}

function changedFieldNames(item = {}) {
  const summary = item.fieldSummary || {};
  return Object.entries(summary)
    .filter(([, value]) => {
      const status = String(value?.effectiveStatus || value?.status || "").toLowerCase();
      return ["changed", "missing", "added", "conflict", "different"].includes(status);
    })
    .map(([field]) => field);
}

function hasChangedFields(item = {}) {
  return changedFieldNames(item).length > 0 || Number(item.fieldStats?.changedFields || 0) > 0;
}

function hasImportantChangedField(item = {}) {
  return changedFieldNames(item).some((field) => IMPORTANT_FIELDS.has(normalizeFieldName(field)));
}

function relationshipChanges(item = {}) {
  return (item.relationshipSummary || [])
    .filter((relationship) => !["matched", "equal", "present", "unknown"].includes(String(relationship.status || "").toLowerCase()))
    .map((relationship) => ({
      status: relationship.status || "changed",
      label: relationship.label || relationship.type || relationship.field || "참조 관계",
      source: relationship.source || relationship.from || "",
      target: relationship.target || relationship.to || relationship.value || "",
      changeType: relationship.changeType || relationship.reason || relationship.status || "changed",
    }));
}

function hasRelationshipChange(item = {}) {
  return relationshipChanges(item).length > 0;
}

function hasAliasSource(field, item = {}) {
  const normalizedField = normalizeFieldName(field);
  if (!Object.values(FIELD_ALIASES).includes(normalizedField)) return false;
  const fieldSummary = item.fieldSummary || {};
  return Object.keys(fieldSummary).some((rawField) => rawField !== normalizedField && normalizeFieldName(rawField) === normalizedField);
}

function isCoreObjectType(type = "") {
  return ["bgp", "static-route", "interface", "sap", "lag", "port", "subscriber-interface", "group-interface"].includes(String(type || ""));
}

function topTypeCounts(items = []) {
  return [...groupBy(items, (item) => item.objectType || item.oldObject?.normalizedType || item.newObject?.normalizedType || "object").entries()]
    .map(([type, list]) => ({ type, count: list.length }))
    .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type))
    .slice(0, 8);
}

function groupBy(items, keyFn) {
  return (items || []).reduce((result, item) => {
    const key = keyFn(item);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(item);
    return result;
  }, new Map());
}
