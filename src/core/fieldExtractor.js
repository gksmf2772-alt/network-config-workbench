// src/core/fieldExtractor.js

import { normalizeIpv4Prefix } from "./utils/ipUtils.js";

function stripQuotes(value) {
  return String(value || "").replace(/^["']|["']$/g, "").trim();
}

export function extractComparableFieldsFromLine(line) {
  const trimmed = String(line || "").trim();
  const fields = [];
  const addField = (field, value, rawValue = value) => {
    const cleanValue = stripQuotes(value);
    if (!field || !cleanValue) return;
    if (fields.some((item) => item.field === field && item.value === cleanValue)) return;
    fields.push({
      field,
      value: cleanValue,
      rawValue,
      rawLine: line,
    });
  };

  const mdCliOneLine = trimmed.replace(/^\/configure\s*\{\s*/i, "").replace(/\s*\}\s*$/i, "");
  if (/^router\s+"?[^"\s{}]+"?\s+static-routes\s+route\b/i.test(mdCliOneLine)) {
    addField("route", mdCliOneLine.match(/\broute\s+"?([^"\s{}]+)"?/i)?.[1]);
    addField("next-hop", mdCliOneLine.match(/\bnext-hop\s+"?([^"\s{}]+)"?/i)?.[1]);
    addField("metric", mdCliOneLine.match(/\bmetric\s+([^"\s{}]+)/i)?.[1]);
    addField("tag", mdCliOneLine.match(/\btag\s+([^"\s{}]+)/i)?.[1]);
    addField("description", mdCliOneLine.match(/\bdescription\s+"([^"]+)"/i)?.[1]);
    if (/\badmin-state\s+enable\b/i.test(mdCliOneLine)) {
      addField("admin-state", "enabled", "admin-state enable");
      addField("state", "enabled", "admin-state enable");
    }
    if (/\badmin-state\s+disable\b/i.test(mdCliOneLine)) {
      addField("admin-state", "disabled", "admin-state disable");
      addField("state", "disabled", "admin-state disable");
    }
  }

  if (/^router\s+"?[^"\s{}]+"?\s+bgp\s+neighbor\b/i.test(mdCliOneLine)) {
    addField("neighbor", mdCliOneLine.match(/\bneighbor\s+"?([^"\s{}]+)"?/i)?.[1]);
    addField("description", mdCliOneLine.match(/\bdescription\s+"([^"]+)"/i)?.[1]);
    addField("group", mdCliOneLine.match(/\bgroup\s+"([^"]+)"/i)?.[1]);
    addField("authentication-key", mdCliOneLine.match(/\bauthentication-key\s+"?([^"\s{}]+)"?/i)?.[1]);
    addField("peer-as", mdCliOneLine.match(/\b(?:peer-as|remote-as)\s+([^"\s{}]+)/i)?.[1]);
    if (/\badmin-state\s+enable\b/i.test(mdCliOneLine)) {
      addField("admin-state", "enabled", "admin-state enable");
      addField("state", "enabled", "admin-state enable");
    }
    if (/\badmin-state\s+disable\b/i.test(mdCliOneLine)) {
      addField("admin-state", "disabled", "admin-state disable");
      addField("state", "disabled", "admin-state disable");
    }
  }

  const description = trimmed.match(/^description\s+(.+)$/i);
  if (description) {
    fields.push({
      field: "description",
      value: stripQuotes(description[1]),
      rawValue: description[1],
      rawLine: line,
    });
  }

  const ciscoIp = trimmed.match(/^ip\s+address\s+(\S+)\s+(\S+)$/i);
  if (ciscoIp) {
    fields.push({
      field: "address",
      value: normalizeIpv4Prefix(ciscoIp[1], ciscoIp[2]) || `${ciscoIp[1]}/${ciscoIp[2]}`,
      rawValue: `${ciscoIp[1]} ${ciscoIp[2]}`,
      rawLine: line,
    });
  }

  const nokiaAddress = trimmed.match(/^address\s+(\S+)$/i);
  if (nokiaAddress) {
    fields.push({
      field: "address",
      value: nokiaAddress[1],
      rawValue: nokiaAddress[1],
      rawLine: line,
    });
  }

  if (/^no\s+shutdown$/i.test(trimmed) || /^admin-state\s+enable$/i.test(trimmed)) {
    fields.push({
      field: "admin-state",
      value: "enabled",
      rawValue: trimmed,
      rawLine: line,
    });

    fields.push({
      field: "state",
      value: "enabled",
      rawValue: trimmed,
      rawLine: line,
    });
  }

  if (/^shutdown$/i.test(trimmed) || /^admin-state\s+disable$/i.test(trimmed)) {
    fields.push({
      field: "admin-state",
      value: "disabled",
      rawValue: trimmed,
      rawLine: line,
    });

    fields.push({
      field: "state",
      value: "disabled",
      rawValue: trimmed,
      rawLine: line,
    });
  }

  const ciscoStaticRoute = trimmed.match(
    /^ip\s+route\s+(\S+)\s+(\S+)\s+(\S+)(.*)$/i
  );

  if (ciscoStaticRoute) {
    const [, destination, mask, nextHop, rest] = ciscoStaticRoute;
    const prefix = normalizeIpv4Prefix(destination, mask);

    fields.push({
      field: "route",
      value: prefix || `${destination}/${mask}`,
      rawValue: `${destination} ${mask}`,
      rawLine: line,
    });

    fields.push({
      field: "next-hop",
      value: nextHop,
      rawValue: nextHop,
      rawLine: line,
    });

    const tag = rest.match(/\btag\s+(\S+)/i);
    if (tag) {
      fields.push({
        field: "tag",
        value: tag[1],
        rawValue: tag[1],
        rawLine: line,
      });
    }
  }

  const nokiaStaticRoute = trimmed.match(
    /^route\s+"?([^"\s{]+)"?(?:\s+route-type\s+\S+)?\s*\{/i
  );

  if (nokiaStaticRoute) {
    fields.push({
      field: "route",
      value: nokiaStaticRoute[1],
      rawValue: nokiaStaticRoute[1],
      rawLine: line,
    });
  }

  const nokiaNextHop = trimmed.match(/^next-hop\s+"?([^"\s{]+)"?/i);
  if (nokiaNextHop) {
    fields.push({
      field: "next-hop",
      value: nokiaNextHop[1],
      rawValue: nokiaNextHop[1],
      rawLine: line,
    });
  }

  const tagLine = trimmed.match(/^tag\s+(\S+)$/i);
  if (tagLine) {
    fields.push({
      field: "tag",
      value: tagLine[1],
      rawValue: tagLine[1],
      rawLine: line,
    });
  }

  const peerAs = trimmed.match(/^(?:peer-as|remote-as)\s+(\S+)$/i);
  if (peerAs) {
    fields.push({
      field: "peer-as",
      value: peerAs[1],
      rawValue: peerAs[1],
      rawLine: line,
    });
  }

  const neighbor = trimmed.match(/^neighbor\s+"?([^"\s{]+)"?/i);
  if (neighbor) {
    fields.push({
      field: "neighbor",
      value: stripQuotes(neighbor[1]),
      rawValue: neighbor[1],
      rawLine: line,
    });
  }

  return fields;
}

export function compareLineFields(oldLine, newLine) {
  const oldFields = extractComparableFieldsFromLine(oldLine);
  const newFields = extractComparableFieldsFromLine(newLine);

  const matches = [];
  const usedNewIndexes = new Set();

  for (const oldField of oldFields) {
    const equalIndex = newFields.findIndex((candidate, index) => {
      if (usedNewIndexes.has(index)) return false;

      return (
        candidate.field === oldField.field &&
        candidate.value === oldField.value
      );
    });

    if (equalIndex >= 0) {
      const newField = newFields[equalIndex];

      matches.push({
        field: oldField.field,
        status: "equal",
        oldValue: oldField.value,
        newValue: newField.value,
        oldRawValue: oldField.rawValue,
        newRawValue: newField.rawValue,
        oldLine,
        newLine,
      });

      usedNewIndexes.add(equalIndex);
      continue;
    }

    const changedIndex = newFields.findIndex((candidate, index) => {
      if (usedNewIndexes.has(index)) return false;

      return candidate.field === oldField.field;
    });

    if (changedIndex >= 0) {
      const newField = newFields[changedIndex];

      matches.push({
        field: oldField.field,
        status: "changed",
        oldValue: oldField.value,
        newValue: newField.value,
        oldRawValue: oldField.rawValue,
        newRawValue: newField.rawValue,
        oldLine,
        newLine,
      });

      usedNewIndexes.add(changedIndex);
      continue;
    }

    matches.push({
      field: oldField.field,
      status: "missing",
      oldValue: oldField.value,
      newValue: null,
      oldRawValue: oldField.rawValue,
      newRawValue: null,
      oldLine,
      newLine: null,
    });
  }

  newFields.forEach((newField, index) => {
    if (usedNewIndexes.has(index)) return;

    matches.push({
      field: newField.field,
      status: "added",
      oldValue: null,
      newValue: newField.value,
      oldRawValue: null,
      newRawValue: newField.rawValue,
      oldLine: null,
      newLine,
    });
  });

  return matches;
}
