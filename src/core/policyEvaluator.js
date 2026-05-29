// src/core/policyEvaluator.js

import { getPolicyForField, getProfilePolicyEntry } from "./fieldPolicy.js";
import { normalizeComparableLine } from "./lineNormalizer.js";

const preparedIgnoreRuleCache = new WeakMap();

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
  issueType = "",
  changeType = "",
  oldValue = "",
  newValue = "",
  vendorPair = "",
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
    issueType,
    changeType,
    oldValue,
    newValue,
    vendorPair,
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
  issueType = "",
  changeType = "",
  oldValue = "",
  newValue = "",
  vendorPair = "",
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
    issueType,
    changeType,
    oldValue,
    newValue,
    vendorPair,
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
    issueType,
    changeType,
    oldValue,
    newValue,
    vendorPair,
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
      reason: effectiveLineRule.reason || effectiveLineRule.reasonKo || effectiveLineRule.message || "사용자 라인 예외",
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
  issueType = "",
  changeType = "",
  oldValue = "",
  newValue = "",
  vendorPair = "",
  mode = "",
  scope = "",
  sourceLineId = "",
} = {}) {
  const exceptions = Array.isArray(profile?.exceptions) ? profile.exceptions : [];
  if (!exceptions.length) return null;

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
    issueType,
    changeType,
    oldValue,
    newValue,
    vendorPair,
    mode,
    scope,
    sourceLineId,
  };
  const exception = exceptions.find((item) => !isComparisonExclusionRule(item) && profileExceptionMatchesContext(item, context));
  if (!exception) return null;
  return {
    ...exception,
    __exceptionSource: "profile-exception",
    source: exception.target?.side || exception.match?.side || exception.side || "both",
  };
}

