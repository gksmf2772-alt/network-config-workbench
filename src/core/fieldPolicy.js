// src/core/fieldPolicy.js

const DEFAULT_FIELD_POLICIES = {
  port: {
    description: "compare",
    "admin-state": "compare",
  },
  lag: {
    description: "compare",
    "admin-state": "compare",
  },
  interface: {
    address: "compare",
    description: "compare",
    "admin-state": "compare",
  },
  "static-route": {
    route: "compare",
    "next-hop": "compare",
    tag: "compare",
    description: "ignore",
  },
  bgp: {
    peerIp: "compare",
    "peer-as": "compare",
    description: "ignore",
  },
};

function normalizeProfileValidationPolicies(profile = {}) {
  const policies = profile.validationPolicies || {};
  const normalized = {};

  for (const [objectType, entries] of Object.entries(policies)) {
    normalized[objectType] = {};

    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (!entry?.field) continue;
        normalized[objectType][entry.field] = entry.policy || "compare";
      }
    } else if (entries && typeof entries === "object") {
      normalized[objectType] = { ...entries };
    }
  }

  return normalized;
}

function findProfilePolicyEntry(objectType, field, profile = {}) {
  const entries = profile.validationPolicies?.[objectType];
  const normalizedField = String(field || "").trim();
  if (!normalizedField) return null;

  if (Array.isArray(entries)) {
    return entries.find((entry) => String(entry?.field || "").trim() === normalizedField) || null;
  }

  if (entries && typeof entries === "object" && entries[normalizedField]) {
    return {
      field: normalizedField,
      policy: entries[normalizedField],
    };
  }

  return null;
}

export function getProfilePolicyEntry(objectType, field, profile = {}) {
  return findProfilePolicyEntry(objectType, field, profile);
}

export function getFieldPoliciesForObjectType(objectType, profile = {}) {
  const defaults = DEFAULT_FIELD_POLICIES[objectType] || {};
  const profilePolicies = normalizeProfileValidationPolicies(profile)[objectType] || {};

  return {
    ...defaults,
    ...profilePolicies,
  };
}

export function getPolicyForField(objectType, field, profile = {}) {
  const policies = getFieldPoliciesForObjectType(objectType, profile);
  return policies[field] || "compare";
}

export function applyFieldPolicies({
  objectType,
  fieldSummary = {},
  profile = {},
} = {}) {
  const policies = getFieldPoliciesForObjectType(objectType, profile);

  const result = {};
  const violations = [];

  for (const [field, summary] of Object.entries(fieldSummary)) {
    const policy = policies[field] || "compare";
    const policyEntry = findProfilePolicyEntry(objectType, field, profile);
    const exceptionAllowed = policy === "exception" && isExceptionAllowed(summary, policyEntry);

    const item = {
      ...summary,
      policy,
      ignored: policy === "ignore" || exceptionAllowed,
      violation: false,
      violationReason: null,
      policyReason: exceptionAllowed ? (policyEntry?.message || "exception-policy") : null,
    };

    if (policy === "ignore" || exceptionAllowed) {
      item.effectiveStatus = "ignored";
    } else if (policy === "presence") {
      item.effectiveStatus =
        summary.status === "missing" || summary.status === "added"
          ? summary.status
          : "present";
    } else {
      item.effectiveStatus = summary.status;
    }

    if (policy === "compare" && summary.status === "changed") {
      item.violation = true;
      item.violationReason = "field-changed";
    }

    if ((policy === "compare" || policy === "required") && summary.status === "missing") {
      item.violation = true;
      item.violationReason = "field-missing";
    }

    if (policy === "required" && summary.status === "added") {
      item.violation = false;
    }

    if (item.violation) {
      violations.push({
        field,
        policy,
        status: summary.status,
        reason: item.violationReason,
        oldValues: summary.oldValues || [],
        newValues: summary.newValues || [],
      });
    }

    result[field] = item;
  }

  for (const [field, policy] of Object.entries(policies)) {
    if (fieldSummary[field]) continue;
    if (policy !== "required") continue;

    result[field] = {
      field,
      status: "missing",
      policy,
      ignored: false,
      violation: true,
      violationReason: "required-field-absent",
      effectiveStatus: "missing",
      equal: 0,
      changed: 0,
      missing: 1,
      added: 0,
      oldValues: [],
      newValues: [],
      matches: [],
    };

    violations.push({
      field,
      policy,
      status: "missing",
      reason: "required-field-absent",
      oldValues: [],
      newValues: [],
    });
  }

  return {
    fieldSummary: result,
    violations,
    violationCount: violations.length,
  };
}

function isExceptionAllowed(summary = {}, policyEntry = null) {
  if (!policyEntry) return true;
  const allowed = [
    ...splitPolicyValues(policyEntry.oldValues),
    ...splitPolicyValues(policyEntry.newValue),
    ...splitPolicyValues(policyEntry.allowedValues),
  ];
  if (!allowed.length) return true;
  const allowedSet = new Set(allowed.map((value) => String(value).trim()));
  const values = [
    ...(summary.oldValues || []),
    ...(summary.newValues || []),
  ].map((value) => String(value).trim()).filter(Boolean);
  return values.length > 0 && values.every((value) => allowedSet.has(value));
}

function splitPolicyValues(value = "") {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
