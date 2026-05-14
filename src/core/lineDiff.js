// src/core/lineDiff.js
import { normalizeComparableLine } from "./lineNormalizer.js";
import { findSemanticLineRule } from "./semanticLineRules.js";
import {
  compareLineFields,
  extractComparableFieldsFromLine,
} from "./fieldExtractor.js";

function normalizeLine(line) {
  return normalizeComparableLine(line);
}

function isIgnorableLine(line) {
  const normalized = normalizeLine(line);

  if (!normalized) return true;
  if (normalized === "!") return true;
  if (normalized === "{") return true;
  if (normalized === "}") return true;
  if (normalized === "exit") return true;

  return false;
}

function makeLineMatch({
  oldLines = [],
  newLines = [],
  status,
  reason,
  score = null,
  fieldMatches = [],
}) {
  return {
    oldLines,
    newLines,
    status,
    reason,
    score,
    fieldMatches,
  };
}

const CANONICAL_LINE_FIELD_ORDER = {
  "static-route": ["route", "next-hop", "tag", "description", "metric", "state"],
  bgp: ["neighbor", "description", "authentication-key", "group", "state", "peer-as"],
};

function canonicalFieldValue(object = {}, field = "") {
  if (!object) return null;
  if (field === "state") {
    return (
      object.fields?.state ??
      object.fields?.["admin-state"] ??
      object.state ??
      null
    );
  }
  if (field === "route") {
    return object.fields?.route ?? object.prefix ?? null;
  }
  if (field === "neighbor") {
    return object.fields?.neighbor ?? object.peerIp ?? null;
  }
  if (field === "next-hop") {
    return object.fields?.["next-hop"] ?? object.fields?.nextHop ?? object.nextHop ?? null;
  }
  if (field === "description") {
    return object.fields?.description ?? object.description ?? null;
  }
  if (field === "peer-as") {
    return object.fields?.["peer-as"] ?? object.fields?.peerAs ?? object.peerAs ?? null;
  }
  return object.fields?.[field] ?? object[field] ?? null;
}

function hasCanonicalFieldRows(planItem = {}) {
  const type = planItem.objectType || planItem.oldObject?.normalizedType || planItem.newObject?.normalizedType;
  if (!CANONICAL_LINE_FIELD_ORDER[type]) return false;
  return ["matched", "candidate"].includes(planItem.status);
}

function formatCanonicalLine(field, value) {
  if (value == null || value === "") return "";
  return `${field} ${value}`;
}

function compareCanonicalFieldRows(planItem = {}) {
  const type = planItem.objectType || planItem.oldObject?.normalizedType || planItem.newObject?.normalizedType;
  const ordered = CANONICAL_LINE_FIELD_ORDER[type] || [];
  const dynamicFields = new Set([
    ...Object.keys(planItem.oldObject?.fields || {}),
    ...Object.keys(planItem.newObject?.fields || {}),
  ]);
  const duplicateFields = new Set(["admin-state", "peerIp", "nextHop", "prefix", "address"]);
  const fields = [
    ...ordered,
    ...[...dynamicFields].filter((field) => !ordered.includes(field) && !duplicateFields.has(field)),
  ];

  return fields
    .map((field) => {
      const oldValue = canonicalFieldValue(planItem.oldObject, field);
      const newValue = canonicalFieldValue(planItem.newObject, field);
      if ((oldValue == null || oldValue === "") && (newValue == null || newValue === "")) return null;

      const oldLine = formatCanonicalLine(field, oldValue);
      const newLine = formatCanonicalLine(field, newValue);
      const same = oldLine && newLine && String(oldValue) === String(newValue);
      const status = oldLine && newLine ? (same ? "equal" : "changed") : oldLine ? "missing" : "added";

      return makeLineMatch({
        oldLines: oldLine ? [oldLine] : [],
        newLines: newLine ? [newLine] : [],
        status,
        reason: "canonical-field-align",
        score: same ? 100 : 0,
        fieldMatches: [{
          field,
          status,
          oldValue: oldValue ?? null,
          newValue: newValue ?? null,
          oldRawValue: oldValue ?? null,
          newRawValue: newValue ?? null,
          oldLine: oldLine || null,
          newLine: newLine || null,
        }],
      });
    })
    .filter(Boolean);
}

