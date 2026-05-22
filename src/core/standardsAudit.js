import { resolveBgpEffectiveObjects } from "./bgpEffectiveResolver.js";
import { evaluatePolicySuppression } from "./policyEvaluator.js";

export const AUDIT_SEVERITY_LABELS_KO = {
  critical: "위험",
  warning: "경고",
  info: "정보",
  "manual-review": "수동 검토",
  unsupported: "미지원",
  suppressed: "예외/숨김 처리",
};

export const MIGRATION_IMPACT_LABELS_KO = {
  "no-impact": "영향 없음",
  "review-before-migration": "전환 전 검토",
  "conversion-policy-required": "전환 정책 필요",
  "unsupported-target": "대상 미지원",
  "target-default-risk": "대상 기본값 위험",
  "manual-conversion-required": "수동 전환 필요",
  "blocks-auto-generation": "자동 생성 차단",
};

export const DEFAULT_STANDARDS_AUDIT_PROFILE = {
  id: "default-network-standard",
  name: "Default Network Standard",
  rules: {
    sapRequiresIngressQos: true,
    sapRequiresEgressQos: true,
    checkReferencedQosPolicyExists: true,
    checkUnusedQosPolicy: true,
    bgpRequiresDescription: true,
    bgpRequiresImportPolicy: false,
    bgpRequiresExportPolicy: false,
    requireBgpImportPolicy: false,
    requireBgpExportPolicy: false,
    bgpRequiresAuthentication: false,
    bgpRequiresMaxPrefix: true,
    staticRouteDefaultRequiresReview: true,
    subscriberRequiresGroupInterface: true,
    groupRequiresSubscriberInterface: true,
    sapRequiresServiceRelationship: true,
    staticHostDuplicateCheck: true,
    cpuProtectionRequiredOnSap: false,
    managementPlaneManualReview: true,
  },
  allowed: {
    staticRouteMetricMin: 0,
    staticRouteMetricMax: 4294967295,
    staticRouteTagMin: 0,
    staticRouteTagMax: 4294967295,
  },
  severities: {},
};

export const STANDARDS_AUDIT_PROFILES = {
  "default-network-standard": DEFAULT_STANDARDS_AUDIT_PROFILE,
  "nokia-classic-standard": {
    ...DEFAULT_STANDARDS_AUDIT_PROFILE,
    id: "nokia-classic-standard",
    name: "Nokia Classic Standard",
  },
  "nokia-md-cli-standard": {
    ...DEFAULT_STANDARDS_AUDIT_PROFILE,
    id: "nokia-md-cli-standard",
    name: "Nokia MD-CLI Standard",
  },
  "nokia-bng-standard": {
    ...DEFAULT_STANDARDS_AUDIT_PROFILE,
    id: "nokia-bng-standard",
    name: "Nokia BNG Standard",
    rules: {
      ...DEFAULT_STANDARDS_AUDIT_PROFILE.rules,
      cpuProtectionRequiredOnSap: true,
    },
  },
  "classic-to-mdcli-migration-standard": {
    ...DEFAULT_STANDARDS_AUDIT_PROFILE,
    id: "classic-to-mdcli-migration-standard",
    name: "Classic to MD-CLI Migration Standard",
    rules: {
      ...DEFAULT_STANDARDS_AUDIT_PROFILE.rules,
      bgpRequiresImportPolicy: true,
      bgpRequiresExportPolicy: true,
      requireBgpImportPolicy: true,
      requireBgpExportPolicy: true,
      bgpRequiresAuthentication: true,
    },
  },
};

const POLICY_REFERENCE_FIELDS = [
  "ingress.qos",
  "egress.qos",
  "ingress.qos.sap-ingress.policy-name",
  "egress.qos.sap-egress.policy-name",
  "qos-policy",
  "ingress.filter.ip",
  "egress.filter.ip",
  "dhcp.filter",
  "import.policy",
  "export.policy",
  "authentication-policy",
  "radius-auth-policy",
  "cpu-protection.policy-id",
];

const QOS_REFERENCE_FIELDS = [
  "ingress.qos",
  "egress.qos",
  "ingress.qos.sap-ingress.policy-name",
  "egress.qos.sap-egress.policy-name",
  "qos-policy",
];

const FILTER_REFERENCE_FIELDS = [
  "ingress.filter.ip",
  "egress.filter.ip",
  "dhcp.filter",
];

const ROUTE_POLICY_REFERENCE_FIELDS = [
  "import.policy",
  "export.policy",
];

export function buildStandardsAuditProfile(profile = {}, vendor = "") {
  const requestedId =
    profile?.standardsAudit?.profileId ||
    profile?.standardsProfile ||
    profile?.auditProfile ||
    vendorProfileId(vendor);
  const base = STANDARDS_AUDIT_PROFILES[requestedId] || DEFAULT_STANDARDS_AUDIT_PROFILE;
  const override = profile?.standardsAudit || {};

  return {
    ...base,
    ...override,
    id: override.id || override.profileId || base.id,
    name: override.name || base.name,
    rules: {
      ...(base.rules || {}),
      ...(override.rules || {}),
    },
    allowed: {
      ...(base.allowed || {}),
      ...(override.allowed || {}),
    },
    severities: {
      ...(base.severities || {}),
      ...(override.severities || {}),
    },
  };
}

