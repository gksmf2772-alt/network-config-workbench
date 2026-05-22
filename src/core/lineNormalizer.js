// src/core/lineNormalizer.js

import { normalizeIpv4Prefix } from "./utils/ipUtils.js";

function stripQuotes(value) {
  return String(value || "").replace(/^["']|["']$/g, "").trim();
}

function normalizeBasicText(line) {
  return String(line || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeDescriptionLine(line) {
  const trimmed = String(line || "").trim();

  const match = trimmed.match(/^description\s+(.+)$/i);
  if (!match) return null;

  return `description ${stripQuotes(match[1])}`.toLowerCase();
}

function normalizeAdminStateLine(line) {
  const normalized = normalizeBasicText(line);

  if (normalized === "no shutdown") return "admin-state enabled";
  if (normalized === "admin-state enable") return "admin-state enabled";

  if (normalized === "shutdown") return "admin-state disabled";
  if (normalized === "admin-state disable") return "admin-state disabled";

  return null;
}

function normalizeIpAddressLine(line) {
  const trimmed = String(line || "").trim();

  const ciscoIpv4 = trimmed.match(/^ip\s+address\s+(\S+)\s+(\S+)$/i);
  if (ciscoIpv4) {
    const prefix = normalizeIpv4Prefix(ciscoIpv4[1], ciscoIpv4[2]);
    if (prefix) return `address ${prefix}`.toLowerCase();
  }

  const nokiaAddress = trimmed.match(/^address\s+(\S+)$/i);
  if (nokiaAddress) {
    return `address ${nokiaAddress[1]}`.toLowerCase();
  }

  return null;
}

function normalizeNeighborLine(line) {
  const trimmed = String(line || "").trim();
  const neighbor = trimmed.match(/^neighbor\s+"?([^"\s{]+)"?/i);

  if (!neighbor) return null;

  return `neighbor ${stripQuotes(neighbor[1])}`.toLowerCase();
}

export function normalizeComparableLine(line) {
  const description = normalizeDescriptionLine(line);
  if (description) return description;

  const adminState = normalizeAdminStateLine(line);
  if (adminState) return adminState;

  const ipAddress = normalizeIpAddressLine(line);
  if (ipAddress) return ipAddress;

  const neighbor = normalizeNeighborLine(line);
  if (neighbor) return neighbor;

  return normalizeBasicText(line)
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ");
}
