import { buildAuditGraphData, summarizeAuditFindings } from "./standardsAudit.js";
import {
  buildAnalysisContext,
  filterAuditFindingsForModeScope,
} from "./analysisModes.js";

const IMPORTANT_FIELDS = new Set([
  "route",
  "next-hop",
  "gateway",
  "address",
  "prefix-length",
  "neighbor",
  "peer-as",
  "import.policy",
  "export.policy",
  "state",
  "admin-state",
  "metric",
  "tag",
  "sap",
  "port",
  "lag",
  "interface",
  "ingress-filter",
  "egress-filter",
  "ingress-qos",
  "egress-qos",
  "sub-profile",
  "sla-profile",
  "static-host",
  "static-host.sub-profile",
  "static-host.sla-profile",
  "static-host.int-dest-id",
  "static-host.subscriber-id",
  "default-host",
  "default-host.next-hop",
  "group-interface",
  "auth-policy",
  "dhcp.filter",
  "dhcp.server",
  "dhcp.trusted",
  "dhcp.lease-populate.l2-header",
  "dhcp.lease-populate.max-leases",
  "neighbor-discovery.populate",
  "cpu-protection.policy-id",
  "cpu-protection.ip-src-monitoring",
  "sub-sla-mgmt.admin-state",
  "sub-sla-mgmt.sub-ident-policy",
  "sub-sla-mgmt.subscriber-limit",
  "sub-sla-mgmt.defaults.sub-profile",
  "sub-sla-mgmt.defaults.sla-profile",
  "sub-sla-mgmt.defaults.subscriber-id",
  "sub-sla-mgmt.defaults.int-dest-id",
]);

const FIELD_ALIASES = {
  "admin-state": "state",
  shutdown: "state",
  "no shutdown": "state",
  nexthop: "next-hop",
  gateway: "next-hop",
  "ip-address": "address",
  ipv4: "address",
  ipv6: "address",
  "static-route-entry": "route",
  "remote-as": "peer-as",
  "auth-key": "authentication-key",
};

const MVP_SECTION_TYPES = [
  { objectType: "interface", label: "Interface" },
  { objectType: "static-route", label: "Static-route" },
  { objectType: "bgp", label: "BGP neighbor" },
];

export function buildLineSummary(report = {}) {
  const rows = Array.isArray(report.diffRows) ? report.diffRows : [];
  const metrics = {
    total: rows.length,
    changed: 0,
    added: 0,
    removed: 0,
    unchanged: 0,
    suppressed: 0,
  };

  rows.forEach((row) => {
    const oldState = row.oldState || "";
    const newState = row.newState || "";
    if (oldState === "equal" && newState === "equal") metrics.unchanged += 1;
    else if (oldState === "missing" || (row.oldRow && !row.newRow)) metrics.removed += 1;
    else if (newState === "added" || (!row.oldRow && row.newRow)) metrics.added += 1;
    else if (oldState !== "placeholder" || newState !== "placeholder") metrics.changed += 1;

    const reason = String(row.semanticReason || row.reason || "");
    if (row.semanticCovered || /ignored|suppressed|noop|structural/i.test(reason)) {
      metrics.suppressed += 1;
    }
  });

  return metrics;
}

export function buildSummaryDashboardData({
  report = {},
  plan = [],
  semanticSummary = {},
  manualMap = {},
  vendorPair = {},
  support = {},
  profileName = "",
  sessionName = "",
  comparedAt = "",
  coverageDiagnostics = semanticSummary.coverageDiagnostics || null,
  audit = {},
  fixtureScope = null,
  analysisMode = "debug/developer",
  compareScope = "all",
  selectedObjects = [],
} = {}) {
  const reviewablePlan = plan.filter(isActivePlanItem);
  const excludedPlan = plan.filter(isExcludedPlanItem);
  const suppressedPlan = plan.filter((item) => item.policySuppressed && !isExcludedPlanItem(item));
  const lineSummary = buildLineSummary(report);
  const fieldAnalysis = buildFieldOverlapAnalysis(reviewablePlan);
  const sectionSummary = buildSectionSummary(reviewablePlan, fieldAnalysis);
  const review = buildReviewItems(plan);
  const analysisContext = buildAnalysisContext({
    mode: analysisMode,
    scope: compareScope,
    selectedObjects,
  });
  const rawAuditFindings = Array.isArray(audit.findings) ? audit.findings : [];
  const auditFindings = filterAuditFindingsForModeScope(rawAuditFindings, {
    mode: analysisContext.analysisMode,
    scope: analysisContext.compareScope,
    selectedObjects,
  });
  const auditSummary = summarizeAuditFindings(auditFindings);
  const graph = buildGraphData({ plan: reviewablePlan, auditFindings });
  const severity = deriveSeverity({
    report,
    semanticSummary,
    lineSummary,
    review,
    support,
    auditSummary,
  });

  const fixtureScopeAnalysis = buildFixtureScopeAnalysis(reviewablePlan, fixtureScope);

  const counts = {
    matched: countByStatus(reviewablePlan, "matched"),
    oldOnly: countByStatus(reviewablePlan, "old-only"),
    newOnly: countByStatus(reviewablePlan, "new-only"),
    excluded: excludedPlan.length,
    suppressed: suppressedPlan.length,
    ambiguous: review.ambiguous.length,
    lowConfidence: review.lowConfidence.length,
    relationshipDiffs: review.relationshipChanges.length,
    abnormal: review.abnormal.length,
    manual: countManualMappings(plan, manualMap, semanticSummary),
    auditActive: auditSummary.active || 0,
    auditSuppressed: auditSummary.suppressed || 0,
    auditCritical: auditSummary.bySeverity?.critical || 0,
    auditWarning: auditSummary.bySeverity?.warning || 0,
    auditManual: auditSummary.bySeverity?.["manual-review"] || 0,
    auditUnsupported: auditSummary.bySeverity?.unsupported || 0,
    unmatchedPartialTargetScope: fixtureScopeAnalysis.unmatchedDuePartialTargetScope,
    unmatchedMatcherIssue: fixtureScopeAnalysis.unmatchedDueLikelyMatcherIssue,
    unmatchedParserGap: fixtureScopeAnalysis.unmatchedDueParserGap,
    unmatchedRealMissingTarget: fixtureScopeAnalysis.unmatchedDueRealMissingTarget,
  };

  const parsedObjectCount = plan.filter((item) => item.oldObject || item.newObject).length;
  const topChangedTypes = topTypeCounts(reviewablePlan.filter((item) => hasChangedFields(item) || hasRelationshipChange(item)));
  const topUnmatchedTypes = topTypeCounts(reviewablePlan.filter((item) => item.status === "old-only" || item.status === "new-only"));
  const lowCoverage = semanticSummary.coveragePercent == null
    ? false
    : Number(semanticSummary.coveragePercent || 0) < 60;

  return {
    lineSummary,
    fieldAnalysis,
    sectionSummary,
    review,
    excludedIssues: buildExcludedReviewItems(excludedPlan),
    graph,
    audit: {
      ...audit,
      findings: auditFindings,
      summary: auditSummary,
    },
    severity,
    counts,
    topChangedTypes,
    topUnmatchedTypes,
    lowCoverage,
    context: {
      oldVendor: vendorPair.oldVendor || semanticSummary.oldVendor || "",
      newVendor: vendorPair.newVendor || semanticSummary.newVendor || "",
      support,
      profileName,
      sessionName,
      comparedAt,
      parsedObjectCount,
      coverageDiagnostics,
      fixtureScope: fixtureScopeAnalysis,
      analysisMode: analysisContext.analysisMode,
      compareScope: analysisContext.compareScope,
      modeLabelKo: analysisContext.modeLabelKo,
      scopeLabelKo: analysisContext.scopeLabelKo,
      standardsAuditVisible: analysisContext.standardsAuditVisible,
      migrationReadinessVisible: analysisContext.migrationReadinessVisible,
      debugDiagnosticsVisible: analysisContext.debugDiagnosticsVisible,
      modeScopeLabelsKo: analysisContext.labelsKo,
    },
  };
}

function isExcludedPlanItem(item = {}) {
  return Boolean(item?.comparisonExcluded || item?.excluded || item?.exclusionIssue);
}

function isActivePlanItem(item = {}) {
  return Boolean(item) && !isExcludedPlanItem(item);
}

function buildExcludedReviewItems(plan = []) {
  return plan.filter(isExcludedPlanItem).map(buildExcludedReviewItem);
}

