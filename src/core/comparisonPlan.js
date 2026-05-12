// src/core/comparisonPlan.js
import { compareObjectPlanLines } from "./lineDiff.js";
import { applyFieldPolicies } from "./fieldPolicy.js";
import { applyDefaultNoopLineSuppression } from "./semanticRules.js";

function getObjectType(match) {
  return (
    match.oldObject?.normalizedType ||
    match.newObject?.normalizedType ||
    "unknown"
  );
}

function getComparePlanId(match, index) {
  const oldId = match.oldObject?.id || "old-none";
  const newId = match.newObject?.id || "new-none";

  return `compare-plan-${index}-${oldId}__${newId}`;
}

function getRawLines(object) {
  return Array.isArray(object?.rawLines) ? object.rawLines : [];
}

function inferMatchKeyFields(match) {
  if (Array.isArray(match.matchKeyFields) && match.matchKeyFields.length) {
    return match.matchKeyFields;
  }
  const fields = [];

  if (match.reason === "prefix") {
    fields.push("prefix");
  }

  if (match.reason === "ip-address") {
    fields.push("ipAddress");
  }

  if (match.reason === "peer-ip") {
    fields.push("peerIp");
  }

  if (match.reason === "description-similarity") {
    fields.push("description");
  }

  if (match.reason === "normalized-identity") {
    fields.push("normalizedIdentity");
  }

  if (match.reason === "manual") {
    fields.push("manual");
  }

  return fields;
}

function inferLineCompareMode(match) {
  if (match.status === "old-only") return "missing";
  if (match.status === "new-only") return "added";
  if (match.status === "candidate") return "candidate";
  if (match.status === "matched") return "object-boundary";
  return "unknown";
}

function collectTokenMatchesFromLineMatches(lineMatches = []) {
  const tokenMatches = [];

  for (const lineMatch of lineMatches) {
    const fieldMatches = Array.isArray(lineMatch.fieldMatches)
      ? lineMatch.fieldMatches
      : [];

    for (const fieldMatch of fieldMatches) {
      tokenMatches.push({
        field: fieldMatch.field,
        status: fieldMatch.status,

        oldValue: fieldMatch.oldValue,
        newValue: fieldMatch.newValue,

        oldRawValue: fieldMatch.oldRawValue,
        newRawValue: fieldMatch.newRawValue,

        oldLine: fieldMatch.oldLine,
        newLine: fieldMatch.newLine,

        sourceReason: lineMatch.reason,
      });
    }
  }

  return tokenMatches;
}

function collectObjectLevelFieldMatches({
  oldObject,
  newObject,
  existingTokenMatches = [],
}) {
  const results = [];

  const oldFields = collectObjectFields(oldObject);
  const newFields = collectObjectFields(newObject);

  // line 단위 비교에서 이미 나온 field라도 object-level field summary에서는 다시 검증한다.
  // Cisco 1-line static route ↔ Nokia multi-line route 같은 1:N 구조 보정을 위해 필요.
  const alreadyComparedFields = new Set();

  for (const [field, oldField] of Object.entries(oldFields)) {
    if (!isVisibleCompareField(field)) continue;
    if (alreadyComparedFields.has(field)) continue;

    const newField = newFields[field];

    if (!newField) {
      results.push({
        field,
        status: "missing",
        oldValue: oldField.value,
        newValue: null,
        oldRawValue: oldField.rawValue,
        newRawValue: null,
        oldLine: null,
        newLine: null,
        sourceReason: "object-field-missing",
      });
      continue;
    }

    if (String(oldField.value) === String(newField.value)) {
      results.push({
        field,
        status: "equal",
        oldValue: oldField.value,
        newValue: newField.value,
        oldRawValue: oldField.rawValue,
        newRawValue: newField.rawValue,
        oldLine: null,
        newLine: null,
        sourceReason: "object-field-equal",
      });
    } else {
      results.push({
        field,
        status: "changed",
        oldValue: oldField.value,
        newValue: newField.value,
        oldRawValue: oldField.rawValue,
        newRawValue: newField.rawValue,
        oldLine: null,
        newLine: null,
        sourceReason: "object-field-changed",
      });
    }
  }

  for (const [field, newField] of Object.entries(newFields)) {
    if (!isVisibleCompareField(field)) continue;
    if (alreadyComparedFields.has(field)) continue;
    if (oldFields[field]) continue;

    results.push({
      field,
      status: "added",
      oldValue: null,
      newValue: newField.value,
      oldRawValue: null,
      newRawValue: newField.rawValue,
      oldLine: null,
      newLine: null,
      sourceReason: "object-field-added",
    });
  }

  return results;
}