export function runStandardsAudit({
  objects = [],
  profile = {},
  vendor = "",
  side = "old",
  targetVendor = "",
} = {}) {
  const auditProfile = buildStandardsAuditProfile(profile, vendor);
  const effectiveObjects = resolveBgpEffectiveObjects(objects, { includeMetadataObjects: false });
  const context = buildAuditContext(effectiveObjects, auditProfile, vendor, side, targetVendor);
  const findings = [];

  applyParserCoverageDiagnostics(context, findings);
  applyQosRules(context, findings);
  applyPolicyRules(context, findings);
  applyBgpRoutingRules(context, findings);
  applySubscriberServiceRules(context, findings);
  applyManagementSecurityRules(context, findings);

  const normalizedFindings = findings.map((finding, index) =>
    normalizeFinding(finding, index, context, profile)
  );

  return {
    profile: {
      id: auditProfile.id,
      name: auditProfile.name,
    },
    side,
    vendor,
    targetVendor,
    findings: normalizedFindings,
    summary: summarizeAuditFindings(normalizedFindings),
  };
}

export function runStandardsAuditForSides({
  oldResult = {},
  newResult = {},
  profile = {},
  oldVendor = "",
  newVendor = "",
} = {}) {
  const oldAudit = runStandardsAudit({
    objects: oldResult.objects || [],
    profile,
    vendor: oldVendor || oldResult.vendor,
    side: "old",
    targetVendor: newVendor || newResult.vendor,
  });
  const newAudit = runStandardsAudit({
    objects: newResult.objects || [],
    profile,
    vendor: newVendor || newResult.vendor,
    side: "new",
    targetVendor: newVendor || newResult.vendor,
  });
  const findings = [...oldAudit.findings, ...newAudit.findings];

  return {
    profile: oldAudit.profile,
    findings,
    old: oldAudit,
    new: newAudit,
    summary: summarizeAuditFindings(findings),
  };
}

export function summarizeAuditFindings(findings = []) {
  const summary = {
    total: findings.length,
    active: 0,
    suppressed: 0,
    bySeverity: {},
    byCategory: {},
    byMigrationImpact: {},
  };

  for (const finding of findings) {
    const severity = finding.suppressed ? "suppressed" : finding.severity || "info";
    summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;
    summary.byCategory[finding.category] = (summary.byCategory[finding.category] || 0) + 1;
    summary.byMigrationImpact[finding.migrationImpact] = (summary.byMigrationImpact[finding.migrationImpact] || 0) + 1;
    if (finding.suppressed) summary.suppressed += 1;
    else summary.active += 1;
  }

  return summary;
}

export function attachAuditFindingsToPlan(plan = [], audit = {}) {
  const byObject = groupFindingsByObject(audit.findings || []);
  return plan.map((item) => {
    const oldKey = item.oldObject ? objectLookupKey(item.oldObject, "old") : "";
    const newKey = item.newObject ? objectLookupKey(item.newObject, "new") : "";
    const findings = [
      ...(byObject.get(oldKey) || []),
      ...(byObject.get(newKey) || []),
    ];
    const activeFindings = findings.filter((finding) => !finding.suppressed);

    return {
      ...item,
      auditFindings: findings,
      auditFindingCount: activeFindings.length,
      auditSeverity: highestSeverity(activeFindings),
      auditSuppressedCount: findings.length - activeFindings.length,
    };
  });
}

export function buildAuditGraphData(findings = []) {
  const nodes = [];
  const edges = [];
  const seen = new Set();

  for (const finding of findings) {
    const objectNodeId = `audit-object:${finding.side}:${finding.objectType}:${finding.objectKey}`;
    const findingNodeId = `audit-finding:${finding.id}`;
    addNode(nodes, seen, {
      id: objectNodeId,
      side: "audit-object",
      objectType: finding.objectType,
      label: finding.objectKey,
      key: `${finding.objectType}:${finding.objectKey}`,
      status: finding.suppressed ? "suppressed" : finding.severity,
      virtual: true,
    });
    addNode(nodes, seen, {
      id: findingNodeId,
      side: "relation",
      objectType: "standard-finding",
      label: finding.titleKo,
      key: finding.id,
      status: finding.suppressed ? "suppressed" : finding.severity,
      virtual: true,
    });
    edges.push({
      id: `audit-edge:${finding.id}`,
      source: objectNodeId,
      target: findingNodeId,
      type: finding.suppressed ? "suppressed" : finding.severity,
      label: finding.suppressed ? "예외 처리됨" : AUDIT_SEVERITY_LABELS_KO[finding.severity] || "표준 점검",
      status: finding.suppressed ? "suppressed" : finding.severity,
      changed: !finding.suppressed,
    });

    for (const related of finding.relatedObjects || []) {
      const relatedId = `audit-related:${related.type || "object"}:${related.key || related}`;
      addNode(nodes, seen, {
        id: relatedId,
        side: "relation",
        objectType: related.type || "related",
        label: related.key || String(related),
        key: related.key || String(related),
        status: "relationship",
        virtual: true,
      });
      edges.push({
        id: `audit-related-edge:${finding.id}:${relatedId}`,
        source: objectNodeId,
        target: relatedId,
        type: "references",
        label: "정책 참조",
        status: "relationship",
        changed: false,
      });
    }
  }

  return { nodes, edges };
}

