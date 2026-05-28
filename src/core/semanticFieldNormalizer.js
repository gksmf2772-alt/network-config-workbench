function clean(value = "") {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function canonicalRoutingContext(fields = {}, { includeRouter = false } = {}) {
  const explicitContext = clean(fields["routing-context"] || fields.vrf || fields.vprn || "").toLowerCase();
  if (explicitContext) return explicitContext;

  if (includeRouter) {
    const router = clean(fields.router || "").toLowerCase();
    if (router && router !== "base") return router;
  }

  return "";
}

export function canonicalStaticRouteIdentity(fields = {}) {
  const route = clean(fields.route || fields.prefix || fields.address || "").toLowerCase();
  const routingContext = canonicalRoutingContext(fields, { includeRouter: true });
  return route && routingContext ? `${routingContext}|${route}` : route;
}

export function canonicalInterfaceIdentity(fields = {}, fallback = "") {
  const address = clean(fields.address || fields.prefix || "").toLowerCase();
  const service = clean(fields.service || "").toLowerCase();
  const serviceId = clean(fields["service-id"] || fields.serviceId || "").toLowerCase();
  const routingContext = canonicalRoutingContext(fields, { includeRouter: true });

  if (address) {
    if (routingContext) return `${routingContext}|${address}`;
    if (service === "vprn" && serviceId) return `vprn:${serviceId}|${address}`;
    return address;
  }

  const fallbackIdentity = clean(fallback).toLowerCase();
  const interfaceName = canonicalInterfaceName(fields.interface || "");
  if (fallbackIdentity && fallbackIdentity !== interfaceName) return fallbackIdentity;

  return canonicalInterfaceName(fields.interface || fallback);
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

export function canonicalAdminState(value) {
  const normalized = clean(value).toLowerCase();
  if (["true", "yes", "enable", "enabled", "no shutdown"].includes(normalized)) return "enabled";
  if (["false", "no", "disable", "disabled", "shutdown"].includes(normalized)) return "disabled";
  return normalized;
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

  [
    "icmp.mask-reply",
    "icmp.redirects",
    "icmp.ttl-expired",
    "icmp.unreachables",
  ].forEach((field) => {
    if (next[field] != null) next[field] = canonicalAdminState(next[field]);
  });

  if (next["ingress.filter.ip"] && !next["ingress-filter"]) {
    next["ingress-filter"] = clean(next["ingress.filter.ip"]);
  }

  if (next["egress.filter.ip"] && !next["egress-filter"]) {
    next["egress-filter"] = clean(next["egress.filter.ip"]);
  }

  if (next["ingress.qos"] && !next["ingress-qos"]) {
    next["ingress-qos"] = clean(next["ingress.qos"]);
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

  [
    "neighbor-discovery.populate",
    "dhcp.trusted",
    "dhcp.lease-populate.l2-header",
    "cpu-protection.ip-src-monitoring",
  ].forEach((field) => {
    if (next[field] != null) next[field] = canonicalBoolean(next[field]);
  });

  [
    "dhcp.admin-state",
    "sub-sla-mgmt.admin-state",
    "static-host.admin-state",
  ].forEach((field) => {
    if (next[field] != null) next[field] = canonicalAdminState(next[field]);
  });

  if (next["dhcp.server"]) {
    next["dhcp.server"] = clean(next["dhcp.server"]).replace(/^\[|\]$/g, "").toLowerCase();
  }

  if (next["sub-sla-mgmt.defaults.subscriber-id"] === "use-auto-id") {
    next["sub-sla-mgmt.defaults.subscriber-id"] = "auto-id";
  }

  if (next["static-host.subscriber-id"] === "subscriber-sap-id") {
    next["static-host.subscriber-id"] = "use-sap-id";
  }

  return next;
}

export function buildHierarchyKey(parts = []) {
  return parts
    .map(canonicalServiceName)
    .filter(Boolean)
    .join("/");
}
