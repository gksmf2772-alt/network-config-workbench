function clean(value = "") {
  return String(value ?? "").trim().replace(/^["']|["']$/g, "");
}

function normalizeToken(value = "") {
  return clean(value).replace(/[{};,]+$/g, "").toLowerCase();
}

function normalizeState(value = "") {
  const text = normalizeToken(value);
  if (text === "enable" || text === "enabled" || text === "no shutdown") return "enabled";
  if (text === "disable" || text === "disabled" || text === "shutdown") return "disabled";
  return text;
}

export function splitStaticRouteNextHopList(value = "") {
  if (Array.isArray(value)) return value.flatMap(splitStaticRouteNextHopList);
  return String(value ?? "")
    .split(",")
    .map(normalizeToken)
    .filter(Boolean);
}

export function staticRouteNextHopFieldKey(nextHop, field) {
  const normalizedNextHop = normalizeToken(nextHop);
  const normalizedField = normalizeToken(field);
  return normalizedNextHop && normalizedField ? `next-hop[${normalizedNextHop}].${normalizedField}` : "";
}

function setEntryField(entry, field, value) {
  const normalizedField = normalizeToken(field);
  const normalizedValue = normalizedField === "state" ? normalizeState(value) : clean(value);
  if (!normalizedField || normalizedValue === "") return;
  entry[normalizedField] = normalizedValue;
}

function makeEntry(nextHop) {
  return {
    nextHop: normalizeToken(nextHop),
  };
}

function mergeEntries(entries = []) {
  const byNextHop = new Map();

  entries.forEach((entry) => {
    const nextHop = normalizeToken(entry?.nextHop || entry?.["next-hop"] || "");
    if (!nextHop) return;
    if (!byNextHop.has(nextHop)) byNextHop.set(nextHop, makeEntry(nextHop));
    const target = byNextHop.get(nextHop);

    ["tag", "metric", "state", "admin-state", "description", "next-hop-type", "tunnel-next-hop"].forEach((field) => {
      const value = entry?.[field];
      if (value === undefined || value === null || value === "") return;
      setEntryField(target, field === "admin-state" ? "state" : field, value);
    });
  });

  return [...byNextHop.values()].sort((left, right) =>
    left.nextHop.localeCompare(right.nextHop, undefined, { numeric: true })
  );
}

export function collectStaticRouteNextHopEntriesFromLines(lines = []) {
  const entries = [];
  const byNextHop = new Map();
  let current = null;

  const ensureEntry = (nextHop) => {
    const normalizedNextHop = normalizeToken(nextHop);
    if (!normalizedNextHop) return null;
    if (byNextHop.has(normalizedNextHop)) {
      current = byNextHop.get(normalizedNextHop);
      return current;
    }
    current = makeEntry(normalizedNextHop);
    byNextHop.set(normalizedNextHop, current);
    entries.push(current);
    return current;
  };

  for (const rawLine of lines || []) {
    const text = String(rawLine || "").trim();
    if (!text) continue;

    const nextHopMatch = text.match(/\bnext-hop\s+"?([^"\s{}]+)"?/i);
    const indirectMatch = text.match(/^indirect\s+"?([^"\s{}]+)"?/i);
    const entry = nextHopMatch || indirectMatch
      ? ensureEntry(nextHopMatch?.[1] || indirectMatch?.[1] || "")
      : current;

    if (!entry) continue;

    if (indirectMatch) setEntryField(entry, "next-hop-type", "indirect");
    if (/^tunnel-next-hop$/i.test(text)) setEntryField(entry, "tunnel-next-hop", "true");

    const tagMatch = text.match(/\btag\s+([^"\s{}]+)/i);
    if (tagMatch) setEntryField(entry, "tag", tagMatch[1]);

    const metricMatch = text.match(/\bmetric\s+([^"\s{}]+)/i);
    if (metricMatch) setEntryField(entry, "metric", metricMatch[1]);

    const descriptionMatch = text.match(/\bdescription\s+"?(.+?)"?\s*}?$/i);
    if (descriptionMatch) setEntryField(entry, "description", descriptionMatch[1]);

    if (/\bno\s+shutdown\b|\badmin-state\s+enable\b/i.test(text)) {
      setEntryField(entry, "state", "enabled");
    } else if (/(^|\s)shutdown\b|\badmin-state\s+disable\b/i.test(text)) {
      setEntryField(entry, "state", "disabled");
    }
  }

  return mergeEntries(entries);
}

export function collectStaticRouteNextHopEntriesFromFields(fields = {}) {
  const entries = splitStaticRouteNextHopList(fields["next-hop"] || fields.nextHop)
    .map((nextHop) => makeEntry(nextHop));
  const byNextHop = new Map(entries.map((entry) => [entry.nextHop, entry]));

  Object.entries(fields || {}).forEach(([field, value]) => {
    const match = String(field).match(/^next-hop\[(.+)]\.(.+)$/);
    if (!match) return;
    const nextHop = normalizeToken(match[1]);
    const entryField = normalizeToken(match[2]);
    if (!nextHop || !entryField) return;
    if (!byNextHop.has(nextHop)) byNextHop.set(nextHop, makeEntry(nextHop));
    setEntryField(byNextHop.get(nextHop), entryField, value);
  });

  if (byNextHop.size === 1) {
    const [entry] = byNextHop.values();
    ["tag", "metric", "state", "admin-state", "description", "next-hop-type", "tunnel-next-hop"].forEach((field) => {
      if (fields[field] === undefined || fields[field] === "") return;
      setEntryField(entry, field === "admin-state" ? "state" : field, fields[field]);
    });
  }

  return mergeEntries([...byNextHop.values()]);
}

export function buildStaticRouteNextHopFields(entries = []) {
  const mergedEntries = mergeEntries(entries);
  const fields = {};
  if (!mergedEntries.length) return fields;

  fields["next-hop"] = mergedEntries.map((entry) => entry.nextHop).join(", ");

  mergedEntries.forEach((entry) => {
    const presentKey = staticRouteNextHopFieldKey(entry.nextHop, "present");
    if (presentKey) fields[presentKey] = "true";

    ["tag", "metric", "state", "description", "next-hop-type", "tunnel-next-hop"].forEach((field) => {
      const key = staticRouteNextHopFieldKey(entry.nextHop, field);
      if (!key || entry[field] === undefined || entry[field] === "") return;
      fields[key] = entry[field];
    });
  });

  if (mergedEntries.length === 1) {
    const [entry] = mergedEntries;
    fields["next-hop"] = entry.nextHop;
    ["tag", "metric", "state", "description", "next-hop-type", "tunnel-next-hop"].forEach((field) => {
      if (entry[field] === undefined || entry[field] === "") return;
      fields[field] = entry[field];
      if (field === "state") fields["admin-state"] = entry[field];
    });
  }

  return fields;
}

export function mergeStaticRouteFields(current = {}, incoming = {}) {
  const base = {
    ...(current || {}),
    ...(incoming || {}),
  };
  const entries = [
    ...collectStaticRouteNextHopEntriesFromFields(current),
    ...collectStaticRouteNextHopEntriesFromFields(incoming),
  ];

  [
    "next-hop",
    "nextHop",
    "tag",
    "metric",
    "state",
    "admin-state",
    "next-hop-type",
    "tunnel-next-hop",
  ].forEach((field) => {
    delete base[field];
  });

  Object.keys(base).forEach((field) => {
    if (/^next-hop\[.+]\./.test(field)) delete base[field];
  });

  return {
    ...base,
    ...buildStaticRouteNextHopFields(entries),
  };
}
