const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export function normalizeIp(value = "") {
  const text = String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[{}]/g, "");
  const match = text.match(/\d{1,3}(?:\.\d{1,3}){3}/);
  return match ? match[0] : "";
}

export function isIPv4(value = "") {
  const ip = normalizeIp(value);
  if (!IPV4_RE.test(ip)) return false;
  return ip.split(".").every((part) => {
    const number = Number(part);
    return Number.isInteger(number) && number >= 0 && number <= 255;
  });
}

export function ipv4ToInt(value = "") {
  const ip = normalizeIp(value);
  if (!isIPv4(ip)) return null;
  return ip
    .split(".")
    .reduce((result, part) => ((result << 8) + Number(part)) >>> 0, 0);
}

export function intToIPv4(value) {
  const number = Number(value) >>> 0;
  return [
    (number >>> 24) & 255,
    (number >>> 16) & 255,
    (number >>> 8) & 255,
    number & 255,
  ].join(".");
}

function prefixMask(prefixLength) {
  if (prefixLength <= 0) return 0;
  return (0xffffffff << (32 - prefixLength)) >>> 0;
}

export function parseIPv4Cidr(value = "") {
  const text = String(value ?? "").trim();
  const match = text.match(/(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?/);
  if (!match) return null;

  const ip = normalizeIp(match[1]);
  const prefixLength = match[2] == null ? 32 : Number(match[2]);
  const ipInt = ipv4ToInt(ip);
  if (ipInt == null || !Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return null;
  }

  const mask = prefixMask(prefixLength);
  const network = ipInt & mask;
  const broadcast = network | (~mask >>> 0);
  return {
    ip,
    ipInt,
    prefixLength,
    network: network >>> 0,
    broadcast: broadcast >>> 0,
    mask,
  };
}

export function cidrContainsIp(cidrValue = "", ipValue = "") {
  const cidr = parseIPv4Cidr(cidrValue);
  const ipInt = ipv4ToInt(ipValue);
  if (!cidr || ipInt == null) return false;
  return (ipInt & cidr.mask) >>> 0 === cidr.network;
}

export function connectedSubnetContainsIp(interfaceAddress = "", ipValue = "") {
  const cidr = parseIPv4Cidr(interfaceAddress);
  const ipInt = ipv4ToInt(ipValue);
  if (!cidr || ipInt == null || cidr.prefixLength >= 32) return false;
  return (ipInt & cidr.mask) >>> 0 === cidr.network;
}

export function peerIpsFromInterfaceAddress(interfaceAddress = "") {
  const cidr = parseIPv4Cidr(interfaceAddress);
  if (!cidr) return [];

  if (cidr.prefixLength === 31) {
    const peerInt = cidr.ipInt === cidr.network ? cidr.broadcast : cidr.network;
    return [intToIPv4(peerInt)];
  }

  if (cidr.prefixLength === 30) {
    const firstHost = (cidr.network + 1) >>> 0;
    const secondHost = (cidr.broadcast - 1) >>> 0;
    if (cidr.ipInt === firstHost) return [intToIPv4(secondHost)];
    if (cidr.ipInt === secondHost) return [intToIPv4(firstHost)];
  }

  return [];
}

export function prefixContainsIp(prefix = "", ipValue = "") {
  return cidrContainsIp(prefix, ipValue);
}
