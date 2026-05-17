// src/core/comparisonPlan.js
import { compareObjectPlanLines } from "./lineDiff.js";
import { applyFieldPolicies } from "./fieldPolicy.js";
import {
  evaluatePolicyContext,
  findMatchingComparisonExclusion,
} from "./policyEvaluator.js";
import { applyDefaultNoopLineSuppression } from "./semanticRules.js";
import {
  formatBgpFieldSourceKo,
  isBgpInheritanceUnresolved,
} from "./bgpEffectiveResolver.js";

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

  if (match.reason === "prefix-next-hop") {
    fields.push("prefix", "next-hop");
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
        oldSource: fieldMatch.oldSource,
        newSource: fieldMatch.newSource,

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
        oldSource: oldField.source,
        newSource: null,
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
        oldSource: oldField.source,
        newSource: newField.source,
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
        oldSource: oldField.source,
        newSource: newField.source,
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
      oldSource: null,
      newSource: newField.source,
      sourceReason: "object-field-added",
    });
  }

  return results;
}

function collectObjectFields(object) {
  const fields = {};

  if (!object || typeof object !== "object") return fields;
  const objectType = object.normalizedType || object.type || object.sourceType || "";

  const candidateFields = {
    description: object.description,

    // UI/fieldSummary에서는 address 하나로 통일한다.
    // prefix가 있으면 반드시 prefix를 우선한다.
    // 예: Nokia MD-CLI address + prefix-length => 10.10.10.1/30
    address: objectType === "static-route"
      ? null
      : object.prefix || object.fields?.prefix || object.fields?.address || object.ipAddress,

    peerIp: object.fields?.neighbor ? null : object.peerIp,
    "peer-as": object.peerAs,
  };

  for (const [field, value] of Object.entries(candidateFields)) {
    if (value == null || value === "") continue;

    addObjectCompareField(fields, {
      field,
      value,
      rawValue: value,
      source: getObjectFieldSource(object, field),
    });
  }

  const semanticFields = objectType === "bgp" && object.effectiveFields
    ? object.effectiveFields
    : object.fields;

  if (semanticFields && typeof semanticFields === "object") {
    for (const [field, value] of Object.entries(semanticFields)) {
      if (value == null || value === "") continue;
      if (fields[field]) continue;
      if (
        objectType === "static-route" &&
        ["address", "prefix", "admin-state"].includes(field)
      ) {
        continue;
      }

      addObjectCompareField(fields, {
        field,
        value,
        rawValue: value,
        source: getObjectFieldSource(object, field),
      });
    }
  }

  return fields;
}

function addObjectCompareField(fields, {
  field,
  value,
  rawValue = value,
  source = null,
} = {}) {
  const compareField = canonicalCompareField(field);
  if (!isVisibleCompareField(compareField)) return;

  const nextField = {
    field: compareField,
    rawField: field,
    value,
    rawValue,
    source,
  };
  const existing = fields[compareField];

  if (!existing) {
    fields[compareField] = nextField;
    return;
  }

  const nextIsCanonical = field === compareField;
  const existingIsAlias = existing.rawField && existing.rawField !== compareField;

  if (nextIsCanonical && existingIsAlias) {
    fields[compareField] = nextField;
  }
}

function getObjectFieldSource(object = {}, field = "") {
  const compareField = canonicalCompareField(field);
  return (
    object.fieldSources?.[compareField] ||
    object.fieldSources?.[field] ||
    buildDefaultFieldSource(object, compareField)
  );
}

const VISIBLE_COMPARE_FIELDS = new Set([
  "description",
  "address",
  "admin-state",
  "state",
  "peer-as",
  "peerIp",
  "neighbor",
  "group",
  "import.policy",
  "export.policy",
  "route",
  "next-hop",
  "metric",
  "tag",
  "ingress-filter",
  "egress-qos",
  "auth-policy",
  "icmp.redirects",
  "dhcp.allow-unmatching-subnets",
  "static-host",
  "default-host",
  "sub-sla-mgmt",
  "subscriber-interface",
  "group-interface",
  "sap",
]);

const COMPARE_FIELD_ALIASES = {
  state: "admin-state",
};

function canonicalCompareField(field = "") {
  const key = String(field || "").trim();
  return COMPARE_FIELD_ALIASES[key] || key;
}

function isVisibleCompareField(field) {
  return VISIBLE_COMPARE_FIELDS.has(canonicalCompareField(field));
}

