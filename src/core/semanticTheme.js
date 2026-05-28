export const SEMANTIC_MATCH_STATES = {
  MATCHED: "matched",
  PARTIAL: "partial",
  AMBIGUOUS: "ambiguous",
  UNMATCHED: "unmatched",
  MANUAL: "manual",
  EXCLUDED: "excluded",
  SUPPRESSED: "suppressed",
};

export const SEMANTIC_STATE_CLASS = {
  [SEMANTIC_MATCH_STATES.MATCHED]: "semantic-state-matched",
  [SEMANTIC_MATCH_STATES.PARTIAL]: "semantic-state-partial",
  [SEMANTIC_MATCH_STATES.AMBIGUOUS]: "semantic-state-ambiguous",
  [SEMANTIC_MATCH_STATES.UNMATCHED]: "semantic-state-unmatched",
  [SEMANTIC_MATCH_STATES.MANUAL]: "semantic-state-manual",
  [SEMANTIC_MATCH_STATES.EXCLUDED]: "semantic-state-excluded",
  [SEMANTIC_MATCH_STATES.SUPPRESSED]: "semantic-state-suppressed",
};

export const SEMANTIC_STATE_LABEL = {
  [SEMANTIC_MATCH_STATES.MATCHED]: "동일",
  [SEMANTIC_MATCH_STATES.PARTIAL]: "변경",
  [SEMANTIC_MATCH_STATES.AMBIGUOUS]: "검토 필요",
  [SEMANTIC_MATCH_STATES.UNMATCHED]: "미매칭",
  [SEMANTIC_MATCH_STATES.MANUAL]: "수동 매칭",
  [SEMANTIC_MATCH_STATES.EXCLUDED]: "비교 제외",
  [SEMANTIC_MATCH_STATES.SUPPRESSED]: "예외 처리",
};

export const SEMANTIC_FIELD_COLOR_CLASS = {
  route: "semantic-field-color-route",
  prefix: "semantic-field-color-route",
  address: "semantic-field-color-address",
  ipAddress: "semantic-field-color-address",
  neighbor: "semantic-field-color-peer",
  peerIp: "semantic-field-color-peer",
  "peer-as": "semantic-field-color-peer",
  "next-hop": "semantic-field-color-next-hop",
  tag: "semantic-field-color-policy",
  state: "semantic-field-color-state",
  "admin-state": "semantic-field-color-state",
  description: "semantic-field-color-description",
  sap: "semantic-field-color-policy",
  "ingress-filter": "semantic-field-color-policy",
  "egress-filter": "semantic-field-color-policy",
  "ingress-qos": "semantic-field-color-policy",
  "egress-qos": "semantic-field-color-policy",
  "auth-policy": "semantic-field-color-policy",
  "icmp.mask-reply": "semantic-field-color-state",
  "icmp.redirects": "semantic-field-color-state",
  "icmp.ttl-expired": "semantic-field-color-state",
  "icmp.unreachables": "semantic-field-color-state",
  "dhcp.allow-unmatching-subnets": "semantic-field-color-state",
  "dhcp.admin-state": "semantic-field-color-state",
  "dhcp.filter": "semantic-field-color-policy",
  "dhcp.server": "semantic-field-color-address",
  "dhcp.trusted": "semantic-field-color-state",
  "dhcp.lease-populate.l2-header": "semantic-field-color-state",
  "dhcp.lease-populate.max-leases": "semantic-field-color-policy",
  "neighbor-discovery.populate": "semantic-field-color-state",
  "static-host": "semantic-field-color-address",
  "static-host.admin-state": "semantic-field-color-state",
  "static-host.sub-profile": "semantic-field-color-policy",
  "static-host.sla-profile": "semantic-field-color-policy",
  "static-host.int-dest-id": "semantic-field-color-policy",
  "static-host.subscriber-id": "semantic-field-color-policy",
  "default-host": "semantic-field-color-address",
  "default-host.next-hop": "semantic-field-color-address",
  "sub-sla-mgmt": "semantic-field-color-policy",
  "sub-sla-mgmt.admin-state": "semantic-field-color-state",
  "sub-sla-mgmt.sub-ident-policy": "semantic-field-color-policy",
  "sub-sla-mgmt.subscriber-limit": "semantic-field-color-policy",
  "sub-sla-mgmt.defaults.sub-profile": "semantic-field-color-policy",
  "sub-sla-mgmt.defaults.sla-profile": "semantic-field-color-policy",
  "sub-sla-mgmt.defaults.subscriber-id": "semantic-field-color-policy",
  "sub-sla-mgmt.defaults.int-dest-id": "semantic-field-color-policy",
  "cpu-protection.policy-id": "semantic-field-color-policy",
  "cpu-protection.ip-src-monitoring": "semantic-field-color-state",
};

