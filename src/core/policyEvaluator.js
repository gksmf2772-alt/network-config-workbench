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
  ruleId = "",
  category = "",
  findingType = "",
  mode = "",
  scope = "",
} = {}) {
  return evaluatePolicySuppression({
    profile,
    rawLine,
    normalizedLine,
    side,
    objectType,
    objectKey,
    fieldPath: field,
    fieldValue,
    ruleId,
    category,
    findingType,
    mode,
    scope,
  });
}

export function evaluatePolicySuppression({
  profile = {},
  rawLine = "",
  normalizedLine = "",
  sourceLineId = "",
  side = "both",
  objectType = "",
  objectKey = "",
  field = "",
  fieldPath = "",
  fieldValue = "",
  ruleId = "",
  category = "",
  findingType = "",
  mode = "",
  scope = "",
} = {}) {
  const normalizedField = fieldPath || field;
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
    field: normalizedField,
    fieldValue,
    ruleId,
    category,
    findingType,
    mode,
    scope,
    sourceLineId,
  });

  const manualLineRule = findMatchingManualLineRule({
    profile,
    rawLine: raw,
    normalizedLine: line,
    side: sourceSide,
    objectType,
  });

  const profileException = findMatchingProfileException({
    profile,
    rawLine: raw,
    normalizedLine: line,
    side: sourceSide,
    objectType,
    objectKey,
    field: normalizedField,
    fieldValue,
    ruleId,
    category,
    findingType,
    mode,
    scope,
    sourceLineId,
  });

  const effectiveLineRule = lineRule || manualLineRule || profileException;

  if (effectiveLineRule) {
    const isProfileException = effectiveLineRule.__exceptionSource === "profile-exception";
    return {
      ignored: true,
      suppressed: true,
      reason: effectiveLineRule.reason || effectiveLineRule.message || "사용자 라인 예외",
      sourcePolicy: isProfileException ? "profile-exception" : "user-exception",
      source: isProfileException ? "profile-exception" : "line-exception",
      policyId: effectiveLineRule.id || effectiveLineRule.name || effectiveLineRule.policyId || "",
      appliesTo: effectiveLineRule.source || effectiveLineRule.side || "both",
      rule: effectiveLineRule,
    };
  }

  if (normalizedField) {
    const policyEntry = getProfilePolicyEntry(objectType, normalizedField, profile);
    const policy = policyEntry?.policy || getPolicyForField(objectType, normalizedField, profile);
    if (policy === "ignore") {
      return {
        ignored: true,
        suppressed: true,
        reason: policyEntry?.message || "고급 비교 정책: 필드 무시",
        sourcePolicy: "advanced-policy",
        source: "advanced-policy",
        policyId: policyEntry?.id || policyEntry?.name || "",
        appliesTo: "both",
        rule: policyEntry || { field: normalizedField, policy },
      };
    }
    if (policy === "exception" && exceptionPolicyAllowsValue(policyEntry, fieldValue)) {
      return {
        ignored: true,
        suppressed: true,
        reason: policyEntry?.message || "고급 비교 정책: 예외 허용",
        sourcePolicy: "advanced-policy",
        source: "field-exception",
        policyId: policyEntry?.id || policyEntry?.name || "",
        appliesTo: "both",
        rule: policyEntry || { field: normalizedField, policy },
      };
    }
  }

  return {
    ignored: false,
    suppressed: false,
    reason: "",
    sourcePolicy: "none",
    source: "none",
    policyId: "",
    appliesTo: "both",
    rule: null,
  };
}

export function isPolicySuppressed(result = {}) {
  return Boolean(result.ignored || result.suppressed);
}

export function findMatchingProfileException({
  profile = {},
  rawLine = "",
  normalizedLine = "",
  side = "both",
  objectType = "",
  objectKey = "",
  field = "",
  fieldValue = "",
  ruleId = "",
  category = "",
  findingType = "",
  mode = "",
  scope = "",
  sourceLineId = "",
} = {}) {
  const exceptions = Array.isArray(profile?.exceptions) ? profile.exceptions : [];
  const context = {
    rawLine,
    normalizedLine,
    side: normalizeSide(side),
    objectType,
    objectKey,
    field,
    fieldValue,
    ruleId,
    category,
    findingType,
    mode,
    scope,
    sourceLineId,
  };
  const exception = exceptions.find((item) => profileExceptionMatchesContext(item, context));
  if (!exception) return null;
  return {
    ...exception,
    __exceptionSource: "profile-exception",
    source: exception.target?.side || exception.match?.side || exception.side || "both",
  };
}