function hasComparableFieldOverlap(oldLine, newLine) {
  const oldFields = extractComparableFieldsFromLine(oldLine);
  const newFields = extractComparableFieldsFromLine(newLine);

  if (!oldFields.length || !newFields.length) return false;

  const newFieldNames = new Set(newFields.map((item) => item.field));

  return oldFields.some((item) => newFieldNames.has(item.field));
}

function scoreLineSimilarity(oldLine, newLine, profile = {}) {
  const oldNorm = normalizeLine(oldLine);
  const newNorm = normalizeLine(newLine);

  if (!oldNorm && !newNorm) return 0;
  if (oldNorm === newNorm) return 100;

  const semanticRule = findSemanticLineRule({
    oldLine,
    newLine,
    profile,
  });

  if (semanticRule) return 95;

  const fieldMatches = compareLineFields(oldLine, newLine);
  if (fieldMatches.some((item) => item.status === "equal")) {
    return 85;
  }

  if (hasComparableFieldOverlap(oldLine, newLine)) {
    return 65;
  }

  return 0;
}

function findBestNewLineMatch({
  oldLine,
  newUsefulLines,
  usedNewIndexes,
  profile,
}) {
  let best = null;

  newUsefulLines.forEach((newLine, index) => {
    if (usedNewIndexes.has(index)) return;

    const score = scoreLineSimilarity(oldLine, newLine, profile);
    if (!score) return;

    if (!best || score > best.score) {
      best = {
        index,
        newLine,
        score,
      };
    }
  });

  return best;
}

function getLineMatchReason(score) {
  if (score >= 100) return "normalized-line-equal";
  if (score >= 95) return "semantic-line-rule";
  if (score >= 85) return "field-value-equal";
  if (score >= 65) return "field-overlap";
  return "line-similarity";
}

function normalizeAnchorIdentity(value) {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[{};,]+$/g, "")
    .toLowerCase();
}

function getObjectAnchorIdentity(object = {}) {
  const fields = object?.fields || {};

  return normalizeAnchorIdentity(
    object?.peerIp ||
      fields.neighbor ||
      object?.prefix ||
      fields.route ||
      fields.prefix ||
      object?.ipAddress ||
      fields.ipAddress ||
      fields.interface ||
      object?.normalizedIdentity ||
      object?.sourceName ||
      ""
  );
}

