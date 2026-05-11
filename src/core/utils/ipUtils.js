// src/core/utils/ipUtils.js

export function ipv4MaskToPrefix(mask) {
  if (!mask) return null;

  const parts = String(mask)
    .trim()
    .split(".")
    .map((part) => Number(part));

  if (parts.length !== 4) return null;

  let bits = "";

  for (const part of parts) {
    if (Number.isNaN(part) || part < 0 || part > 255) {
      return null;
    }

    bits += part.toString(2).padStart(8, "0");
  }

  const prefix = bits.indexOf("0");

  if (prefix === -1) return 32;

  return prefix;
}

export function normalizeIpv4Prefix(ipAddress, mask) {
  if (!ipAddress || !mask) return null;

  const prefixLength = ipv4MaskToPrefix(mask);

  if (prefixLength == null) return null;

  return `${ipAddress}/${prefixLength}`;
}