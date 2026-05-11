// src/core/semanticLineRules.js

import { normalizeComparableLine } from "./lineNormalizer.js";

export const DEFAULT_SEMANTIC_LINE_RULES = [
  {
    id: "admin-state-enable",
    field: "admin-state",
    value: "enabled",
    oldPatterns: ["no shutdown"],
    newPatterns: ["admin-state enable"],
  },
  {
    id: "admin-state-disable",
    field: "admin-state",
    value: "disabled",
    oldPatterns: ["shutdown"],
    newPatterns: ["admin-state disable"],
  },
];

function normalizePattern(pattern) {
  return normalizeComparableLine(pattern);
}

function normalizeRuleLine(line) {
  return normalizeComparableLine(line);
}

export function getSemanticLineRules(profile = {}) {
  const profileRules = Array.isArray(profile.semanticLineRules)
    ? profile.semanticLineRules
    : [];

  return [
    ...DEFAULT_SEMANTIC_LINE_RULES,
    ...profileRules,
  ];
}

export function findSemanticLineRule({
  oldLine,
  newLine,
  profile,
}) {
  const oldNormalized = normalizeRuleLine(oldLine);
  const newNormalized = normalizeRuleLine(newLine);

  const rules = getSemanticLineRules(profile);

  for (const rule of rules) {
    const oldPatterns = rule.oldPatterns || [];
    const newPatterns = rule.newPatterns || [];

    const oldMatches = oldPatterns
      .map(normalizePattern)
      .includes(oldNormalized);

    const newMatches = newPatterns
      .map(normalizePattern)
      .includes(newNormalized);

    if (oldMatches && newMatches) {
      return rule;
    }
  }

  return null;
}