export function profileExceptionMatchesContext(exception = {}, context = {}) {
  if (!exception || exception.enabled === false) return false;
  if (isComparisonExclusionRule(exception)) return false;
  const exceptionScope = String(exception.scope || "object").toLowerCase();
  const target = exception.target || {};
  const match = exception.match || {};
  const matchMode = String(match.mode || (exceptionScope === "profile" ? "profile-field-rule" : "exact-object"));
  const exactObjectScope = exceptionScope !== "profile" && (
    exceptionScope === "object" ||
    matchMode === "exact-object" ||
    matchMode === "exact-object-field-rule"
  );
  const profileScope = exceptionScope === "profile";
  const valueMode = normalizeComparableLine(match.valueMode || exception.valueMode || "");
  const expectedObjectType = resolveExceptionObjectType(exception, target, match);

  if (!sideApplies(target.side || match.side || exception.side || "both", context.side || "both")) return false;
  if (profileScope && !expectedObjectType) return false;
  if (!matchesExact(expectedObjectType, context.objectType)) return false;
  if (!matchesFieldValue(match.fieldPath || target.fieldPath || exception.fieldPath || exception.field, context.field, exactObjectScope)) return false;
  if (!matchesRuleValue(match.ruleId || target.ruleId || exception.ruleId, context.ruleId, exactObjectScope)) return false;
  if (!matchesContextValue(match.category || target.category || exception.category, context.category, exactObjectScope)) return false;
  if (!profileScope && !matchesContextValue(match.findingType || target.findingType || exception.findingType, context.findingType, exactObjectScope)) return false;
  if (!matchesContextValue(match.issueType || target.issueType || exception.issueType, context.issueType, exactObjectScope)) return false;
  if (!profileScope && !matchesContextValue(match.vendorPair || target.vendorPair || exception.vendorPair, context.vendorPair, true)) return false;
  if (!matchesChangeType(match.changeType || target.changeType || target.status || exception.changeType, context.changeType)) return false;
  if (!matchesChangeTypes(match.changeTypes || target.changeTypes || exception.changeTypes, context.changeType)) return false;
  if (valueMode !== "any") {
    if (!matchesPattern(match.oldValuePattern || exception.oldValuePattern, context.oldValue)) return false;
    if (!matchesPattern(match.newValuePattern || exception.newValuePattern, context.newValue)) return false;
  }
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
    match.issueType || target.issueType || exception.issueType ||
    match.changeType || target.changeType || target.status || exception.changeType ||
    match.changeTypes || target.changeTypes || exception.changeTypes ||
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

function resolveExceptionObjectType(exception = {}, target = {}, match = {}) {
  const direct = [
    match.objectType,
    match.settingType,
    target.objectType,
    target.settingType,
    exception.objectType,
    exception.settingType,
  ].find((value) => normalizeComparableLine(value));
  if (direct) return direct;

  return [
    match.objectKey,
    match.settingKey,
    target.objectKey,
    target.settingKey,
    target.createdFromObjectKey,
    target.createdFromSettingKey,
    exception.objectKey,
    exception.settingKey,
    exception.createdFromObjectKey,
  ].map(inferObjectTypeFromKey).find(Boolean) || "";
}

function inferObjectTypeFromKey(value = "") {
  const normalized = normalizeComparableLine(value);
  const match = normalized.match(/^([a-z0-9_.-]+):/);
  return match?.[1] || "";
}

export function findMatchingComparisonExclusion({
  profile = {},
  side = "both",
  objectType = "",
  objectKey = "",
  settingType = "",
  settingKey = "",
  matchStatus = "",
  ruleId = "",
  vendorPair = "",
} = {}) {
  const exceptions = Array.isArray(profile?.exceptions) ? profile.exceptions : [];
  if (!exceptions.length) return null;

  const context = {
    side: normalizeSide(side),
    objectType: settingType || objectType,
    objectKey: settingKey || objectKey,
    matchStatus,
    ruleId,
    vendorPair,
  };
  const exception = exceptions.find((item) => comparisonExclusionMatchesContext(item, context));
  if (!exception) return null;
  return {
    ...exception,
    __exceptionSource: "comparison-exclusion",
    source: exception.target?.side || exception.match?.side || exception.side || context.side || "both",
  };
}

export function comparisonExclusionMatchesContext(exception = {}, context = {}) {
  if (!isComparisonExclusionRule(exception) || exception.enabled === false) return false;
  const scope = String(exception.scope || "").toLowerCase();
  const target = exception.target || {};
  const match = exception.match || {};
  const mode = String(match.mode || (scope === "profile" ? "profile-setting-status" : "exact-setting")).toLowerCase();
  const expectedType = match.settingType || match.objectType || target.settingType || target.objectType || exception.settingType || exception.objectType;
  const expectedKey = match.settingKey || match.objectKey || target.settingKey || target.objectKey || exception.settingKey || exception.objectKey;
  const expectedStatus = match.matchStatus || target.matchStatus || exception.matchStatus;
  const expectedRuleId = match.ruleId || target.ruleId || exception.ruleId;
  const expectedVendorPair = match.vendorPair || target.vendorPair || exception.vendorPair;

  if (!sideApplies(match.side || target.side || exception.side || "both", context.side || "both")) return false;
  if (!matchesContextValue(expectedVendorPair, context.vendorPair, false)) return false;
  if (!matchesContextValue(expectedType, context.objectType, false)) return false;
  if (!matchesContextValue(expectedStatus, context.matchStatus, false)) return false;
  if (!matchesRuleValue(expectedRuleId, context.ruleId, false)) return false;

  if (mode === "exact-setting" || scope === "setting") {
    if (!matchesContextValue(expectedKey, context.objectKey, false)) return false;
    return Boolean(expectedKey && expectedType && expectedStatus);
  }

  if (mode === "profile-setting-status" || scope === "profile") {
    return Boolean(expectedType && expectedStatus);
  }

  return false;
}

export function isComparisonExclusionRule(exception = {}) {
  const type = String(exception?.type || "").toLowerCase();
  const mode = String(exception?.match?.mode || "").toLowerCase();
  return type === "comparison-exclusion" ||
    mode === "exact-setting" ||
    mode === "profile-setting-status";
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
  issueType = "",
  changeType = "",
  oldValue = "",
  newValue = "",
  vendorPair = "",
  mode = "",
  scope = "",
  sourceLineId = "",
} = {}) {
  const rawRules = Array.isArray(profile?.rules?.ignore) ? profile.rules.ignore : [];
  const rules = getPreparedIgnoreRules(rawRules);
  if (!rules.length) return null;

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
    issueType,
    changeType,
    oldValue,
    newValue,
    vendorPair,
    mode,
    scope,
    sourceLineId,
  ].map((value) => String(value || ""));
  let normalizedHaystacks = null;
  const getNormalizedHaystacks = () => {
    if (!normalizedHaystacks) {
      normalizedHaystacks = haystacks.map((value) => normalizeComparableLine(value));
    }
    return normalizedHaystacks;
  };
  const contextValues = {
    objectType: normalizeComparableLine(objectType),
    objectKey: normalizeComparableLine(objectKey),
    field: normalizeComparableLine(field),
    ruleId: normalizeComparableLine(ruleId),
    category: normalizeComparableLine(category),
    findingType: normalizeComparableLine(findingType),
    mode: normalizeComparableLine(mode),
    scope: normalizeComparableLine(scope),
  };

  const match = rules.find((rule) => {
    if (!rule.valid) return false;
    if (!sideApplies(rule.source, side)) return false;
    if (rule.objectType && rule.objectType !== contextValues.objectType) return false;
    if (rule.objectKey && rule.objectKey !== contextValues.objectKey) return false;
    if (rule.field && rule.field !== contextValues.field) return false;
    if (rule.ruleId && rule.ruleId !== contextValues.ruleId) return false;
    if (rule.category && rule.category !== contextValues.category) return false;
    if (rule.findingType && rule.findingType !== contextValues.findingType) return false;
    if (rule.mode && rule.mode !== contextValues.mode) return false;
    if (rule.scope && rule.scope !== contextValues.scope) return false;
    if (rule.matchMode === "regex") {
      return haystacks.some((value) => lineRuleMatches(value, rule.pattern, rule.matchMode));
    }

    if (!rule.normalizedPattern) return false;
    const normalizedValues = getNormalizedHaystacks();

    if (rule.matchMode === "exact") {
      return normalizedValues.some((value) => value === rule.normalizedPattern);
    }
    if (rule.matchMode === "prefix") {
      return normalizedValues.some((value) => value.startsWith(rule.normalizedPattern));
    }
    return normalizedValues.some((value) => value.includes(rule.normalizedPattern));
  });

  return match?.original || null;
}

