function clean(value = "") {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

export function canonicalInterfaceName(value = "") {
  return clean(value)
    .replace(/\.0$/i, "")
    .toLowerCase();
}

export function canonicalServiceName(value = "") {
  return clean(value).toLowerCase();
}

export function canonicalBoolean(value) {
  if (value === true || value === "true" || value === "yes" || value === "enable") return "true";
  if (value === false || value === "false" || value === "no" || value === "disable") return "false";
  return clean(value).toLowerCase();
}

export function normalizeNokiaSemanticFields(fields = {}) {
  const next = { ...fields };

  if (next.interface) next.interface = canonicalInterfaceName(next.interface);
  if (next["subscriber-interface"]) next["subscriber-interface"] = canonicalServiceName(next["subscriber-interface"]);
  if (next["group-interface"]) next["group-interface"] = canonicalServiceName(next["group-interface"]);
  if (next.sap) next.sap = canonicalServiceName(next.sap);

  if (next["ingress.filter.ip"] && !next["ingress-filter"]) {
    next["ingress-filter"] = clean(next["ingress.filter.ip"]);
  }

  if (next["egress.qos"] && !next["egress-qos"]) {
    next["egress-qos"] = clean(next["egress.qos"]);
  }

  if (next["egress.qos.sap-egress.policy-name"] && !next["egress-qos"]) {
    next["egress-qos"] = clean(next["egress.qos.sap-egress.policy-name"]);
  }

  if (next["authentication-policy"] && !next["auth-policy"]) {
    next["auth-policy"] = clean(next["authentication-policy"]);
  }

  if (next["radius-auth-policy"] && !next["auth-policy"]) {
    next["auth-policy"] = clean(next["radius-auth-policy"]);
  }

  if (next["icmp.redirects.disabled"] != null) {
    next["icmp.redirects"] = "disabled";
  }

  if (next["dhcp.allow-unmatching-subnets"] != null) {
    next["dhcp.allow-unmatching-subnets"] = canonicalBoolean(next["dhcp.allow-unmatching-subnets"]);
  }

  return next;
}

export function buildHierarchyKey(parts = []) {
  return parts
    .map(canonicalServiceName)
    .filter(Boolean)
    .join("/");
}
