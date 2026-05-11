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

export function compareObjectLines({
  oldLines = [],
  newLines = [],
  profile = {},
} = {}) {
  const oldUsefulLines = oldLines.filter((line) => !isIgnorableLine(line));
  const newUsefulLines = newLines.filter((line) => !isIgnorableLine(line));

  const results = [];
  const usedNewIndexes = new Set();

  // 1. exact normalized line matching
    oldUsefulLines.forEach((oldLine) => {
    const oldNorm = normalizeLine(oldLine);

    // 1. exact / normalized equal
    const exactNewIndex = newUsefulLines.findIndex((newLine, index) => {
        if (usedNewIndexes.has(index)) return false;
        return normalizeLine(newLine) === oldNorm;
    });

    if (exactNewIndex >= 0) {
        results.push(
        makeLineMatch({
            oldLines: [oldLine],
            newLines: [newUsefulLines[exactNewIndex]],
            status: "equal",
            reason: "normalized-line-equal",
            score: 100,
            fieldMatches: compareLineFields(oldLine, newUsefulLines[exactNewIndex]),
        })
        );

        usedNewIndexes.add(exactNewIndex);
        return;
    }

    // 2. semantic line rule
    const semanticNewIndex = newUsefulLines.findIndex((newLine, index) => {
        if (usedNewIndexes.has(index)) return false;

        return Boolean(
        findSemanticLineRule({
            oldLine,
            newLine,
            profile,
        })
        );
    });

    if (semanticNewIndex >= 0) {
        const rule = findSemanticLineRule({
        oldLine,
        newLine: newUsefulLines[semanticNewIndex],
        profile,
        });

        results.push(
        makeLineMatch({
            oldLines: [oldLine],
            newLines: [newUsefulLines[semanticNewIndex]],
            status: "equal",
            reason: "semantic-line-rule",
            score: 100,
            fieldMatches: compareLineFields(oldLine, newUsefulLines[semanticNewIndex]),
        })
        );

        results[results.length - 1].field = rule?.field || null;
        results[results.length - 1].value = rule?.value || null;
        results[results.length - 1].ruleId = rule?.id || null;

        usedNewIndexes.add(semanticNewIndex);
        return;
    }

    // 3. field overlap matching
    const fieldNewIndex = newUsefulLines.findIndex((newLine, index) => {
        if (usedNewIndexes.has(index)) return false;
        return hasComparableFieldOverlap(oldLine, newLine);
    });

    if (fieldNewIndex >= 0) {
        const fieldMatches = compareLineFields(
        oldLine,
        newUsefulLines[fieldNewIndex]
        );

        const hasChanged = fieldMatches.some((item) => item.status === "changed");
        const hasMissing = fieldMatches.some((item) => item.status === "missing");
        const hasAdded = fieldMatches.some((item) => item.status === "added");

        results.push(
        makeLineMatch({
            oldLines: [oldLine],
            newLines: [newUsefulLines[fieldNewIndex]],
            status: hasChanged || hasMissing || hasAdded ? "changed" : "equal",
            reason: "field-overlap",
            score: hasChanged || hasMissing || hasAdded ? 70 : 100,
            fieldMatches,
        })
        );

        usedNewIndexes.add(fieldNewIndex);
        return;
    }

    // 4. missing
    results.push(
        makeLineMatch({
        oldLines: [oldLine],
        newLines: [],
        status: "missing",
        reason: "no-line-match",
        })
    );
    });

  // 2. new-only lines
  newUsefulLines.forEach((newLine, index) => {
    if (usedNewIndexes.has(index)) return;

    results.push(
      makeLineMatch({
        oldLines: [],
        newLines: [newLine],
        status: "added",
        reason: "no-line-match",
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

  return compareObjectLines({
    oldLines: planItem.oldLines || [],
    newLines: planItem.newLines || [],
    profile,
  });
}

export function attachLineMatchesToPlan(plan = []) {
  return plan.map((item) => ({
    ...item,
    lineMatches: compareObjectPlanLines(item),
  }));
}