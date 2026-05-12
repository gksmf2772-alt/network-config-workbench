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
      state: ["enable", "enabled"],
    },

    ignoreMissingLines: [
      /^no switchport$/i,
    ],

    ignoreAddedLines: [
      /^interface\s+/i,
    ],
    
    ignoreWrapperLines: [
  /^interface\s+/i,
    ],
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

function matchesSemanticLineRule(line, rules = []) {
  const normalizedLine = String(line || "").trim();

  return rules.some((rule) => {
    if (rule instanceof RegExp) {
      return rule.test(normalizedLine);
    }

    return normalizedLine === String(rule).trim();
  });
}

function isWrapperLinePair(lineMatch, wrapperRules = []) {
  const oldText = Array.isArray(lineMatch.oldLines)
    ? lineMatch.oldLines.join(" ").trim()
    : "";

  const newText = Array.isArray(lineMatch.newLines)
    ? lineMatch.newLines.join(" ").trim()
    : "";

  if (!oldText && !newText) return false;

  return (
    matchesSemanticLineRule(oldText, wrapperRules) ||
    matchesSemanticLineRule(newText, wrapperRules)
  );
}

export function applyDefaultNoopLineSuppression(
  lineMatches = [],
  objectType = "unknown"
) {
    const rules = getSemanticDefaultRulesForObjectType(objectType);

    const ignoreMissingLines = rules.ignoreMissingLines || [];
    const ignoreAddedLines = rules.ignoreAddedLines || [];
    const ignoreWrapperLines = rules.ignoreWrapperLines || [];

      return lineMatches.map((lineMatch) => {
        if (isWrapperLinePair(lineMatch, ignoreWrapperLines)) {
          return {
            ...lineMatch,
            status: "equal",
            reason: "semantic-wrapper-line-ignored",
            semanticCovered: true,
          };
        }
        const oldText = Array.isArray(lineMatch.oldLines)
      ? lineMatch.oldLines.join(" ").trim()
      : "";

    const newText = Array.isArray(lineMatch.newLines)
      ? lineMatch.newLines.join(" ").trim()
      : "";

    if (
      lineMatch.status === "missing" &&
      matchesSemanticLineRule(oldText, ignoreMissingLines)
    ) {
      return {
        ...lineMatch,
        status: "equal",
        reason: "semantic-missing-line-ignored",
        semanticCovered: true,
      };
    }

    if (
      lineMatch.status === "added" &&
      matchesSemanticLineRule(newText, ignoreAddedLines)
    ) {
      return {
        ...lineMatch,
        status: "equal",
        reason: "semantic-added-line-ignored",
        semanticCovered: true,
      };
    }
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