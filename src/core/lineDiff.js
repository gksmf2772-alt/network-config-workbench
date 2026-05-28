// src/core/lineDiff.js
import { normalizeComparableLine } from "./lineNormalizer.js";
import { findSemanticLineRule } from "./semanticLineRules.js";
import {
  compareLineFields,
  extractComparableFieldsFromLine,
} from "./fieldExtractor.js";

function normalizeLine(line) {
  return normalizeComparableLine(line);
}

function isIgnorableLine(line) {
  const normalized = normalizeLine(line);

  if (!normalized) return true;
  if (normalized === "!") return true;
  if (normalized === "{") return true;
  if (normalized === "}") return true;
  if (normalized === "exit") return true;

  return false;
}

function makeLineMatch({
  oldLines = [],
  newLines = [],
  oldDisplayLine = null,
  newDisplayLine = null,
  oldSourceLines = [],
  newSourceLines = [],
  matchKey = null,
  canonicalField = null,
  status,
  reason,
  score = null,
  fieldMatches = [],
}) {
  return {
    oldLines,
    newLines,
    oldDisplayLine,
    newDisplayLine,
    oldSourceLines,
    newSourceLines,
    matchKey,
    canonicalField,
    status,
    reason,
    score,
    fieldMatches,
  };
}

const CANONICAL_LINE_FIELD_ORDER = {
  "static-route": ["route", "next-hop", "tag", "description", "metric", "state"],
  bgp: ["neighbor", "description", "authentication-key", "group", "state", "peer-as"],
  port: [
    "description",
    "admin-state",
    "ethernet.mode",
    "ethernet.mtu",
    "ethernet.egress.scheduler-policy",
    "ethernet.crc-monitor.signal-degrade.threshold",
    "ethernet.down-on-internal-error",
    "ethernet.access.egress.queue-group.name",
    "ethernet.access.egress.queue-group.instance",
    "ethernet.access.egress.queue-group.host-match.destination",
  ],
  lag: [
    "description",
    "mode",
    "state",
    "member-port",
    "lacp-mode",
    "lacp.administrative-key",
    "lacp-xmit-interval",
    "access.adapt-qos.mode",
  ],
  interface: [
    "description",
    "address",
    "state",
    "sap",
    "ingress-filter",
    "ingress-qos",
    "egress-filter",
    "egress-qos",
    "icmp.mask-reply",
    "icmp.redirects",
    "icmp.ttl-expired",
    "icmp.unreachables",
  ],
  "subscriber-interface": [
    "description",
    "address",
    "state",
    "dhcp.allow-unmatching-subnets",
    "group-interface",
    "auth-policy",
    "neighbor-discovery.populate",
    "dhcp.admin-state",
    "dhcp.filter",
    "dhcp.server",
    "dhcp.trusted",
    "dhcp.lease-populate.l2-header",
    "dhcp.lease-populate.max-leases",
    "sap",
    "ingress-filter",
    "ingress-qos",
    "egress-filter",
    "egress-qos",
    "cpu-protection.policy-id",
    "cpu-protection.ip-src-monitoring",
    "default-host",
    "default-host.next-hop",
    "sub-sla-mgmt.admin-state",
    "sub-sla-mgmt.sub-ident-policy",
    "sub-sla-mgmt.subscriber-limit",
    "sub-sla-mgmt.defaults.sub-profile",
    "sub-sla-mgmt.defaults.sla-profile",
    "sub-sla-mgmt.defaults.subscriber-id",
    "sub-sla-mgmt.defaults.int-dest-id",
    "static-host",
    "static-host.admin-state",
    "static-host.sub-profile",
    "static-host.sla-profile",
    "static-host.int-dest-id",
    "static-host.subscriber-id",
  ],
};

