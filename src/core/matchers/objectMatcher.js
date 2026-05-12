// src/core/matchers/objectMatcher.js

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

function findIdentityMatch(oldObject, candidates) {
  const normalizedIdentityMatches = [];

  for (const newObject of candidates) {
    if (!isSameType(oldObject, newObject)) continue;

    if (oldObject.normalizedType === "interface") {
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
    }

    if (oldObject.normalizedType === "bgp") {
      if (
        oldObject.peerIp &&
        newObject.peerIp &&
        oldObject.peerIp === newObject.peerIp
      ) {
        return makeMatch({
          oldObject,
          newObject,
          status: "matched",
          reason: "peer-ip",
          score: 100,
          matchKeyFields: ["peerIp"],
          scoreReasons: ["peer-ip"],
        });
      }
    }

    if (
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

function addWeightedScore(result, field, score, reason) {
  if (!score) return;

  result.score += score;
  result.matchKeyFields.push(field);
  result.scoreReasons.push(reason || field);
}

function scoreSemanticObjectPair(oldObject, newObject) {
  const result = {
    score: 0,
    matchKeyFields: [],
    scoreReasons: [],
  };

  if (!isSameType(oldObject, newObject)) return result;

  const oldPrefix = normalizeValue(getFieldValue(oldObject, "prefix"));
  const newPrefix = normalizeValue(getFieldValue(newObject, "prefix"));

  if (oldPrefix && newPrefix && oldPrefix === newPrefix) {
    addWeightedScore(result, "prefix", 50, "prefix");
  }

  const oldIpAddress = normalizeValue(getFieldValue(oldObject, "ipAddress"));
  const newIpAddress = normalizeValue(getFieldValue(newObject, "ipAddress"));

  if (oldIpAddress && newIpAddress && oldIpAddress === newIpAddress) {
    addWeightedScore(result, "ipAddress", 40, "ip-address");
  }

  const oldPeerIp = normalizeValue(
    getFieldValue(oldObject, "peerIp") || getFieldValue(oldObject, "neighbor")
  );
  const newPeerIp = normalizeValue(
    getFieldValue(newObject, "peerIp") || getFieldValue(newObject, "neighbor")
  );

  if (oldPeerIp && newPeerIp && oldPeerIp === newPeerIp) {
    addWeightedScore(result, "peerIp", 55, "peer-ip");
  }

  const oldPeerAs = normalizeValue(
    getFieldValue(oldObject, "peerAs") ||
      getFieldValue(oldObject, "peer-as") ||
      getFieldValue(oldObject, "peerAs")
  );
  const newPeerAs = normalizeValue(
    getFieldValue(newObject, "peerAs") ||
      getFieldValue(newObject, "peer-as") ||
      getFieldValue(newObject, "peerAs")
  );

  if (oldPeerAs && newPeerAs && oldPeerAs === newPeerAs) {
    addWeightedScore(result, "peer-as", 20, "peer-as");
  }

  const oldRoute = normalizeValue(
    getFieldValue(oldObject, "route") || getFieldValue(oldObject, "normalizedIdentity")
  );
  const newRoute = normalizeValue(
    getFieldValue(newObject, "route") || getFieldValue(newObject, "normalizedIdentity")
  );

  if (
    oldObject.normalizedType === "static-route" &&
    oldRoute &&
    newRoute &&
    oldRoute === newRoute
  ) {
    addWeightedScore(result, "route", 55, "route");
  }

  const oldNextHop = normalizeValue(
    getFieldValue(oldObject, "next-hop") || getFieldValue(oldObject, "nextHop")
  );
  const newNextHop = normalizeValue(
    getFieldValue(newObject, "next-hop") || getFieldValue(newObject, "nextHop")
  );

  if (oldNextHop && newNextHop && oldNextHop === newNextHop) {
    addWeightedScore(result, "next-hop", 25, "next-hop");
  }

  const descScore = descriptionSimilarity(
    oldObject.description || getFieldValue(oldObject, "description"),
    newObject.description || getFieldValue(newObject, "description")
  );

  if (descScore >= 85) {
    addWeightedScore(result, "description", 25, "description-similarity");
  } else if (descScore >= 60) {
    addWeightedScore(result, "description", 10, "description-partial-similarity");
  }

  result.score = Math.min(result.score, 100);

  const oldDescription = normalizeValue(
  getFieldValue(oldObject, "description") || oldObject.description
  );
  const newDescription = normalizeValue(
    getFieldValue(newObject, "description") || newObject.description
  );

  if (oldDescription && newDescription && oldDescription === newDescription) {
    addWeightedScore(result, "description", 35, "description");
  }

  const oldIdentity = normalizeValue(getFieldValue(oldObject, "normalizedIdentity"));
  const newIdentity = normalizeValue(getFieldValue(newObject, "normalizedIdentity"));

  if (oldIdentity && newIdentity && oldIdentity === newIdentity) {
    addWeightedScore(result, "normalizedIdentity", 40, "normalized-identity");
  }

  if (oldObject.normalizedType === "interface") {
  const hasAddressMatch = result.matchKeyFields.includes("prefix") ||
    result.matchKeyFields.includes("ipAddress");

  const hasDescriptionMatch = result.matchKeyFields.includes("description");

  if (hasAddressMatch && hasDescriptionMatch) {
    addWeightedScore(result, "interface-semantic", 15, "interface-semantic-confidence");
  }
}

  return result;
}

function getBestWeightedReason(matchKeyFields = []) {
  if (matchKeyFields.includes("prefix")) return "prefix";
  if (matchKeyFields.includes("route")) return "route";
  if (matchKeyFields.includes("peerIp")) return "peer-ip";
  if (matchKeyFields.includes("ipAddress")) return "ip-address";
  if (matchKeyFields.includes("next-hop")) return "next-hop";
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

function findBestWeightedMatch(oldObject, candidates) {
  const scoredCandidates = [];

  for (const newObject of candidates) {
    const result = scoreSemanticObjectPair(oldObject, newObject);

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
    status: ambiguous ? "candidate" : best.score >= 80 ? "matched" : "candidate",
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
  });
}

export function matchNormalizedObjects({
  oldObjects = [],
  newObjects = [],
  manualMap = {},
} = {}) {
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

  // 2. Identity matching
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

  // 3. Weighted semantic matching
  for (const oldObject of oldObjects) {
    if (usedOldIds.has(oldObject.id)) continue;

    const candidates = newObjects.filter(
      (newObject) =>
        !usedNewIds.has(newObject.id) &&
        newObject.normalizedType === oldObject.normalizedType
    );

    const match = findBestWeightedMatch(oldObject, candidates);
    if (!match) continue;

    matches.push(match);
    usedOldIds.add(oldObject.id);

    if (match.status === "matched") {
      usedNewIds.add(match.newObject.id);
    }
  }

  // 4. Description similarity matching
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

  // 5. Old only
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

  // 6. New only
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