export function profileExceptionMatchesContext(exception = {}, context = {}) {
  if (!exception || exception.enabled === false) return false;
  const exceptionScope = String(exception.scope || "object").toLowerCase();
  const target = exception.target || {};
  const match = exception.match || {};
  const matchMode = String(match.mode || (exceptionScope === "profile" ? "profile-field-rule" : "exact-object"));
  const exactObjectScope = exceptionScope === "object" || matchMode === "exact-object";

  if (!sideApplies(target.side || match.side || exception.side || "both", context.side || "both")) return false;
  if (!matchesExact(match.objectType || target.objectType || exception.objectType, context.objectType)) return false;
  if (!matchesContextValue(match.fieldPath || target.fieldPath || exception.fieldPath || exception.field, context.field, exactObjectScope)) return false;
  if (!matchesContextValue(match.ruleId || target.ruleId || exception.ruleId, context.ruleId, exactObjectScope)) return false;
  if (!matchesContextValue(match.category || target.category || exception.category, context.category, exactObjectScope)) return false;
  if (!matchesContextValue(match.findingType || target.findingType || exception.findingType, context.findingType, exactObjectScope)) return false;
  if (!matchesExact(match.modeScope || exception.mode, context.mode)) return false;
  if (!matchesExact(match.compareScope || exception.compareScope, context.scope)) return false;

  if (exactObjectScope) {
    if (!matchesExact(match.objectKey || target.objectKey || exception.objectKey, context.objectKey)) return false;
    return Boolean(
      match.objectKey || target.objectKey || exception.objectKey ||
      match.ruleId || target.ruleId || exception.ruleId ||
      match.fieldPath || target.fieldPath || exception.fieldPath || exception.field ||
      match.findingType || target.findingType || exception.findingType
    );
  }

  const hasNarrowKey = Boolean(
    match.ruleId || target.ruleId || exception.ruleId ||
    match.fieldPath || target.fieldPath || exception.fieldPath || exception.field ||
    match.findingType || target.findingType || exception.findingType ||
    match.category || target.category || exception.category
  );
  if (!hasNarrowKey) return false;

  const valuePattern = match.valuePattern || exception.valuePattern || "";
  if (valuePattern) {
    const haystacks = [context.rawLine, context.normalizedLine, context.fieldValue, context.objectKey];
    return haystacks.some((value) => lineRuleMatches(value, valuePattern, match.valueMatchMode || "contains"));
  }
  return true;
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
  ruleId = "",
  category = "",
  findingType = "",
  mode = "",
  scope = "",
  sourceLineId = "",
} = {}) {
  const rules = Array.isArray(profile?.rules?.ignore) ? profile.rules.ignore : [];
  const haystacks = [
    rawLine,
    normalizedLine,
    objectType,
    objectKey,
    field,
    fieldValue,
    ruleId,
    category,
    findingType,
    mode,
    scope,
    sourceLineId,
  ].map((value) => String(value || ""));

  return rules.find((rule) => {
    if (!rule || (rule.action && rule.action !== "ignore")) return false;
    if (!sideApplies(rule.source || rule.side || "both", side)) return false;
    if (rule.objectType && normalizeComparableLine(rule.objectType) !== normalizeComparableLine(objectType)) return false;
    if (rule.objectKey && normalizeComparableLine(rule.objectKey) !== normalizeComparableLine(objectKey)) return false;
    if (rule.field && normalizeComparableLine(rule.field) !== normalizeComparableLine(field)) return false;
    if (rule.ruleId && normalizeComparableLine(rule.ruleId) !== normalizeComparableLine(ruleId)) return false;
    if (rule.category && normalizeComparableLine(rule.category) !== normalizeComparableLine(category)) return false;
    if (rule.findingType && normalizeComparableLine(rule.findingType) !== normalizeComparableLine(findingType)) return false;
    if (rule.mode && normalizeComparableLine(rule.mode) !== normalizeComparableLine(mode)) return false;
    if (rule.scope && normalizeComparableLine(rule.scope) !== normalizeComparableLine(scope)) return false;
    const pattern = String(rule.pattern || rule.value || rule.text || "").trim();
    if (!pattern) return false;
    return haystacks.some((value) => lineRuleMatches(value, pattern, rule.matchMode || rule.mode || rule.type || "contains"));
  });
}

function findMatchingManualLineRule({
  profile = {},
  rawLine = "",
  normalizedLine = "",
  side = "both",
  objectType = "",
} = {}) {
  const lineRules = profile?.lineRules || {};
  if (!lineRules || typeof lineRules !== "object") return null;

  const normalizedObjectType = normalizeComparableLine(objectType);
  const directRules = Array.isArray(lineRules[objectType]) ? lineRules[objectType] : [];
  const normalizedRules = normalizedObjectType !== objectType && Array.isArray(lineRules[normalizedObjectType])
    ? lineRules[normalizedObjectType]
    : [];
  const fallbackRules = Object.values(lineRules).filter(Array.isArray).flat();
  const rules = directRules.length || normalizedRules.length
    ? [...directRules, ...normalizedRules]
    : fallbackRules;
  const currentSide = normalizeSide(side);
  const haystacks = [rawLine, normalizedLine].map((value) => String(value || ""));

  return rules.find((rule) => {
    if (!rule) return false;
    if (!sideApplies(rule.source || rule.side || "both", currentSide)) return false;

    const action = String(rule.action || "").toLowerCase();
    const suppressesCurrentSide =
      action === "ignore" ||
      (action === "added" && currentSide === "new") ||
      (action === "missing" && currentSide === "old");
    if (!suppressesCurrentSide) return false;

    const pattern = String(rule.pattern || rule.value || rule.text || "").trim();
    if (!pattern) return false;

    return haystacks.some((value) =>
      lineRuleMatches(value, pattern, "exact") ||
      lineRuleMatches(value, pattern, "contains") ||
      lineRuleMatches(pattern, value, "contains")
    );
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

function matchesExact(expected = "", actual = "") {
  const normalizedExpected = normalizeComparableLine(expected);
  if (!normalizedExpected) return true;
  return normalizedExpected === normalizeComparableLine(actual);
}

function matchesContextValue(expected = "", actual = "", optionalWhenActualBlank = false) {
  const normalizedExpected = normalizeComparableLine(expected);
  if (!normalizedExpected) return true;
  const normalizedActual = normalizeComparableLine(actual);
  if (!normalizedActual && optionalWhenActualBlank) return true;
  return normalizedExpected === normalizedActual;
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
