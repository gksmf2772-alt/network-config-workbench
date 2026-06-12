export function canonicalizeInterfaceName(value = "") {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[{}]/g, "")
    .replace(/\bcreate\b/gi, "")
    .trim()
    .replace(/^(?:interface|port)\s+/i, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function canonicalizePortName(value = "") {
  return canonicalizeInterfaceName(value);
}

export function canonicalizeLagNumber(value = "") {
  return String(value ?? "")
    .split(":")[0]
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\bcreate\b/gi, "")
    .replace(/^lag[-_\s]*/i, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function graphValueList(value) {
  if (Array.isArray(value)) return value.flatMap(graphValueList);
  const text = String(value ?? "").trim();
  if (!text) return [];
  const quoted = [...text.matchAll(/"([^"]+)"/g)].map((match) => match[1]).filter(Boolean);
  if (quoted.length) return quoted;
  return text
    .split(/\s*,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function firstGraphValue(value) {
  return graphValueList(value)[0] || "";
}

export function normalizeDeviceId(value = "") {
  return String(value || "device")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function normalizeVrf(value = "") {
  return String(value || "default")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function objectFields(object = {}) {
  return {
    ...(object.canonicalFields || {}),
    ...(object.fields || {}),
  };
}

export function objectType(object = {}) {
  return object.normalizedType || object.type || object.sourceType || "";
}

export function objectIdentity(object = {}) {
  return object.normalizedIdentity || object.identity || object.sourceName || object.id || "";
}

export function objectDeviceId(object = {}, fallback = "device") {
  const fields = objectFields(object);
  return normalizeDeviceId(object.deviceId || fields.deviceId || fields.device || fallback);
}

export function objectVrf(object = {}) {
  const fields = objectFields(object);
  return normalizeVrf(
    object.vrf ||
    fields.vrf ||
    fields.router ||
    fields["routing-context"] ||
    fields.vprn ||
    fields.service ||
    fields["service-id"] ||
    "default"
  );
}

export function evidenceFromObject(object = {}, reason = "") {
  return {
    source: "config",
    objectId: object.id || "",
    objectType: objectType(object),
    sourceName: object.sourceName || objectIdentity(object),
    lineStart: object.lineStart ?? null,
    lineEnd: object.lineEnd ?? null,
    rawLines: Array.isArray(object.rawLines) ? object.rawLines.slice(0, 4) : [],
    reason,
  };
}
