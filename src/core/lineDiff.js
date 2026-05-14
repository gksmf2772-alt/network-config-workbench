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