export function getSemanticMatchState({ status = "", reason = "", score = null } = {}) {
  const normalizedStatus = String(status || "").toLowerCase();
  const normalizedReason = String(reason || "").toLowerCase();

  if (normalizedReason === "manual") return SEMANTIC_MATCH_STATES.MANUAL;
  if (normalizedStatus === "partial" || normalizedStatus === "changed") {
    return SEMANTIC_MATCH_STATES.PARTIAL;
  }
  if (normalizedStatus === "candidate" || normalizedReason.includes("ambiguous")) {
    return SEMANTIC_MATCH_STATES.AMBIGUOUS;
  }
  if (normalizedStatus === "matched") {
    if (score != null && Number(score) < 90) return SEMANTIC_MATCH_STATES.PARTIAL;
    return SEMANTIC_MATCH_STATES.MATCHED;
  }
  return SEMANTIC_MATCH_STATES.UNMATCHED;
}

export function getSemanticDiffBlockState(input = {}) {
  const normalizedStatus = String(input?.status || "").toLowerCase();
  const normalizedReason = String(input?.reason || input?.suppressionReason || "").toLowerCase();

  if (
    input?.comparisonExcluded ||
    input?.excluded ||
    normalizedStatus === "excluded" ||
    normalizedStatus === "comparison-excluded"
  ) {
    return SEMANTIC_MATCH_STATES.EXCLUDED;
  }
  if (
    input?.policySuppressed ||
    input?.suppressed ||
    normalizedStatus === "suppressed" ||
    normalizedStatus === "ignored" ||
    normalizedReason.includes("suppressed") ||
    normalizedReason.includes("exception")
  ) {
    return SEMANTIC_MATCH_STATES.SUPPRESSED;
  }
  if (normalizedReason === "manual") return SEMANTIC_MATCH_STATES.MANUAL;
  if (normalizedStatus === "partial" || normalizedStatus === "changed") {
    return SEMANTIC_MATCH_STATES.PARTIAL;
  }
  if (normalizedStatus === "matched" || normalizedStatus === "candidate") {
    return hasActiveSemanticDifference(input)
      ? SEMANTIC_MATCH_STATES.PARTIAL
      : SEMANTIC_MATCH_STATES.MATCHED;
  }
  if (normalizedReason.includes("ambiguous")) return SEMANTIC_MATCH_STATES.AMBIGUOUS;
  if ([
    "old-only",
    "new-only",
    "unmatched",
    "unmatched-old",
    "unmatched-new",
    "unmatched-source",
    "unmatched-target",
    "source-only",
    "target-only",
    "no-target",
    "no-source",
  ].includes(normalizedStatus)) {
    return SEMANTIC_MATCH_STATES.UNMATCHED;
  }
  return SEMANTIC_MATCH_STATES.PARTIAL;
}

function hasActiveSemanticDifference(input = {}) {
  const policyViolations = Array.isArray(input?.policyViolations)
    ? input.policyViolations.filter((violation) => !violation?.ignored && !violation?.suppressed)
    : [];
  const policyViolationCount = Array.isArray(input?.policyViolations)
    ? policyViolations.length
    : Number(input?.policyViolationCount || 0);
  if (policyViolationCount > 0) return true;

  const fields = Object.values(input?.fieldSummary || {});
  if (fields.length) {
    return fields.some((field) => isActiveChangedField(field));
  }

  const fieldStats = input?.fieldStats || {};
  return (
    Number(fieldStats.changedFields || 0) > 0 ||
    Number(fieldStats.missingFields || 0) > 0 ||
    Number(fieldStats.addedFields || 0) > 0
  );
}

