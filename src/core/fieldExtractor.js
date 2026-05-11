// src/core/fieldExtractor.js

import { normalizeIpv4Prefix } from "./utils/ipUtils.js";

function stripQuotes(value) {
  return String(value || "").replace(/^["']|["']$/g, "").trim();
}

export function extractComparableFieldsFromLine(line) {
  const trimmed = String(line || "").trim();
  const fields = [];

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
  }

  if (/^shutdown$/i.test(trimmed) || /^admin-state\s+disable$/i.test(trimmed)) {
    fields.push({
      field: "admin-state",
      value: "disabled",
      rawValue: trimmed,
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