function buildAuditContext(objects, auditProfile, vendor, side, targetVendor) {
  const normalizedObjects = (objects || []).map((object) => ({
    ...object,
    fields: object.fields || object.canonicalFields || {},
  }));
  const byType = groupBy(normalizedObjects, objectType);
  const references = collectPolicyReferences(normalizedObjects);

  return {
    objects: normalizedObjects,
    byType,
    references,
    auditProfile,
    vendor,
    side,
    targetVendor,
    definedPolicies: {
      qos: collectPolicyDefinitions(normalizedObjects, ["qos-policy", "sap-ingress-policy", "sap-egress-policy"]),
      filter: collectPolicyDefinitions(normalizedObjects, ["filter", "acl", "ip-filter", "ipv6-filter"]),
      route: collectPolicyDefinitions(normalizedObjects, ["route-policy", "prefix-list", "community", "as-path-policy"]),
      cpu: collectPolicyDefinitions(normalizedObjects, ["cpu-protection"]),
    },
  };
}

function applyParserCoverageDiagnostics(context, findings) {
  const supported = new Set([
    "port",
    "lag",
    "interface",
    "static-route",
    "pim",
    "bgp",
    "subscriber-interface",
    "group-interface",
    "sap",
    "static-host",
    "default-host",
    "dhcp",
    "icmp-options",
    "sub-sla-mgmt",
    "cpu-protection",
    "qos-policy",
    "filter",
    "acl",
    "route-policy",
    "prefix-list",
    "community",
  ]);

  for (const object of context.objects) {
    if (supported.has(objectType(object))) continue;
    addFinding(findings, context, {
      ruleId: "parser.partial-object-support",
      category: "parser-coverage",
      severity: "manual-review",
      titleKo: "파서 부분 인식 객체",
      descriptionKo: "표준 점검 엔진이 이 객체 타입을 완전히 해석하지 못할 수 있습니다.",
      recommendationKo: "전환 전 원문 라인과 벤더 문법을 수동 검토하세요.",
      object,
      migrationImpact: "review-before-migration",
      confidence: 50,
    });
  }
}

function applyQosRules(context, findings) {
  const rules = context.auditProfile.rules || {};
  const sapObjects = context.byType.get("sap") || [];

  for (const object of sapObjects) {
    if (rules.sapRequiresIngressQos && !getField(object, ["ingress.qos", "ingress.qos.sap-ingress.policy-name"])) {
      addFinding(findings, context, {
        ruleId: "qos.sap-ingress-required",
        category: "qos",
        severity: "warning",
        titleKo: "SAP ingress QoS 누락",
        descriptionKo: "SAP에 표준 ingress QoS 정책 참조가 없습니다.",
        recommendationKo: "표준 SAP ingress QoS 정책을 명시하거나 예외 사유를 등록하세요.",
        object,
        fieldPath: "ingress.qos",
        expectedValue: "ingress QoS policy",
        actualValue: "",
        migrationImpact: "target-default-risk",
      });
    }
    if (rules.sapRequiresEgressQos && !getField(object, ["egress.qos", "egress.qos.sap-egress.policy-name"])) {
      addFinding(findings, context, {
        ruleId: "qos.sap-egress-required",
        category: "qos",
        severity: "warning",
        titleKo: "SAP egress QoS 누락",
        descriptionKo: "SAP에 표준 egress QoS 정책 참조가 없습니다.",
        recommendationKo: "표준 SAP egress QoS 정책을 명시하거나 예외 사유를 등록하세요.",
        object,
        fieldPath: "egress.qos",
        expectedValue: "egress QoS policy",
        actualValue: "",
        migrationImpact: "target-default-risk",
      });
    }

    const ingress = getField(object, ["ingress.qos", "ingress.qos.sap-ingress.policy-name"]);
    const egress = getField(object, ["egress.qos", "egress.qos.sap-egress.policy-name"]);
    if (ingress && egress && normalizeValue(ingress) !== normalizeValue(egress)) {
      addFinding(findings, context, {
        ruleId: "qos.sap-ingress-egress-asymmetry",
        category: "qos",
        severity: "manual-review",
        titleKo: "SAP ingress/egress QoS 비대칭",
        descriptionKo: "Ingress와 egress QoS 정책이 서로 다릅니다.",
        recommendationKo: "의도된 비대칭인지 확인하고 전환 매핑 정책을 명시하세요.",
        object,
        fieldPath: "ingress.qos,egress.qos",
        actualValue: `${ingress} / ${egress}`,
        expectedValue: "프로파일 기준 일관성",
        migrationImpact: "conversion-policy-required",
      });
    }
  }

  if (rules.checkReferencedQosPolicyExists) {
    for (const reference of context.references.filter((item) => item.kind === "qos")) {
      if (context.definedPolicies.qos.size && !context.definedPolicies.qos.has(normalizeValue(reference.value))) {
        addFinding(findings, context, {
          ruleId: "qos.referenced-policy-undefined",
          category: "qos",
          severity: "critical",
          titleKo: "정의되지 않은 QoS 정책 참조",
          descriptionKo: "객체가 참조하는 QoS 정책 정의를 찾지 못했습니다.",
          recommendationKo: "정책 정의를 포함하거나 정책명 매핑을 보정하세요.",
          object: reference.object,
          fieldPath: reference.field,
          actualValue: reference.value,
          expectedValue: "정의된 QoS policy",
          relatedObjects: [{ type: "qos-policy", key: reference.value }],
          migrationImpact: "blocks-auto-generation",
        });
      } else if (!context.definedPolicies.qos.size) {
        addFinding(findings, context, {
          ruleId: "qos.policy-parser-partial",
          category: "qos",
          severity: "manual-review",
          titleKo: "QoS 정책 정의 파서 미지원/부분 인식",
          descriptionKo: "QoS 정책 참조는 있으나 정책 정의 객체를 충분히 파싱하지 못했습니다.",
          recommendationKo: "정책 정의 원문을 확인하고 전환 매핑 정책을 작성하세요.",
          object: reference.object,
          fieldPath: reference.field,
          actualValue: reference.value,
          expectedValue: "파싱된 QoS policy 정의",
          relatedObjects: [{ type: "qos-policy", key: reference.value }],
          migrationImpact: "manual-conversion-required",
          confidence: 60,
        });
      }
    }
  }

  if (rules.checkUnusedQosPolicy && context.definedPolicies.qos.size) {
    const used = new Set(context.references.filter((item) => item.kind === "qos").map((item) => normalizeValue(item.value)));
    for (const policy of context.definedPolicies.qos.values()) {
      if (used.has(normalizeValue(policy.key))) continue;
      addFinding(findings, context, {
        ruleId: "qos.defined-policy-unused",
        category: "qos",
        severity: "info",
        titleKo: "사용되지 않는 QoS 정책",
        descriptionKo: "정의된 QoS 정책을 참조하는 객체가 없습니다.",
        recommendationKo: "전환 대상에 유지할지 삭제할지 결정하세요.",
        object: policy.object,
        fieldPath: "policy",
        actualValue: policy.key,
        expectedValue: "참조되는 정책",
        migrationImpact: "review-before-migration",
      });
    }
  }
}