function findMatchingManualLineRule({
  profile = {},
  rawLine = "",
  normalizedLine = "",
  side = "both",
  objectType = "",
} = {}) {
  const lineRules = profile?.lineRules;
  if (!lineRules || typeof lineRules !== "object") return null;

  const normalizedObjectType = normalizeComparableLine(objectType);
  const directRules = Array.isArray(lineRules[objectType]) ? lineRules[objectType] : [];
  const normalizedRules = normalizedObjectType !== objectType && Array.isArray(lineRules[normalizedObjectType])
    ? lineRules[normalizedObjectType]
    : [];
  const globalRules = !normalizedObjectType
    ? [
      ...(Array.isArray(lineRules.global) ? lineRules.global : []),
      ...(Array.isArray(lineRules["*"]) ? lineRules["*"] : []),
    ]
    : [];
  const rules = directRules.length || normalizedRules.length
    ? [...directRules, ...normalizedRules]
    : globalRules;
  if (!rules.length) return null;
  const currentSide = normalizeSide(side);
  const haystacks = [rawLine, normalizedLine].map((value) => String(value || ""));
  let normalizedHaystacks = null;
  const getNormalizedHaystacks = () => {
    if (!normalizedHaystacks) {
      normalizedHaystacks = haystacks.map((value) => normalizeComparableLine(value));
    }
    return normalizedHaystacks;
  };

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
    const normalizedPattern = normalizeComparableLine(pattern);
    if (!normalizedPattern) return false;
    const normalizedValues = getNormalizedHaystacks();

    return normalizedValues.some((value) =>
      value === normalizedPattern ||
      value.includes(normalizedPattern)
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

function getPreparedIgnoreRules(rules = []) {
  if (!Array.isArray(rules) || !rules.length) return [];
  const signature = ignoreRulesSignature(rules);
  const cached = preparedIgnoreRuleCache.get(rules);
  if (cached?.signature === signature) {
    return cached.prepared;
  }

  const prepared = rules.map((rule) => {
    if (!rule || (rule.action && rule.action !== "ignore")) {
      return { valid: false, original: rule };
    }

    const pattern = String(rule.pattern || rule.value || rule.text || "").trim();
    const matchMode = rule.matchMode || rule.mode || rule.type || "contains";
    return {
      valid: Boolean(pattern),
      original: rule,
      source: rule.source || rule.side || "both",
      objectType: normalizeComparableLine(rule.objectType),
      objectKey: normalizeComparableLine(rule.objectKey),
      field: normalizeComparableLine(rule.field),
      ruleId: normalizeComparableLine(rule.ruleId),
      category: normalizeComparableLine(rule.category),
      findingType: normalizeComparableLine(rule.findingType),
      mode: normalizeComparableLine(rule.mode),
      scope: normalizeComparableLine(rule.scope),
      pattern,
      normalizedPattern: normalizeComparableLine(pattern),
      matchMode,
    };
  });

  preparedIgnoreRuleCache.set(rules, { signature, prepared });
  return prepared;
}

function ignoreRulesSignature(rules = []) {
  return rules.map((rule) => {
    if (!rule) return "";
    return [
      rule.action,
      rule.source,
      rule.side,
      rule.objectType,
      rule.objectKey,
      rule.field,
      rule.ruleId,
      rule.category,
      rule.findingType,
      rule.mode,
      rule.scope,
      rule.pattern,
      rule.value,
      rule.text,
      rule.matchMode,
      rule.type,
    ].map((value) => String(value || "")).join("\u0001");
  }).join("\u0002");
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

function matchesFieldValue(expected = "", actual = "", optionalWhenActualBlank = false) {
  const expectedAliases = canonicalFieldAliases(expected);
  if (!expectedAliases.length) return true;
  const actualAliases = canonicalFieldAliases(actual);
  if (!actualAliases.length && optionalWhenActualBlank) return true;
  return actualAliases.some((field) => expectedAliases.includes(field));
}

function matchesRuleValue(expected = "", actual = "", optionalWhenActualBlank = false) {
  const normalizedExpected = canonicalRuleId(expected);
  if (!normalizedExpected) return true;
  const normalizedActual = canonicalRuleId(actual);
  if (!normalizedActual && optionalWhenActualBlank) return true;
  return normalizedExpected === normalizedActual;
}

function matchesChangeType(expected = "", actual = "") {
  const normalizedExpected = normalizeComparableLine(expected);
  if (!normalizedExpected) return true;
  return changeTypeAliases(actual).includes(normalizedExpected);
}

function matchesChangeTypes(expected = [], actual = "") {
  if (!Array.isArray(expected) || !expected.length) return true;
  const actualAliases = changeTypeAliases(actual);
  return expected.some((item) => actualAliases.includes(normalizeComparableLine(item)));
}

function changeTypeAliases(value = "") {
  const normalized = normalizeComparableLine(value);
  const aliases = new Set([normalized]);
  if (normalized === "structure-converted") aliases.add("added");
  if (normalized === "added") aliases.add("structure-converted");
  if (normalized === "changed") aliases.add("different");
  if (normalized === "different") aliases.add("changed");
  if (normalized === "missing-old") aliases.add("added");
  if (normalized === "missing-new") aliases.add("missing");
  return [...aliases].filter(Boolean);
}

function matchesPattern(pattern = "", value = "") {
  const rawPattern = String(pattern || "").trim();
  if (!rawPattern || rawPattern === "*") return true;
  const rawValue = String(value ?? "");
  const escaped = rawPattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*");
  try {
    return new RegExp(`^${escaped}$`, "i").test(rawValue);
  } catch {
    return lineRuleMatches(rawValue, rawPattern, "contains");
  }
}

function canonicalFieldPath(value = "") {
  return normalizeComparableLine(value).replace(/\s+/g, "-");
}

function canonicalFieldAliases(value = "") {
  const field = canonicalFieldPath(value);
  if (!field) return [];
  const aliases = new Set([field]);
  if (field === "state") aliases.add("admin-state");
  if (field === "admin-state") aliases.add("state");
  return [...aliases];
}

function canonicalRuleId(value = "") {
  return normalizeComparableLine(String(value || "").split(/[·|,]/)[0]);
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
