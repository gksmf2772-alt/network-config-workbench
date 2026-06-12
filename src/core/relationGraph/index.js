export {
  NodeKind,
  RelationKind,
  DiagnosticKind,
  DIRECT_RELATION_ENDPOINTS,
  createCanonicalNode,
  createGraphEdge,
  createGraphDiagnostic,
  isDirectRelationAllowed,
} from "./types.js";

export {
  canonicalizeInterfaceName,
  canonicalizeLagNumber,
  canonicalizePortName,
  evidenceFromObject,
  graphValueList,
  normalizeDeviceId,
  normalizeVrf,
  objectFields,
  objectType,
  objectVrf,
} from "./canonicalInterface.js";

export {
  canonicalBgpNeighborId,
  canonicalLagId,
  canonicalL3InterfaceId,
  canonicalPeerNhId,
  canonicalPimId,
  canonicalPimNeighborId,
  canonicalPortId,
  canonicalStaticRouteId,
  makeCanonicalId,
} from "./canonicalIds.js";

export {
  buildCanonicalGraph,
  createCanonicalGraphContext,
  staticRouteNextHops,
} from "./canonicalGraphBuilder.js";

export {
  resolveBgpRelations,
  resolveInterfacePeerRelations,
  resolveLagInterfaceRelations,
  resolvePimRelations,
  resolvePortLagRelations,
  resolveStaticRouteRelations,
} from "./relationResolver.js";

export {
  cidrContainsIp,
  connectedSubnetContainsIp,
  isIPv4,
  normalizeIp,
  parseIPv4Cidr,
  peerIpsFromInterfaceAddress,
  prefixContainsIp,
} from "./ipUtils.js";

export {
  buildCanonicalViewGraph,
  COLUMN_LAYOUT,
  COLUMN_SERVICES,
  ROW_GAP,
  ROW_HEIGHT,
  ViewMode,
  VIEW_COLUMN_X,
  computeColumnLayout,
  normalizeViewMode,
} from "./viewGraph.js";