function lineContainsIdentity(line = "", identity = "") {
  if (!identity) return false;

  const normalizedLine = normalizeAnchorIdentity(line)
    .replace(/[{}"]/g, " ")
    .replace(/\s+/g, " ");

  return normalizedLine.split(/\s+/).includes(identity) ||
    normalizedLine.includes(identity);
}

function firstUsefulLine(lines = []) {
  return lines.find((line) => !isIgnorableLine(line)) || "";
}

function isSameSemanticAnchor(planItem = {}, oldLine = "", newLine = "") {
  if (!oldLine || !newLine) return false;
  if (!["matched", "candidate"].includes(planItem.status)) return false;

  const oldIdentity = getObjectAnchorIdentity(planItem.oldObject);
  const newIdentity = getObjectAnchorIdentity(planItem.newObject);

  if (oldIdentity && newIdentity && oldIdentity === newIdentity) {
    return (
      lineContainsIdentity(oldLine, oldIdentity) &&
      lineContainsIdentity(newLine, newIdentity)
    );
  }

  return planItem.status === "matched";
}

function applyObjectAnchorLineCoverage(lineMatches = [], planItem = {}) {
  const oldLine = firstUsefulLine(planItem.oldLines || []);
  const newLine = firstUsefulLine(planItem.newLines || []);

  if (!isSameSemanticAnchor(planItem, oldLine, newLine)) {
    return lineMatches;
  }

  const anchorMatch = makeLineMatch({
    oldLines: [oldLine],
    newLines: [newLine],
    status: "equal",
    reason: `semantic-object-anchor:${planItem.reason || "matched"}`,
    score: 100,
    fieldMatches: compareLineFields(oldLine, newLine),
  });

  anchorMatch.semanticCovered = true;

  const withoutAnchorFragments = lineMatches.filter((lineMatch) => {
    const oldLines = Array.isArray(lineMatch.oldLines) ? lineMatch.oldLines : [];
    const newLines = Array.isArray(lineMatch.newLines) ? lineMatch.newLines : [];

    const hasOldAnchor = oldLines.includes(oldLine);
    const hasNewAnchor = newLines.includes(newLine);

    return !hasOldAnchor && !hasNewAnchor;
  });

  return [anchorMatch, ...withoutAnchorFragments];
}

export function compareObjectLines({
  oldLines = [],
  newLines = [],
  profile = {},
} = {}) {
  const oldUsefulLines = oldLines.filter((line) => !isIgnorableLine(line));
  const newUsefulLines = newLines.filter((line) => !isIgnorableLine(line));

  const results = [];
  const usedNewIndexes = new Set();

  for (const oldLine of oldUsefulLines) {
    const best = findBestNewLineMatch({
      oldLine,
      newUsefulLines,
      usedNewIndexes,
      profile,
    });

    if (best && best.score >= 65) {
      results.push(
        makeLineMatch({
          oldLines: [oldLine],
          newLines: [best.newLine],
          status: best.score >= 85 ? "equal" : "changed",
          reason: getLineMatchReason(best.score),
          score: best.score,
          fieldMatches: compareLineFields(oldLine, best.newLine),
        })
      );

      usedNewIndexes.add(best.index);
      continue;
    }

    results.push(
      makeLineMatch({
        oldLines: [oldLine],
        newLines: [],
        status: "missing",
        reason: "no-line-match",
        score: 0,
        fieldMatches: extractComparableFieldsFromLine(oldLine).map((field) => ({
          field: field.field,
          status: "missing",
          oldValue: field.value,
          newValue: null,
          oldRawValue: field.rawValue,
          newRawValue: null,
          oldLine,
          newLine: null,
        })),
      })
    );
  }

  newUsefulLines.forEach((newLine, index) => {
    if (usedNewIndexes.has(index)) return;

    results.push(
      makeLineMatch({
        oldLines: [],
        newLines: [newLine],
        status: "added",
        reason: "new-line-unmatched",
        score: 0,
        fieldMatches: extractComparableFieldsFromLine(newLine).map((field) => ({
          field: field.field,
          status: "added",
          oldValue: null,
          newValue: field.value,
          oldRawValue: null,
          newRawValue: field.rawValue,
          oldLine: null,
          newLine,
        })),
      })
    );
  });

  return results;
}

export function compareObjectPlanLines(planItem, profile = {}) {
  if (!planItem) return [];

  if (hasCanonicalFieldRows(planItem)) {
    return compareCanonicalFieldRows(planItem);
  }

  if (planItem.status === "old-only") {
    return compareObjectLines({
      oldLines: planItem.oldLines || [],
      newLines: [],
    });
  }

  if (planItem.status === "new-only") {
    return compareObjectLines({
      oldLines: [],
      newLines: planItem.newLines || [],
    });
  }

  const lineMatches = compareObjectLines({
    oldLines: planItem.oldLines || [],
    newLines: planItem.newLines || [],
    profile,
  });

  return applyObjectAnchorLineCoverage(lineMatches, planItem);
}

export function attachLineMatchesToPlan(plan = []) {
  return plan.map((item) => ({
    ...item,
    lineMatches: compareObjectPlanLines(item),
  }));
}
