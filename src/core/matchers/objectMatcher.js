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
}) {
  return {
    oldObject: oldObject || null,
    newObject: newObject || null,
    status,
    reason,
    score,
  };
}

function findIdentityMatch(oldObject, candidates) {
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
        });
      }
    }

    if (
      oldObject.normalizedIdentity &&
      newObject.normalizedIdentity &&
      oldObject.normalizedIdentity === newObject.normalizedIdentity
    ) {
      return makeMatch({
        oldObject,
        newObject,
        status: "matched",
        reason: "normalized-identity",
        score: 95,
      });
    }
  }

  return null;
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

  // 3. Description similarity matching
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

  // 4. Old only
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

  // 5. New only
  for (const newObject of newObjects) {
    if (usedNewIds.has(newObject.id)) continue;

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