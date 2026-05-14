// src/core/comparisonPlan.js
import { compareObjectPlanLines } from "./lineDiff.js";
import { applyFieldPolicies } from "./fieldPolicy.js";
import { applyDefaultNoopLineSuppression } from "./semanticRules.js";

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
      sourceReason: "object-field-added",
    });
  }

  return results;
}

function collectObjectFields(object) {
  const fields = {};

  if (!object || typeof object !== "object") return fields;

  const candidateFields = {
    description: object.description,

    // UI/fieldSummary에서는 address 하나로 통일한다.
    // prefix가 있으면 반드시 prefix를 우선한다.
    // 예: Nokia MD-CLI address + prefix-length => 10.10.10.1/30
    address: object.prefix || object.fields?.prefix || object.fields?.address || object.ipAddress,

    peerIp: object.peerIp,
    "peer-as": object.peerAs,
  };

  for (const [field, value] of Object.entries(candidateFields)) {
    if (value == null || value === "") continue;

    fields[field] = {
      field,
      value,
      rawValue: value,
    };
  }

  if (object.fields && typeof object.fields === "object") {
    for (const [field, value] of Object.entries(object.fields)) {
      if (value == null || value === "") continue;
      if (fields[field]) continue;
      if (!isVisibleCompareField(field)) continue;

      fields[field] = {
        field,
        value,
        rawValue: value,
      };
    }
  }

  return fields;
}

const VISIBLE_COMPARE_FIELDS = new Set([
  "description",
  "address",
  "admin-state",
  "state",
  "peer-as",
  "peerIp",
  "neighbor",
  "route",
  "next-hop",
  "tag",
]);

function isVisibleCompareField(field) {
  return VISIBLE_COMPARE_FIELDS.has(field);
}

export function createFieldSummary(tokenMatches = []) {
  const summary = {};

  for (const tokenMatch of tokenMatches) {
    const field = tokenMatch.field || "unknown";
    if (!isVisibleCompareField(field)) continue;

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
  }

  return summary;
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
    const field = String(fieldMatch.field || "").trim();
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

  const policyResult = applyFieldPolicies({
    objectType,
    fieldSummary: rawFieldSummary,
    profile,
  });

  const fieldSummary = policyResult.fieldSummary;
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

  const coveredLineMatches = applyDefaultNoopLineSuppression(
    interfaceStructureCoveredLineMatches,
    objectType
  );

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

    lineMatches: coveredLineMatches,
    tokenMatches,
    fieldSummary,
    fieldStats,

    relationshipSummary: dedupedRelationshipSummary,

    policyViolations: policyResult.violations,
    policyViolationCount: policyResult.violationCount,

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