function canonicalFieldValue(object = {}, field = "") {
  if (!object) return null;
  if (field === "state") {
    return (
      object.fields?.state ??
      object.fields?.["admin-state"] ??
      object.state ??
      null
    );
  }
  if (field === "route") {
    return object.fields?.route ?? object.prefix ?? null;
  }
  if (field === "neighbor") {
    return object.fields?.neighbor ?? object.peerIp ?? null;
  }
  if (field === "next-hop") {
    return object.fields?.["next-hop"] ?? object.fields?.nextHop ?? object.nextHop ?? null;
  }
  if (field === "description") {
    return object.fields?.description ?? object.description ?? null;
  }
  if (field === "peer-as") {
    return object.fields?.["peer-as"] ?? object.fields?.peerAs ?? object.peerAs ?? null;
  }
  return object.fields?.[field] ?? object[field] ?? null;
}

function hasCanonicalFieldRows(planItem = {}) {
  const type = planItem.objectType || planItem.oldObject?.normalizedType || planItem.newObject?.normalizedType;
  if (!CANONICAL_LINE_FIELD_ORDER[type]) return false;
  return ["matched", "candidate"].includes(planItem.status);
}

function formatCanonicalLine(field, value) {
  if (value == null || value === "") return "";
  return `${field} ${value}`;
}

function sourceDisplayLines(object = {}, field = "") {
  const lines = Array.isArray(object?.rawLines) ? object.rawLines : [];
  if (!lines.length || !field) return [];

  if ((object.normalizedType || object.sourceType) === "port") {
    return portSourceDisplayLines(object, field, lines);
  }

  return genericSourceDisplayLines(field, lines);
}

function genericSourceDisplayLines(field = "", lines = []) {
  if (field === "description") return findSingleSourceLine(lines, /^description\s+/i);
  if (field === "admin-state" || field === "state") {
    return findSingleSourceLine(lines, /^(no\s+shutdown|shutdown|admin-state\s+(?:enable|disable|enabled|disabled))$/i);
  }
  return [];
}

function portSourceDisplayLines(object = {}, field = "", lines = []) {
  const vendor = object.vendor || "";

  if (vendor === "nokia-md-cli") {
    return mdCliPortSourceDisplayLines(field, lines);
  }

  if (field === "description" || field === "admin-state" || field === "state") {
    return genericSourceDisplayLines(field, lines);
  }

  return classicPortSourceDisplayLines(field, lines);
}

function classicPortSourceDisplayLines(field = "", lines = []) {
  if (field === "ethernet.mode") return findSingleSourceLine(lines, /^mode\s+\S+/i);
  if (field === "ethernet.mtu") return findSingleSourceLine(lines, /^mtu\s+\S+/i);
  if (field === "ethernet.egress.scheduler-policy") {
    return findSingleSourceLine(lines, /^egress-scheduler-policy\s+/i);
  }
  if (field === "ethernet.crc-monitor.signal-degrade.threshold") {
    return findClassicExitBlock(lines, /^crc-monitor$/i) ||
      findSingleSourceLine(lines, /^sd-threshold\s+/i);
  }
  if (field === "ethernet.down-on-internal-error") {
    return findSingleSourceLine(lines, /^down-on-internal-error$/i);
  }
  if (
    field === "ethernet.access.egress.queue-group.name" ||
    field === "ethernet.access.egress.queue-group.instance"
  ) {
    return findSingleSourceLine(lines, /^queue-group\s+/i);
  }
  if (field === "ethernet.access.egress.queue-group.host-match.destination") {
    return findSingleSourceLine(lines, /^host-match\s+dest\s+/i);
  }
  return [];
}

