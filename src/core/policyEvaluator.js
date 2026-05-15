// src/core/policyEvaluator.js

import { getPolicyForField, getProfilePolicyEntry } from "./fieldPolicy.js";
import { normalizeComparableLine } from "./lineNormalizer.js";

export function evaluatePolicyContext({
  profile = {},
  rawLine = "",
  normalizedLine = "",
  side = "both",
  objectType = "",
  objectKey = "",
  field = "",
  fieldValue = "",
} = {}) {
  const line = normalizeComparableLine(normalizedLine || rawLine);
  const raw = String(rawLine || "");
  const sourceSide = normalizeSide(side);

  const lineRule = findMatchingLineRule({
    profile,
    rawLine: raw,
    normalizedLine: line,
    side: sourceSide,
    objectType,
    objectKey,
    field,
    fieldValue,
  });

  if (lineRule) {
    return {
      ignored: true,
      suppressed: true,
      reason: lineRule.reason || lineRule.message || "사용자 예외 규칙",
      sourcePolicy: "user-exception",
      appliesTo: lineRule.source || lineRule.side || "both",
      rule: lineRule,
    };
  }

  if (field) {
    const policyEntry = getProfilePolicyEntry(objectType, field, profile);
    const policy = policyEntry?.policy || getPolicyForField(objectType, field, profile);
    if (policy === "ignore") {
      return {
        ignored: true,
        suppressed: true,
        reason: policyEntry?.message || "고급 비교 정책: 필드 무시",
        sourcePolicy: "advanced-policy",
        appliesTo: "both",
        rule: policyEntry || { field, policy },
      };
    }
    if (policy === "exception" && exceptionPolicyAllowsValue(policyEntry, fieldValue)) {
      return {
        ignored: true,
        suppressed: true,
        reason: policyEntry?.message || "고급 비교 정책: 예외 허용",
        sourcePolicy: "advanced-policy",
        appliesTo: "both",
        rule: policyEntry || { field, policy },
      };
    }
  }

  return {
    ignored: false,
    suppressed: false,
    reason: "",
    sourcePolicy: "none",
    appliesTo: "both",
    rule: null,
  };
}

export function isPolicySuppressed(result = {}) {
  return Boolean(result.ignored || result.suppressed);
}

export function findMatchingLineRule({
  profile = {},
  rawLine = "",
  normalizedLine = "",
  side = "both",
  objectType = "",
  objectKey = "",
  field = "",
  fieldValue = "",
} = {}) {
  const rules = Array.isArray(profile?.rules?.ignore) ? profile.rules.ignore : [];
  const haystacks = [
    rawLine,
    normalizedLine,
    objectType,
    objectKey,
    field,
    fieldValue,
  ].map((value) => String(value || ""));

  return rules.find((rule) => {
    if (!rule || rule.action && rule.action !== "ignore") return false;
    if (!sideApplies(rule.source || rule.side || "both", side)) return false;
    if (rule.objectType && normalizeComparableLine(rule.objectType) !== normalizeComparableLine(objectType)) return false;
    if (rule.field && normalizeComparableLine(rule.field) !== normalizeComparableLine(field)) return false;
    const pattern = String(rule.pattern || rule.value || rule.text || "").trim();
    if (!pattern) return false;
    return haystacks.some((value) => lineRuleMatches(value, pattern, rule.matchMode || rule.mode || rule.type || "contains"));
  });
}

export function lineRuleMatches(value = "", pattern = "", mode = "contains") {
  const rawValue = String(value || "");
  const rawPattern = String(pattern || "");
  const normalizedValue = normalizeComparableLine(rawValue);
  const normalizedPattern = normalizeComparableLine(rawPattern);

  if (!normalizedPattern) return false;

  if (mode === "regex") {
    try {
      return new RegExp(rawPattern, "i").test(rawValue);
    } catch {
      return false;
    }
  }

  if (mode === "exact") return normalizedValue === normalizedPattern;
  if (mode === "prefix") return normalizedValue.startsWith(normalizedPattern);
  return normalizedValue.includes(normalizedPattern);
}

export function normalizeSide(side = "both") {
  const value = String(side || "both").toLowerCase();
  if (value === "old" || value === "existing") return "old";
  if (value === "new" || value === "target") return "new";
  return "both";
}

function sideApplies(ruleSide = "both", currentSide = "both") {
  const rule = normalizeSide(ruleSide);
  const current = normalizeSide(currentSide);
  return rule === "both" || current === "both" || rule === current;
}

function exceptionPolicyAllowsValue(policyEntry = {}, fieldValue = "") {
  if (!policyEntry) return true;
  const allowedValues = [
    ...splitPolicyValues(policyEntry.oldValues),
    ...splitPolicyValues(policyEntry.newValue),
    ...splitPolicyValues(policyEntry.allowedValues),
  ];
  if (!allowedValues.length) return true;
  const value = normalizeComparableLine(fieldValue);
  return allowedValues.some((allowed) => value === normalizeComparableLine(allowed));
}

function splitPolicyValues(value = "") {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
