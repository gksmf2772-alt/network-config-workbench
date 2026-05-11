// src/core/comparisonPlan.js
import { compareObjectPlanLines } from "./lineDiff.js";

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

export function createFieldSummary(tokenMatches = []) {
  const summary = {};

  for (const tokenMatch of tokenMatches) {
    const field = tokenMatch.field || "unknown";

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

    if (item.changed > 0) {
      item.status = "changed";
    } else if (item.missing > 0) {
      item.status = "missing";
    } else if (item.added > 0) {
      item.status = "added";
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

  const tokenMatches = collectTokenMatchesFromLineMatches(lineMatches);
  const fieldSummary = createFieldSummary(tokenMatches);
  const fieldStats = summarizeFieldSummary(fieldSummary);

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

    lineCompareMode: inferLineCompareMode(match),

    lineMatches,

    tokenMatches,
    fieldSummary,
    fieldStats,

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