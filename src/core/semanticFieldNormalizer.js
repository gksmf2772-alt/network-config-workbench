function clean(value = "") {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

export function canonicalStaticRouteIdentity(fields = {}) {
  const route = clean(fields.route || fields.prefix || fields.address || "").toLowerCase();
  const routingContext = clean(fields["routing-context"] || fields.vrf || fields.vprn || "").toLowerCase();
  return route && routingContext ? `${routingContext}|${route}` : route;
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
  if (next.route) next.route = clean(next.route).toLowerCase();
  if (next.prefix) next.prefix = clean(next.prefix).toLowerCase();
  if (next.address) next.address = clean(next.address).toLowerCase();
  if (next.address && next["prefix-length"] && !next.address.includes("/")) {
    next.address = `${next.address}/${clean(next["prefix-length"])}`;
    next.prefix = next.address;
  }
  if (next["static-host"]) next["static-host"] = clean(next["static-host"]).toLowerCase();
  if (next["default-host"]) next["default-host"] = clean(next["default-host"]).toLowerCase();
  if (next["next-hop"]) next["next-hop"] = clean(next["next-hop"]).toLowerCase();
  if (next.nextHop && !next["next-hop"]) next["next-hop"] = clean(next.nextHop).toLowerCase();
  if (next.metric) next.metric = clean(next.metric);
  if (next.tag) next.tag = clean(next.tag);
  if (next["admin-state"] && !next.state) next.state = next["admin-state"];
  if (next.state === "enable") next.state = "enabled";
  if (next.state === "disable") next.state = "disabled";
  if (next.state) next.state = clean(next.state).toLowerCase();
  if (next.state && !next["admin-state"]) next["admin-state"] = next.state;
  if (next["admin-state"] === "enable") next["admin-state"] = "enabled";
  if (next["admin-state"] === "disable") next["admin-state"] = "disabled";
  if (next.neighbor) next.neighbor = clean(next.neighbor).toLowerCase();
  if (next.peerIp && !next.neighbor) next.neighbor = clean(next.peerIp).toLowerCase();
  if (next["authentication-key"]) next["authentication-key"] = clean(next["authentication-key"]);
  if (next.group) next.group = clean(next.group);

  if (next["ingress.filter.ip"] && !next["ingress-filter"]) {
    next["ingress-filter"] = clean(next["ingress.filter.ip"]);
  }

  if (next["egress.filter.ip"] && !next["egress-filter"]) {
    next["egress-filter"] = clean(next["egress.filter.ip"]);
  }

  if (next["ingress.qos.sap-ingress.policy-name"] && !next["ingress-qos"]) {
    next["ingress-qos"] = clean(next["ingress.qos.sap-ingress.policy-name"]);
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
