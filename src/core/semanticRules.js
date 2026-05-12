export const SEMANTIC_DEFAULT_RULES = {
  "static-route": {
    ignoreWhenAdded: {
      "admin-state": ["enable", "enabled"],
      state: ["enable", "enabled"],
      "route-type": ["unicast"],
    },
  },
  interface: {
    ignoreWhenAdded: {
      "admin-state": ["enable", "enabled"],
    },
  },
  port: {
    ignoreWhenAdded: {
      "admin-state": ["enable", "enabled"],
    },
  },
  lag: {
    ignoreWhenAdded: {
      "admin-state": ["enable", "enabled"],
    },
  },
};

export function getSemanticDefaultRulesForObjectType(objectType) {
  return SEMANTIC_DEFAULT_RULES[objectType] || {};
}

export function normalizeSemanticValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase();
}

export function isAddedDefaultNoopLine(lineMatch, objectType) {
  if (String(lineMatch.status || "").trim() !== "added") {
    return false;
  }

  const rules = getSemanticDefaultRulesForObjectType(objectType);
  const ignoreWhenAdded = rules.ignoreWhenAdded || {};

  const fieldMatches = Array.isArray(lineMatch.fieldMatches)
    ? lineMatch.fieldMatches
    : [];

  if (!fieldMatches.length) return false;

  return fieldMatches.every((fieldMatch) => {
    const field = String(fieldMatch.field || "").trim();
    const value = normalizeSemanticValue(
      fieldMatch.newValue ?? fieldMatch.value
    );

    const allowedValues = ignoreWhenAdded[field];
    if (!allowedValues) return false;

    return allowedValues
      .map(normalizeSemanticValue)
      .includes(value);
  });
}

export function applyDefaultNoopLineSuppression(
  lineMatches = [],
  objectType = "unknown"
) {
  return lineMatches.map((lineMatch) => {
    if (!isAddedDefaultNoopLine(lineMatch, objectType)) {
      return lineMatch;
    }

    return {
      ...lineMatch,
      status: "equal",
      reason: "default-noop-covered",
      defaultNoop: true,
      semanticCovered: true,
    };
  });
}