function applyPolicyRules(context, findings) {
  for (const reference of context.references.filter((item) => item.kind === "filter" || item.kind === "route-policy")) {
    const definitions = reference.kind === "filter" ? context.definedPolicies.filter : context.definedPolicies.route;
    if (definitions.size && !definitions.has(normalizeValue(reference.value))) {
      addFinding(findings, context, {
        ruleId: `${reference.kind}.referenced-policy-undefined`,
        category: reference.kind === "filter" ? "filter-acl" : "routing-policy",
        severity: "critical",
        titleKo: "정의되지 않은 정책 참조",
        descriptionKo: "참조된 정책 객체 정의를 찾지 못했습니다.",
        recommendationKo: "정책 정의를 포함하거나 참조명을 보정하세요.",
        object: reference.object,
        fieldPath: reference.field,
        actualValue: reference.value,
        expectedValue: "정의된 정책",
        relatedObjects: [{ type: reference.kind, key: reference.value }],
        migrationImpact: "blocks-auto-generation",
      });
    } else if (!definitions.size) {
      addFinding(findings, context, {
        ruleId: `${reference.kind}.parser-partial`,
        category: reference.kind === "filter" ? "filter-acl" : "routing-policy",
        severity: "manual-review",
        titleKo: "정책 파서 미지원/부분 인식",
        descriptionKo: "정책 참조는 있으나 정책 본문을 충분히 파싱하지 못했습니다.",
        recommendationKo: "정책 본문, 기본 동작, broad permit 여부를 수동 검토하세요.",
        object: reference.object,
        fieldPath: reference.field,
        actualValue: reference.value,
        expectedValue: "파싱된 정책 정의",
        relatedObjects: [{ type: reference.kind, key: reference.value }],
        migrationImpact: "manual-conversion-required",
        confidence: 60,
      });
    }
  }

  for (const object of context.objects) {
    if (!["filter", "acl", "route-policy"].includes(objectType(object))) continue;
    const raw = rawText(object);
    if (/\bpermit\b.*\b(any|0\.0\.0\.0\/0)\b.*\b(any|0\.0\.0\.0\/0)\b/i.test(raw)) {
      addFinding(findings, context, {
        ruleId: "filter.broad-permit-any-any",
        category: "filter-acl",
        severity: "critical",
        titleKo: "광범위 permit any-any",
        descriptionKo: "필터/ACL에 broad permit 패턴이 있습니다.",
        recommendationKo: "대상, 출발지, 로그/deny 정책을 검토하세요.",
        object,
        fieldPath: "entry.action",
        actualValue: "permit any-any",
        expectedValue: "최소 허용 정책",
        migrationImpact: "review-before-migration",
      });
    }
    if (!/\b(default-action|default-action\s+(drop|deny|accept)|entry\s+\d+)/i.test(raw)) {
      addFinding(findings, context, {
        ruleId: "filter.default-action-missing",
        category: "filter-acl",
        severity: "manual-review",
        titleKo: "필터 기본 동작 확인 필요",
        descriptionKo: "필터/ACL 기본 동작을 파서가 확정하지 못했습니다.",
        recommendationKo: "기본 permit/deny 동작과 벤더 기본값 변화를 확인하세요.",
        object,
        fieldPath: "default-action",
        expectedValue: "명시된 기본 동작",
        migrationImpact: "target-default-risk",
        confidence: 60,
      });
    }
  }
}