function isActiveChangedField(field = {}) {
  if (field?.ignored || field?.comparisonExcluded) return false;
  const status = String(field?.effectiveStatus || field?.status || "").toLowerCase();
  return ["changed", "missing", "added"].includes(status);
}

export function getSemanticStateClass(input = {}) {
  return SEMANTIC_STATE_CLASS[getSemanticMatchState(input)] || SEMANTIC_STATE_CLASS.unmatched;
}

export function getSemanticStateLabel(input = {}) {
  const normalizedStatus = String(input?.status || "").toLowerCase();
  const normalizedReason = String(input?.reason || input?.suppressionReason || "").toLowerCase();

  if (
    input?.comparisonExcluded ||
    input?.excluded ||
    normalizedStatus === "excluded" ||
    normalizedStatus === "comparison-excluded"
  ) {
    return SEMANTIC_STATE_LABEL[SEMANTIC_MATCH_STATES.EXCLUDED];
  }
  if (
    input?.policySuppressed ||
    input?.suppressed ||
    normalizedStatus === "suppressed" ||
    normalizedStatus === "ignored" ||
    normalizedReason.includes("suppressed") ||
    normalizedReason.includes("exception")
  ) {
    return SEMANTIC_STATE_LABEL[SEMANTIC_MATCH_STATES.SUPPRESSED];
  }
  if (normalizedReason === "manual") return SEMANTIC_STATE_LABEL[SEMANTIC_MATCH_STATES.MANUAL];
  if (isSourceMissingStatus(normalizedStatus)) return "누락";
  if (isTargetAddedStatus(normalizedStatus)) return "추가";
  if (
    normalizedStatus === "candidate" ||
    normalizedStatus === "manual-review" ||
    normalizedStatus === "low-confidence" ||
    normalizedReason.includes("ambiguous")
  ) {
    return SEMANTIC_STATE_LABEL[SEMANTIC_MATCH_STATES.AMBIGUOUS];
  }
  if (normalizedStatus === "matched" && input?.score != null && Number(input.score) < 90) {
    return SEMANTIC_STATE_LABEL[SEMANTIC_MATCH_STATES.AMBIGUOUS];
  }
  if (normalizedStatus === "matched" && hasActiveSemanticDifference(input)) {
    return SEMANTIC_STATE_LABEL[SEMANTIC_MATCH_STATES.PARTIAL];
  }
  if (normalizedStatus === "partial" || normalizedStatus === "changed") {
    return SEMANTIC_STATE_LABEL[SEMANTIC_MATCH_STATES.PARTIAL];
  }
  if (normalizedStatus === "matched") return SEMANTIC_STATE_LABEL[SEMANTIC_MATCH_STATES.MATCHED];
  if (isGenericUnmatchedStatus(normalizedStatus)) return SEMANTIC_STATE_LABEL[SEMANTIC_MATCH_STATES.UNMATCHED];
  return SEMANTIC_STATE_LABEL[getSemanticMatchState(input)] || SEMANTIC_STATE_LABEL[SEMANTIC_MATCH_STATES.UNMATCHED];
}

function isSourceMissingStatus(status = "") {
  return [
    "old-only",
    "source-only",
    "no-target",
    "unmatched-old",
    "unmatched-source",
  ].includes(status);
}

function isTargetAddedStatus(status = "") {
  return [
    "new-only",
    "target-only",
    "no-source",
    "unmatched-new",
    "unmatched-target",
  ].includes(status);
}

function isGenericUnmatchedStatus(status = "") {
  return [
    "unmatched",
    "unmatched-setting",
  ].includes(status);
}

export function getSemanticFieldColorClass(field = "") {
  return SEMANTIC_FIELD_COLOR_CLASS[String(field || "").trim()] || "semantic-field-color-default";
}