function mdCliPortSourceDisplayLines(field = "", lines = []) {
  if (field === "description") {
    return firstSourceLines(
      findSingleSourceLine(lines, /^description\s+/i),
      findMdCliOneLineSourceLine(lines, ["description"])
    );
  }
  if (field === "admin-state" || field === "state") {
    return firstSourceLines(
      findSingleSourceLine(lines, /^admin-state\s+(?:enable|disable|enabled|disabled)$/i),
      findMdCliOneLineSourceLine(lines, ["admin-state"])
    );
  }
  if (field === "ethernet.mode") {
    return firstSourceLines(
      findSingleSourceLine(lines, /^mode\s+\S+/i),
      findMdCliOneLineSourceLine(lines, ["ethernet", "mode"])
    );
  }
  if (field === "ethernet.mtu") {
    return firstSourceLines(
      findSingleSourceLine(lines, /^mtu\s+\S+/i),
      findMdCliOneLineSourceLine(lines, ["ethernet", "mtu"]),
      findMdCliOneLineSourceLine(lines, ["mtu"])
    );
  }
  if (field === "ethernet.egress.scheduler-policy") {
    return firstSourceLines(
      findMdCliEnclosingBraceBlock(lines, /^policy-name\s+/i, /^egress\s*\{/i),
      findMdCliEnclosingBraceBlock(lines, /^policy-name\s+/i, /^port-scheduler-policy\s*\{/i),
      findSingleSourceLine(lines, /^policy-name\s+/i),
      findMdCliOneLineSourceLine(lines, ["ethernet", "egress", "port-scheduler-policy", "policy-name"])
    );
  }
  if (field === "ethernet.crc-monitor.signal-degrade.threshold") {
    return firstSourceLines(
      findMdCliEnclosingBraceBlock(lines, /^threshold\s+/i, /^crc-monitor\s*\{/i),
      findSingleSourceLine(lines, /^threshold\s+/i),
      findMdCliOneLineSourceLine(lines, ["ethernet", "crc-monitor", "signal-degrade", "threshold"])
    );
  }
  if (field === "ethernet.down-on-internal-error") {
    return firstSourceLines(
      findMdCliBraceBlock(lines, /^down-on-internal-error\b/i),
      findSingleSourceLine(lines, /^down-on-internal-error\b/i),
      findMdCliOneLineSourceLine(lines, ["ethernet", "down-on-internal-error"])
    );
  }
  if (
    field === "ethernet.access.egress.queue-group.name" ||
    field === "ethernet.access.egress.queue-group.instance"
  ) {
    return firstSourceLines(
      findMdCliBraceBlock(lines, /^queue-group\s+/i),
      findSingleSourceLine(lines, /^queue-group\s+/i),
      findMdCliOneLineSourceLine(lines, ["ethernet", "access", "egress", "queue-group"])
    );
  }
  if (field === "ethernet.access.egress.queue-group.host-match.destination") {
    return firstSourceLines(
      findMdCliEnclosingBraceBlock(lines, /^int-dest-id\s+/i, /^host-match\s*\{/i),
      findSingleSourceLine(lines, /^int-dest-id\s+/i),
      findMdCliOneLineSourceLine(lines, ["host-match", "int-dest-id"]),
      findMdCliOneLineSourceLine(lines, ["int-dest-id"])
    );
  }
  return [];
}

function firstSourceLines(...candidates) {
  return candidates.find((item) => Array.isArray(item) && item.length > 0) || [];
}

function findMdCliOneLineSourceLine(lines = [], path = []) {
  const line = lines.find((item) => {
    const text = String(item || "");
    if (!/^\s*\/?configure\s*\{/i.test(text)) return false;
    return tokenPathExists(tokenizeSourceLine(text), path);
  });
  return line ? [line] : [];
}

function tokenizeSourceLine(line = "") {
  return [...String(line || "").matchAll(/"([^"]*)"|[{}]|\S+/g)]
    .map((match) => (match[1] !== undefined ? match[1] : match[0]))
    .map((token) => String(token || "").replace(/[{};,]+$/g, "").replace(/^["']|["']$/g, "").toLowerCase())
    .filter((token) => token && token !== "{" && token !== "}");
}

function tokenPathExists(tokens = [], path = []) {
  const normalizedPath = path.map((item) => String(item || "").toLowerCase());
  for (let index = 0; index <= tokens.length - normalizedPath.length; index += 1) {
    const matched = normalizedPath.every((part, offset) => tokens[index + offset] === part);
    if (matched) return true;
  }
  return false;
}

function findSingleSourceLine(lines = [], pattern) {
  const line = lines.find((item) => pattern.test(String(item || "").trim()));
  return line ? [line] : [];
}

function indentationOf(line = "") {
  return String(line || "").match(/^\s*/)?.[0]?.length || 0;
}

function findClassicExitBlock(lines = [], startPattern) {
  const startIndex = lines.findIndex((line) => startPattern.test(String(line || "").trim()));
  if (startIndex < 0) return [];

  const startIndent = indentationOf(lines[startIndex]);
  const block = [lines[startIndex]];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    block.push(line);
    const text = String(line || "").trim();
    if (/^exit$/i.test(text) && indentationOf(line) <= startIndent) break;
  }

  return block;
}

function findMdCliBraceBlock(lines = [], startPattern) {
  const startIndex = lines.findIndex((line) => startPattern.test(String(line || "").trim()));
  if (startIndex < 0) return [];
  return collectMdCliBraceBlock(lines, startIndex);
}

function findMdCliEnclosingBraceBlock(lines = [], targetPattern, blockStartPattern) {
  const targetIndex = lines.findIndex((line) => targetPattern.test(String(line || "").trim()));
  if (targetIndex < 0) return [];

  let best = [];
  for (let index = 0; index <= targetIndex; index += 1) {
    if (!blockStartPattern.test(String(lines[index] || "").trim())) continue;
    const block = collectMdCliBraceBlock(lines, index);
    if (block.length && index + block.length > targetIndex) best = block;
  }

  return best;
}

function collectMdCliBraceBlock(lines = [], startIndex = 0) {
  const first = lines[startIndex];
  if (!first) return [];

  const block = [first];
  let depth = (String(first).match(/\{/g) || []).length - (String(first).match(/\}/g) || []).length;
  if (depth <= 0) return block;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    block.push(line);
    depth += (String(line).match(/\{/g) || []).length;
    depth -= (String(line).match(/\}/g) || []).length;
    if (depth <= 0) break;
  }

  return block;
}

function displayLineFromSource(sourceLines = [], canonicalLine = "") {
  return sourceLines.length ? sourceLines.join("\n") : canonicalLine || null;
}

function compareCanonicalFieldRows(planItem = {}) {
  const type = planItem.objectType || planItem.oldObject?.normalizedType || planItem.newObject?.normalizedType;
  const ordered = CANONICAL_LINE_FIELD_ORDER[type] || [];
  const dynamicFields = new Set([
    ...Object.keys(planItem.oldObject?.fields || {}),
    ...Object.keys(planItem.newObject?.fields || {}),
  ]);
  const duplicateFields = new Set([
    "peerIp",
    "nextHop",
    "prefix",
    "address",
    "interface",
    "service",
    "service-id",
    "prefix-length",
    "state",
    "admin-state",
    "port",
    "lag",
    "members",
    "lacpMode",
  ]);
  const fields = [
    ...ordered,
    ...[...dynamicFields].filter((field) => !ordered.includes(field) && !duplicateFields.has(field)),
  ];

  return fields
    .map((field) => {
      const oldValue = canonicalFieldValue(planItem.oldObject, field);
      const newValue = canonicalFieldValue(planItem.newObject, field);
      if ((oldValue == null || oldValue === "") && (newValue == null || newValue === "")) return null;

      const oldLine = formatCanonicalLine(field, oldValue);
      const newLine = formatCanonicalLine(field, newValue);
      const same = oldLine && newLine && String(oldValue) === String(newValue);
      const status = oldLine && newLine ? (same ? "equal" : "changed") : oldLine ? "missing" : "added";
      const oldSourceLines = oldLine ? sourceDisplayLines(planItem.oldObject, field) : [];
      const newSourceLines = newLine ? sourceDisplayLines(planItem.newObject, field) : [];

      return makeLineMatch({
        oldLines: oldLine ? [oldLine] : [],
        newLines: newLine ? [newLine] : [],
        oldDisplayLine: displayLineFromSource(oldSourceLines, oldLine),
        newDisplayLine: displayLineFromSource(newSourceLines, newLine),
        oldSourceLines,
        newSourceLines,
        matchKey: field,
        canonicalField: field,
        status,
        reason: "canonical-field-align",
        score: same ? 100 : 0,
        fieldMatches: [{
          field,
          status,
          oldValue: oldValue ?? null,
          newValue: newValue ?? null,
          oldRawValue: oldValue ?? null,
          newRawValue: newValue ?? null,
          oldLine: oldLine || null,
          newLine: newLine || null,
        }],
      });
    })
    .filter(Boolean);
}

function hasComparableFieldOverlap(oldLine, newLine) {
  const oldFields = extractComparableFieldsFromLine(oldLine);
  const newFields = extractComparableFieldsFromLine(newLine);

  if (!oldFields.length || !newFields.length) return false;

  const newFieldNames = new Set(newFields.map((item) => item.field));

  return oldFields.some((item) => newFieldNames.has(item.field));
}

function scoreLineSimilarity(oldLine, newLine, profile = {}) {
  const oldNorm = normalizeLine(oldLine);
  const newNorm = normalizeLine(newLine);

  if (!oldNorm && !newNorm) return 0;
  if (oldNorm === newNorm) return 100;

  const semanticRule = findSemanticLineRule({
    oldLine,
    newLine,
    profile,
  });

  if (semanticRule) return 95;

  const fieldMatches = compareLineFields(oldLine, newLine);
  if (fieldMatches.some((item) => item.status === "equal")) {
    return 85;
  }

  if (hasComparableFieldOverlap(oldLine, newLine)) {
    return 65;
  }

  return 0;
}

function findBestNewLineMatch({
  oldLine,
  newUsefulLines,
  usedNewIndexes,
  profile,
}) {
  let best = null;

  newUsefulLines.forEach((newLine, index) => {
    if (usedNewIndexes.has(index)) return;

    const score = scoreLineSimilarity(oldLine, newLine, profile);
    if (!score) return;

    if (!best || score > best.score) {
      best = {
        index,
        newLine,
        score,
      };
    }
  });

  return best;
}

function getLineMatchReason(score) {
  if (score >= 100) return "normalized-line-equal";
  if (score >= 95) return "semantic-line-rule";
  if (score >= 85) return "field-value-equal";
  if (score >= 65) return "field-overlap";
  return "line-similarity";
}

function normalizeAnchorIdentity(value) {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[{};,]+$/g, "")
    .toLowerCase();
}

function getObjectAnchorIdentity(object = {}) {
  const fields = object?.fields || {};

  return normalizeAnchorIdentity(
    object?.peerIp ||
      fields.neighbor ||
      object?.prefix ||
      fields.route ||
      fields.prefix ||
      object?.ipAddress ||
      fields.ipAddress ||
      fields.interface ||
      object?.normalizedIdentity ||
      object?.sourceName ||
      ""
  );
}

function lineContainsIdentity(line = "", identity = "") {
  if (!identity) return false;

  const normalizedLine = normalizeAnchorIdentity(line)
    .replace(/[{}"]/g, " ")
    .replace(/\s+/g, " ");

  return normalizedLine.split(/\s+/).includes(identity) ||
    normalizedLine.includes(identity);
}

function firstUsefulLine(lines = []) {
  return lines.find((line) => !isIgnorableLine(line)) || "";
}

function isSameSemanticAnchor(planItem = {}, oldLine = "", newLine = "") {
  if (!oldLine || !newLine) return false;
  if (!["matched", "candidate"].includes(planItem.status)) return false;

  const oldIdentity = getObjectAnchorIdentity(planItem.oldObject);
  const newIdentity = getObjectAnchorIdentity(planItem.newObject);

  if (oldIdentity && newIdentity && oldIdentity === newIdentity) {
    return (
      lineContainsIdentity(oldLine, oldIdentity) &&
      lineContainsIdentity(newLine, newIdentity)
    );
  }

  return planItem.status === "matched";
}

function applyObjectAnchorLineCoverage(lineMatches = [], planItem = {}) {
  const oldLine = firstUsefulLine(planItem.oldLines || []);
  const newLine = firstUsefulLine(planItem.newLines || []);

  if (!isSameSemanticAnchor(planItem, oldLine, newLine)) {
    return lineMatches;
  }

  const anchorMatch = makeLineMatch({
    oldLines: [oldLine],
    newLines: [newLine],
    status: "equal",
    reason: `semantic-object-anchor:${planItem.reason || "matched"}`,
    score: 100,
    fieldMatches: compareLineFields(oldLine, newLine),
  });

  anchorMatch.semanticCovered = true;

  const withoutAnchorFragments = lineMatches.filter((lineMatch) => {
    const oldLines = Array.isArray(lineMatch.oldLines) ? lineMatch.oldLines : [];
    const newLines = Array.isArray(lineMatch.newLines) ? lineMatch.newLines : [];

    const hasOldAnchor = oldLines.includes(oldLine);
    const hasNewAnchor = newLines.includes(newLine);

    return !hasOldAnchor && !hasNewAnchor;
  });

  return [anchorMatch, ...withoutAnchorFragments];
}

export function compareObjectLines({
  oldLines = [],
  newLines = [],
  profile = {},
} = {}) {
  const oldUsefulLines = oldLines.filter((line) => !isIgnorableLine(line));
  const newUsefulLines = newLines.filter((line) => !isIgnorableLine(line));

  const results = [];
  const usedNewIndexes = new Set();

  for (const oldLine of oldUsefulLines) {
    const best = findBestNewLineMatch({
      oldLine,
      newUsefulLines,
      usedNewIndexes,
      profile,
    });

    if (best && best.score >= 65) {
      results.push(
        makeLineMatch({
          oldLines: [oldLine],
          newLines: [best.newLine],
          status: best.score >= 85 ? "equal" : "changed",
          reason: getLineMatchReason(best.score),
          score: best.score,
          fieldMatches: compareLineFields(oldLine, best.newLine),
        })
      );

      usedNewIndexes.add(best.index);
      continue;
    }

    results.push(
      makeLineMatch({
        oldLines: [oldLine],
        newLines: [],
        status: "missing",
        reason: "no-line-match",
        score: 0,
        fieldMatches: extractComparableFieldsFromLine(oldLine).map((field) => ({
          field: field.field,
          status: "missing",
          oldValue: field.value,
          newValue: null,
          oldRawValue: field.rawValue,
          newRawValue: null,
          oldLine,
          newLine: null,
        })),
      })
    );
  }

  newUsefulLines.forEach((newLine, index) => {
    if (usedNewIndexes.has(index)) return;

    results.push(
      makeLineMatch({
        oldLines: [],
        newLines: [newLine],
        status: "added",
        reason: "new-line-unmatched",
        score: 0,
        fieldMatches: extractComparableFieldsFromLine(newLine).map((field) => ({
          field: field.field,
          status: "added",
          oldValue: null,
          newValue: field.value,
          oldRawValue: null,
          newRawValue: field.rawValue,
          oldLine: null,
          newLine,
        })),
      })
    );
  });

  return results;
}

export function compareObjectPlanLines(planItem, profile = {}) {
  if (!planItem) return [];

  if (hasCanonicalFieldRows(planItem)) {
    return compareCanonicalFieldRows(planItem);
  }

  if (planItem.status === "old-only") {
    return compareObjectLines({
      oldLines: planItem.oldLines || [],
      newLines: [],
    });
  }

  if (planItem.status === "new-only") {
    return compareObjectLines({
      oldLines: [],
      newLines: planItem.newLines || [],
    });
  }

  const lineMatches = compareObjectLines({
    oldLines: planItem.oldLines || [],
    newLines: planItem.newLines || [],
    profile,
  });

  return applyObjectAnchorLineCoverage(lineMatches, planItem);
}

export function attachLineMatchesToPlan(plan = []) {
  return plan.map((item) => ({
    ...item,
    lineMatches: compareObjectPlanLines(item),
  }));
}
