// src/core/matchers/objectMatcher.js

import { resolveBgpEffectiveObjects } from "../bgpEffectiveResolver.js";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\/_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeDescription(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];

  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeDescriptionEndpoint(value = "") {
  const normalized = String(value || "")
    .trim()
    .replace(/^#+|#+$/g, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

  return normalizeKnownEndpointTypos(normalized.replace(/^(?:to|from|via)-(?=[a-z0-9])/i, ""));
}

function isLikelyDescriptionEndpoint(segment = "") {
  const normalized = normalizeDescriptionEndpoint(segment);
  if (!normalized) return false;
  if (!/[a-z]/i.test(normalized) || !/\d/.test(normalized)) return false;
  if (!normalized.includes("-")) return false;
  if (/^(to|from|via)$/i.test(normalized)) return false;
  if (/^(lag|port|po|te|gi|ge|xe|et|eth|ethernet|ae)[-_/]?\w*/i.test(normalized)) {
    return false;
  }
  if (/^(stby|sby|standby|active|fiber)$/i.test(normalized)) return false;

  return true;
}

function normalizeDescriptionToken(value = "") {
  const normalized = String(value || "")
    .trim()
    .replace(/^#+|#+$/g, "")
    .replace(/^["']|["']$/g, "")
    .replace(/[.,]+$/g, "")
    .toLowerCase();

  return normalizeKnownEndpointTypos(normalized.replace(/^(?:to|from|via)-(?=[a-z0-9])/i, ""));
}

function normalizeKnownEndpointTypos(value = "") {
  return String(value || "").replace(/\bganbuk\b/g, "gangbuk");
}

function isLikelyEndpointDeviceToken(token = "") {
  const normalized = normalizeDescriptionToken(token);
  if (!isLikelyDescriptionEndpoint(normalized)) return false;
  if (normalized.includes("_")) return false;
  return true;
}

function endpointPortTokenCandidates(token = "") {
  const normalized = normalizeDescriptionToken(token);
  const candidates = new Set();

  for (const match of normalized.matchAll(/\(([^()]+)\)/g)) {
    for (const candidate of endpointPortTokenCandidates(match[1])) {
      candidates.add(candidate);
    }
  }

  const match = normalized.match(/^(te|xe|ge|gi|et|fe|eth|ethernet)-?(\d+(?:\/\d+){1,4})$/i);
  if (match) {
    const prefixAliases = {
      ethernet: "eth",
    };
    const prefix = prefixAliases[match[1].toLowerCase()] || match[1].toLowerCase();
    candidates.add(`${prefix}${match[2]}`);
    candidates.add(match[2]);
  }

  const numericMatch = normalized.match(/^(\d+(?:\/\d+){1,4})$/);
  if (numericMatch) {
    candidates.add(numericMatch[1]);
  }

  return [...candidates];
}

function descriptionTokenGroups(description = "") {
  return String(description || "")
    .replace(/^["']|["']$/g, "")
    .replace(/^#+|#+$/g, "")
    .split(/[,;]+/)
    .map((segment) =>
      segment
        .trim()
        .replace(/^#+|#+$/g, "")
        .split(/[\s_]+/)
        .map(normalizeDescriptionToken)
        .filter(Boolean)
    )
    .filter((tokens) => tokens.length);
}

function addCompositeEndpointCandidates(candidates, tokens = []) {
  const deviceTokens = tokens.filter(isLikelyEndpointDeviceToken);
  const portTokens = tokens.flatMap(endpointPortTokenCandidates).filter(Boolean);

  for (const deviceToken of deviceTokens) {
    for (const portToken of portTokens) {
      candidates.add(`${normalizeDescriptionEndpoint(deviceToken)}|${portToken}`);
    }
  }
}

function descriptionCompositeEndpointCandidates(description = "") {
  const groups = descriptionTokenGroups(description);
  const candidates = new Set();

  groups.forEach((tokens, index) => {
    addCompositeEndpointCandidates(candidates, tokens);

    const nextTokens = groups[index + 1] || [];
    if (nextTokens.length) {
      addCompositeEndpointCandidates(candidates, [...tokens, ...nextTokens]);
    }
  });

  return [...candidates];
}

function descriptionSplitEndpointCandidates(description = "") {
  const candidates = new Set();

  for (const tokens of descriptionTokenGroups(description)) {
    const portTokens = tokens.flatMap(endpointPortTokenCandidates);
    if (portTokens.length) continue;

    for (const deviceToken of tokens.filter(isLikelyEndpointDeviceToken)) {
      candidates.add(normalizeDescriptionEndpoint(deviceToken));
    }
  }

  return [...candidates];
}

function descriptionEndpointCandidates(description = "") {
  const cleanDescription = String(description || "")
    .replace(/^["']|["']$/g, "")
    .replace(/^#+|#+$/g, "");

  const segments = cleanDescription
    .split(/[,;]+/)
    .flatMap((segment) => {
      const cleanSegment = segment.trim().replace(/^#+|#+$/g, "");
      return [
        cleanSegment,
        ...cleanSegment.split(/\s+/),
      ];
    });

  const candidates = new Set(segments
    .map((segment) => segment.trim().replace(/^#+|#+$/g, ""))
    .filter(isLikelyDescriptionEndpoint)
    .map(normalizeDescriptionEndpoint));

  for (const endpoint of descriptionCompositeEndpointCandidates(cleanDescription)) {
    candidates.add(endpoint);
  }

  for (const endpoint of descriptionSplitEndpointCandidates(cleanDescription)) {
    candidates.add(endpoint);
  }

  return [...candidates];
}

function sharedDescriptionEndpoint(oldDescription = "", newDescription = "") {
  const oldEndpoints = descriptionEndpointCandidates(oldDescription);
  const newEndpointSet = new Set(descriptionEndpointCandidates(newDescription));

  return oldEndpoints.find((endpoint) => newEndpointSet.has(endpoint)) || null;
}

function tokenWeight(token) {
  if (!token) return 0;

  // 숫자, 포트번호, 순번성 토큰은 낮은 가중치
  if (/^\d+$/.test(token)) return 0.2;
  if (/^\d+\/\d+(\/\d+)?$/.test(token)) return 0.2;
  if (/^(gi|te|eth|ethernet|xe|ge|et|po|port|lag|ae)\d*/i.test(token)) {
    return 0.3;
  }

  // 장비명/서비스명/위치명 가능성이 높은 토큰
  if (/^(kt|pe|ce|core|leaf|spine|border|uplink|downlink|svc|service|internet|vpn|mpls|to)$/i.test(token)) {
    return 1.5;
  }

  return 1.0;
}

export function descriptionSimilarity(oldDescription, newDescription) {
  const oldTokens = tokenizeDescription(oldDescription);
  const newTokens = tokenizeDescription(newDescription);

  if (!oldTokens.length || !newTokens.length) return 0;

  const oldSet = new Set(oldTokens);
  const newSet = new Set(newTokens);
  const union = new Set([...oldTokens, ...newTokens]);

  let intersectionWeight = 0;
  let unionWeight = 0;

  for (const token of union) {
    const weight = tokenWeight(token);
    unionWeight += weight;

    if (oldSet.has(token) && newSet.has(token)) {
      intersectionWeight += weight;
    }
  }

  if (!unionWeight) return 0;

  return Math.round((intersectionWeight / unionWeight) * 100);
}

function isSameType(oldObject, newObject) {
  return oldObject?.normalizedType === newObject?.normalizedType;
}

function makeMatch({
  oldObject,
  newObject,
  status,
  reason,
  score = null,
  matchKeyFields = [],
  scoreReasons = [],
  ambiguousAlternatives = [],
}) {
  return {
    oldObject: oldObject || null,
    newObject: newObject || null,
    status,
    reason,
    score,
    matchKeyFields,
    scoreReasons,
    ambiguousAlternatives,
  };
}

function activeComparableObjects(objects = []) {
  return resolveBgpEffectiveObjects(objects || [], { includeMetadataObjects: false })
    .filter((object) => !object.metadataOnly);
}

function getObjectKey(object = {}) {
  const type = object?.normalizedType || object?.sourceType || "";
  return [
    object?.id,
    object?.key,
    object?.normalizedIdentity,
    object?.sourceName,
    getFieldValue(object, type),
    getFieldValue(object, "port"),
    getFieldValue(object, "lag"),
    getFieldValue(object, "sap"),
  ]
    .filter(Boolean)
    .map((item) => normalizeIdentityToken(item));
}

function matchesObjectRef(object = {}, ref = "") {
  const normalizedRef = normalizeIdentityToken(ref);
  if (!normalizedRef) return false;
  return getObjectKey(object).includes(normalizedRef);
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function collectObjectAliases(profile = {}) {
  return [
    ...asArray(profile.objectAliases),
    ...asArray(profile.objectAliasPolicy?.aliases),
    ...asArray(profile.aliasPolicies?.objectAliases),
    ...asArray(profile.aliases?.objects),
  ].filter(Boolean);
}

function findObjectAliasMatch(oldObject, candidates = [], profile = {}) {
  const aliases = collectObjectAliases(profile);
  if (!aliases.length) return null;

  for (const alias of aliases) {
    const objectType = alias.objectType || alias.type || alias.normalizedType || "";
    if (objectType && objectType !== oldObject.normalizedType) continue;

    const oldRef =
      alias.oldId ||
      alias.oldObjectId ||
      alias.oldKey ||
      alias.old ||
      alias.from ||
      alias.source;
    if (!matchesObjectRef(oldObject, oldRef)) continue;

    const newRef =
      alias.newId ||
      alias.newObjectId ||
      alias.newKey ||
      alias.new ||
      alias.to ||
      alias.target;
    const newObject = candidates.find((candidate) => matchesObjectRef(candidate, newRef));
    if (!newObject) continue;

    return makeMatch({
      oldObject,
      newObject,
      status: "matched",
      reason: alias.reason || "object-alias-policy",
      score: Number(alias.confidence || alias.score || 100),
      matchKeyFields: ["object-alias"],
      scoreReasons: ["object-alias-policy"],
    });
  }

  return null;
}

function canUseNormalizedIdentityAsStrongMatch(object = {}) {
  const type = object.normalizedType;

  // 벤더 간 장비 교체에서는 port/lag/interface 이름은 신뢰도가 낮다.
  // L3 interface는 prefix/ipAddress가 이미 위에서 강매칭된다.
  if (["port", "lag", "interface", "static-route"].includes(type)) {
    return false;
  }

  return true;
}

function findIdentityMatch(oldObject, candidates) {
  const normalizedIdentityMatches = [];

  for (const newObject of candidates) {
    if (!isSameType(oldObject, newObject)) continue;

    if (oldObject.normalizedType === "interface") {
      if (!hasCompatibleInterfaceContext(oldObject, newObject)) {
        continue;
      }

      if (
        oldObject.prefix &&
        newObject.prefix &&
        oldObject.prefix === newObject.prefix
      ) {
        return makeMatch({
          oldObject,
          newObject,
          status: "matched",
          reason: "prefix",
          score: 100,
          matchKeyFields: ["prefix"],
          scoreReasons: ["prefix"],
        });
      }

      if (
        oldObject.ipAddress &&
        newObject.ipAddress &&
        oldObject.ipAddress === newObject.ipAddress
      ) {
        return makeMatch({
          oldObject,
          newObject,
          status: "matched",
          reason: "ip-address",
          score: 100,
          matchKeyFields: ["ipAddress"],
          scoreReasons: ["ip-address"],
        });
      }
    }

    if (oldObject.normalizedType === "static-route") {
      if (!hasCompatibleStaticRouteContext(oldObject, newObject)) {
        continue;
      }

      const oldPrefix = getStaticRoutePrefix(oldObject);
      const newPrefix = getStaticRoutePrefix(newObject);
      const oldNextHop = getStaticRouteNextHop(oldObject);
      const newNextHop = getStaticRouteNextHop(newObject);

      if (
        oldPrefix &&
        newPrefix &&
        oldPrefix === newPrefix &&
        oldNextHop &&
        newNextHop &&
        oldNextHop === newNextHop
      ) {
        return makeMatch({
          oldObject,
          newObject,
          status: "matched",
          reason: "prefix-next-hop",
          score: 100,
          matchKeyFields: ["prefix", "next-hop"],
          scoreReasons: ["prefix", "next-hop", "static-route-exact-identity"],
        });
      }

      continue;
    }

    if (oldObject.normalizedType === "bgp") {
      if (
        oldObject.peerIp &&
        newObject.peerIp &&
        oldObject.peerIp === newObject.peerIp
      ) {
        const groupBased = Boolean(newObject.bgpInheritance?.groupReference);
        return makeMatch({
          oldObject,
          newObject,
          status: "matched",
          reason: groupBased ? "peer-ip-mdcli-group-structure" : "peer-ip",
          score: 100,
          matchKeyFields: groupBased ? ["peerIp", "group"] : ["peerIp"],
          scoreReasons: groupBased
            ? ["same-peer-ip", "mdcli-group-based-neighbor", "structure-conversion-from-classic-direct"]
            : ["peer-ip"],
        });
      }
    }

    if (oldObject.normalizedType === "pim") {
      const oldPimInterface = getPimInterfaceIdentity(oldObject);
      const newPimInterface = getPimInterfaceIdentity(newObject);
      const normalizedOldPimInterface = normalizeKnownIdentityTypos(oldPimInterface);
      const normalizedNewPimInterface = normalizeKnownIdentityTypos(newPimInterface);

      if (
        oldPimInterface &&
        newPimInterface &&
        oldPimInterface !== newPimInterface &&
        normalizedOldPimInterface &&
        normalizedOldPimInterface === normalizedNewPimInterface
      ) {
        return makeMatch({
          oldObject,
          newObject,
          status: "matched",
          reason: "pim-interface-known-typo",
          score: 95,
          matchKeyFields: ["interface"],
          scoreReasons: ["pim-interface-known-typo-normalized"],
        });
      }
    }

    if (
      canUseNormalizedIdentityAsStrongMatch(oldObject) &&
      oldObject.normalizedIdentity &&
      newObject.normalizedIdentity &&
      oldObject.normalizedIdentity === newObject.normalizedIdentity
    ) {
      normalizedIdentityMatches.push(newObject);
    }
  }

  if (!normalizedIdentityMatches.length) {
    return null;
  }

  if (normalizedIdentityMatches.length > 1) {
    return makeMatch({
      oldObject,
      newObject: normalizedIdentityMatches[0],
      status: "candidate",
      reason: "ambiguous-normalized-identity",
      score: 95,
      matchKeyFields: ["normalizedIdentity"],
      scoreReasons: [
        "normalized-identity",
        "ambiguous-candidates",
      ],
      ambiguousAlternatives: normalizedIdentityMatches.map((item) => ({
        id: item.id,
        sourceName: item.sourceName,
        normalizedIdentity: item.normalizedIdentity,
        score: 95,
        reason: "normalized-identity",
      })),
    });
  }

  return makeMatch({
    oldObject,
    newObject: normalizedIdentityMatches[0],
    status: "matched",
    reason: "normalized-identity",
    score: 95,
    matchKeyFields: ["normalizedIdentity"],
    scoreReasons: ["normalized-identity"],
  });
}

function getFieldValue(object, field) {
  if (!object) return null;

  if (object[field] !== undefined && object[field] !== null) {
    return object[field];
  }

  const fieldValue = object.fields?.[field];

  if (fieldValue && typeof fieldValue === "object" && "value" in fieldValue) {
    return fieldValue.value;
  }

  return fieldValue ?? null;
}

function normalizeValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase();
}

function isNokiaGreSourcePrimaryConversion(oldObject = {}, newObject = {}) {
  const oldInterface = normalizeValue(getFieldValue(oldObject, "interface") || oldObject.sourceName);
  const newInterface = normalizeValue(getFieldValue(newObject, "interface") || newObject.sourceName);

  return oldObject.vendor === "nokia-classic" &&
    newObject.vendor === "nokia-md-cli" &&
    oldInterface === "gre-source" &&
    newInterface === "gre-source-1";
}

function normalizeIdentityToken(value) {
  return normalizeValue(value).replace(/[{};,]+$/g, "");
}

function normalizeKnownIdentityTypos(value = "") {
  return normalizeKnownEndpointTypos(normalizeIdentityToken(value));
}

function getPimInterfaceIdentity(object = {}) {
  return normalizeIdentityToken(
    getFieldValue(object, "interface") ||
    object?.normalizedIdentity ||
    object?.sourceName ||
    object?.name
  );
}

function normalizeLagReference(value = "") {
  return normalizeIdentityToken(value).split(":")[0];
}

function getSimpleDescriptionReference(object = {}) {
  const rawDescription = getFieldValue(object, "description") || object.description || "";
  const cleanDescription = String(rawDescription || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^#+|#+$/g, "")
    .trim();

  if (!/^[a-z0-9][a-z0-9._#-]*$/i.test(cleanDescription)) return "";
  return normalizeIdentityToken(cleanDescription);
}

function getInterfaceIdentity(object = {}) {
  return normalizeIdentityToken(
    getFieldValue(object, "interface") ||
    object?.normalizedIdentity ||
    object?.sourceName ||
    object?.name
  );
}

function findLagServiceInterfaceSapMatch(oldObject, newObjects = [], usedNewIds = new Set()) {
  if (oldObject?.normalizedType !== "lag") return null;

  const serviceInterface = getSimpleDescriptionReference(oldObject);
  if (!serviceInterface) return null;

  const sapLagRefs = new Set(
    newObjects
      .filter((object) => object?.normalizedType === "interface")
      .filter((object) => getInterfaceIdentity(object) === serviceInterface)
      .map((object) => normalizeLagReference(getFieldValue(object, "sap")))
      .filter(Boolean)
  );

  if (!sapLagRefs.size) return null;

  const targetLags = new Map();
  for (const newObject of newObjects) {
    if (newObject?.normalizedType !== "lag") continue;
    if (usedNewIds.has(newObject.id)) continue;

    const lagRef = normalizeLagReference(
      getFieldValue(newObject, "lag") ||
      newObject.normalizedIdentity ||
      newObject.sourceName
    );

    if (sapLagRefs.has(lagRef)) targetLags.set(newObject.id, newObject);
  }

  if (targetLags.size !== 1) return null;

  return makeMatch({
    oldObject,
    newObject: [...targetLags.values()][0],
    status: "matched",
    reason: "lag-service-interface-sap",
    score: 95,
    matchKeyFields: ["description", "sap", "lag"],
    scoreReasons: [
      "old-lag-description-service-interface",
      "service-interface-sap-lag",
    ],
  });
}

function splitStaticRouteIdentity(identity = "") {
  const [prefix = "", nextHop = ""] = String(identity || "").split("|");
  return {
    prefix: normalizeIdentityToken(prefix),
    nextHop: normalizeIdentityToken(nextHop),
  };
}

function getStaticRoutePrefix(object = {}) {
  const identity = splitStaticRouteIdentity(object?.normalizedIdentity);
  return (
    normalizeIdentityToken(getFieldValue(object, "route")) ||
    normalizeIdentityToken(getFieldValue(object, "prefix")) ||
    normalizeIdentityToken(object?.prefix) ||
    identity.prefix
  );
}

function getStaticRouteNextHop(object = {}) {
  const identity = splitStaticRouteIdentity(object?.normalizedIdentity);
  return (
    normalizeIdentityToken(getFieldValue(object, "next-hop")) ||
    normalizeIdentityToken(getFieldValue(object, "nextHop")) ||
    normalizeIdentityToken(getFieldValue(object, "gateway")) ||
    normalizeIdentityToken(object?.nextHop) ||
    identity.nextHop
  );
}

function getStaticRouteRoutingContext(object = {}) {
  return normalizeIdentityToken(
    getFieldValue(object, "routing-context") ||
    getFieldValue(object, "vrf") ||
    getFieldValue(object, "vprn") ||
    nonDefaultRouterContext(getFieldValue(object, "router"))
  );
}

function nonDefaultRouterContext(value = "") {
  const router = normalizeIdentityToken(value);
  return router && router !== "base" ? router : "";
}

function getInterfaceRoutingContext(object = {}) {
  const explicitContext = normalizeIdentityToken(
    getFieldValue(object, "routing-context") ||
    getFieldValue(object, "vrf") ||
    getFieldValue(object, "vprn")
  );
  if (explicitContext) return explicitContext;

  const service = normalizeIdentityToken(getFieldValue(object, "service"));
  const serviceId = normalizeIdentityToken(
    getFieldValue(object, "service-id") ||
    getFieldValue(object, "serviceId")
  );
  if (service === "vprn" && serviceId) return `vprn:${serviceId}`;

  return nonDefaultRouterContext(getFieldValue(object, "router"));
}

function hasCompatibleInterfaceContext(oldObject = {}, newObject = {}) {
  const oldContext = getInterfaceRoutingContext(oldObject);
  const newContext = getInterfaceRoutingContext(newObject);

  if (!oldContext && !newContext) return true;
  return Boolean(oldContext && newContext && oldContext === newContext);
}

function hasCompatibleStaticRouteContext(oldObject = {}, newObject = {}) {
  const oldContext = getStaticRouteRoutingContext(oldObject);
  const newContext = getStaticRouteRoutingContext(newObject);

  if (!oldContext && !newContext) return true;
  return Boolean(oldContext && newContext && oldContext === newContext);
}

function getStaticRoutePolicy(profile = {}) {
  return (
    profile.staticRouteConversionPolicy ||
    profile.conversionPolicies?.staticRoute ||
    profile.policies?.staticRoute ||
    {}
  );
}

function allowsStaticRouteNextHopRewrite({ oldObject, newObject, profile }) {
  const policy = getStaticRoutePolicy(profile);
  const rewrites = [
    ...asArray(policy.allowedNextHopRewrites),
    ...asArray(policy.nextHopRewrites),
  ];
  if (!rewrites.length) return false;

  const oldPrefix = getStaticRoutePrefix(oldObject);
  const newPrefix = getStaticRoutePrefix(newObject);
  const oldNextHop = getStaticRouteNextHop(oldObject);
  const newNextHop = getStaticRouteNextHop(newObject);

  return rewrites.some((rewrite) => {
    const prefix = normalizeIdentityToken(rewrite.prefix || rewrite.route || "");
    const from = normalizeIdentityToken(rewrite.from || rewrite.old || rewrite.source || "");
    const to = normalizeIdentityToken(rewrite.to || rewrite.new || rewrite.target || "");

    if (prefix && prefix !== oldPrefix && prefix !== newPrefix) return false;
    if (from && from !== oldNextHop) return false;
    if (to && to !== newNextHop) return false;

    return Boolean(prefix || from || to);
  });
}

function scoreStaticRoutePair(oldObject, newObject, profile = {}) {
  const result = {
    score: 0,
    matchKeyFields: [],
    scoreReasons: [],
  };

  const oldPrefix = getStaticRoutePrefix(oldObject);
  const newPrefix = getStaticRoutePrefix(newObject);
  const oldContext = getStaticRouteRoutingContext(oldObject);
  const newContext = getStaticRouteRoutingContext(newObject);
  const oldNextHop = getStaticRouteNextHop(oldObject);
  const newNextHop = getStaticRouteNextHop(newObject);

  if (oldContext !== newContext) {
    result.scoreReasons.push("static-route-routing-context-mismatch");
    return result;
  }

  if (oldPrefix && newPrefix && oldPrefix !== newPrefix) {
    return result;
  }

  if (oldPrefix && newPrefix && oldPrefix === newPrefix) {
    addWeightedScore(result, "prefix", 80, "prefix");

    if (oldNextHop && newNextHop && oldNextHop === newNextHop) {
      addWeightedScore(result, "next-hop", 20, "next-hop");
      result.scoreReasons.push("static-route-exact-identity");
      return result;
    }

    if (oldNextHop && newNextHop && oldNextHop !== newNextHop) {
      if (allowsStaticRouteNextHopRewrite({ oldObject, newObject, profile })) {
        addWeightedScore(result, "next-hop", 20, "next-hop-policy-rewrite");
        result.scoreReasons.push("static-route-next-hop-accepted-by-policy");
        return result;
      }
      result.scoreReasons.push("static-route-next-hop-mismatch");
      return result;
    }

    result.scoreReasons.push("static-route-prefix-only");
    return result;
  }

  return result;
}

function normalizeListValue(value) {
  if (Array.isArray(value)) return value.flatMap(normalizeListValue);
  return String(value || "")
    .split(/[,\s]+/)
    .map(normalizeIdentityToken)
    .filter(Boolean);
}

function getObjectMembers(object = {}) {
  return [
    ...normalizeListValue(getFieldValue(object, "members")),
    ...normalizeListValue(getFieldValue(object, "member-port")),
    ...normalizeListValue(getFieldValue(object, "port-member")),
  ];
}

function sameSet(left = [], right = []) {
  if (!left.length || !right.length || left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function overlapRatio(left = [], right = []) {
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  const overlap = left.filter((item) => rightSet.has(item)).length;
  return overlap / Math.max(left.length, right.length);
}

function getPhysicalId(object = {}) {
  return (
    normalizeIdentityToken(getFieldValue(object, "physical-port")) ||
    normalizeIdentityToken(getFieldValue(object, "physicalPort")) ||
    normalizeIdentityToken(getFieldValue(object, "hardware-port")) ||
    normalizeIdentityToken(getFieldValue(object, "port-id")) ||
    normalizeIdentityToken(getFieldValue(object, "port")) ||
    normalizeIdentityToken(getFieldValue(object, "lag")) ||
    normalizeIdentityToken(object?.normalizedIdentity)
  );
}

function scorePortLagPair(oldObject, newObject) {
  const result = {
    score: 0,
    matchKeyFields: [],
    scoreReasons: [],
  };

  const objectType = oldObject.normalizedType;
  const oldPhysicalId = getPhysicalId(oldObject);
  const newPhysicalId = getPhysicalId(newObject);

  if (oldPhysicalId && newPhysicalId && oldPhysicalId === newPhysicalId) {
    addWeightedScore(result, objectType === "lag" ? "lag" : "port", 80, `${objectType}-physical-id`);
  }

  if (objectType === "lag") {
    const oldMembers = getObjectMembers(oldObject);
    const newMembers = getObjectMembers(newObject);
    const memberOverlap = overlapRatio(oldMembers, newMembers);
    if (sameSet(oldMembers, newMembers)) {
      addWeightedScore(result, "members", 85, "lag-member-set-exact");
    } else if (memberOverlap > 0) {
      addWeightedScore(
        result,
        "members",
        Math.round(55 + memberOverlap * 20),
        "lag-member-set-partial"
      );
      result.scoreReasons.push("lag-member-set-changed");
    }
  }

  const oldState = normalizeValue(getFieldValue(oldObject, "state") || getFieldValue(oldObject, "admin-state"));
  const newState = normalizeValue(getFieldValue(newObject, "state") || getFieldValue(newObject, "admin-state"));
  if (oldState && newState && oldState === newState && result.score > 0) {
    addWeightedScore(result, "state", 5, "admin-state");
  }

  const oldDescription = oldObject.description || getFieldValue(oldObject, "description");
  const newDescription = newObject.description || getFieldValue(newObject, "description");
  const commonEndpoint = sharedDescriptionEndpoint(oldDescription, newDescription);

  if (commonEndpoint) {
    addWeightedScore(result, "description", 85, "description-endpoint-match");
  }

  const descScore = descriptionSimilarity(oldDescription, newDescription);
  if (descScore >= 85) {
    addWeightedScore(result, "description", 15, "description-similarity");
  } else if (descScore >= 60) {
    addWeightedScore(result, "description", 8, "description-partial-similarity");
  }

  result.score = Math.min(result.score, 100);
  return result;
}

const SAP_PARENT_FIELDS = [
  "service-id",
  "service",
  "interface",
  "subscriber-interface",
  "group-interface",
];

const SAP_POLICY_FIELDS = [
  "ingress-filter",
  "egress-filter",
  "ingress-qos",
  "egress-qos",
  "ingress.filter.ip",
  "egress.filter.ip",
  "ingress.qos.sap-ingress.policy-name",
  "egress.qos.sap-egress.policy-name",
];

function scoreSapPair(oldObject, newObject) {
  const result = {
    score: 0,
    matchKeyFields: [],
    scoreReasons: [],
  };

  const oldSap = normalizeIdentityToken(getFieldValue(oldObject, "sap") || oldObject.normalizedIdentity);
  const newSap = normalizeIdentityToken(getFieldValue(newObject, "sap") || newObject.normalizedIdentity);
  if (oldSap && newSap && oldSap === newSap) {
    addWeightedScore(result, "sap", 55, "same-sap-id");
  }

  let parentMatches = 0;
  let parentConflicts = 0;
  let serviceMatched = false;
  for (const field of SAP_PARENT_FIELDS) {
    const oldValue = normalizeValue(getFieldValue(oldObject, field));
    const newValue = normalizeValue(getFieldValue(newObject, field));
    if (!oldValue || !newValue) {
      if (oldValue || newValue) result.scoreReasons.push(`missing-parent:${field}`);
      continue;
    }
    if (oldValue === newValue) {
      parentMatches += 1;
      if (field === "service-id" || field === "service") serviceMatched = true;
      addWeightedScore(result, field, field === "service-id" || field === "service" ? 25 : 15, `same-parent:${field}`);
    } else {
      parentConflicts += 1;
      result.scoreReasons.push(`conflicting-parent:${field}`);
    }
  }

  if (oldSap && newSap && oldSap === newSap && serviceMatched) {
    addWeightedScore(result, "sap-service", 25, "same-sap-service");
  }

  for (const field of SAP_POLICY_FIELDS) {
    const oldValue = normalizeValue(getFieldValue(oldObject, field));
    const newValue = normalizeValue(getFieldValue(newObject, field));
    if (oldValue && newValue && oldValue === newValue) {
      addWeightedScore(result, field, 8, `same-policy:${field}`);
    }
  }

  if (oldSap && newSap && oldSap === newSap && !parentMatches) {
    result.scoreReasons.push(parentConflicts ? "conflicting-parent-relationship" : "missing-parent-relationship");
  }

  if (parentConflicts && result.score > 55) {
    result.score = 55;
  }

  result.score = Math.min(result.score, 100);
  return result;
}

function addWeightedScore(result, field, score, reason) {
  if (!score) return;

  result.score += score;
  result.matchKeyFields.push(field);
  result.scoreReasons.push(reason || field);
}

const CANONICAL_SERVICE_FIELDS = [
  "interface",
  "subscriber-interface",
  "group-interface",
  "sap",
  "ingress-filter",
  "egress-qos",
  "auth-policy",
  "icmp.redirects",
  "dhcp.allow-unmatching-subnets",
  "static-host",
  "default-host",
  "sub-sla-mgmt",
];

function scoreSemanticObjectPair(oldObject, newObject, profile = {}) {
  const result = {
    score: 0,
    matchKeyFields: [],
    scoreReasons: [],
  };

  if (!isSameType(oldObject, newObject)) return result;

  const objectType = oldObject.normalizedType;

  if (objectType === "interface" && !hasCompatibleInterfaceContext(oldObject, newObject)) {
    result.scoreReasons.push("interface-routing-context-mismatch");
    return result;
  }

  if (objectType === "static-route") {
    return scoreStaticRoutePair(oldObject, newObject, profile);
  }

  if (["port", "lag"].includes(objectType)) {
    return scorePortLagPair(oldObject, newObject);
  }

  if (objectType === "sap") {
    return scoreSapPair(oldObject, newObject);
  }

  const oldPrefix = normalizeValue(getFieldValue(oldObject, "prefix"));
  const newPrefix = normalizeValue(getFieldValue(newObject, "prefix"));

  if (
    ["interface", "static-route"].includes(objectType) &&
    oldPrefix &&
    newPrefix &&
    oldPrefix === newPrefix
  ) {
    addWeightedScore(result, "prefix", objectType === "interface" ? 80 : 60, "prefix");
  }

  const oldIpAddress = normalizeValue(getFieldValue(oldObject, "ipAddress"));
  const newIpAddress = normalizeValue(getFieldValue(newObject, "ipAddress"));

  if (
    objectType === "interface" &&
    oldIpAddress &&
    newIpAddress &&
    oldIpAddress === newIpAddress
  ) {
    addWeightedScore(result, "ipAddress", 60, "ip-address");
  }

  if (objectType === "interface" && isNokiaGreSourcePrimaryConversion(oldObject, newObject)) {
    addWeightedScore(result, "interface", 65, "nokia-gre-source-primary-conversion");
  }

  const oldPeerIp = normalizeValue(
    getFieldValue(oldObject, "peerIp") || getFieldValue(oldObject, "neighbor")
  );
  const newPeerIp = normalizeValue(
    getFieldValue(newObject, "peerIp") || getFieldValue(newObject, "neighbor")
  );

  if (
    objectType === "bgp" &&
    oldPeerIp &&
    newPeerIp &&
    oldPeerIp === newPeerIp
  ) {
    addWeightedScore(result, "peerIp", 80, "peer-ip");
  }

  const oldPeerAs = normalizeValue(
    getFieldValue(oldObject, "peerAs") ||
    getFieldValue(oldObject, "peer-as")
  );
  const newPeerAs = normalizeValue(
    getFieldValue(newObject, "peerAs") ||
    getFieldValue(newObject, "peer-as")
  );

  if (
    objectType === "bgp" &&
    oldPeerAs &&
    newPeerAs &&
    oldPeerAs === newPeerAs
  ) {
    addWeightedScore(result, "peer-as", 20, "peer-as");
  }

  const oldRoute = normalizeValue(
    getFieldValue(oldObject, "route") || getFieldValue(oldObject, "normalizedIdentity")
  );
  const newRoute = normalizeValue(
    getFieldValue(newObject, "route") || getFieldValue(newObject, "normalizedIdentity")
  );

  if (
    objectType === "static-route" &&
    oldRoute &&
    newRoute &&
    oldRoute === newRoute
  ) {
    addWeightedScore(result, "route", 60, "route");
  }

  const oldNextHop = normalizeValue(
    getFieldValue(oldObject, "next-hop") ||
    getFieldValue(oldObject, "nextHop") ||
    getFieldValue(oldObject, "gateway")
  );
  const newNextHop = normalizeValue(
    getFieldValue(newObject, "next-hop") ||
    getFieldValue(newObject, "nextHop") ||
    getFieldValue(newObject, "gateway")
  );

  if (
    objectType === "static-route" &&
    oldNextHop &&
    newNextHop &&
    oldNextHop === newNextHop
  ) {
    addWeightedScore(result, "next-hop", 25, "next-hop");
  }

  const descScore = descriptionSimilarity(
    oldObject.description || getFieldValue(oldObject, "description"),
    newObject.description || getFieldValue(newObject, "description")
  );

  if (descScore >= 85) {
    addWeightedScore(
      result,
      "description",
      ["port", "lag"].includes(objectType) ? 90 : 35,
      "description-similarity"
    );
  } else if (descScore >= 60) {
    addWeightedScore(
      result,
      "description",
      ["port", "lag"].includes(objectType) ? 65 : 20,
      "description-partial-similarity"
    );
  }

  const oldDescription = normalizeValue(
    getFieldValue(oldObject, "description") || oldObject.description
  );
  const newDescription = normalizeValue(
    getFieldValue(newObject, "description") || newObject.description
  );

  if (oldDescription && newDescription && oldDescription === newDescription) {
    addWeightedScore(
      result,
      "description",
      ["port", "lag"].includes(objectType) ? 95 : 40,
      "description-exact"
    );
  }

  const oldIdentity = normalizeValue(getFieldValue(oldObject, "normalizedIdentity"));
  const newIdentity = normalizeValue(getFieldValue(newObject, "normalizedIdentity"));

  if (
    !["port", "lag", "interface"].includes(objectType) &&
    oldIdentity &&
    newIdentity &&
    oldIdentity === newIdentity
  ) {
    addWeightedScore(result, "normalizedIdentity", 40, "normalized-identity");
  }

  for (const field of CANONICAL_SERVICE_FIELDS) {
    const oldValue = normalizeValue(getFieldValue(oldObject, field));
    const newValue = normalizeValue(getFieldValue(newObject, field));

    if (oldValue && newValue && oldValue === newValue) {
      const weight = field === "interface" && objectType === "interface" ? 80 : 25;
      addWeightedScore(result, field, weight, `canonical-field:${field}`);
    }
  }

  if (objectType === "interface") {
    const hasAddressMatch =
      result.matchKeyFields.includes("prefix") ||
      result.matchKeyFields.includes("ipAddress");

    const hasDescriptionMatch = result.matchKeyFields.includes("description");

    if (hasAddressMatch && hasDescriptionMatch) {
      addWeightedScore(result, "interface-semantic", 10, "interface-semantic-confidence");
    }
  }

  result.score = Math.min(result.score, 100);

  return result;
}

function getBestWeightedReason(matchKeyFields = []) {
  if (matchKeyFields.includes("prefix") && matchKeyFields.includes("next-hop")) {
    return "prefix-next-hop";
  }
  if (matchKeyFields.includes("members")) return "lag-member-set";
  if (matchKeyFields.includes("sap") && matchKeyFields.includes("service-id")) {
    return "same-sap-service";
  }
  if (matchKeyFields.includes("sap")) return "same-sap-id";
  if (matchKeyFields.includes("prefix")) return "prefix";
  if (matchKeyFields.includes("route")) return "route";
  if (matchKeyFields.includes("peerIp")) return "peer-ip";
  if (matchKeyFields.includes("ipAddress")) return "ip-address";
  if (matchKeyFields.includes("next-hop")) return "next-hop";
  if (matchKeyFields.some((field) => CANONICAL_SERVICE_FIELDS.includes(field))) {
    return "canonical-service-field";
  }
  if (matchKeyFields.includes("description")) return "description-similarity";
  return "weighted-semantic-score";
}

function isAmbiguousBestMatch(best, alternatives = [], tolerance = 5) {
  if (!best) return false;

  return alternatives.some(
    (item) =>
      item.newObject?.id !== best.newObject?.id &&
      Math.abs(item.score - best.score) <= tolerance
  );
}

function getAutoMatchThreshold(object = {}) {
  const type = object.normalizedType;

  if (type === "interface") return 80;
  if (type === "static-route") return 100;

  // port/lag는 description 의존도가 높으므로 85 이상만 자동 확정
  // 그 미만은 candidate로 보내고 Select로 확정한다.
  if (["port", "lag"].includes(type)) return 85;

  return 80;
}

function findBestWeightedMatch(oldObject, candidates, profile = {}) {
  const scoredCandidates = [];

  for (const newObject of candidates) {
    const result = scoreSemanticObjectPair(oldObject, newObject, profile);

    if (!result.score) continue;

    scoredCandidates.push({
      oldObject,
      newObject,
      score: result.score,
      matchKeyFields: result.matchKeyFields,
      scoreReasons: result.scoreReasons,
    });
  }

  if (!scoredCandidates.length) return null;

  scoredCandidates.sort((a, b) => b.score - a.score);

  const best = scoredCandidates[0];

  if (!best || best.score < 55) return null;

  const ambiguous = isAmbiguousBestMatch(
    best,
    scoredCandidates.slice(1)
  );

  return makeMatch({
    oldObject: best.oldObject,
    newObject: best.newObject,
    status: ambiguous
      ? "candidate"
      : best.score >= getAutoMatchThreshold(oldObject)
        ? "matched"
        : "candidate",
    reason: ambiguous
      ? "ambiguous-weighted-match"
      : getBestWeightedReason(best.matchKeyFields),
    score: best.score,
    matchKeyFields: best.matchKeyFields,
    scoreReasons: ambiguous
      ? [...best.scoreReasons, "ambiguous-candidates"]
      : best.scoreReasons,
    ambiguousAlternatives: ambiguous
      ? scoredCandidates
          .filter((item) => Math.abs(item.score - best.score) <= 5)
          .map((item) => ({
            id: item.newObject?.id,
            sourceName: item.newObject?.sourceName,
            normalizedIdentity: item.newObject?.normalizedIdentity,
            score: item.score,
            reason: getBestWeightedReason(item.matchKeyFields),
            matchKeyFields: item.matchKeyFields,
            scoreReasons: item.scoreReasons,
          }))
      : [],
  });
}

function findBestDescriptionMatch(oldObject, candidates) {
  let best = null;

  if (oldObject?.normalizedType === "static-route") {
    return null;
  }

  for (const newObject of candidates) {
    if (!isSameType(oldObject, newObject)) continue;

    const score = descriptionSimilarity(
      oldObject.description,
      newObject.description
    );

    if (!best || score > best.score) {
      best = {
        oldObject,
        newObject,
        score,
      };
    }
  }

  if (!best || best.score < 60) return null;

  return makeMatch({
    oldObject: best.oldObject,
    newObject: best.newObject,
    status: best.score >= 85 ? "matched" : "candidate",
    reason: "description-similarity",
    score: best.score,
    scoreReasons: ["description-similarity"],
  });
}

export function matchNormalizedObjects({
  oldObjects = [],
  newObjects = [],
  manualMap = {},
  profile = {},
} = {}) {
  oldObjects = activeComparableObjects(oldObjects);
  newObjects = activeComparableObjects(newObjects);
  const matches = [];
  const usedOldIds = new Set();
  const usedNewIds = new Set();

  // 1. Manual object mapping
  for (const oldObject of oldObjects) {
    const newId = manualMap?.[oldObject.id];
    if (!newId) continue;

    const newObject = newObjects.find((item) => item.id === newId);
    if (!newObject) continue;

    matches.push(
      makeMatch({
        oldObject,
        newObject,
        status: "matched",
        reason: "manual",
        score: 100,
        matchKeyFields: ["manual"],
        scoreReasons: ["manual"]
      })
    );

    usedOldIds.add(oldObject.id);
    usedNewIds.add(newObject.id);
  }

  // 2. Object alias policy matching
  for (const oldObject of oldObjects) {
    if (usedOldIds.has(oldObject.id)) continue;

    const candidates = newObjects.filter(
      (newObject) =>
        !usedNewIds.has(newObject.id) &&
        newObject.normalizedType === oldObject.normalizedType
    );

    const match = findObjectAliasMatch(oldObject, candidates, profile);
    if (!match) continue;

    matches.push(match);
    usedOldIds.add(oldObject.id);
    usedNewIds.add(match.newObject.id);
  }

  // 3. Identity matching
  for (const oldObject of oldObjects) {
    if (usedOldIds.has(oldObject.id)) continue;

    const candidates = newObjects.filter(
      (newObject) =>
        !usedNewIds.has(newObject.id) &&
        newObject.normalizedType === oldObject.normalizedType
    );

    const match = findIdentityMatch(oldObject, candidates);
    if (!match) continue;

    matches.push(match);
    usedOldIds.add(oldObject.id);
    usedNewIds.add(match.newObject.id);
  }

  // 4. Cross-object service relationship matching
  for (const oldObject of oldObjects) {
    if (usedOldIds.has(oldObject.id)) continue;

    const match = findLagServiceInterfaceSapMatch(oldObject, newObjects, usedNewIds);
    if (!match) continue;

    matches.push(match);
    usedOldIds.add(oldObject.id);
    usedNewIds.add(match.newObject.id);
  }

  // 5. Weighted semantic matching
  for (const oldObject of oldObjects) {
    if (usedOldIds.has(oldObject.id)) continue;

    const candidates = newObjects.filter(
      (newObject) =>
        !usedNewIds.has(newObject.id) &&
        newObject.normalizedType === oldObject.normalizedType
    );

    const match = findBestWeightedMatch(oldObject, candidates, profile);
    if (!match) continue;

    matches.push(match);
    usedOldIds.add(oldObject.id);

    if (match.status === "matched") {
      usedNewIds.add(match.newObject.id);
    }
  }

  // 6. Description similarity matching
  for (const oldObject of oldObjects) {
    if (usedOldIds.has(oldObject.id)) continue;

    const candidates = newObjects.filter(
      (newObject) =>
        !usedNewIds.has(newObject.id) &&
        newObject.normalizedType === oldObject.normalizedType
    );

    const match = findBestDescriptionMatch(oldObject, candidates);
    if (!match) continue;

    matches.push(match);
    usedOldIds.add(oldObject.id);

    // candidate는 확정 매칭이 아니므로 new를 점유하지 않음
    if (match.status === "matched") {
      usedNewIds.add(match.newObject.id);
    }
  }

  // 7. Old only
  for (const oldObject of oldObjects) {
    if (usedOldIds.has(oldObject.id)) continue;

    matches.push(
      makeMatch({
        oldObject,
        status: "old-only",
        reason: "unmatched",
      })
    );

    usedOldIds.add(oldObject.id);
  }

  const ambiguousAlternativeNewIds = new Set();

  for (const match of matches) {
    const alternatives = Array.isArray(match.ambiguousAlternatives)
      ? match.ambiguousAlternatives
      : [];

    for (const alternative of alternatives) {
      if (alternative?.id) {
        ambiguousAlternativeNewIds.add(alternative.id);
      }
    }
  }

  // 8. New only
  for (const newObject of newObjects) {
    if (usedNewIds.has(newObject.id)) continue;
    if (ambiguousAlternativeNewIds.has(newObject.id)) continue;

    const alreadyCandidate = matches.some(
      (match) =>
        match.status === "candidate" &&
        match.newObject?.id === newObject.id
    );

    if (alreadyCandidate) continue;

    matches.push(
      makeMatch({
        newObject,
        status: "new-only",
        reason: "unmatched",
      })
    );

    usedNewIds.add(newObject.id);
  }

  return matches;
}