function applyBgpRoutingRules(context, findings) {
  const rules = context.auditProfile.rules || {};
  const requireImportPolicy = rules.requireBgpImportPolicy === true || rules.bgpRequiresImportPolicy === true;
  const requireExportPolicy = rules.requireBgpExportPolicy === true || rules.bgpRequiresExportPolicy === true;
  for (const object of context.byType.get("bgp") || []) {
    if (rules.bgpRequiresDescription && !getField(object, ["description"])) {
      addFinding(findings, context, {
        ruleId: "bgp.neighbor-description-required",
        category: "routing-bgp",
        severity: "warning",
        titleKo: "BGP neighbor 설명 누락",
        descriptionKo: "BGP neighbor description이 없습니다.",
        recommendationKo: "운영 표준에 맞는 peer 설명을 추가하세요.",
        object,
        fieldPath: "description",
        expectedValue: "description",
        migrationImpact: "review-before-migration",
      });
    }
    if (rules.bgpRequiresAuthentication && !getField(object, ["authentication-key", "auth-key"])) {
      addFinding(findings, context, {
        ruleId: "bgp.neighbor-auth-required",
        category: "routing-bgp",
        severity: "critical",
        titleKo: "BGP neighbor 인증 누락",
        descriptionKo: "프로파일이 BGP neighbor 인증을 요구하지만 인증 필드가 없습니다.",
        recommendationKo: "인증 정책을 적용하거나 예외 승인 후 진행하세요.",
        object,
        fieldPath: "authentication-key",
        expectedValue: "authentication-key",
        migrationImpact: "blocks-auto-generation",
      });
    }
    if (requireImportPolicy && !getField(object, ["import.policy", "import-policy"])) {
      if (object.bgpInheritance?.groupDefinitionMissing) {
        addFinding(findings, context, {
          ruleId: "bgp.group-inheritance-unresolved",
          category: "routing-bgp",
          severity: "manual-review",
          titleKo: "BGP group 상속 확인 필요",
          descriptionKo: object.bgpInheritance.messageKo || "BGP neighbor group 정의를 현재 대상 구성에서 확인하지 못했습니다.",
          recommendationKo: "partial target fixture인지 확인하고 group 정의에서 상속값을 검증하세요.",
          object,
          fieldPath: "group",
          actualValue: object.groupReference || getField(object, ["group"]),
          expectedValue: "BGP group definition",
          migrationImpact: "review-before-migration",
          confidence: 60,
        });
      } else {
      addFinding(findings, context, {
        ruleId: "bgp.import-policy-required",
        category: "routing-bgp",
        severity: "warning",
        titleKo: "BGP import 정책 누락",
        descriptionKo: "BGP neighbor import policy 참조가 없습니다.",
        recommendationKo: "수신 경로 정책을 명시하세요.",
        object,
        fieldPath: "import.policy",
        expectedValue: "import policy",
        migrationImpact: "target-default-risk",
      });
      }
    }
    if (requireExportPolicy && !getField(object, ["export.policy", "export-policy"])) {
      if (object.bgpInheritance?.groupDefinitionMissing) {
        continue;
      }
      addFinding(findings, context, {
        ruleId: "bgp.export-policy-required",
        category: "routing-bgp",
        severity: "warning",
        titleKo: "BGP export 정책 누락",
        descriptionKo: "BGP neighbor export policy 참조가 없습니다.",
        recommendationKo: "송신 경로 정책을 명시하세요.",
        object,
        fieldPath: "export.policy",
        expectedValue: "export policy",
        migrationImpact: "target-default-risk",
      });
    }
    if (rules.bgpRequiresMaxPrefix && !getField(object, ["max-prefix", "prefix-limit"])) {
      addFinding(findings, context, {
        ruleId: "bgp.max-prefix-required",
        category: "routing-bgp",
        severity: "manual-review",
        titleKo: "BGP max-prefix 확인 필요",
        descriptionKo: "BGP neighbor max-prefix/prefix-limit 설정을 확인하지 못했습니다.",
        recommendationKo: "route leak 방지를 위해 prefix limit 기준을 확인하세요.",
        object,
        fieldPath: "max-prefix",
        expectedValue: "max-prefix",
        migrationImpact: "review-before-migration",
        confidence: 70,
      });
    }
  }

  for (const object of context.byType.get("static-route") || []) {
    const route = getField(object, ["route", "prefix", "address"]);
    const nextHop = getField(object, ["next-hop", "gateway"]);
    if (!nextHop || !isPlausibleNextHop(nextHop)) {
      addFinding(findings, context, {
        ruleId: "static-route.next-hop-invalid",
        category: "routing-bgp",
        severity: "critical",
        titleKo: "Static route next-hop 비정상",
        descriptionKo: "Static route next-hop/gateway가 없거나 비정상 값입니다.",
        recommendationKo: "next-hop 주소 또는 인터페이스 참조를 보정하세요.",
        object,
        fieldPath: "next-hop",
        actualValue: nextHop,
        expectedValue: "정상 next-hop",
        migrationImpact: "blocks-auto-generation",
      });
    }
    if (context.auditProfile.rules.staticRouteDefaultRequiresReview && isDefaultRoute(route)) {
      addFinding(findings, context, {
        ruleId: "static-route.default-review",
        category: "routing-bgp",
        severity: "manual-review",
        titleKo: "Default route 수동 검토",
        descriptionKo: "Default route는 전환 시 라우팅 영향 범위가 큽니다.",
        recommendationKo: "대상 VRF/라우팅 테이블과 next-hop 정책을 검토하세요.",
        object,
        fieldPath: "route",
        actualValue: route,
        expectedValue: "승인된 default route",
        migrationImpact: "review-before-migration",
      });
    }
    validateNumericRange(context, findings, object, "metric", "staticRouteMetricMin", "staticRouteMetricMax", "static-route.metric-range");
    validateNumericRange(context, findings, object, "tag", "staticRouteTagMin", "staticRouteTagMax", "static-route.tag-range");
  }
}