function buildExcludedReviewItem(item = {}) {
  const object = item.oldObject || item.newObject || {};
  const objectType = item.objectType || getObjectType(object);
  const side = item.newObject && !item.oldObject ? "new" : item.oldObject && !item.newObject ? "old" : "both";
  const base = buildReviewBase(item);
  return {
    ...base,
    side,
    reason: item.exclusionReason || item.exclusionIssue?.reason || "비교 제외 규칙 적용",
    classification: "비교 제외됨",
    status: "excluded",
    policyId: item.exclusionPolicyId || item.exclusionRule?.id || "",
    ruleId: item.exclusionIssue?.ruleId || "semantic-compare.unmatched-setting",
    objectType,
    objectKey: objectKey(object, objectType),
  };
}

function buildFixtureScopeAnalysis(plan = [], fixtureScope = null) {
  const oldObjects = plan.map((item) => item.oldObject).filter(Boolean);
  const newObjects = plan.map((item) => item.newObject).filter(Boolean);
  const newTypeCounts = countMap(newObjects, getObjectType);
  const oldTypeCounts = countMap(oldObjects, getObjectType);
  const partialTarget =
    fixtureScope?.status === "partial-assembled-target" ||
    fixtureScope?.fixtureCompleteness === "partial-assembled-target" ||
    fixtureScope?.partialTarget === true;
  const oldOnly = plan.filter((item) => item.status === "old-only" && !item.policySuppressed);
  const partialTargetUnmatched = [];
  const matcherIssueUnmatched = [];
  const parserGapUnmatched = [];
  const realMissingUnmatched = [];

  for (const item of oldOnly) {
    const classification = classifyFixtureUnmatchedItem(item, {
      newObjects,
      oldTypeCounts,
      newTypeCounts,
      partialTarget,
    });

    if (classification.category === "parserGap") {
      parserGapUnmatched.push(item);
    } else if (classification.category === "partialTargetScope") {
      partialTargetUnmatched.push(item);
    } else if (classification.category === "matcherIssue") {
      matcherIssueUnmatched.push(item);
    } else {
      realMissingUnmatched.push(item);
    }
  }

  const sourceObjectsInTargetScope = oldObjects.filter((object) => (newTypeCounts.get(getObjectType(object)) || 0) > 0).length;
  const sourceObjectsOutsideTargetScope = oldObjects.length - sourceObjectsInTargetScope;

  return {
    status: partialTarget ? "partial-assembled-target" : (fixtureScope?.status || "full-or-unknown-target"),
    labelsKo: partialTarget
      ? [
          "부분 Target 구성",
          "전체 장비 설정 간 1:1 비교 아님",
          "Target fixture 범위 밖 미매칭",
          "Matcher 개선 필요",
          "Parser 미지원 가능성",
          "실제 누락 가능성",
        ]
      : [
          "전체/미확인 Target 구성",
          "Matcher 개선 필요",
          "Parser 미지원 가능성",
          "실제 누락 가능성",
        ],
    fullSourceObjectCount: oldObjects.length,
    targetFixtureObjectCount: newObjects.length,
    sourceObjectsInTargetScope,
    sourceObjectsOutsideTargetScope,
    unmatchedDuePartialTargetScope: partialTargetUnmatched.length,
    unmatchedDueLikelyMatcherIssue: matcherIssueUnmatched.length,
    unmatchedDueParserGap: parserGapUnmatched.length,
    unmatchedDueRealMissingTarget: realMissingUnmatched.length,
    byType: {
      partialTargetScope: fixtureUnmatchedTypeBreakdown(partialTargetUnmatched),
      matcherIssue: fixtureUnmatchedTypeBreakdown(matcherIssueUnmatched),
      parserGap: fixtureUnmatchedTypeBreakdown(parserGapUnmatched),
      realMissingTarget: fixtureUnmatchedTypeBreakdown(realMissingUnmatched),
    },
    byReason: {
      realMissingTarget: fixtureUnmatchedReasonBreakdown(realMissingUnmatched, newObjects),
    },
  };
}

export function createFixtureUnmatchedClassifier(plan = [], fixtureScope = null) {
  const oldObjects = plan.map((item) => item?.oldObject).filter(Boolean);
  const newObjects = plan.map((item) => item?.newObject).filter(Boolean);
  const partialTarget =
    fixtureScope?.status === "partial-assembled-target" ||
    fixtureScope?.fixtureCompleteness === "partial-assembled-target" ||
    fixtureScope?.partialTarget === true;

  const context = {
    newObjects,
    oldTypeCounts: countMap(oldObjects, getObjectType),
    newTypeCounts: countMap(newObjects, getObjectType),
    partialTarget,
  };

  return (item = {}) => classifyFixtureUnmatchedItem(item, context);
}

function classifyFixtureUnmatchedItem(item = {}, context = {}) {
  const type = item.objectType || getObjectType(item.oldObject);
  const oldObject = item.oldObject || {};
  const newObjects = context.newObjects || [];
  const oldTypeCounts = context.oldTypeCounts || new Map();
  const newTypeCounts = context.newTypeCounts || new Map();
  const sourceCount = oldTypeCounts.get(type) || 0;
  const targetCount = newTypeCounts.get(type) || 0;
  const isParserGap = ["qos-policy", "filter", "route-policy", "prefix-list", "community"].includes(type);

  if (isParserGap) {
    if (!hasPolicyPlaceholderTargetIdentity(oldObject, newObjects)) {
      return {
        category: "realMissingTarget",
        reason: fixtureRealMissingReason(item, newObjects),
      };
    }
    return { category: "parserGap", reason: "" };
  }

  if (context.partialTarget && (!targetCount || sourceCount > targetCount)) {
    return { category: "partialTargetScope", reason: "" };
  }

  if (targetCount && ["port", "lag", "interface", "sap", "subscriber-interface", "group-interface", "static-route"].includes(type)) {
    if (type === "static-route" && !hasStaticRouteTargetPrefix(oldObject, newObjects)) {
      return {
        category: "realMissingTarget",
        reason: fixtureRealMissingReason(item, newObjects),
      };
    }
    if (type === "interface" && !hasInterfaceTargetEvidence(oldObject, newObjects)) {
      return {
        category: "realMissingTarget",
        reason: fixtureRealMissingReason(item, newObjects),
      };
    }
    if (["port", "lag"].includes(type) && !hasPortLagTargetEvidence(type, oldObject, newObjects)) {
      return {
        category: "realMissingTarget",
        reason: fixtureRealMissingReason(item, newObjects),
      };
    }
    return { category: "matcherIssue", reason: "" };
  }

  return {
    category: "realMissingTarget",
    reason: fixtureRealMissingReason(item, newObjects),
  };
}

function fixtureUnmatchedTypeBreakdown(items = []) {
  return [...countMap(items, (item) => item.objectType || getObjectType(item.oldObject || item.newObject)).entries()]
    .map(([objectType, count]) => ({ objectType, count }))
    .sort((left, right) => right.count - left.count || left.objectType.localeCompare(right.objectType));
}