export function createFieldSummary(tokenMatches = []) {
  const summary = {};

  for (const tokenMatch of tokenMatches) {
    const rawField = tokenMatch.field || "unknown";
    const field = canonicalCompareField(rawField);
    if (!isVisibleCompareField(field)) continue;
    const normalizedTokenMatch = rawField === field
      ? tokenMatch
      : {
          ...tokenMatch,
          field,
          rawField,
        };

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
        oldSources: [],
        newSources: [],
        matches: [],
      };
    }

    const item = summary[field];

    item.matches.push(normalizedTokenMatch);

    if (normalizedTokenMatch.status === "equal") {
      item.equal += 1;
    } else if (normalizedTokenMatch.status === "changed") {
      item.changed += 1;
    } else if (normalizedTokenMatch.status === "missing") {
      item.missing += 1;
    } else if (normalizedTokenMatch.status === "added") {
      item.added += 1;
    }

    if (normalizedTokenMatch.oldValue != null) {
      item.oldValues.push(normalizedTokenMatch.oldValue);
    }

    if (normalizedTokenMatch.newValue != null) {
      item.newValues.push(normalizedTokenMatch.newValue);
    }

    if (normalizedTokenMatch.oldSource) {
      item.oldSources.push(normalizedTokenMatch.oldSource);
    }

    if (normalizedTokenMatch.newSource) {
      item.newSources.push(normalizedTokenMatch.newSource);
    }
  }

  for (const field of Object.keys(summary)) {
    const item = summary[field];

    const oldValueSet = new Set(item.oldValues.map((value) => String(value)));
    const newValueSet = new Set(item.newValues.map((value) => String(value)));

    const hasOldValues = oldValueSet.size > 0;
    const hasNewValues = newValueSet.size > 0;

    const oldCanonicalValue = pickCanonicalFieldValue(field, item.oldValues);
    const newCanonicalValue = pickCanonicalFieldValue(field, item.newValues);

    if (
      oldCanonicalValue &&
      newCanonicalValue &&
      oldCanonicalValue === newCanonicalValue
    ) {
      item.status = "equal";
      item.oldValues = [oldCanonicalValue];
      item.newValues = [newCanonicalValue];
      item.oldSourceLabels = uniqueSourceLabels(item.oldSources);
      item.newSourceLabels = uniqueSourceLabels(item.newSources);
      continue;
    }

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
    item.oldSourceLabels = uniqueSourceLabels(item.oldSources);
    item.newSourceLabels = uniqueSourceLabels(item.newSources);
  }

  return summary;
}