function applySubscriberServiceRules(context, findings) {
  const rules = context.auditProfile.rules || {};
  const groups = new Set((context.byType.get("group-interface") || []).map((object) => normalizeValue(object.normalizedIdentity)));
  const subscribers = new Set((context.byType.get("subscriber-interface") || []).map((object) => normalizeValue(object.normalizedIdentity)));
  const staticHosts = new Map();

  for (const object of context.byType.get("sap") || []) {
    const group = getField(object, ["group-interface"]);
    const subscriber = getField(object, ["subscriber-interface"]);
    if (rules.sapRequiresServiceRelationship && (!group || !subscriber)) {
      addFinding(findings, context, {
        ruleId: "service.sap-relationship-incomplete",
        category: "subscriber-service",
        severity: "warning",
        titleKo: "SAP 서비스 관계 불완전",
        descriptionKo: "SAP의 subscriber-interface/group-interface 관계가 완전하지 않습니다.",
        recommendationKo: "서비스 계층 관계를 보정한 뒤 전환하세요.",
        object,
        fieldPath: "subscriber-interface,group-interface",
        actualValue: `${subscriber || "-"} / ${group || "-"}`,
        expectedValue: "subscriber-interface + group-interface",
        migrationImpact: "conversion-policy-required",
      });
    }
    if (rules.cpuProtectionRequiredOnSap && !hasRelatedObject(context, "cpu-protection", object)) {
      addFinding(findings, context, {
        ruleId: "security.cpu-protection-required",
        category: "management-security",
        severity: "warning",
        titleKo: "CPU protection 누락",
        descriptionKo: "SAP 또는 관련 서비스에 CPU protection 정책이 없습니다.",
        recommendationKo: "표준 CPU protection 정책 적용 여부를 확인하세요.",
        object,
        fieldPath: "cpu-protection",
        expectedValue: "cpu-protection",
        migrationImpact: "target-default-risk",
      });
    }
  }

  for (const object of context.byType.get("group-interface") || []) {
    const subscriber = getField(object, ["subscriber-interface"]);
    if (rules.groupRequiresSubscriberInterface && (!subscriber || !subscribers.has(normalizeValue(subscriber)))) {
      addFinding(findings, context, {
        ruleId: "service.group-subscriber-missing",
        category: "subscriber-service",
        severity: "warning",
        titleKo: "group-interface 상위 subscriber 누락",
        descriptionKo: "group-interface가 참조하는 subscriber-interface를 찾지 못했습니다.",
        recommendationKo: "상위 subscriber-interface 정의와 이름 정규화를 확인하세요.",
        object,
        fieldPath: "subscriber-interface",
        actualValue: subscriber,
        expectedValue: "정의된 subscriber-interface",
        migrationImpact: "conversion-policy-required",
      });
    }
  }

  for (const object of context.byType.get("static-host") || []) {
    const host = getField(object, ["static-host", "address", "prefix"]);
    const key = normalizeValue(host);
    if (!key) continue;
    if (staticHosts.has(key)) {
      addFinding(findings, context, {
        ruleId: "subscriber.static-host-duplicate",
        category: "subscriber-service",
        severity: "critical",
        titleKo: "static-host 중복",
        descriptionKo: "동일 static-host 값이 여러 객체에서 발견되었습니다.",
        recommendationKo: "중복 가입자/호스트 정의 여부를 확인하세요.",
        object,
        fieldPath: "static-host",
        actualValue: host,
        expectedValue: "고유 static-host",
        relatedObjects: [{ type: "static-host", key: objectKey(staticHosts.get(key)) }],
        migrationImpact: "blocks-auto-generation",
      });
    } else {
      staticHosts.set(key, object);
    }
    if (!isPlausiblePrefixOrAddress(host)) {
      addFinding(findings, context, {
        ruleId: "subscriber.static-host-abnormal",
        category: "subscriber-service",
        severity: "warning",
        titleKo: "static-host 값 비정상",
        descriptionKo: "static-host 주소 형식이 비정상입니다.",
        recommendationKo: "가입자 주소 형식을 확인하세요.",
        object,
        fieldPath: "static-host",
        actualValue: host,
        expectedValue: "IPv4 주소 또는 prefix",
        migrationImpact: "review-before-migration",
      });
    }
  }

  for (const object of context.byType.get("dhcp") || []) {
    const group = getField(object, ["group-interface"]);
    if (group && !groups.has(normalizeValue(group))) {
      addFinding(findings, context, {
        ruleId: "subscriber.dhcp-group-missing",
        category: "subscriber-service",
        severity: "warning",
        titleKo: "DHCP group-interface 참조 누락",
        descriptionKo: "DHCP 설정의 group-interface 참조를 찾지 못했습니다.",
        recommendationKo: "DHCP와 group-interface 관계를 확인하세요.",
        object,
        fieldPath: "group-interface",
        actualValue: group,
        expectedValue: "정의된 group-interface",
        migrationImpact: "conversion-policy-required",
      });
    }
  }
}

