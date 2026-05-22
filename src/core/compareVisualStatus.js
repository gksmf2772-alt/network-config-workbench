import { getSemanticDiffBlockState } from "./semanticTheme.js";

export function applySemanticPlanVisualStatusToDiffRows(diffRows = [], plan = []) {
  if (!Array.isArray(diffRows) || !Array.isArray(plan) || !plan.length) return diffRows;
  const lookup = buildSemanticPlanLookup(plan);
  if (!lookup.size) return diffRows;

  return diffRows.map((row) => row ? ({
    ...row,
    oldRow: applySemanticPlanVisualStatusToDiffRow(row.oldRow, lookup),
    newRow: applySemanticPlanVisualStatusToDiffRow(row.newRow, lookup),
  }) : row);
}

export function applySemanticPlanVisualStatusToDiffRow(row = null, semanticPlanByKey = new Map()) {
  if (!row) return row;
  const planItem = findSemanticPlanItemForDiffRow(row, semanticPlanByKey);
  if (!planItem || !shouldRenderSemanticCleanMatch(planItem)) return row;
  return {
    ...row,
    objectStatus: "matched",
    objectMatched: true,
    objectScore: planItem.score ?? row.objectScore ?? "",
    objectReason: planItem.reason || row.objectReason || "",
    semanticPairKey: planItem.id || row.semanticPairKey || "",
  };
}

function findSemanticPlanItemForDiffRow(row = {}, semanticPlanByKey = new Map()) {
  for (const key of diffRowSemanticLookupKeys(row)) {
    const item = semanticPlanByKey.get(canonicalizeComparableLine(key));
    if (item) return item;
  }
  return null;
}

function diffRowSemanticLookupKeys(row = {}) {
  const objectType = row.objectKey ? splitObjectKey(row.objectKey).type : "";
  return [
    row.objectKey,
    row.semanticPairKey,
    objectType && row.objectIdentity ? `${objectType}:${row.objectIdentity}` : "",
  ].filter(Boolean);
}

export function shouldRenderSemanticCleanMatch(item = {}) {
  if (String(item.status || "").toLowerCase() !== "matched") return false;
  if (!item.oldObject || !item.newObject) return false;
  if (item.comparisonExcluded || item.excluded || item.policySuppressed || item.suppressed) return false;
  return !hasActiveSemanticDisplayViolation(item);
}

export function hasActiveSemanticDisplayViolation(item = {}) {
  if (activeSemanticPolicyViolations(item).length > 0) return true;
  if (!Array.isArray(item.policyViolations) && Number(item.policyViolationCount || 0) > 0) return true;
  return false;
}

export function semanticLineRelationState(lineMatch = {}, field = "", item = {}) {
  const status = String(lineMatch.status || "").toLowerCase();
  const reason = String(lineMatch.reason || "").toLowerCase();
  if (reason.includes("ambiguous") || reason.includes("conflict")) return "conflict";
  if (shouldRenderSemanticCleanMatch(item)) return "equal";
  if (status === "equal") return "equal";
  if (status === "changed") return "changed";
  if (status === "candidate") return "candidate";
  if (status === "added" || status === "missing") return "candidate";
  return field ? "candidate" : "changed";
}

export function semanticObjectVisualState(item = {}) {
  const state = getSemanticDiffBlockState(item);
  if (state === "partial" && shouldRenderSemanticCleanMatch(item)) return "matched";
  if (state === "manual") return "manual";
  if (state === "matched") return "matched";
  if (state === "excluded") return "excluded";
  if (state === "suppressed") return "suppressed";
  if (state === "unmatched") return "unmatched";
  if (Array.isArray(item.ambiguousAlternatives) && item.ambiguousAlternatives.length) return "ambiguous";
  return "partial";
}

export function buildSemanticPlanLookup(plan = []) {
  const lookup = new Map();
  (plan || []).forEach((item) => {
    semanticPlanLookupKeys(item).forEach((key) => {
      lookup.set(canonicalizeComparableLine(key), item);
    });
  });
  return lookup;
}

function semanticPlanLookupKeys(item = {}) {
  const object = item.oldObject || item.newObject || {};
  const objectType = item.objectType || object.normalizedType || object.type || "object";
  const oldIdentity = semanticObjectIdentity(item.oldObject);
  const newIdentity = semanticObjectIdentity(item.newObject);
  const keys = [
    item.oldObject?.key,
    item.newObject?.key,
    oldIdentity ? `${objectType}:${oldIdentity}` : "",
    newIdentity ? `${objectType}:${newIdentity}` : "",
    item.objectKey,
  ];
  return [...new Set(keys.filter(Boolean))];
}

export function activeSemanticPolicyViolations(item = {}) {
  const violations = Array.isArray(item.policyViolations) ? item.policyViolations : [];
  return violations.filter((violation) => {
    if (violation?.ignored || violation?.suppressed) return false;
    const summary = findSemanticFieldSummary(item.fieldSummary, violation.field);
    if (!summary) return true;
    return isActiveSemanticViolationSummary(summary);
  });
}

function findSemanticFieldSummary(fieldSummary = {}, field = "") {
  const aliases = semanticFieldAliases(field);
  for (const alias of aliases) {
    if (fieldSummary?.[alias]) return fieldSummary[alias];
  }
  return null;
}

function isActiveSemanticViolationSummary(summary = {}) {
  if (summary.ignored || summary.suppressed || summary.comparisonExcluded) return false;
  const status = String(summary.effectiveStatus || summary.status || "").toLowerCase();
  if (["ignored", "inheritance-unresolved", "structure-converted", "comparison-excluded"].includes(status)) return false;
  return Boolean(summary.violation);
}

function semanticFieldAliases(field = "") {
  const normalized = canonicalizeComparableLine(field).replace(/\s+/g, "-");
  if (!normalized) return [];
  const aliases = new Set([normalized]);
  if (normalized === "state") aliases.add("admin-state");
  if (normalized === "admin-state") aliases.add("state");
  return [...aliases];
}

function semanticObjectIdentity(object = null) {
  if (!object) return "";
  return String(object.normalizedIdentity || object.identity || object.sourceName || object.name || object.id || "").trim();
}

function splitObjectKey(key) {
  if (!key) return { type: "unknown", name: "" };
  const separator = key.indexOf(":");
  if (separator < 0) return { type: key, name: "" };
  return { type: key.slice(0, separator), name: key.slice(separator + 1) };
}

function canonicalizeComparableLine(line) {
  return String(line || "").toLowerCase().replace(/"/g, "").replace(/\s+/g, " ").trim();
}
