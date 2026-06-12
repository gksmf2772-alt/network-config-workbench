import {
  canonicalizeInterfaceName,
  canonicalizeLagNumber,
  canonicalizePortName,
  normalizeDeviceId,
  normalizeVrf,
} from "./canonicalInterface.js";
import { NodeKind } from "./types.js";

function idPart(value = "") {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "_");
}

export function makeCanonicalId(kind, parts = []) {
  return [kind, ...parts.map(idPart)].join("|");
}

export function canonicalPortId({ deviceId, name }) {
  return makeCanonicalId(NodeKind.PORT, [
    normalizeDeviceId(deviceId),
    canonicalizePortName(name),
  ]);
}

export function canonicalLagId({ deviceId, lag }) {
  return makeCanonicalId(NodeKind.LAG, [
    normalizeDeviceId(deviceId),
    canonicalizeLagNumber(lag),
  ]);
}

export function canonicalL3InterfaceId({ deviceId, vrf, name }) {
  return makeCanonicalId(NodeKind.L3_INTERFACE, [
    normalizeDeviceId(deviceId),
    normalizeVrf(vrf),
    canonicalizeInterfaceName(name),
  ]);
}

export function canonicalPeerNhId({ deviceId, vrf, ip }) {
  return makeCanonicalId(NodeKind.PEER_NH, [
    normalizeDeviceId(deviceId),
    normalizeVrf(vrf),
    String(ip || "").trim(),
  ]);
}

export function canonicalStaticRouteId({ deviceId, vrf, prefix, nextHop }) {
  return makeCanonicalId(NodeKind.STATIC_ROUTE, [
    normalizeDeviceId(deviceId),
    normalizeVrf(vrf),
    String(prefix || "").trim(),
    String(nextHop || "").trim() || "none",
  ]);
}

export function canonicalBgpNeighborId({ deviceId, vrf, neighborIp }) {
  return makeCanonicalId(NodeKind.BGP_NEIGHBOR, [
    normalizeDeviceId(deviceId),
    normalizeVrf(vrf),
    String(neighborIp || "").trim(),
  ]);
}

export function canonicalPimId({ deviceId, vrf, interfaceName, neighborIp = "" }) {
  return makeCanonicalId(NodeKind.PIM, [
    normalizeDeviceId(deviceId),
    normalizeVrf(vrf),
    canonicalizeInterfaceName(interfaceName),
    String(neighborIp || "").trim() || "enabled",
  ]);
}

export function canonicalPimNeighborId({ deviceId, vrf, interfaceName, neighborIp }) {
  return makeCanonicalId(NodeKind.PIM_NEIGHBOR, [
    normalizeDeviceId(deviceId),
    normalizeVrf(vrf),
    canonicalizeInterfaceName(interfaceName),
    String(neighborIp || "").trim(),
  ]);
}