function applyManagementSecurityRules(context, findings) {
  if (!context.auditProfile.rules.managementPlaneManualReview) return;
  const hasCpuProtection = (context.byType.get("cpu-protection") || []).length > 0;
  const hasManagementAcl = context.references.some((item) => item.kind === "filter" && /mgmt|manage|acl/i.test(String(item.value || "")));
  const anchor = context.objects[0];

  if (!anchor) return;
  if (!hasCpuProtection) {
    addFinding(findings, context, {
      ruleId: "security.cpu-protection-coverage",
      category: "management-security",
      severity: "manual-review",
      titleKo: "Control-plane 보호 확인 필요",
      descriptionKo: "파싱된 객체에서 cpu-protection 적용 범위를 확정하지 못했습니다.",
      recommendationKo: "Control-plane/cpu-protection 표준 적용 여부를 원문에서 확인하세요.",
      object: anchor,
      fieldPath: "cpu-protection",
      expectedValue: "cpu-protection 적용",
      migrationImpact: "target-default-risk",
      confidence: 50,
    });
  }
  if (!hasManagementAcl) {
    addFinding(findings, context, {
      ruleId: "security.management-acl-review",
      category: "management-security",
      severity: "manual-review",
      titleKo: "Management ACL 적용 확인 필요",
      descriptionKo: "관리-plane ACL/filter 적용 여부를 파싱 결과로 확정하지 못했습니다.",
      recommendationKo: "SSH/SNMP/관리 접근 필터와 insecure protocol 차단 여부를 확인하세요.",
      object: anchor,
      fieldPath: "management-filter",
      expectedValue: "관리 ACL/filter",
      migrationImpact: "review-before-migration",
      confidence: 50,
    });
  }
}

function addFinding(findings, context, input) {
  const ruleId = input.ruleId;
  if (context.auditProfile.rules?.[ruleId] === false) return;
  const severity = context.auditProfile.severities?.[ruleId] || input.severity || "info";
  findings.push({ ...input, severity });
}

function normalizeFinding(finding, index, context, profile) {
  const object = finding.object || {};
  const fieldPath = finding.fieldPath || "";
  const rawLines = Array.isArray(object.rawLines) ? object.rawLines : [];
  const sourceLines = rawLines.map((text, lineIndex) => ({
    line: sourceLineNumber(text, context.objects, object, lineIndex),
    text,
  }));
  const policyChecks = rawLines.length
    ? rawLines.map((rawLine, lineIndex) => evaluatePolicySuppression({
      profile,
      rawLine,
      normalizedLine: rawLine,
      sourceLineId: `${context.side}:${sourceLineNumber(rawLine, context.objects, object, lineIndex)}`,
      side: context.side,
      objectType: objectType(object),
      objectKey: objectKey(object),
      fieldPath,
      fieldValue: finding.actualValue,
      ruleId: finding.ruleId,
      category: finding.category || "standards",
      findingType: "standards-audit",
    }))
    : [];
  policyChecks.push(evaluatePolicySuppression({
    profile,
    rawLine: rawLines.join("\n"),
    normalizedLine: rawLines.join("\n"),
    side: context.side,
    objectType: objectType(object),
    objectKey: objectKey(object),
    fieldPath,
    fieldValue: finding.actualValue,
    ruleId: finding.ruleId,
    category: finding.category || "standards",
    findingType: "standards-audit",
  }));
  const policy = policyChecks.find((item) => item.suppressed || item.ignored) || policyChecks[policyChecks.length - 1] || {};
  const suppressed = Boolean(policy.suppressed || policy.ignored);
  const severity = suppressed ? "suppressed" : finding.severity;

  return {
    id: `${context.side}:${finding.ruleId}:${index}:${objectType(object)}:${objectKey(object)}`,
    ruleId: finding.ruleId,
    category: finding.category || "standards",
    severity,
    titleKo: finding.titleKo,
    descriptionKo: finding.descriptionKo,
    recommendationKo: finding.recommendationKo,
    objectType: objectType(object),
    objectKey: objectKey(object),
    side: context.side,
    vendor: context.vendor || object.vendor || "",
    fieldPath,
    actualValue: maskSensitiveValue(fieldPath, finding.actualValue ?? getField(object, [fieldPath])),
    expectedValue: finding.expectedValue ?? "",
    sourceLines,
    relatedObjects: finding.relatedObjects || [],
    migrationImpact: finding.migrationImpact || "review-before-migration",
    policyProfile: context.auditProfile.id,
    ignored: suppressed,
    suppressed,
    suppressionReason: suppressed ? policy.reason || "예외/숨김 처리" : "",
    suppressionPolicy: suppressed ? policy.source || policy.sourcePolicy || "" : "",
    suppressionPolicyId: suppressed ? policy.policyId || "" : "",
    confidence: finding.confidence ?? 100,
  };
}

function collectPolicyReferences(objects) {
  const references = [];
  for (const object of objects) {
    for (const [field, value] of Object.entries(object.fields || {})) {
      if (!POLICY_REFERENCE_FIELDS.includes(field)) continue;
      for (const item of splitReferenceValues(value)) {
        references.push({
          object,
          field,
          value: item,
          kind: referenceKind(field),
        });
      }
    }
  }
  return references;
}