function collectObjectFields(object) {
  const fields = {};

  if (!object || typeof object !== "object") return fields;

  const candidateFields = {
    description: object.description,

    // UI/fieldSummary에서는 address 하나로 통일
    address: object.prefix || object.ipAddress,

    peerIp: object.peerIp,
    "peer-as": object.peerAs,
  };

  for (const [field, value] of Object.entries(candidateFields)) {
    if (value == null || value === "") continue;

    fields[field] = {
      field,
      value,
      rawValue: value,
    };
  }

  if (object.fields && typeof object.fields === "object") {
    for (const [field, value] of Object.entries(object.fields)) {
      if (value == null || value === "") continue;
      if (fields[field]) continue;
      if (!isVisibleCompareField(field)) continue;

      fields[field] = {
        field,
        value,
        rawValue: value,
      };
    }
  }

  return fields;
}

const VISIBLE_COMPARE_FIELDS = new Set([
  "description",
  "address",
  "admin-state",
  "state",
  "peer-as",
  "peerIp",
  "neighbor",
  "route",
  "next-hop",
  "tag",
]);

function isVisibleCompareField(field) {
  return VISIBLE_COMPARE_FIELDS.has(field);
}

export function createFieldSummary(tokenMatches = []) {
  const summary = {};

  for (const tokenMatch of tokenMatches) {
    const field = tokenMatch.field || "unknown";
    if (!isVisibleCompareField(field)) continue;

    if (!summary[field]) {
      summary[field] = {
        field,
        status: "equal",
        equal: 0,
        changed: 0,
        missing: 0,
        added: 0,
        oldValues: [],
        newValues: [],
        matches: [],
      };
    }

    const item = summary[field];

    item.matches.push(tokenMatch);

    if (tokenMatch.status === "equal") {
      item.equal += 1;
    } else if (tokenMatch.status === "changed") {
      item.changed += 1;
    } else if (tokenMatch.status === "missing") {
      item.missing += 1;
    } else if (tokenMatch.status === "added") {
      item.added += 1;
    }

    if (tokenMatch.oldValue != null) {
      item.oldValues.push(tokenMatch.oldValue);
    }

    if (tokenMatch.newValue != null) {
      item.newValues.push(tokenMatch.newValue);
    }
  }

  for (const field of Object.keys(summary)) {
    const item = summary[field];

    const oldValueSet = new Set(item.oldValues.map((value) => String(value)));
    const newValueSet = new Set(item.newValues.map((value) => String(value)));

    const hasOldValues = oldValueSet.size > 0;
    const hasNewValues = newValueSet.size > 0;

    const sameValueSet =
      hasOldValues &&
      hasNewValues &&
      oldValueSet.size === newValueSet.size &&
      [...oldValueSet].every((value) => newValueSet.has(value));

    if (sameValueSet) {
      item.status = "equal";
    } else if (item.changed > 0) {
      item.status = "changed";
    } else if (item.missing > 0 && !hasNewValues) {
      item.status = "missing";
    } else if (item.added > 0 && !hasOldValues) {
      item.status = "added";
    } else if (item.missing > 0 || item.added > 0) {
      item.status = "changed";
    } else {
      item.status = "equal";
    }

    item.oldValues = [...new Set(item.oldValues)];
    item.newValues = [...new Set(item.newValues)];
  }

  return summary;
}

export function summarizeFieldSummary(fieldSummary = {}) {
  const values = Object.values(fieldSummary);

  return {
    totalFields: values.length,
    equalFields: values.filter((item) => item.status === "equal").length,
    changedFields: values.filter((item) => item.status === "changed").length,
    missingFields: values.filter((item) => item.status === "missing").length,
    addedFields: values.filter((item) => item.status === "added").length,
  };
}

