export const SEMANTIC_MATCH_STATES = {
  MATCHED: "matched",
  PARTIAL: "partial",
  AMBIGUOUS: "ambiguous",
  UNMATCHED: "unmatched",
  MANUAL: "manual",
};

export const SEMANTIC_STATE_CLASS = {
  [SEMANTIC_MATCH_STATES.MATCHED]: "semantic-state-matched",
  [SEMANTIC_MATCH_STATES.PARTIAL]: "semantic-state-partial",
  [SEMANTIC_MATCH_STATES.AMBIGUOUS]: "semantic-state-ambiguous",
  [SEMANTIC_MATCH_STATES.UNMATCHED]: "semantic-state-unmatched",
  [SEMANTIC_MATCH_STATES.MANUAL]: "semantic-state-manual",
};

export const SEMANTIC_STATE_LABEL = {
  [SEMANTIC_MATCH_STATES.MATCHED]: "matched",
  [SEMANTIC_MATCH_STATES.PARTIAL]: "partial",
  [SEMANTIC_MATCH_STATES.AMBIGUOUS]: "ambiguous",
  [SEMANTIC_MATCH_STATES.UNMATCHED]: "unmatched",
  [SEMANTIC_MATCH_STATES.MANUAL]: "manual",
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
  "ingress-filter": "semantic-field-color-policy",
  "egress-qos": "semantic-field-color-policy",
  "auth-policy": "semantic-field-color-policy",
  "icmp.redirects": "semantic-field-color-state",
  "dhcp.allow-unmatching-subnets": "semantic-field-color-state",
  "static-host": "semantic-field-color-address",
  "default-host": "semantic-field-color-address",
  "sub-sla-mgmt": "semantic-field-color-policy",
};

export function getSemanticMatchState({ status = "", reason = "", score = null } = {}) {
  const normalizedStatus = String(status || "").toLowerCase();
  const normalizedReason = String(reason || "").toLowerCase();

  if (normalizedReason === "manual") return SEMANTIC_MATCH_STATES.MANUAL;
  if (normalizedStatus === "candidate" || normalizedReason.includes("ambiguous")) {
    return SEMANTIC_MATCH_STATES.AMBIGUOUS;
  }
  if (normalizedStatus === "matched") {
    if (score != null && Number(score) < 90) return SEMANTIC_MATCH_STATES.PARTIAL;
    return SEMANTIC_MATCH_STATES.MATCHED;
  }
  return SEMANTIC_MATCH_STATES.UNMATCHED;
}

export function getSemanticStateClass(input = {}) {
  return SEMANTIC_STATE_CLASS[getSemanticMatchState(input)] || SEMANTIC_STATE_CLASS.unmatched;
}

export function getSemanticStateLabel(input = {}) {
  return SEMANTIC_STATE_LABEL[getSemanticMatchState(input)] || "unmatched";
}

export function getSemanticFieldColorClass(field = "") {
  return SEMANTIC_FIELD_COLOR_CLASS[String(field || "").trim()] || "semantic-field-color-default";
}