function fixtureUnmatchedReasonBreakdown(items = [], newObjects = []) {
  const counts = new Map();

  for (const item of items) {
    const objectType = item.objectType || getObjectType(item.oldObject || item.newObject);
    const reason = fixtureRealMissingReason(item, newObjects);
    const key = `${objectType}\u0000${reason}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([key, count]) => {
      const [objectType, reason] = key.split("\u0000");
      return { objectType, reason, count };
    })
    .sort((left, right) =>
      left.objectType.localeCompare(right.objectType) ||
      left.reason.localeCompare(right.reason)
    );
}

function fixtureRealMissingReason(item = {}, newObjects = []) {
  const type = item.objectType || getObjectType(item.oldObject || item.newObject);
  const oldObject = item.oldObject || {};

  if (type === "static-route") return fixtureStaticRouteRealMissingReason(oldObject);

  if (type === "interface") {
    if (interfaceAddress(oldObject)) {
      if (isSystemLoopbackInterface(oldObject)) return "missing-target-system-loopback-address";
      if (isGreInterface(oldObject)) return "missing-target-gre-address";
      return hasInterfaceDescriptionTargetEvidence(oldObject, newObjects)
        ? "missing-target-address-with-description-evidence"
        : "missing-target-address";
    }
    if (interfaceName(oldObject)) return "missing-target-name";
    return "missing-target-identity";
  }

  if (["port", "lag"].includes(type)) return fixturePortLagRealMissingReason(type, oldObject, newObjects);

  if (type === "pim" && hasPimInterfaceTargetEvidence(oldObject, newObjects)) {
    return "missing-target-pim-config-with-interface-evidence";
  }

  if (["qos-policy", "filter", "route-policy", "prefix-list", "community"].includes(type)) {
    return fixturePolicyPlaceholderRealMissingReason(type, oldObject);
  }

  if (type === "bgp") return fixtureBgpRealMissingReason(oldObject, newObjects);

  return "missing-target-type";
}

function fixtureBgpRealMissingReason(oldObject = {}, newObjects = []) {
  const group = bgpGroupName(oldObject);
  const peer = bgpPeerAddress(oldObject);
  const hasTargetGroup = group && newObjects.some((object) =>
    getObjectType(object) === "bgp" &&
    bgpGroupName(object) === group
  );

  if (group === "ser-peer") return "missing-target-bgp-ser-peer";
  if (group && !hasTargetGroup) return "missing-target-bgp-group";
  if (peer) return "missing-target-bgp-peer";
  return "missing-target-bgp-identity";
}

function bgpGroupName(object = {}) {
  const fields = object?.fields || {};
  return normalizeFieldValue(fields.group || object.group || "");
}

function bgpPeerAddress(object = {}) {
  const fields = object?.fields || {};
  return normalizeFieldValue(
    fields.neighbor ||
    fields.peerIp ||
    object.peerIp ||
    object.normalizedIdentity ||
    object.sourceName ||
    ""
  );
}

function fixturePolicyPlaceholderRealMissingReason(type = "", oldObject = {}) {
  const identity = policyPlaceholderIdentity(oldObject);
  const rawText = objectRawText(oldObject);

  if (type === "route-policy") {
    if (/icod/i.test(identity)) return "missing-target-route-policy-icod";
    if (/peer/i.test(identity)) return "missing-target-route-policy-peer";
    if (/(deny|drop)/i.test(identity)) return "missing-target-route-policy-deny-drop";
    return "missing-target-route-policy-identity";
  }

  if (type === "prefix-list") {
    if (/^\s*ip-prefix-list\b/im.test(rawText)) return "missing-target-ip-prefix-list-definition";
    if (/^\s*prefix-list\b/im.test(rawText)) return "missing-target-prefix-list-definition";
    return "missing-target-prefix-list-identity";
  }

  if (type === "community") {
    if (/\bexpression\b/i.test(rawText)) return "missing-target-community-expression-definition";
    if (/\bmembers\b/i.test(rawText)) return "missing-target-community-members-definition";
    return "missing-target-community-identity";
  }

  return "missing-target-identity";
}

function objectRawText(object = {}) {
  return Array.isArray(object.rawLines) ? object.rawLines.join("\n") : "";
}

function fixtureStaticRouteRealMissingReason(oldObject = {}) {
  const fields = oldObject?.fields || {};
  const prefix = staticRoutePrefix(oldObject);
  const nextHopType = normalizeFieldValue(fields["next-hop-type"] || "");
  const tunnelNextHop = normalizeFieldValue(fields["tunnel-next-hop"] || "");
  const nextHop = String(fields["next-hop"] || oldObject.nextHop || "");
  const description = String(fields.description || oldObject.description || "");

  if (prefix === "0.0.0.0/0" || prefix === "::/0") return "missing-target-default-route";
  if (nextHopType === "indirect" || tunnelNextHop === "true") return "missing-target-indirect-tunnel-route";
  if (description.toLowerCase().includes("loopback")) return "missing-target-loopback-host-route";
  if (nextHop.split(/\s*,\s*/).filter(Boolean).length > 1) return "missing-target-multi-next-hop-route";
  return "missing-target-prefix";
}

function isSystemLoopbackInterface(object = {}) {
  const name = interfaceName(object);
  return name === "system" || /^lo\d*$/i.test(name);
}

function isGreInterface(object = {}) {
  return /^gre(?:-|$)/i.test(interfaceName(object));
}

function fixturePortLagRealMissingReason(type = "", oldObject = {}, newObjects = []) {
  const physicalId = portLagPhysicalId(type, oldObject);
  const hasDescription = Boolean(String(portLagDescription(oldObject) || "").trim());

  if (type === "lag") {
    const hasMembers = portLagMembers(oldObject).length > 0;
    if (hasMembers && hasDescription) return "missing-target-lag-members-with-description";
    if (hasMembers) return "missing-target-lag-members";
    if (hasDescription) return "missing-target-lag-id-with-description";
    if (physicalId) return "missing-target-lag-id";
    return "missing-target-lag-evidence";
  }

  if (isDisabledPortLag(oldObject)) {
    return hasDescription
      ? "missing-target-disabled-port-with-description"
      : "missing-target-disabled-port";
  }
  if (hasDescription && isEnabledPortLag(oldObject)) {
    return hasMdCliPortShellTarget(oldObject, newObjects)
      ? "missing-target-active-port-with-mdcli-port-shell"
      : "missing-target-active-port-with-description";
  }
  if (hasDescription) return "missing-target-port-id-with-description";
  if (physicalId) return "missing-target-port-id";
  return "missing-target-port-evidence";
}

function isDisabledPortLag(object = {}) {
  const fields = object?.fields || {};
  const adminState = normalizeFieldValue(fields["admin-state"] || fields.state || object.adminState || object.state || "");
  if (["disabled", "disable", "shutdown"].includes(adminState)) return true;

  return objectRawText(object)
    .split(/\r?\n/)
    .some((line) => /^\s*shutdown\s*$/i.test(line));
}

function isEnabledPortLag(object = {}) {
  const fields = object?.fields || {};
  const adminState = normalizeFieldValue(fields["admin-state"] || fields.state || object.adminState || object.state || "");
  if (["enabled", "enable", "no shutdown"].includes(adminState)) return true;

  return objectRawText(object)
    .split(/\r?\n/)
    .some((line) => /^\s*no\s+shutdown\s*$/i.test(line));
}

function hasStaticRouteTargetPrefix(oldObject = {}, newObjects = []) {
  const oldPrefix = staticRoutePrefix(oldObject);
  if (!oldPrefix) return false;

  return newObjects.some((object) =>
    getObjectType(object) === "static-route" &&
    staticRoutePrefix(object) === oldPrefix
  );
}

function staticRoutePrefix(object = {}) {
  const fields = object?.fields || {};
  const identityPrefix = String(object?.normalizedIdentity || "").split("|")[0];
  return normalizeFieldValue(
    fields.route ||
    fields.prefix ||
    object.route ||
    object.prefix ||
    identityPrefix
  );
}

function hasPolicyPlaceholderTargetIdentity(oldObject = {}, newObjects = []) {
  const oldType = getObjectType(oldObject);
  const oldIdentity = policyPlaceholderIdentity(oldObject);
  if (!oldType || !oldIdentity) return false;

  return newObjects.some((object) =>
    getObjectType(object) === oldType &&
    policyPlaceholderIdentity(object) === oldIdentity
  );
}

function policyPlaceholderIdentity(object = {}) {
  const fields = object?.fields || {};
  return normalizeFieldValue(
    fields.name ||
    fields.policy ||
    fields["policy-statement"] ||
    fields["prefix-list"] ||
    fields.community ||
    object.normalizedIdentity ||
    object.sourceName ||
    object.name ||
    ""
  );
}

function hasInterfaceTargetEvidence(oldObject = {}, newObjects = []) {
  const oldAddress = interfaceAddress(oldObject);
  const oldName = interfaceName(oldObject);

  return newObjects.some((object) => {
    if (getObjectType(object) !== "interface") return false;
    if (oldAddress) return interfaceAddress(object) === oldAddress;
    return Boolean(oldName && interfaceName(object) === oldName);
  });
}

function hasInterfaceDescriptionTargetEvidence(oldObject = {}, newObjects = []) {
  const oldEndpoints = portLagDescriptionEndpointCandidates(interfaceDescription(oldObject));
  if (!oldEndpoints.length) return false;

  const targetEndpoints = new Set(
    newObjects.flatMap((object) =>
      portLagDescriptionEndpointCandidates(interfaceDescription(object))
    )
  );

  return oldEndpoints.some((endpoint) => targetEndpoints.has(endpoint));
}

function interfaceAddress(object = {}) {
  const fields = object?.fields || {};
  const prefixLength = normalizeFieldValue(fields["prefix-length"] || object.prefixLength || "");
  const address = normalizeFieldValue(
    fields.prefix ||
    object.prefix ||
    fields.address ||
    object.ipAddress ||
    ""
  );

  if (address && prefixLength && !address.includes("/")) return `${address}/${prefixLength}`;
  return address;
}

function interfaceName(object = {}) {
  const fields = object?.fields || {};
  return normalizeFieldValue(
    fields.interface ||
    fields.name ||
    object.name ||
    object.sourceName ||
    object.normalizedIdentity ||
    ""
  );
}

function interfaceDescription(object = {}) {
  const fields = object?.fields || {};
  return fields.description || object.description || "";
}

function hasPimInterfaceTargetEvidence(oldObject = {}, newObjects = []) {
  const oldInterface = pimInterfaceName(oldObject);
  if (!oldInterface) return false;

  return newObjects.some((object) =>
    getObjectType(object) === "interface" &&
    interfaceName(object) === oldInterface
  );
}

function pimInterfaceName(object = {}) {
  const fields = object?.fields || {};
  return normalizeFieldValue(
    fields.interface ||
    object.normalizedIdentity ||
    object.sourceName ||
    object.name ||
    ""
  );
}

function hasPortLagTargetEvidence(type = "", oldObject = {}, newObjects = []) {
  return newObjects.some((object) =>
    getObjectType(object) === type &&
    hasPortLagEvidence(type, oldObject, object)
  );
}

function hasMdCliPortShellTarget(oldObject = {}, newObjects = []) {
  const portCandidates = mdCliPortShellCandidates(portLagPhysicalId("port", oldObject));
  if (!portCandidates.size) return false;

  return newObjects.some((object) =>
    getObjectType(object) === "port" &&
    portCandidates.has(portLagPhysicalId("port", object)) &&
    !String(portLagDescription(object) || "").trim()
  );
}

function mdCliPortShellCandidates(port = "") {
  const match = String(port || "").match(/^(\d+)\/(\d+)\/(\d+)$/);
  if (!match) return new Set();
  return new Set([`${match[1]}/${match[2]}/c${match[3]}/1`]);
}

function hasPortLagEvidence(type = "", oldObject = {}, newObject = {}) {
  const oldPhysicalId = portLagPhysicalId(type, oldObject);
  const newPhysicalId = portLagPhysicalId(type, newObject);
  if (oldPhysicalId && newPhysicalId && oldPhysicalId === newPhysicalId) return true;

  if (type === "lag" && hasPortLagMemberOverlap(oldObject, newObject)) return true;

  const oldDescription = portLagDescription(oldObject);
  const newDescription = portLagDescription(newObject);
  return Boolean(
    oldDescription &&
    newDescription &&
    (
      normalizeFieldValue(oldDescription) === normalizeFieldValue(newDescription) ||
      sharedPortLagDescriptionEndpoint(oldDescription, newDescription)
    )
  );
}

function portLagPhysicalId(type = "", object = {}) {
  const fields = object?.fields || {};
  return normalizeFieldValue(
    fields["physical-port"] ||
    fields.physicalPort ||
    fields["hardware-port"] ||
    fields["port-id"] ||
    fields[type] ||
    fields.port ||
    fields.lag ||
    object.normalizedIdentity ||
    object.sourceName ||
    ""
  );
}

function portLagDescription(object = {}) {
  const fields = object?.fields || {};
  return fields.description || object.description || "";
}

function hasPortLagMemberOverlap(oldObject = {}, newObject = {}) {
  const oldMembers = portLagMembers(oldObject);
  const newMemberSet = new Set(portLagMembers(newObject));
  return oldMembers.some((member) => newMemberSet.has(member));
}

function portLagMembers(object = {}) {
  const fields = object?.fields || {};
  return [
    ...normalizePortLagList(fields.members),
    ...normalizePortLagList(fields["member-port"]),
    ...normalizePortLagList(fields["port-member"]),
  ];
}

function normalizePortLagList(value) {
  if (Array.isArray(value)) return value.flatMap(normalizePortLagList);
  return String(value || "")
    .split(/[,\s]+/)
    .map(normalizeFieldValue)
    .filter(Boolean);
}

function sharedPortLagDescriptionEndpoint(oldDescription = "", newDescription = "") {
  const oldEndpoints = portLagDescriptionEndpointCandidates(oldDescription);
  const newEndpointSet = new Set(portLagDescriptionEndpointCandidates(newDescription));
  return oldEndpoints.some((endpoint) => newEndpointSet.has(endpoint));
}

function portLagDescriptionEndpointCandidates(description = "") {
  const cleanDescription = String(description || "")
    .replace(/^["']|["']$/g, "")
    .replace(/^#+|#+$/g, "");

  return [...new Set(cleanDescription
    .split(/[,;]+/)
    .flatMap((segment) => {
      const cleanSegment = segment.trim().replace(/^#+|#+$/g, "");
      return [cleanSegment, ...cleanSegment.split(/\s+/)];
    })
    .map((segment) => segment.trim().replace(/^#+|#+$/g, ""))
    .filter(isLikelyPortLagDescriptionEndpoint)
    .map(normalizePortLagDescriptionEndpoint))];
}

function isLikelyPortLagDescriptionEndpoint(segment = "") {
  const normalized = normalizePortLagDescriptionEndpoint(segment);
  if (!normalized) return false;
  if (!/[a-z]/i.test(normalized) || !/\d/.test(normalized)) return false;
  if (!normalized.includes("-")) return false;
  if (/^(to|from|via)$/i.test(normalized)) return false;
  if (/^(lag|port|po|te|gi|ge|xe|et|eth|ethernet|ae)[-_/]?\w*/i.test(normalized)) return false;
  if (/^(stby|sby|standby|active|fiber)$/i.test(normalized)) return false;
  return true;
}

function normalizePortLagDescriptionEndpoint(value = "") {
  return String(value || "")
    .trim()
    .replace(/^#+|#+$/g, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .replace(/\bganbuk\b/g, "gangbuk");
}

export function buildSectionSummary(plan = [], fieldAnalysis = {}) {
  const activePlan = plan.filter(isActivePlanItem);
  const overlapByType = new Map((fieldAnalysis.aggregateByType || []).map((row) => [row.objectType, row]));

  return MVP_SECTION_TYPES.map(({ objectType, label }) => {
    const items = activePlan.filter((item) => planItemObjectType(item) === objectType);
    const overlap = overlapByType.get(objectType) || {};
    const missing = items.filter((item) => item.status === "old-only").length;
    const added = items.filter((item) => item.status === "new-only").length;
    const changed = items.filter(sectionItemHasActiveChange).length;
    const reviewNeeded = items.filter(isSectionReviewNeeded).length;

    return {
      objectType,
      label,
      total: items.length,
      matched: items.filter((item) => item.status === "matched").length,
      candidate: items.filter((item) => item.status === "candidate").length,
      changed,
      reviewNeeded,
      missing,
      added,
      suppressed: items.filter((item) => item.policySuppressed).length,
      averageOverlap: overlap.averageOverlap || 0,
      changedFields: overlap.changedFields || 0,
      missingFields: (overlap.missingOldFields || 0) + (overlap.missingNewFields || 0),
    };
  });
}

function planItemObjectType(item = {}) {
  return item.objectType || item.oldObject?.normalizedType || item.newObject?.normalizedType || "object";
}

function sectionItemHasActiveChange(item = {}) {
  return hasChangedFields(item) ||
    hasRelationshipChange(item) ||
    Number(item.policyViolationCount || 0) > 0 ||
    Number(item.auditFindingCount || 0) > 0;
}

function isSectionReviewNeeded(item = {}) {
  if (isSuppressedOnlyPlanItem(item)) return false;
  if (item.status === "old-only" || item.status === "new-only" || item.status === "candidate") return true;
  if (Number(item.score || 0) > 0 && Number(item.score || 0) < 80 && item.oldObject && item.newObject) return true;
  return sectionItemHasActiveChange(item);
}

export function buildFieldOverlapAnalysis(plan = []) {
  const pairs = plan
    .filter(isActivePlanItem)
    .filter((item) => item.oldObject && item.newObject)
    .map((item) => buildFieldOverlapPair(item));

  const aggregateByType = [...groupBy(pairs, (pair) => pair.objectType).entries()]
    .map(([objectType, list]) => {
      const totals = list.reduce((result, pair) => {
        result.matchedObjects += 1;
        result.commonFields += pair.sameFields;
        result.changedFields += pair.differentFields;
        result.missingOldFields += pair.missingOldFields;
        result.missingNewFields += pair.missingNewFields;
        result.aliasMatches += pair.aliasMatches.length;
        result.reviewNeeded += pair.reviewNeeded ? 1 : 0;
        result.overlapTotal += pair.overlapPercent;
        result.rawTotalComparableFields += pair.rawTotalComparableFields;
        result.rawSameFields += pair.rawSameFields;
        result.rawDifferentFields += pair.rawDifferentFields;
        result.rawMissingOldFields += pair.rawMissingOldFields;
        result.rawMissingNewFields += pair.rawMissingNewFields;
        result.suppressedFields += pair.suppressedFields;
        result.excludedFields += pair.excludedFields;
        return result;
      }, {
        matchedObjects: 0,
        commonFields: 0,
        changedFields: 0,
        missingOldFields: 0,
        missingNewFields: 0,
        aliasMatches: 0,
        reviewNeeded: 0,
        overlapTotal: 0,
        rawTotalComparableFields: 0,
        rawSameFields: 0,
        rawDifferentFields: 0,
        rawMissingOldFields: 0,
        rawMissingNewFields: 0,
        suppressedFields: 0,
        excludedFields: 0,
      });

      return {
        objectType,
        ...totals,
        averageOverlap: totals.matchedObjects
          ? Math.round(totals.overlapTotal / totals.matchedObjects)
          : 0,
        rawOverlapPercent: totals.rawTotalComparableFields
          ? Math.round((totals.rawSameFields / totals.rawTotalComparableFields) * 100)
          : 0,
      };
    })
    .sort((left, right) => right.reviewNeeded - left.reviewNeeded || right.changedFields - left.changedFields || left.objectType.localeCompare(right.objectType));

  const aggregate = pairs.reduce((result, pair) => {
    result.totalPairs += 1;
    result.totalComparableFields += pair.totalComparableFields;
    result.sameFields += pair.sameFields;
    result.differentFields += pair.differentFields;
    result.missingOldFields += pair.missingOldFields;
    result.missingNewFields += pair.missingNewFields;
    result.aliasMatches += pair.aliasMatches.length;
    result.reviewNeeded += pair.reviewNeeded ? 1 : 0;
    result.rawTotalComparableFields += pair.rawTotalComparableFields;
    result.rawSameFields += pair.rawSameFields;
    result.rawDifferentFields += pair.rawDifferentFields;
    result.rawMissingOldFields += pair.rawMissingOldFields;
    result.rawMissingNewFields += pair.rawMissingNewFields;
    result.suppressedFields += pair.suppressedFields;
    result.excludedFields += pair.excludedFields;
    return result;
  }, {
    totalPairs: 0,
    totalComparableFields: 0,
    sameFields: 0,
    differentFields: 0,
    missingOldFields: 0,
    missingNewFields: 0,
    aliasMatches: 0,
    reviewNeeded: 0,
    rawTotalComparableFields: 0,
    rawSameFields: 0,
    rawDifferentFields: 0,
    rawMissingOldFields: 0,
    rawMissingNewFields: 0,
    suppressedFields: 0,
    excludedFields: 0,
  });

  aggregate.overlapPercent = aggregate.totalComparableFields
    ? Math.round((aggregate.sameFields / aggregate.totalComparableFields) * 100)
    : 0;
  aggregate.rawOverlapPercent = aggregate.rawTotalComparableFields
    ? Math.round((aggregate.rawSameFields / aggregate.rawTotalComparableFields) * 100)
    : 0;
  aggregate.policyAppliedComparableFields = aggregate.totalComparableFields;
  aggregate.policyExcludedFields = aggregate.suppressedFields + aggregate.excludedFields;

  const byField = [...groupBy(pairs.flatMap((pair) => pair.fieldRows), (row) => row.field).entries()]
    .map(([field, list]) => ({
      field,
      total: list.length,
      same: list.filter((row) => row.status === "same").length,
      different: list.filter((row) => row.status === "different").length,
      missingOld: list.filter((row) => row.status === "missing-old").length,
      missingNew: list.filter((row) => row.status === "missing-new").length,
      aliasMatch: list.filter((row) => row.aliasMatched).length,
    }))
    .sort((left, right) => (right.different + right.missingOld + right.missingNew) - (left.different + left.missingOld + left.missingNew) || left.field.localeCompare(right.field))
    .slice(0, 24);

  return {
    aggregate,
    aggregateByType,
    pairs,
    byField,
  };
}

export function buildReviewItems(plan = []) {
  const review = {
    critical: [],
    unmatchedOld: [],
    unmatchedNew: [],
    excluded: [],
    suppressed: [],
    abnormal: [],
    ambiguous: [],
    lowConfidence: [],
    relationshipChanges: [],
    aliasOnly: [],
  };

  plan.forEach((item) => {
    if (!isActivePlanItem(item)) {
      if (isExcludedPlanItem(item)) {
        review.excluded.push(buildExcludedReviewItem(item));
      }
      return;
    }
    if (isSuppressedOnlyPlanItem(item)) {
      review.suppressed.push(buildSuppressedReviewItem(item));
      return;
    }
    if (hasSuppressedPolicyEvidence(item)) {
      review.suppressed.push(buildSuppressedReviewItem(item));
    }
    const base = buildReviewBase(item);
    if (item.status === "old-only") {
      review.unmatchedOld.push({
        ...base,
        side: "old",
        reason: "기존 설정에서만 발견됨",
        action: "비교 위치로 이동",
      });
    }
    if (item.status === "new-only") {
      review.unmatchedNew.push({
        ...base,
        side: "new",
        reason: "신규 설정에서만 발견됨",
        action: "비교 위치로 이동",
      });
    }

    if (Array.isArray(item.ambiguousAlternatives) && item.ambiguousAlternatives.length) {
      review.ambiguous.push({
        ...base,
        reason: "매핑 후보가 여러 개 있음",
        candidates: item.ambiguousAlternatives.map((candidate) => ({
          key: candidate.objectKey || candidate.id || candidate.normalizedIdentity || candidate.sourceName || "-",
          score: toScore(candidate.score),
          reason: candidate.reason || candidate.matchReason || "",
        })).slice(0, 6),
      });
    }

    const score = Number(item.score || 0);
    if (score > 0 && score < 80 && item.oldObject && item.newObject) {
      review.lowConfidence.push({
        ...base,
        reason: "일치도가 낮아 수동 검토 필요",
        score,
        fields: changedFieldNames(item).slice(0, 6),
      });
    }

    const relationChanges = relationshipChanges(item);
    if (relationChanges.length) {
      review.relationshipChanges.push({
        ...base,
        reason: "연결/참조 관계 변경",
        relationships: relationChanges.slice(0, 5),
      });
    }

    if (Number(item.policyViolationCount || 0) > 0 || hasImportantChangedField(item)) {
      review.abnormal.push({
        ...base,
        reason: Number(item.policyViolationCount || 0) > 0
          ? "정책/필수 값 위반 가능성"
          : "중요 설정 항목 값 변경",
        fields: changedFieldNames(item).filter((field) => IMPORTANT_FIELDS.has(normalizeFieldName(field))).slice(0, 6),
      });
    }

    const overlap = item.oldObject && item.newObject ? buildFieldOverlapPair(item) : null;
    if (overlap?.aliasMatches?.length && !overlap.differentFields && !overlap.missingOldFields && !overlap.missingNewFields) {
      review.aliasOnly.push({
        ...base,
        reason: "표현만 다르고 같은 의미로 연결됨",
        fields: overlap.aliasMatches.slice(0, 6),
      });
    }
  });

  review.critical = [
    ...review.unmatchedOld.filter((item) => isCoreObjectType(item.objectType)),
    ...review.unmatchedNew.filter((item) => isCoreObjectType(item.objectType)),
    ...review.relationshipChanges.filter((item) => isCoreObjectType(item.objectType)),
    ...review.lowConfidence.filter((item) => item.score < 50),
  ].slice(0, 12);

  return review;
}

function isSuppressedOnlyPlanItem(item = {}) {
  if (isExcludedPlanItem(item) || !hasSuppressedPolicyEvidence(item)) return false;
  const lineMatches = Array.isArray(item.lineMatches) ? item.lineMatches : [];
  const hasLineMatches = lineMatches.length > 0;
  const allLinesIgnored = hasLineMatches && lineMatches.every((lineMatch) => {
    const status = String(lineMatch?.status || "").toLowerCase();
    return lineMatch?.ignored || lineMatch?.suppressed || status === "ignored";
  });
  if (allLinesIgnored) return true;
  const fieldSummaries = Object.values(item.fieldSummary || {});
  const hasActiveField = fieldSummaries.some((summary) => {
    const status = String(summary?.effectiveStatus || summary?.status || "").toLowerCase();
    return policyAppliedFieldState(summary) === "active" &&
      status &&
      !["equal", "same", "present", "ignored"].includes(status);
  });
  const hasActiveLine = lineMatches.some((lineMatch) => {
    const status = String(lineMatch?.status || "").toLowerCase();
    return status &&
      !lineMatch?.ignored &&
      !lineMatch?.suppressed &&
      !["equal", "matched", "present", "ignored"].includes(status);
  });
  const hasActiveReviewSignal = hasActiveField ||
    hasActiveLine ||
    Number(item.policyViolationCount || 0) > 0 ||
    relationshipChanges(item).length > 0 ||
    (Array.isArray(item.ambiguousAlternatives) && item.ambiguousAlternatives.length > 0) ||
    (Number(item.score || 0) > 0 && Number(item.score || 0) < 80 && item.oldObject && item.newObject);
  return !hasActiveReviewSignal;
}

function hasSuppressedPolicyEvidence(item = {}) {
  const fieldSummaries = Object.values(item.fieldSummary || {});
  if (fieldSummaries.some((summary) => {
    const status = String(summary?.effectiveStatus || summary?.status || "").toLowerCase();
    return policyAppliedFieldState(summary) === "suppressed" ||
      summary?.ignored ||
      summary?.suppressed ||
      status === "ignored" ||
      (Array.isArray(summary?.policyHits) && summary.policyHits.some((hit) => hit?.ignored || hit?.suppressed));
  })) return true;
  return (item.lineMatches || []).some((lineMatch) => {
    const status = String(lineMatch?.status || "").toLowerCase();
    return lineMatch?.ignored ||
      lineMatch?.suppressed ||
      status === "ignored" ||
      (Array.isArray(lineMatch?.policyHits) && lineMatch.policyHits.some((hit) => hit?.ignored || hit?.suppressed));
  });
}

function buildSuppressedReviewItem(item = {}) {
  const base = buildReviewBase(item, { includeIgnored: true });
  const suppressionSources = suppressedPolicySources(item);
  const exceptionSuppressed = suppressionSources.some((source) =>
    ["profile-exception", "user-exception", "line-exception", "field-exception"].includes(source)
  );
  return {
    ...base,
    side: item.newObject && !item.oldObject ? "new" : item.oldObject && !item.newObject ? "old" : "both",
    reason: item.suppressionReason === "comparison-exclusion"
      ? "비교 제외 규칙 적용"
      : exceptionSuppressed ? "예외 처리된 항목" : "프로파일 정책으로 제외된 항목",
    action: exceptionSuppressed ? "예외 해제 또는 프로파일 확인" : "프로파일 정책 확인",
    status: "ignored",
    classification: exceptionSuppressed ? "예외 처리됨" : "정책 제외됨",
    policyId: firstSuppressedPolicyId(item),
    suppressionSources,
  };
}

function suppressedPolicySources(item = {}) {
  const sources = new Set();
  const addSource = (source) => {
    const normalized = String(source || "").trim();
    if (normalized) sources.add(normalized);
  };

  for (const summary of Object.values(item.fieldSummary || {})) {
    if (policyAppliedFieldState(summary) === "suppressed" || summary?.ignored || summary?.suppressed || String(summary?.effectiveStatus || "").toLowerCase() === "ignored") {
      addSource(summary.sourcePolicy || summary.policySource);
      for (const hit of summary.policyHits || []) {
        addSource(hit?.sourcePolicy || hit?.policySource || hit?.source);
      }
      if (!sources.size) addSource("field-policy");
    }
  }

  for (const lineMatch of item.lineMatches || []) {
    if (lineMatch?.ignored || lineMatch?.suppressed || String(lineMatch?.status || "").toLowerCase() === "ignored") {
      addSource(lineMatch.sourcePolicy || lineMatch.policySource);
      for (const hit of lineMatch.policyHits || []) {
        addSource(hit?.sourcePolicy || hit?.policySource || hit?.source);
      }
      if (!sources.size) addSource("line-policy");
    }
  }

  return [...sources];
}

function firstSuppressedPolicyId(item = {}) {
  for (const summary of Object.values(item.fieldSummary || {})) {
    const direct = summary?.policyId || summary?.policy?.id || "";
    if (direct) return direct;
    const hit = Array.isArray(summary?.policyHits)
      ? summary.policyHits.find((entry) => entry?.policyId)
      : null;
    if (hit?.policyId) return hit.policyId;
  }
  for (const lineMatch of item.lineMatches || []) {
    const hit = Array.isArray(lineMatch?.policyHits)
      ? lineMatch.policyHits.find((entry) => entry?.policyId)
      : null;
    if (hit?.policyId) return hit.policyId;
  }
  return "";
}

export function buildGraphData({ plan = [], auditFindings = [] } = {}) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const activePlan = plan.filter(isActivePlanItem);
  const limitedPlan = activePlan.slice(0, 140);

  limitedPlan.forEach((item, index) => {
    const oldNode = item.oldObject ? graphNodeFromObject(item.oldObject, item, "old", index) : null;
    const newNode = item.newObject ? graphNodeFromObject(item.newObject, item, "new", index) : null;
    [oldNode, newNode].forEach((node) => {
      if (!node || nodeIds.has(node.id)) return;
      nodeIds.add(node.id);
      nodes.push(node);
    });

    if (oldNode && newNode) {
      edges.push({
        id: `map:${item.id || index}`,
        source: oldNode.id,
        target: newNode.id,
        type: item.reason === "manual" ? "manual" : "mapping",
        label: item.reason === "manual" ? "직접 연결" : "자동 연결",
        confidence: toScore(item.score),
        status: item.status || "matched",
        changed: hasChangedFields(item) || hasRelationshipChange(item),
      });
    }

    relationshipChanges(item).forEach((relationship, relationIndex) => {
      const anchor = newNode || oldNode;
      if (!anchor) return;
      const relationId = `rel:${item.id || index}:${relationIndex}`;
      nodes.push({
        id: relationId,
        side: "relation",
        objectType: "relation",
        label: relationship.label || relationship.target || relationship.field || "참조 관계",
        key: relationId,
        status: "relationship",
        confidence: 0,
        fieldOverlap: 0,
        changedFields: 0,
        virtual: true,
      });
      edges.push({
        id: `rel-edge:${item.id || index}:${relationIndex}`,
        source: anchor.id,
        target: relationId,
        type: "relationship",
        label: "참조 관계",
        confidence: 0,
        status: relationship.status || "changed",
        changed: true,
      });
    });
  });

  const auditGraph = buildAuditGraphData(auditFindings.filter((finding) => !finding.suppressed).slice(0, 80));
  for (const node of auditGraph.nodes || []) {
    if (nodeIds.has(node.id)) continue;
    nodeIds.add(node.id);
    nodes.push(node);
  }
  edges.push(...(auditGraph.edges || []));

  return {
    nodes,
    edges,
    truncated: activePlan.length > limitedPlan.length,
    totalPlanItems: activePlan.length,
  };
}

export function deriveSeverity({
  report = {},
  semanticSummary = {},
  lineSummary = {},
  review = {},
  support = {},
  auditSummary = {},
} = {}) {
  const criticalCount =
    (review.critical?.length || 0) +
    (auditSummary.bySeverity?.critical || 0) +
    (Number(semanticSummary.coveragePercent || 0) > 0 && Number(semanticSummary.coveragePercent || 0) < 40 ? 1 : 0);
  if (support?.state === "planned" || support?.state === "unsupported") {
    return { level: "critical", label: "검토 우선순위 높음", reason: "선택한 벤더 지원 상태가 미완성" };
  }
  if (criticalCount || Number(report.summary?.required || 0)) {
    return { level: "critical", label: "검토 우선순위 높음", reason: "핵심 객체 누락 또는 낮은 분석 비율" };
  }
  if ((auditSummary.bySeverity?.warning || 0) || (review.unmatchedOld?.length || 0) || (review.unmatchedNew?.length || 0) || (review.ambiguous?.length || 0)) {
    return { level: "warning", label: "확인 필요", reason: "표준 점검 또는 매핑 후보 확인 필요" };
  }
  if ((auditSummary.bySeverity?.["manual-review"] || 0) || (review.lowConfidence?.length || 0) || (review.relationshipChanges?.length || 0) || lineSummary.changed) {
    return { level: "attention", label: "변경 검토", reason: "표준 점검 수동 검토 또는 참조 관계 변경 있음" };
  }
  return { level: "ok", label: "안정", reason: "주요 검토 항목 낮음" };
}

function buildFieldOverlapPair(item = {}) {
  const objectType = item.objectType || item.oldObject?.normalizedType || item.newObject?.normalizedType || "object";
  const rawFieldRows = buildRawFieldOverlapRows(item);
  const { fieldRows, suppressedFields, excludedFields } = buildPolicyAppliedFieldOverlapRows(item, rawFieldRows);
  const rawCounts = summarizeFieldOverlapRows(rawFieldRows);
  const policyCounts = summarizeFieldOverlapRows(fieldRows);

  const sameFields = policyCounts.sameFields;
  const differentFields = policyCounts.differentFields;
  const missingOldFields = policyCounts.missingOldFields;
  const missingNewFields = policyCounts.missingNewFields;
  const totalComparableFields = policyCounts.totalComparableFields;
  const overlapPercent = policyCounts.overlapPercent;

  return {
    planId: item.id || "",
    objectType,
    oldKey: objectKey(item.oldObject, objectType),
    newKey: objectKey(item.newObject, objectType),
    label: `${objectType} ${objectIdentity(item.oldObject || item.newObject)}`,
    score: toScore(item.score),
    totalComparableFields,
    sameFields,
    differentFields,
    missingOldFields,
    missingNewFields,
    overlapPercent,
    rawTotalComparableFields: rawCounts.totalComparableFields,
    rawSameFields: rawCounts.sameFields,
    rawDifferentFields: rawCounts.differentFields,
    rawMissingOldFields: rawCounts.missingOldFields,
    rawMissingNewFields: rawCounts.missingNewFields,
    rawOverlapPercent: rawCounts.overlapPercent,
    suppressedFields,
    excludedFields,
    highImpactChangedFields: fieldRows
      .filter((row) => row.status !== "same" && IMPORTANT_FIELDS.has(normalizeFieldName(row.field)))
      .map((row) => row.field),
    aliasMatches: fieldRows.filter((row) => row.aliasMatched).map((row) => row.field),
    reviewNeeded: differentFields > 0 || missingOldFields > 0 || missingNewFields > 0 || toScore(item.score) < 80,
    fieldRows,
  };
}

function buildRawFieldOverlapRows(item = {}) {
  const oldFields = normalizeFields(item.oldObject?.fields || item.oldObject?.canonicalFields || {});
  const newFields = normalizeFields(item.newObject?.fields || item.newObject?.canonicalFields || {});
  const fields = new Set([...Object.keys(oldFields), ...Object.keys(newFields)]);

  return [...fields].sort().map((field) => {
    const hasOld = Object.prototype.hasOwnProperty.call(oldFields, field);
    const hasNew = Object.prototype.hasOwnProperty.call(newFields, field);
    const oldValue = hasOld ? displayFieldValue(field, oldFields[field]) : "";
    const newValue = hasNew ? displayFieldValue(field, newFields[field]) : "";
    const oldComparableValue = hasOld ? normalizeFieldValue(oldFields[field]) : "";
    const newComparableValue = hasNew ? normalizeFieldValue(newFields[field]) : "";
    const aliasMatched = hasAliasSource(field, item);
    let status = "same";
    if (!hasOld) status = "missing-old";
    else if (!hasNew) status = "missing-new";
    else if (oldComparableValue !== newComparableValue) status = "different";
    return {
      field,
      status,
      oldValue,
      newValue,
      aliasMatched,
    };
  });
}

function buildPolicyAppliedFieldOverlapRows(item = {}, rawFieldRows = []) {
  const rawByField = new Map(rawFieldRows.map((row) => [normalizeFieldName(row.field), row]));
  const summaryEntries = Object.entries(item.fieldSummary || {})
    .map(([field, summary]) => [normalizeFieldName(field), summary])
    .filter(([field]) => field);

  if (!summaryEntries.length) {
    return {
      fieldRows: rawFieldRows,
      suppressedFields: 0,
      excludedFields: 0,
    };
  }

  let suppressedFields = 0;
  let excludedFields = 0;
  const fieldRows = [];

  for (const [field, summary] of summaryEntries) {
    const fallback = rawByField.get(field) || {
      field,
      status: "same",
      oldValue: compactFieldValues(summary?.oldValues),
      newValue: compactFieldValues(summary?.newValues),
      aliasMatched: false,
    };
    const policyState = policyAppliedFieldState(summary);
    if (policyState === "excluded") {
      excludedFields += 1;
      continue;
    }
    if (policyState === "suppressed") {
      suppressedFields += 1;
      continue;
    }

    fieldRows.push({
      field,
      status: normalizeFieldOverlapStatus(summary, fallback.status),
      oldValue: compactFieldValues(summary?.oldValues) || fallback.oldValue || "",
      newValue: compactFieldValues(summary?.newValues) || fallback.newValue || "",
      aliasMatched: fallback.aliasMatched || hasAliasSource(field, item),
    });
  }

  return {
    fieldRows,
    suppressedFields,
    excludedFields,
  };
}

function policyAppliedFieldState(summary = {}) {
  const status = String(summary?.effectiveStatus || summary?.status || "").toLowerCase();
  const sourcePolicy = String(summary?.sourcePolicy || summary?.policySource || "").toLowerCase();
  const policyHitSources = (summary?.policyHits || [])
    .map((hit) => String(hit?.sourcePolicy || hit?.policySource || "").toLowerCase());
  const sources = [sourcePolicy, ...policyHitSources];

  if (sources.includes("comparison-exclusion") || status === "comparison-excluded") return "excluded";
  if (
    summary?.ignored ||
    summary?.suppressed ||
    status === "ignored" ||
    status === "inheritance-unresolved" ||
    status === "structure-converted" ||
    sources.includes("profile-exception") ||
    sources.includes("user-exception") ||
    sources.includes("advanced-policy")
  ) {
    return "suppressed";
  }
  return "active";
}

function normalizeFieldOverlapStatus(summary = {}, fallbackStatus = "same") {
  const status = String(summary?.effectiveStatus || summary?.status || "").toLowerCase();
  if (["same", "equal", "present"].includes(status)) return "same";
  if (["changed", "different", "conflict"].includes(status)) return "different";
  if (["missing", "missing-new"].includes(status)) return "missing-new";
  if (["added", "missing-old"].includes(status)) return "missing-old";
  return fallbackStatus || "same";
}

function summarizeFieldOverlapRows(fieldRows = []) {
  const sameFields = fieldRows.filter((row) => row.status === "same").length;
  const differentFields = fieldRows.filter((row) => row.status === "different").length;
  const missingOldFields = fieldRows.filter((row) => row.status === "missing-old").length;
  const missingNewFields = fieldRows.filter((row) => row.status === "missing-new").length;
  const totalComparableFields = fieldRows.length;
  const overlapPercent = totalComparableFields ? Math.round((sameFields / totalComparableFields) * 100) : 0;
  return {
    sameFields,
    differentFields,
    missingOldFields,
    missingNewFields,
    totalComparableFields,
    overlapPercent,
  };
}

function buildReviewBase(item = {}, options = {}) {
  const object = item.oldObject || item.newObject || {};
  const objectType = item.objectType || object.normalizedType || object.type || "object";
  const overlap = item.oldObject && item.newObject ? buildFieldOverlapPair(item) : null;
  const fieldRows = buildReviewTableFieldRows(item, overlap, options);
  const oldKey = item.oldObject ? objectKey(item.oldObject, objectType) : "";
  const newKey = item.newObject ? objectKey(item.newObject, objectType) : "";
  return {
    planId: item.id || "",
    objectType,
    objectKey: objectKey(object, objectType),
    oldKey,
    newKey,
    label: reviewObjectLabel(item, object),
    status: item.status || "",
    score: toScore(item.score),
    commonFields: overlap?.sameFields || 0,
    differentFields: overlap?.differentFields || 0,
    missingOldFields: overlap?.missingOldFields || 0,
    missingNewFields: overlap?.missingNewFields || 0,
    fieldRows,
  };
}

function reviewObjectLabel(item = {}, fallbackObject = {}) {
  if (item.oldObject && item.newObject) {
    const oldIdentity = objectIdentity(item.oldObject);
    const newIdentity = objectIdentity(item.newObject);
    if (oldIdentity && newIdentity && oldIdentity !== newIdentity) return `${oldIdentity} -> ${newIdentity}`;
  }
  return objectIdentity(fallbackObject);
}

function buildReviewTableFieldRows(item = {}, overlap = null, options = {}) {
  const includeIgnored = Boolean(options.includeIgnored);
  const summaryRows = Object.entries(item.fieldSummary || {})
    .filter(([field, value]) => includeIgnored || isDescriptionFieldName(field) || policyAppliedFieldState(value) === "active")
    .map(([field, value]) => ({
      field: normalizeReviewFieldName(field, value),
      status: String(value?.effectiveStatus || value?.status || "").toLowerCase(),
      oldValue: compactFieldValues(value?.oldValues),
      newValue: compactFieldValues(value?.newValues),
    }))
    .filter((row) => row.field);

  if (summaryRows.length) return ensureDescriptionReviewFieldRow(summaryRows, item);

  if (overlap?.fieldRows?.length) {
    return ensureDescriptionReviewFieldRow(overlap.fieldRows.map((row) => ({
      field: normalizeFieldName(row.field),
      status: row.status,
      oldValue: row.oldValue,
      newValue: row.newValue,
    })), item);
  }

  const object = item.oldObject || item.newObject || {};
  const sourceFields = normalizeFields(object.fields || object.canonicalFields || {});
  const sourceSide = item.newObject && !item.oldObject ? "new" : "old";

  return ensureDescriptionReviewFieldRow(Object.entries(sourceFields).map(([field, value]) => ({
    field: normalizeFieldName(field),
    status: sourceSide === "new" ? "added" : "missing",
    oldValue: sourceSide === "old" ? displayFieldValue(field, value) : "",
    newValue: sourceSide === "new" ? displayFieldValue(field, value) : "",
  })), item);
}

function ensureDescriptionReviewFieldRow(rows = [], item = {}) {
  const oldValue = getObjectDescription(item.oldObject);
  const newValue = getObjectDescription(item.newObject);
  const descriptionSummary = item.fieldSummary?.description;
  const descriptionSuppressed = descriptionSummary && policyAppliedFieldState(descriptionSummary) !== "active";
  const existingIndex = rows.findIndex((row) => isDescriptionFieldName(row.field));

  if (existingIndex >= 0) {
    return rows.map((row, index) => {
      if (index !== existingIndex) return row;
      const nextOldValue = oldValue || row.oldValue;
      const nextNewValue = newValue || row.newValue;
      return {
        ...row,
        oldValue: nextOldValue,
        newValue: nextNewValue,
        status: descriptionSuppressed ? "ignored" : descriptionReviewStatus(nextOldValue, nextNewValue, row.status),
      };
    });
  }

  if (!oldValue && !newValue) return rows;

  return [
    ...rows,
    {
      field: "description",
      status: descriptionSuppressed ? "ignored" : descriptionReviewStatus(oldValue, newValue),
      oldValue,
      newValue,
    },
  ];
}

function getObjectDescription(object = {}) {
  const values = [object?.description];
  [object?.fields, object?.canonicalFields].forEach((fields = {}) => {
    Object.entries(fields || {}).forEach(([field, value]) => {
      if (isDescriptionFieldName(field)) values.push(value);
    });
  });
  return compactFieldValues(values.map((value) => displayFieldValue("description", value)));
}

function descriptionReviewStatus(oldValue = "", newValue = "", fallback = "same") {
  if (!oldValue && !newValue) return fallback || "same";
  if (!oldValue) return "missing-old";
  if (!newValue) return "missing-new";
  return normalizeFieldValue(oldValue) === normalizeFieldValue(newValue) ? "same" : "different";
}

function compactFieldValues(values = []) {
  const list = Array.isArray(values) ? values : [values];
  return [...new Set(list.map((value) => String(value ?? "").trim()).filter(Boolean))].join(", ");
}

function graphNodeFromObject(object, item, side, index) {
  const objectType = item.objectType || object.normalizedType || object.type || "object";
  const overlap = item.oldObject && item.newObject ? buildFieldOverlapPair(item) : null;
  return {
    id: `${side}:${objectKey(object, objectType)}:${index}`,
    side,
    objectType,
    label: objectIdentity(object),
    key: objectKey(object, objectType),
    status: item.status || "",
    confidence: toScore(item.score),
    fieldOverlap: overlap?.overlapPercent || 0,
    changedFields: overlap?.differentFields || 0,
    manual: item.reason === "manual",
  };
}

function normalizeFields(fields = {}) {
  return Object.entries(fields || {}).reduce((result, [field, value]) => {
    const key = normalizeFieldName(field);
    if (!key) return result;
    result[key] = value;
    return result;
  }, {});
}

function normalizeFieldName(field = "") {
  const normalized = String(field || "").trim().toLowerCase().replace(/\s+/g, "-");
  return FIELD_ALIASES[normalized] || normalized;
}

function normalizeReviewFieldName(field = "", summary = {}) {
  const preferred = String(summary?.field || field || "").trim().toLowerCase().replace(/\s+/g, "-");
  if (preferred === "admin-state") return "admin-state";
  return normalizeFieldName(field);
}

function isDescriptionFieldName(field = "") {
  const normalized = normalizeFieldName(field);
  return normalized === "description" || normalized.endsWith(".description");
}

function normalizeFieldValue(value) {
  if (Array.isArray(value)) return value.map(normalizeFieldValue).join(",");
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function displayFieldValue(field = "", value = "") {
  if (Array.isArray(value)) return value.map((entry) => displayFieldValue(field, entry)).join(",");
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return isDescriptionFieldName(field) ? text : text.toLowerCase();
}

function objectIdentity(object = {}) {
  return String(
    object.normalizedIdentity ||
    object.identity ||
    object.name ||
    object.sourceName ||
    object.id ||
    "-",
  );
}

function objectKey(object = {}, objectType = "object") {
  return String(object.key || `${objectType}:${objectIdentity(object)}`);
}

function toScore(score) {
  const value = Number(score);
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function countByStatus(plan = [], status) {
  return plan.filter((item) => isActivePlanItem(item) && item.status === status).length;
}

function countMap(items = [], keyFn) {
  return (items || []).reduce((result, item) => {
    const key = keyFn(item);
    result.set(key, (result.get(key) || 0) + 1);
    return result;
  }, new Map());
}

function getObjectType(object = {}) {
  return object.normalizedType || object.type || object.sourceType || "object";
}

function countManualMappings(plan = [], manualMap = {}, semanticSummary = {}) {
  const manualByReason = plan.filter((item) => String(item.reason || "").toLowerCase() === "manual").length;
  return Math.max(
    manualByReason,
    Number(semanticSummary.manual || 0),
    Object.keys(manualMap || {}).length,
  );
}

function changedFieldNames(item = {}) {
  const summary = item.fieldSummary || {};
  return Object.entries(summary)
    .filter(([, value]) => {
      if (value?.ignored || value?.effectiveStatus === "ignored") return false;
      const status = String(value?.effectiveStatus || value?.status || "").toLowerCase();
      return ["changed", "missing", "added", "conflict", "different"].includes(status);
    })
    .map(([field]) => field);
}

function hasChangedFields(item = {}) {
  return changedFieldNames(item).length > 0 || Number(item.fieldStats?.changedFields || 0) > 0;
}

function hasImportantChangedField(item = {}) {
  return changedFieldNames(item).some((field) => IMPORTANT_FIELDS.has(normalizeFieldName(field)));
}

function relationshipChanges(item = {}) {
  return (item.relationshipSummary || [])
    .filter((relationship) => !["matched", "equal", "present", "unknown"].includes(String(relationship.status || "").toLowerCase()))
    .map((relationship) => ({
      status: relationship.status || "changed",
      label: relationship.label || relationship.type || relationship.field || "참조 관계",
      source: relationship.source || relationship.from || "",
      target: relationship.target || relationship.to || relationship.value || "",
      changeType: relationship.changeType || relationship.reason || relationship.status || "changed",
    }));
}

function hasRelationshipChange(item = {}) {
  return relationshipChanges(item).length > 0;
}

function hasAliasSource(field, item = {}) {
  const normalizedField = normalizeFieldName(field);
  if (!Object.values(FIELD_ALIASES).includes(normalizedField)) return false;
  const fieldSummary = item.fieldSummary || {};
  return Object.keys(fieldSummary).some((rawField) => rawField !== normalizedField && normalizeFieldName(rawField) === normalizedField);
}

function isCoreObjectType(type = "") {
  return ["bgp", "static-route", "interface", "sap", "lag", "port", "subscriber-interface", "group-interface"].includes(String(type || ""));
}

function topTypeCounts(items = []) {
  return [...groupBy(items, (item) => item.objectType || item.oldObject?.normalizedType || item.newObject?.normalizedType || "object").entries()]
    .map(([type, list]) => ({ type, count: list.length }))
    .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type))
    .slice(0, 8);
}

function groupBy(items, keyFn) {
  return (items || []).reduce((result, item) => {
    const key = keyFn(item);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(item);
    return result;
  }, new Map());
}