function getEqualFieldNames(fieldSummary = {}) {
  return new Set(
    Object.values(fieldSummary)
      .filter(
        (item) =>
          item.status === "equal" ||
          item.effectiveStatus === "equal"
      )
      .map((item) => String(item.field || "").trim())
      .filter(Boolean)
  );
}

function isLineCoveredByEqualField(lineMatch, equalFields) {
  const status = String(lineMatch.status || "").trim();

  if (status !== "added" && status !== "missing") {
    return false;
  }

  const fieldMatches = Array.isArray(lineMatch.fieldMatches)
    ? lineMatch.fieldMatches
    : [];

  return fieldMatches.some((fieldMatch) => {
    const field = String(fieldMatch.field || "").trim();
    return equalFields.has(field);
  });
}

function applySemanticLineCoverage(
  lineMatches = [],
  fieldSummary = {}
) {
  const equalFields = getEqualFieldNames(fieldSummary);

  if (!equalFields.size) return lineMatches;

  return lineMatches.map((lineMatch) => {
    if (!isLineCoveredByEqualField(lineMatch, equalFields)) {
      return lineMatch;
    }

    return {
      ...lineMatch,
      status: "equal",
      reason: "semantic-field-covered",
      semanticCovered: true,
    };
  });
}

export function createObjectComparePlan(match, index = 0, profile = {}) {
  const objectType = getObjectType(match);

  const oldLines = getRawLines(match.oldObject);
  const newLines = getRawLines(match.newObject);

  const lineMatches = compareObjectPlanLines(
    {
      status: match.status,
      oldLines,
      newLines,
    },
    profile
  );

  const lineTokenMatches = collectTokenMatchesFromLineMatches(lineMatches);

  const objectFieldMatches = collectObjectLevelFieldMatches({
    oldObject: match.oldObject,
    newObject: match.newObject,
    existingTokenMatches: lineTokenMatches,
  });

  const tokenMatches = [
    ...lineTokenMatches,
    ...objectFieldMatches,
  ];

  const rawFieldSummary = createFieldSummary(tokenMatches);

  const policyResult = applyFieldPolicies({
    objectType,
    fieldSummary: rawFieldSummary,
    profile,
  });

  const fieldSummary = policyResult.fieldSummary;
  const fieldStats = summarizeFieldSummary(fieldSummary);

  const semanticallyCoveredLineMatches = applySemanticLineCoverage(
    lineMatches,
    fieldSummary
  );

  const coveredLineMatches = applyDefaultNoopLineSuppression(
    semanticallyCoveredLineMatches,
    objectType
  );

  return {
    id: getComparePlanId(match, index),
    status: match.status,
    reason: match.reason,
    score: match.score,

    objectType,

    oldObject: match.oldObject || null,
    newObject: match.newObject || null,

    oldLines,
    newLines,

    matchKeyFields: inferMatchKeyFields(match),
    scoreReasons: Array.isArray(match.scoreReasons)
      ? match.scoreReasons
      : [],

    ambiguousAlternatives: Array.isArray(match.ambiguousAlternatives)
      ? match.ambiguousAlternatives
      : [],
      
    lineCompareMode: inferLineCompareMode(match),

    lineMatches: coveredLineMatches,
    tokenMatches,
    fieldSummary,
    fieldStats,

    policyViolations: policyResult.violations,
    policyViolationCount: policyResult.violationCount,

    warnings: [],
  };
}

export function createComparisonPlan(matches = [], profile = {}) {
  return matches.map((match, index) =>
    createObjectComparePlan(match, index, profile)
  );
}

export function summarizeComparisonPlan(plan = []) {
  const summary = {
    total: plan.length,
    matched: 0,
    candidate: 0,
    oldOnly: 0,
    newOnly: 0,
    byType: {},
    byReason: {},
  };

  for (const item of plan) {
    if (item.status === "matched") summary.matched += 1;
    if (item.status === "candidate") summary.candidate += 1;
    if (item.status === "old-only") summary.oldOnly += 1;
    if (item.status === "new-only") summary.newOnly += 1;

    summary.byType[item.objectType] = (summary.byType[item.objectType] || 0) + 1;
    summary.byReason[item.reason] = (summary.byReason[item.reason] || 0) + 1;
  }

  return summary;
}