function collectPolicyDefinitions(objects, types) {
  const typeSet = new Set(types);
  const map = new Map();
  for (const object of objects) {
    if (!typeSet.has(objectType(object))) continue;
    const key = normalizeValue(object.normalizedIdentity || object.sourceName || object.fields?.name || object.id);
    if (!key) continue;
    map.set(key, { key, object });
  }
  return map;
}

function referenceKind(field) {
  if (QOS_REFERENCE_FIELDS.includes(field)) return "qos";
  if (FILTER_REFERENCE_FIELDS.includes(field)) return "filter";
  if (ROUTE_POLICY_REFERENCE_FIELDS.includes(field)) return "route-policy";
  if (field === "cpu-protection.policy-id") return "cpu";
  return "policy";
}

function validateNumericRange(context, findings, object, field, minKey, maxKey, ruleId) {
  const value = getField(object, [field]);
  if (value == null || value === "") return;
  const numeric = Number(value);
  const min = Number(context.auditProfile.allowed?.[minKey]);
  const max = Number(context.auditProfile.allowed?.[maxKey]);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    addFinding(findings, context, {
      ruleId,
      category: "routing-bgp",
      severity: "warning",
      titleKo: "Static route 값 범위 초과",
      descriptionKo: `${field} 값이 표준 범위를 벗어났습니다.`,
      recommendationKo: "라우팅 정책 기준값을 확인하세요.",
      object,
      fieldPath: field,
      actualValue: value,
      expectedValue: `${min}-${max}`,
      migrationImpact: "review-before-migration",
    });
  }
}

function hasRelatedObject(context, type, object) {
  const sap = getField(object, ["sap"]);
  const subscriber = getField(object, ["subscriber-interface"]);
  const group = getField(object, ["group-interface"]);
  return (context.byType.get(type) || []).some((candidate) => (
    (!sap || getField(candidate, ["sap"]) === sap) &&
    (!subscriber || getField(candidate, ["subscriber-interface"]) === subscriber) &&
    (!group || getField(candidate, ["group-interface"]) === group)
  ));
}

function addNode(nodes, seen, node) {
  if (seen.has(node.id)) return;
  seen.add(node.id);
  nodes.push(node);
}

function groupFindingsByObject(findings) {
  const map = new Map();
  for (const finding of findings) {
    const key = `${finding.side}:${finding.objectType}:${finding.objectKey}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(finding);
  }
  return map;
}

function objectLookupKey(object, side) {
  return `${side}:${objectType(object)}:${objectKey(object)}`;
}

function groupBy(items, keyFn) {
  return items.reduce((result, item) => {
    const key = keyFn(item);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(item);
    return result;
  }, new Map());
}

function objectType(object = {}) {
  return object.normalizedType || object.type || object.sourceType || "object";
}

function objectKey(object = {}) {
  return String(
    object.normalizedIdentity ||
    object.identity ||
    object.sourceName ||
    object.name ||
    object.id ||
    "-"
  );
}

function getField(object = {}, fields = []) {
  const source = object.fields || object.canonicalFields || {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field) && source[field] != null && source[field] !== "") {
      return source[field];
    }
  }
  return "";
}

function normalizeValue(value) {
  return String(value ?? "").trim().replace(/^["']|["']$/g, "").toLowerCase();
}

function splitReferenceValues(value) {
  if (Array.isArray(value)) return value.flatMap(splitReferenceValues);
  return String(value ?? "")
    .split(/[,\s]+/)
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function rawText(object) {
  return Array.isArray(object.rawLines) ? object.rawLines.join("\n") : "";
}

function sourceLineNumber(_text, _objects, _object, index) {
  return Number(_object.startLine || _object.lineNo || 0) + index || index + 1;
}

function maskSensitiveValue(fieldPath, value) {
  if (value == null) return "";
  if (/password|secret|key|certificate|hash/i.test(String(fieldPath || ""))) return "[민감값 숨김]";
  return value;
}

function isPlausibleNextHop(value) {
  if (Array.isArray(value)) return value.length > 0 && value.every(isPlausibleNextHop);
  const text = String(value || "").trim();
  if (!text) return false;
  if (text.includes(",")) {
    return text.split(",").map((item) => item.trim()).filter(Boolean).every(isPlausibleNextHop);
  }
  if (/^(black-hole|discard|null0)$/i.test(text)) return true;
  return isPlausiblePrefixOrAddress(text) || /^[a-z][\w./:-]+$/i.test(text);
}

function isPlausiblePrefixOrAddress(value) {
  const text = String(value || "").trim();
  const [ip, prefix] = text.split("/");
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (prefix == null) return true;
  const prefixNumber = Number(prefix);
  return Number.isInteger(prefixNumber) && prefixNumber >= 0 && prefixNumber <= 32;
}

function isDefaultRoute(route) {
  return ["0.0.0.0/0", "::/0", "default"].includes(normalizeValue(route));
}

function highestSeverity(findings = []) {
  const order = ["critical", "warning", "manual-review", "unsupported", "info"];
  return order.find((severity) => findings.some((finding) => finding.severity === severity)) || "";
}

function vendorProfileId(vendor = "") {
  if (vendor === "nokia-classic") return "nokia-classic-standard";
  if (vendor === "nokia-md-cli") return "nokia-md-cli-standard";
  return "default-network-standard";
}
