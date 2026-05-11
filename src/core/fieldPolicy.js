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

    const item = {
      ...summary,
      policy,
      ignored: policy === "ignore",
      violation: false,
      violationReason: null,
    };

    if (policy === "ignore") {
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