function uniqueSourceLabels(sources = []) {
  const labels = [];
  const seen = new Set();
  for (const source of sources || []) {
    const label = formatBgpFieldSourceKo(source);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels;
}

function pickCanonicalFieldValue(field, values = []) {
  const normalizedValues = values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  if (!normalizedValues.length) return "";

  if (field === "address") {
    const cidrValue = normalizedValues.find((value) =>
      /^\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}$/.test(value)
    );

    if (cidrValue) return cidrValue;
  }

  return normalizedValues[normalizedValues.length - 1];
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
      .map(canonicalCompareField)
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
    const field = canonicalCompareField(fieldMatch.field || "");
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

function buildDefaultFieldSource(object = {}, field = "") {
  if ((object.normalizedType || object.type) !== "bgp") return null;
  if (field === "group") {
    return {
      source: "mdcli-group-reference",
      labelKo: "그룹 참조",
      group: object.fields?.group || object.groupReference || "",
    };
  }
  return {
    source: "direct-neighbor",
    labelKo: "직접 설정",
  };
}

function applyPolicySuppressionToLineMatches({
  lineMatches = [],
  objectType = "",
  profile = {},
  oldObject = null,
  newObject = null,
  findingType = "",
} = {}) {
  return lineMatches.map((lineMatch) => {
    const fieldMatches = Array.isArray(lineMatch.fieldMatches) ? lineMatch.fieldMatches : [];
    const policyHits = [];

    fieldMatches.forEach((fieldMatch) => {
      const field = fieldMatch.field || "";
      const oldPolicy = fieldMatch.oldLine || fieldMatch.oldValue != null
        ? evaluatePolicyContext({
          profile,
          rawLine: fieldMatch.oldLine || "",
          side: "old",
          objectType,
          objectKey: objectKeyForPolicy(oldObject, objectType),
          field,
          fieldValue: fieldMatch.oldValue,
          findingType,
        })
        : null;
      const newPolicy = fieldMatch.newLine || fieldMatch.newValue != null
        ? evaluatePolicyContext({
          profile,
          rawLine: fieldMatch.newLine || "",
          side: "new",
          objectType,
          objectKey: objectKeyForPolicy(newObject, objectType),
          field,
          fieldValue: fieldMatch.newValue,
          findingType,
        })
        : null;

      [oldPolicy, newPolicy].filter(Boolean).forEach((policy) => {
        if (policy.suppressed) policyHits.push(policy);
      });
    });

    [...(lineMatch.oldLines || [])].forEach((line) => {
      const policy = evaluatePolicyContext({
        profile,
        rawLine: line,
        side: "old",
        objectType,
        objectKey: objectKeyForPolicy(oldObject, objectType),
        findingType,
      });
      if (policy.suppressed) policyHits.push(policy);
    });

    [...(lineMatch.newLines || [])].forEach((line) => {
      const policy = evaluatePolicyContext({
        profile,
        rawLine: line,
        side: "new",
        objectType,
        objectKey: objectKeyForPolicy(newObject, objectType),
        findingType,
      });
      if (policy.suppressed) policyHits.push(policy);
    });

    if (!policyHits.length) return lineMatch;

    return {
      ...lineMatch,
      status: "ignored",
      reason: policyHits[0].reason || "policy-suppressed",
      semanticCovered: true,
      ignored: true,
      suppressed: true,
      policySource: policyHits[0].sourcePolicy,
      policyHits,
      fieldMatches: fieldMatches.map((fieldMatch) => ({
        ...fieldMatch,
        status: "ignored",
        ignored: true,
      })),
    };
  });
}

function applyLineExceptionSuppressionToFieldPolicy({
  policyResult = {},
  objectType = "",
  profile = {},
  oldObject = null,
  newObject = null,
  findingType = "",
} = {}) {
  const fieldSummary = { ...(policyResult.fieldSummary || {}) };
  const suppressedFields = new Set();
  const suppressionReasons = {};
  const vendorPair = profileVendorPair(profile);

  for (const [field, summary] of Object.entries(fieldSummary)) {
    const matches = Array.isArray(summary.matches) ? summary.matches : [];
    const policyHits = [];
    const fieldContext = buildSemanticFieldPolicyContext({
      profile,
      objectType,
      field,
      summary,
      findingType,
      vendorPair,
    });

    for (const match of matches) {
      const oldPolicy = match.oldLine || match.oldValue != null
        ? evaluatePolicyContext({
          profile,
          rawLine: match.oldLine || "",
          side: "old",
          objectType,
          objectKey: objectKeyForPolicy(oldObject, objectType),
          field,
          fieldValue: match.oldValue,
          ...fieldContext,
          findingType,
        })
        : null;
      const newPolicy = match.newLine || match.newValue != null
        ? evaluatePolicyContext({
          profile,
          rawLine: match.newLine || "",
          side: "new",
          objectType,
          objectKey: objectKeyForPolicy(newObject, objectType),
          field,
          fieldValue: match.newValue,
          ...fieldContext,
          findingType,
        })
        : null;

      [oldPolicy, newPolicy].filter(Boolean).forEach((policy) => {
        if (policy.suppressed) policyHits.push(policy);
      });
    }

    if (!policyHits.length) {
      const oldValue = firstSummaryValue(summary.oldValues);
      const newValue = firstSummaryValue(summary.newValues);
      const sides = [
        oldObject ? {
          side: "old",
          objectKey: objectKeyForPolicy(oldObject, objectType),
          fieldValue: oldValue,
          rawLine: "",
        } : null,
        newObject ? {
          side: "new",
          objectKey: objectKeyForPolicy(newObject, objectType),
          fieldValue: newValue,
          rawLine: "",
        } : null,
      ].filter(Boolean);

      for (const sideContext of sides) {
        const policy = evaluatePolicyContext({
          profile,
          objectType,
          field,
          ...fieldContext,
          findingType,
          ...sideContext,
        });
        if (policy.suppressed) policyHits.push(policy);
      }
    }

    if (!policyHits.length) continue;

    suppressedFields.add(field);
    suppressionReasons[field] = policyHits[0].reason || "policy-suppressed";
    fieldSummary[field] = {
      ...summary,
      ignored: true,
      violation: false,
      violationReason: null,
      policyReason: suppressionReasons[field],
      effectiveStatus: "ignored",
      policyHits,
    };
  }

  if (!suppressedFields.size) return policyResult;

  return {
    ...policyResult,
    fieldSummary,
    violations: (policyResult.violations || []).filter((violation) => !suppressedFields.has(violation.field)),
    violationCount: (policyResult.violations || []).filter((violation) => !suppressedFields.has(violation.field)).length,
  };
}

function applyBgpInheritanceStatusToFieldPolicy({
  policyResult = {},
  objectType = "",
  oldObject = null,
  newObject = null,
} = {}) {
  if (objectType !== "bgp") return policyResult;
  const fieldSummary = { ...(policyResult.fieldSummary || {}) };
  const suppressedFields = new Set();

  for (const [field, summary] of Object.entries(fieldSummary)) {
    if (field === "group" && newObject?.groupReference) {
      fieldSummary[field] = {
        ...summary,
        violation: false,
        violationReason: null,
        effectiveStatus: "structure-converted",
        status: summary.status === "added" ? "structure-converted" : summary.status,
        policyReason: "MD-CLI 그룹 구조",
        newSourceLabels: summary.newSourceLabels?.length
          ? summary.newSourceLabels
          : [`group ${newObject.groupReference}`],
      };
      suppressedFields.add(field);
      continue;
    }

    if (
      summary.status === "missing" &&
      newObject &&
      isBgpInheritanceUnresolved(newObject, field)
    ) {
      fieldSummary[field] = {
        ...summary,
        ignored: true,
        violation: false,
        violationReason: null,
        effectiveStatus: "inheritance-unresolved",
        policyReason: newObject.bgpInheritance?.messageKo || "상속 확인 필요",
        newSourceLabels: ["상속 확인 필요"],
      };
      suppressedFields.add(field);
    }
  }

  if (!suppressedFields.size) return {
    ...policyResult,
    fieldSummary,
  };

  const violations = (policyResult.violations || []).filter((violation) => !suppressedFields.has(violation.field));
  return {
    ...policyResult,
    fieldSummary,
    violations,
    violationCount: violations.length,
  };
}

function isPolicySuppressedPlanItem({
  status = "",
  fieldSummary = {},
  lineMatches = [],
} = {}) {
  if (!["old-only", "new-only", "candidate", "matched"].includes(status)) return false;
  const fields = Object.values(fieldSummary || {});
  const hasFields = fields.length > 0;
  const allFieldsIgnored = hasFields && fields.every((field) => field.ignored || field.effectiveStatus === "ignored");
  const hasLineMatches = lineMatches.length > 0;
  const allLinesIgnored = hasLineMatches && lineMatches.every((lineMatch) => lineMatch.ignored || lineMatch.status === "ignored");
  if (status === "matched" || status === "candidate") return allFieldsIgnored && allLinesIgnored;
  return allFieldsIgnored || allLinesIgnored;
}

function comparisonSideForPlanItem(status = "", oldObject = null, newObject = null) {
  if (status === "old-only" || (oldObject && !newObject)) return "old";
  if (status === "new-only" || (newObject && !oldObject)) return "new";
  return "both";
}

function comparisonSettingRuleId(status = "") {
  if (status === "old-only" || status === "new-only") return "semantic-compare.unmatched-setting";
  return "semantic-compare.setting";
}

function findPlanItemComparisonExclusion({
  match = {},
  objectType = "",
  profile = {},
} = {}) {
  const side = comparisonSideForPlanItem(match.status, match.oldObject || null, match.newObject || null);
  const object = side === "new" ? match.newObject : side === "old" ? match.oldObject : (match.oldObject || match.newObject);
  const objectKey = objectKeyForPolicy(object, objectType);
  if (!objectKey || !objectType) return null;
  return findMatchingComparisonExclusion({
    profile,
    side,
    objectType,
    objectKey,
    settingType: objectType,
    settingKey: objectKey,
    matchStatus: match.status || "",
    ruleId: comparisonSettingRuleId(match.status || ""),
    vendorPair: profileVendorPair(profile),
  });
}

function markFieldSummaryComparisonExcluded(fieldSummary = {}, exclusion = {}) {
  return Object.fromEntries(Object.entries(fieldSummary || {}).map(([field, summary]) => [
    field,
    {
      ...(summary || {}),
      effectiveStatus: "ignored",
      ignored: true,
      suppressed: true,
      policyReason: exclusion.reasonKo || exclusion.reason || "비교 제외 규칙 적용",
      policyHits: [
        ...(
          Array.isArray(summary?.policyHits)
            ? summary.policyHits
            : []
        ),
        {
          suppressed: true,
          ignored: true,
          reason: exclusion.reasonKo || exclusion.reason || "비교 제외 규칙 적용",
          sourcePolicy: "comparison-exclusion",
          source: "comparison-exclusion",
          policyId: exclusion.id || "",
          rule: exclusion,
        },
      ],
    },
  ]));
}

function markLineMatchesComparisonExcluded(lineMatches = [], exclusion = {}) {
  return lineMatches.map((lineMatch) => ({
    ...lineMatch,
    status: "ignored",
    reason: exclusion.reasonKo || exclusion.reason || "comparison-exclusion",
    semanticCovered: true,
    ignored: true,
    suppressed: true,
    policySource: "comparison-exclusion",
    policyHits: [
      ...(
        Array.isArray(lineMatch.policyHits)
          ? lineMatch.policyHits
          : []
      ),
      {
        suppressed: true,
        ignored: true,
        reason: exclusion.reasonKo || exclusion.reason || "비교 제외 규칙 적용",
        sourcePolicy: "comparison-exclusion",
        source: "comparison-exclusion",
        policyId: exclusion.id || "",
        rule: exclusion,
      },
    ],
    fieldMatches: (Array.isArray(lineMatch.fieldMatches) ? lineMatch.fieldMatches : []).map((fieldMatch) => ({
      ...fieldMatch,
      status: "ignored",
      ignored: true,
    })),
  }));
}

function buildComparisonExclusionIssue({
  itemId = "",
  match = {},
  objectType = "",
  exclusion = {},
} = {}) {
  const side = comparisonSideForPlanItem(match.status, match.oldObject || null, match.newObject || null);
  const object = side === "new" ? match.newObject : side === "old" ? match.oldObject : (match.oldObject || match.newObject);
  const objectKey = objectKeyForPolicy(object, objectType);
  return {
    id: `${itemId || objectKey}:excluded`,
    panelKey: "excluded",
    objectType,
    objectKey,
    oldKey: match.oldObject ? objectKeyForPolicy(match.oldObject, objectType) : "",
    newKey: match.newObject ? objectKeyForPolicy(match.newObject, objectType) : "",
    displayName: object?.fields?.description || object?.canonicalFields?.description || object?.description || object?.normalizedIdentity || object?.identity || object?.sourceName || objectKey,
    fieldPath: "",
    status: "excluded",
    statusLabel: "비교 제외됨",
    reason: exclusion.reasonKo || exclusion.reason || "비교 제외 규칙 적용",
    ruleId: comparisonSettingRuleId(match.status || ""),
    issueType: "object-difference",
    classification: "비교 제외됨",
    suppressed: true,
    excluded: true,
    sourcePolicy: "comparison-exclusion",
    policyId: exclusion.id || "",
    policySource: "comparison-exclusion",
    side,
    matchStatus: match.status || "",
  };
}

function objectKeyForPolicy(object = {}, objectType = "") {
  if (!object) return "";
  return object.key || `${objectType}:${object.normalizedIdentity || object.identity || object.sourceName || object.id || ""}`;
}

function buildSemanticFieldPolicyContext({
  profile = {},
  objectType = "",
  field = "",
  summary = {},
  findingType = "",
  vendorPair = "",
} = {}) {
  const changeType = normalizeSemanticChangeType(summary.effectiveStatus || summary.status || "");
  return {
    ruleId: semanticFieldRuleId(objectType, field, summary),
    category: "semantic-compare",
    issueType: "field-difference",
    changeType,
    oldValue: firstSummaryValue(summary.oldValues),
    newValue: firstSummaryValue(summary.newValues),
    vendorPair: vendorPair || profileVendorPair(profile),
    findingType: changeType || findingType,
  };
}

function semanticFieldRuleId(objectType = "", field = "", summary = {}) {
  if (isImportantSemanticField(objectType, field)) return "semantic-compare.important-field-change";
  const status = normalizeSemanticChangeType(summary.effectiveStatus || summary.status || "");
  if (status === "added") return "semantic-compare.field-added";
  if (status === "missing") return "semantic-compare.field-missing";
  return "semantic-compare.field-difference";
}

function isImportantSemanticField(objectType = "", field = "") {
  const normalizedField = String(field || "").toLowerCase();
  if (objectType === "bgp") {
    return [
      "neighbor",
      "peerip",
      "group",
      "peer-as",
      "import.policy",
      "export.policy",
      "state",
      "admin-state",
      "description",
      "authentication-key",
    ].includes(normalizedField);
  }
  return [
    "route",
    "next-hop",
    "gateway",
    "tag",
    "metric",
    "state",
    "admin-state",
    "description",
    "sap",
    "port",
    "lag",
    "interface",
  ].includes(normalizedField);
}

function normalizeSemanticChangeType(status = "") {
  const value = String(status || "").toLowerCase();
  if (value === "structure-converted") return "structure-converted";
  if (value === "missing-old") return "added";
  if (value === "missing-new") return "missing";
  if (value === "different") return "changed";
  return value || "changed";
}

function firstSummaryValue(values = []) {
  const list = Array.isArray(values) ? values : [values];
  return String(list.find((value) => value != null && String(value).trim()) ?? "");
}

function profileVendorPair(profile = {}) {
  const oldVendor = profile.oldVendor || profile.vendorPreset?.oldVendor || "";
  const newVendor = profile.newVendor || profile.vendorPreset?.newVendor || "";
  return [oldVendor, newVendor].filter(Boolean).join("->");
}

function isInterfaceStructuralLine(line = "") {
  const text = String(line || "")
    .trim()
    .replace(/[{}"]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

  if (!text) return true;

  return [
    "ipv4",
    "primary",
    "admin-state enable",
    "admin-state disable",
  ].includes(text);
}

function isOnlyInterfaceStructuralLineMatch(lineMatch = {}) {
  const oldLines = Array.isArray(lineMatch.oldLines) ? lineMatch.oldLines : [];
  const newLines = Array.isArray(lineMatch.newLines) ? lineMatch.newLines : [];

  const visibleLines = [...oldLines, ...newLines]
    .map((line) => String(line || "").trim())
    .filter(Boolean);

  if (!visibleLines.length) return false;

  return visibleLines.every(isInterfaceStructuralLine);
}

function applyInterfaceStructuralLineCoverage(
  lineMatches = [],
  objectType = ""
) {
  if (objectType !== "interface") return lineMatches;

  return lineMatches.map((lineMatch) => {
    if (!["added", "missing"].includes(lineMatch.status)) {
      return lineMatch;
    }

    if (!isOnlyInterfaceStructuralLineMatch(lineMatch)) {
      return lineMatch;
    }

    return {
      ...lineMatch,
      status: "equal",
      reason: "semantic-interface-structure-covered",
      semanticCovered: true,
    };
  });
}

function getEqualAddressValue(fieldSummary = {}) {
  const address = fieldSummary.address;
  if (!address) return "";

  const oldValues = Array.isArray(address.oldValues)
    ? address.oldValues.map((value) => String(value))
    : [];

  const newValues = Array.isArray(address.newValues)
    ? address.newValues.map((value) => String(value))
    : [];

  const oldCidr = oldValues.find((value) => value.includes("/")) || "";
  const newCidr = newValues.find((value) => value.includes("/")) || "";

  if (oldCidr && newCidr && oldCidr === newCidr) {
    return oldCidr;
  }

  return "";
}

function isInterfaceAddressSyntaxLine(line = "") {
  const text = String(line || "").trim().toLowerCase();

  if (/^set\s+interfaces\s+\S+\s+unit\s+\S+\s+family\s+inet\s+address\s+\S+\/\d+$/.test(text)) {
    return true;
  }

  if (/^address\s+\d{1,3}(?:\.\d{1,3}){3}$/.test(text)) {
    return true;
  }

  if (/^prefix-length\s+\d{1,3}$/.test(text)) {
    return true;
  }

  return false;
}

function normalizeLineTextForCoverage(line = "") {
  return String(line || "")
    .trim()
    .replace(/\s+/g, " ");
}

function applyInterfaceAddressLineCoverage(
  lineMatches = [],
  fieldSummary = {},
  objectType = ""
) {
  if (objectType !== "interface") return lineMatches;

  const equalAddress = getEqualAddressValue(fieldSummary);
  if (!equalAddress) return lineMatches;

  const oldAddressIndex = lineMatches.findIndex((lineMatch) => {
    const oldLines = Array.isArray(lineMatch.oldLines) ? lineMatch.oldLines : [];

    return oldLines.some((line) =>
      /^set\s+interfaces\s+\S+\s+unit\s+\S+\s+family\s+inet\s+address\s+\S+\/\d+$/i.test(
        String(line || "").trim()
      )
    );
  });

  if (oldAddressIndex < 0) return lineMatches;

  const groupedNewLines = [];

  for (const lineMatch of lineMatches) {
    const newLines = Array.isArray(lineMatch.newLines) ? lineMatch.newLines : [];

    for (const line of newLines) {
      const text = String(line || "").trim();

      if (
        /^interface\s+"?[^"\s{]+\.\d+"?\s*\{$/i.test(text) ||
        /^ipv4\s*\{$/i.test(text) ||
        /^primary\s*\{$/i.test(text) ||
        /^address\s+\d{1,3}(?:\.\d{1,3}){3}$/i.test(text) ||
        /^prefix-length\s+\d+$/i.test(text) ||
        /^}$/.test(text)
      ) {
        groupedNewLines.push(line);
      }
    }
  }

  const groupedNewLineSet = new Set(
    groupedNewLines.map(normalizeLineTextForCoverage)
  );

  return lineMatches
    .map((lineMatch, index) => {
      if (index === oldAddressIndex) {
        return {
          ...lineMatch,
          status: "equal",
          reason: "semantic-address-covered",
          semanticCovered: true,
          newLines: groupedNewLines,
        };
      }

      const oldLines = Array.isArray(lineMatch.oldLines) ? lineMatch.oldLines : [];
      const newLines = Array.isArray(lineMatch.newLines) ? lineMatch.newLines : [];

      const isGroupedNewOnlyLine =
        oldLines.length === 0 &&
        newLines.length > 0 &&
        newLines.every((line) =>
          groupedNewLineSet.has(normalizeLineTextForCoverage(line))
        );

      if (isGroupedNewOnlyLine) {
        return null;
      }

      return lineMatch;
    })
    .filter(Boolean);
}

function createRelationshipSummary(match = {}) {
  const objectType =
    match.oldObject?.type ||
    match.newObject?.type ||
    "";

  const summary = [];

  if (objectType === "static-route") {
    const oldNextHop =
      match.oldObject?.normalizedFields?.["next-hop"] ||
      match.oldObject?.fields?.["next-hop"] ||
      null;

    const newNextHop =
      match.newObject?.normalizedFields?.["next-hop"] ||
      match.newObject?.fields?.["next-hop"] ||
      null;

    let status = "unknown";
    let reason = "no-next-hop";

    if (oldNextHop && newNextHop) {
      if (String(oldNextHop) === String(newNextHop)) {
        status = "matched";
        reason = "same-next-hop";
      } else {
        status = "changed";
        reason = "next-hop-changed";
      }
    } else if (oldNextHop && !newNextHop) {
      status = "missing";
      reason = "next-hop-missing";
    } else if (!oldNextHop && newNextHop) {
      status = "added";
      reason = "next-hop-added";
    }

    summary.push({
      type: "static-route-next-hop",
      label: "Static route next-hop",
      status,
      reason,
      oldValue: oldNextHop || "-",
      newValue: newNextHop || "-",
    });
  }

  return summary;
}

export function createObjectComparePlan(
  match,
  index = 0,
  profile = {},
  allObjects = []
) {
  const objectType = getObjectType(match);

  const oldLines = getRawLines(match.oldObject);
  const newLines = getRawLines(match.newObject);

  const lineMatches = compareObjectPlanLines(
    {
      status: match.status,
      oldLines,
      newLines,
      oldObject: match.oldObject || null,
      newObject: match.newObject || null,
      reason: match.reason,
      matchKeyFields: match.matchKeyFields || [],
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

  const rawPolicyResult = applyFieldPolicies({
    objectType,
    fieldSummary: rawFieldSummary,
    profile,
  });
  const policyResult = applyLineExceptionSuppressionToFieldPolicy({
    policyResult: rawPolicyResult,
    objectType,
    profile,
    oldObject: match.oldObject || null,
    newObject: match.newObject || null,
    findingType: match.status || "",
  });
  const effectivePolicyResult = applyBgpInheritanceStatusToFieldPolicy({
    policyResult,
    objectType,
    oldObject: match.oldObject || null,
    newObject: match.newObject || null,
  });

  const fieldSummary = effectivePolicyResult.fieldSummary;
  const fieldStats = summarizeFieldSummary(fieldSummary);

  const localRelationships =
    createRelationshipSummaryFromFields(
      objectType,
      fieldSummary
    );

  const crossRelationships =
    createCrossObjectRelationships({
      currentObject:
        match.newObject ||
        match.oldObject,
      allObjects,
    });

  const relationshipSummary = [
    ...localRelationships,
    ...crossRelationships,
  ];

  const dedupedRelationshipSummary = [];
  const relationshipKeys = new Set();

  for (const relationship of relationshipSummary) {
    const key = [
      relationship.type,
      relationship.oldValue,
      relationship.newValue,
      relationship.reason,
    ].join("::");

    if (relationshipKeys.has(key)) {
      continue;
    }

    relationshipKeys.add(key);
    dedupedRelationshipSummary.push(relationship);
  }
  
  const semanticallyCoveredLineMatches = applySemanticLineCoverage(
    lineMatches,
    fieldSummary
  );

  const interfaceAddressCoveredLineMatches = applyInterfaceAddressLineCoverage(
    semanticallyCoveredLineMatches,
    fieldSummary,
    objectType
  );

  const interfaceStructureCoveredLineMatches =
    applyInterfaceStructuralLineCoverage(
      interfaceAddressCoveredLineMatches,
      objectType
    );

  const noopCoveredLineMatches = applyDefaultNoopLineSuppression(
    interfaceStructureCoveredLineMatches,
    objectType
  );

  const coveredLineMatches = applyPolicySuppressionToLineMatches({
    lineMatches: noopCoveredLineMatches,
    objectType,
    profile,
    oldObject: match.oldObject || null,
    newObject: match.newObject || null,
    findingType: match.status || "",
  });

  const fieldSummaryBeforeExclusion = fieldSummary;
  const coveredLineMatchesBeforeExclusion = coveredLineMatches;
  const policySuppressedBeforeExclusion = isPolicySuppressedPlanItem({
    status: match.status,
    fieldSummary: fieldSummaryBeforeExclusion,
    lineMatches: coveredLineMatchesBeforeExclusion,
  });
  const comparisonExclusion = findPlanItemComparisonExclusion({
    match,
    objectType,
    profile,
  });
  const comparisonExcluded = Boolean(comparisonExclusion);
  const effectiveFieldSummary = comparisonExcluded
    ? markFieldSummaryComparisonExcluded(fieldSummaryBeforeExclusion, comparisonExclusion)
    : fieldSummaryBeforeExclusion;
  const effectiveLineMatches = comparisonExcluded
    ? markLineMatchesComparisonExcluded(coveredLineMatchesBeforeExclusion, comparisonExclusion)
    : coveredLineMatchesBeforeExclusion;
  const policySuppressed = policySuppressedBeforeExclusion || comparisonExcluded;
  const comparisonExclusionIssue = comparisonExcluded
    ? buildComparisonExclusionIssue({
      itemId: getComparePlanId(match, index),
      match,
      objectType,
      exclusion: comparisonExclusion,
    })
    : null;

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

    lineMatches: effectiveLineMatches,
    tokenMatches,
    fieldSummary: effectiveFieldSummary,
    fieldStats: comparisonExcluded ? summarizeFieldSummary(effectiveFieldSummary) : fieldStats,
    policySuppressed,
    suppressionReason: comparisonExcluded
      ? "comparison-exclusion"
      : (policySuppressed ? "explicit-policy" : ""),
    comparisonExcluded,
    excluded: comparisonExcluded,
    exclusionRule: comparisonExclusion,
    exclusionPolicyId: comparisonExclusion?.id || "",
    exclusionReason: comparisonExclusion?.reasonKo || comparisonExclusion?.reason || "",
    exclusionIssue: comparisonExclusionIssue,

    relationshipSummary: dedupedRelationshipSummary,

    policyViolations: comparisonExcluded ? [] : effectivePolicyResult.violations,
    policyViolationCount: comparisonExcluded ? 0 : effectivePolicyResult.violationCount,

    warnings: [],
  };
}

export function createComparisonPlan(matches = [], profile = {}) {
  const allObjects = [
    ...matches.map((match) => match?.oldObject).filter(Boolean),
    ...matches.map((match) => match?.newObject).filter(Boolean),
  ];

  return matches.map((match, index) =>
    createObjectComparePlan(
      match,
      index,
      profile,
      allObjects
    )
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

function getFirstFieldValue(fieldSummary = {}, fieldName = "") {
  const field = fieldSummary[fieldName];
  if (!field) return "";

  const oldValue = Array.isArray(field.oldValues) && field.oldValues.length
    ? String(field.oldValues[0])
    : "";

  const newValue = Array.isArray(field.newValues) && field.newValues.length
    ? String(field.newValues[0])
    : "";

  return { oldValue, newValue };
}

function createRelationshipSummaryFromFields(objectType, fieldSummary = {}) {
  if (objectType !== "static-route") return [];

  const { oldValue, newValue } = getFirstFieldValue(fieldSummary, "next-hop");

  if (!oldValue && !newValue) return [];

  let status = "unknown";
  let reason = "no-next-hop";

  if (oldValue && newValue) {
    status = oldValue === newValue ? "matched" : "changed";
    reason = oldValue === newValue ? "same-next-hop" : "next-hop-changed";
  } else if (oldValue && !newValue) {
    status = "missing";
    reason = "next-hop-missing";
  } else if (!oldValue && newValue) {
    status = "added";
    reason = "next-hop-added";
  }

  return [
    {
      type: "static-route-next-hop",
      label: "Static route next-hop",
      status,
      reason,
      oldValue: oldValue || "-",
      newValue: newValue || "-",
    },
  ];
}

function findObjectsByType(objects = [], type = "") {
  return objects.filter((item) => getNormalizedType(item) === type);
}

function ipInsidePrefix(ip = "", prefix = "") {
  if (!ip || !prefix) return false;

  if (prefix.includes("/32")) {
    return prefix.replace("/32", "") === ip;
  }

  return false;
}

function getNormalizedType(object = {}) {
  return object?.normalizedType || object?.type || object?.sourceType || "";
}

function getObjectField(object = {}, field = "") {
  return object?.fields?.[field] ?? object?.[field] ?? "";
}

function getObjectArrayField(object = {}, field = "") {
  const value = object?.fields?.[field] ?? object?.[field] ?? [];
  return Array.isArray(value) ? value : value ? [value] : [];
}

function createCrossObjectRelationships({
  currentObject,
  allObjects = [],
}) {
  const relationships = [];

  if (!currentObject) return relationships;

  const currentType = getNormalizedType(currentObject);

  if (currentType === "static-route") {
    const route =
      getObjectField(currentObject, "route") ||
      currentObject.prefix ||
      "";

    const bgpObjects = findObjectsByType(allObjects, "bgp");

    bgpObjects.forEach((bgp) => {
      const neighbor =
        getObjectField(bgp, "neighbor") ||
        bgp.peerIp ||
        "";

      if (!neighbor) return;

      if (ipInsidePrefix(neighbor, route)) {
        relationships.push({
          type: "static-route-bgp-neighbor",
          label: "Static route → BGP neighbor",
          status: "matched",
          reason: "neighbor-ip-covered-by-static-route",
          oldValue: route,
          newValue: neighbor,
        });
      }
    });
  }

  if (currentType === "port") {
    const portName =
      getObjectField(currentObject, "interfaceName") ||
      getObjectField(currentObject, "port") ||
      currentObject.sourceName ||
      currentObject.id ||
      "";

    const lagId = getObjectField(currentObject, "lag");

    if (lagId) {
      relationships.push({
        type: "port-lag",
        label: "Port → LAG",
        status: "matched",
        reason: "port-member-of-lag",
        oldValue: portName,
        newValue: `lag-${lagId}`,
      });
    }
  }

  if (currentType === "lag") {
    const lagId =
      getObjectField(currentObject, "lag") ||
      currentObject.sourceName ||
      "";

    const members = getObjectArrayField(currentObject, "members");

    members.forEach((member) => {
      relationships.push({
        type: "lag-member-port",
        label: "LAG → member port",
        status: "matched",
        reason: "lag-contains-port",
        oldValue: `lag-${lagId}`,
        newValue: member,
      });
    });
  }

  if (currentType === "pim") {
  const pimInterface =
    getObjectField(currentObject, "interface") ||
    currentObject.sourceName ||
    "";

  if (pimInterface) {
    relationships.push({
      type: "pim-interface",
      label: "PIM → Interface",
      status: "matched",
      reason: "pim-enabled-on-interface",
      oldValue: pimInterface,
      newValue: pimInterface,
    });
  }
}

  return relationships;
}
