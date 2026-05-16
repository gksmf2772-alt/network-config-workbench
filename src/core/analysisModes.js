import { summarizeAuditFindings } from "./standardsAudit.js";

export const ANALYSIS_MODE_IDS = {
  SIMPLE_COMPARE: "simple-compare",
  SEMANTIC_COMPARE: "semantic-compare",
  SCOPED_COMPARE: "scoped-compare",
  STANDARDS_AUDIT: "standards-audit",
  MIGRATION_READINESS: "migration-readiness",
  DEBUG: "debug/developer",
};

export const ANALYSIS_PRESETS = {
  "simple-compare": {
    labelKo: "단순 비교",
    analysisMode: ANALYSIS_MODE_IDS.SIMPLE_COMPARE,
    standardsAudit: false,
    migrationReadiness: false,
    debugDiagnostics: false,
    showSuppressedDetails: false,
    showOnlyCompareScope: true,
  },
  "semantic-compare": {
    labelKo: "의미 기반 비교",
    analysisMode: ANALYSIS_MODE_IDS.SEMANTIC_COMPARE,
    standardsAudit: false,
    migrationReadiness: false,
    debugDiagnostics: false,
    showSuppressedDetails: false,
    showOnlyCompareScope: true,
  },
  "bgp-neighbor-compare": {
    labelKo: "BGP Neighbor 비교",
    analysisMode: ANALYSIS_MODE_IDS.SCOPED_COMPARE,
    compareScope: "bgp-neighbor-only",
    standardsAudit: false,
    migrationReadiness: false,
    debugDiagnostics: false,
    showSuppressedDetails: false,
    showOnlyCompareScope: true,
  },
  "policy-qos-audit": {
    labelKo: "정책/QoS 표준 점검",
    analysisMode: ANALYSIS_MODE_IDS.STANDARDS_AUDIT,
    standardsAudit: true,
    migrationReadiness: false,
    debugDiagnostics: false,
    showSuppressedDetails: true,
    showOnlyCompareScope: false,
  },
  "migration-readiness": {
    labelKo: "마이그레이션 준비도",
    analysisMode: ANALYSIS_MODE_IDS.MIGRATION_READINESS,
    standardsAudit: false,
    migrationReadiness: true,
    debugDiagnostics: false,
    showSuppressedDetails: true,
    showOnlyCompareScope: false,
  },
  "full-diagnostics": {
    labelKo: "전체 진단",
    analysisMode: ANALYSIS_MODE_IDS.DEBUG,
    standardsAudit: true,
    migrationReadiness: true,
    debugDiagnostics: true,
    showSuppressedDetails: true,
    showOnlyCompareScope: false,
  },
};

const MODE_CONFIG = {
  [ANALYSIS_MODE_IDS.SIMPLE_COMPARE]: ANALYSIS_PRESETS["simple-compare"],
  [ANALYSIS_MODE_IDS.SEMANTIC_COMPARE]: ANALYSIS_PRESETS["semantic-compare"],
  [ANALYSIS_MODE_IDS.SCOPED_COMPARE]: {
    ...ANALYSIS_PRESETS["semantic-compare"],
    labelKo: "범위 지정 비교",
    analysisMode: ANALYSIS_MODE_IDS.SCOPED_COMPARE,
  },
  [ANALYSIS_MODE_IDS.STANDARDS_AUDIT]: ANALYSIS_PRESETS["policy-qos-audit"],
  [ANALYSIS_MODE_IDS.MIGRATION_READINESS]: ANALYSIS_PRESETS["migration-readiness"],
  [ANALYSIS_MODE_IDS.DEBUG]: ANALYSIS_PRESETS["full-diagnostics"],
};

const SCOPE_LABELS_KO = {
  all: "전체",
  "bgp-neighbor-only": "BGP Neighbor",
  "bgp-only": "BGP",
  "static-route-only": "Static Route",
  "interface-only": "Interface",
  "port-lag-only": "Port/LAG",
  "service-sap-only": "Service/SAP",
  custom: "사용자 지정",
};

const SCOPE_OBJECT_TYPES = {
  "bgp-neighbor-only": new Set(["bgp"]),
  "bgp-only": new Set(["bgp"]),
  "static-route-only": new Set(["static-route"]),
  "interface-only": new Set(["interface", "pim"]),
  "port-lag-only": new Set(["port", "lag"]),
  "service-sap-only": new Set([
    "service",
    "sap",
    "subscriber-interface",
    "group-interface",
    "static-host",
    "default-host",
    "dhcp",
    "icmp-options",
    "sub-sla-mgmt",
    "cpu-protection",
  ]),
};

const MIGRATION_IMPACT_VISIBLE = new Set([
  "review-before-migration",
  "conversion-policy-required",
  "unsupported-target",
  "target-default-risk",
  "manual-conversion-required",
  "blocks-auto-generation",
]);

const COMPARE_ONLY_MODES = new Set([
  ANALYSIS_MODE_IDS.SIMPLE_COMPARE,
  ANALYSIS_MODE_IDS.SEMANTIC_COMPARE,
  ANALYSIS_MODE_IDS.SCOPED_COMPARE,
]);

export function resolveAnalysisMode({ mode = "", profile = {}, options = {} } = {}) {
  const explicit =
    mode ||
    options.analysisMode ||
    profile.analysisMode ||
    profile.compareMode ||
    profile.mode ||
    profile.analysis?.mode ||
    "";
  const normalized = normalizeAnalysisMode(explicit);
  if (normalized) return normalized;
  if (options.semanticDebug || profile.debugDiagnostics === true || profile.analysis?.debugDiagnostics === true) {
    return ANALYSIS_MODE_IDS.DEBUG;
  }
  if (profile.migrationReadiness?.enabled === true || profile.analysis?.migrationReadiness === true) {
    return ANALYSIS_MODE_IDS.MIGRATION_READINESS;
  }
  if (profile.standardsAudit?.enabled === true || profile.analysis?.standardsAudit === true) {
    return ANALYSIS_MODE_IDS.STANDARDS_AUDIT;
  }
  return ANALYSIS_MODE_IDS.SIMPLE_COMPARE;
}

export function normalizeAnalysisMode(mode = "") {
  const value = String(mode || "").trim().toLowerCase();
  if (!value) return "";
  if (value === "simple" || value === "simple-compare" || value === "단순 비교") return ANALYSIS_MODE_IDS.SIMPLE_COMPARE;
  if (value === "semantic" || value === "semantic-compare" || value === "의미 기반 비교") return ANALYSIS_MODE_IDS.SEMANTIC_COMPARE;
  if (value === "scoped" || value === "scoped-compare" || value === "bgp-neighbor-compare" || value === "bgp neighbor 비교") return ANALYSIS_MODE_IDS.SCOPED_COMPARE;
  if (value === "standards" || value === "standards-audit" || value === "audit") return ANALYSIS_MODE_IDS.STANDARDS_AUDIT;
  if (value === "migration" || value === "migration-readiness") return ANALYSIS_MODE_IDS.MIGRATION_READINESS;
  if (value === "debug" || value === "developer" || value === "debug/developer" || value === "full-diagnostics") return ANALYSIS_MODE_IDS.DEBUG;
  return "";
}

export function resolveCompareScope({
  scope = "",
  profile = {},
  selectedObjects = [],
  oldText = "",
  newText = "",
} = {}) {
  const explicit =
    scope ||
    profile.compareScope ||
    profile.scope ||
    profile.analysis?.scope ||
    profile.analysis?.compareScope ||
    "";
  const normalized = normalizeCompareScope(explicit);
  if (normalized) return normalized;

  if (Array.isArray(selectedObjects) && selectedObjects.length) {
    const selected = selectedObjects.map((item) => String(item || "").trim()).filter(Boolean);
    if (selected.length === 1 && selected[0] === "bgp") return "bgp-neighbor-only";
    if (selected.length === 1 && selected[0] === "static-route") return "static-route-only";
    if (selected.length && selected.length < 6) return "custom";
  }

  if (looksLikeBgpNeighborOnly(oldText, newText)) return "bgp-neighbor-only";
  return "all";
}

export function normalizeCompareScope(scope = "") {
  const value = String(scope || "").trim().toLowerCase();
  if (!value || value === "all" || value === "전체") return value ? "all" : "";
  if (["bgp-neighbor", "bgp-neighbor-only", "neighbor-only", "bgp neighbor"].includes(value)) return "bgp-neighbor-only";
  if (["bgp", "bgp-only"].includes(value)) return "bgp-only";
  if (["static-route", "static-route-only"].includes(value)) return "static-route-only";
  if (["interface", "interface-only"].includes(value)) return "interface-only";
  if (["port-lag", "port-lag-only"].includes(value)) return "port-lag-only";
  if (["service-sap", "service-sap-only"].includes(value)) return "service-sap-only";
  if (value === "custom") return "custom";
  return "";
}

export function buildAnalysisContext({
  mode = "",
  scope = "",
  profile = {},
  selectedObjects = [],
  oldText = "",
  newText = "",
} = {}) {
  const analysisMode = resolveAnalysisMode({ mode, profile });
  const compareScope = resolveCompareScope({ scope, profile, selectedObjects, oldText, newText });
  const modeConfig = MODE_CONFIG[analysisMode] || MODE_CONFIG[ANALYSIS_MODE_IDS.SIMPLE_COMPARE];
  const standardsAuditVisible = Boolean(modeConfig.standardsAudit);
  const migrationReadinessVisible = Boolean(modeConfig.migrationReadiness);
  const debugDiagnosticsVisible = Boolean(modeConfig.debugDiagnostics);

  return {
    analysisMode,
    compareScope,
    modeLabelKo: modeConfig.labelKo || "단순 비교",
    scopeLabelKo: SCOPE_LABELS_KO[compareScope] || SCOPE_LABELS_KO.custom,
    standardsAuditVisible,
    migrationReadinessVisible,
    debugDiagnosticsVisible,
    compareOnlyMode: COMPARE_ONLY_MODES.has(analysisMode),
    labelsKo: {
      currentScope: `현재 비교 범위: ${SCOPE_LABELS_KO[compareScope] || SCOPE_LABELS_KO.custom}`,
      standardsAudit: standardsAuditVisible ? "표준 점검: 켜짐" : "표준 점검: 꺼짐",
      migrationReadiness: migrationReadinessVisible ? "전환 준비도: 켜짐" : "전환 준비도: 꺼짐",
      debugDiagnostics: debugDiagnosticsVisible ? "고급 진단: 표시" : "고급 진단 숨김",
    },
  };
}

export function getScopeObjectTypes(scope = "all", selectedObjects = []) {
  const normalized = normalizeCompareScope(scope) || "all";
  if (normalized === "custom") {
    return new Set((selectedObjects || []).map(String).filter(Boolean));
  }
  return SCOPE_OBJECT_TYPES[normalized] || null;
}

export function filterPlanByModeScope(plan = [], {
  scope = "all",
  selectedObjects = [],
} = {}) {
  const allowed = getScopeObjectTypes(scope, selectedObjects);
  if (!allowed || !allowed.size) return plan;
  return (plan || []).filter((item) => allowed.has(getPlanObjectType(item)));
}

export function filterAuditFindingsForModeScope(findings = [], {
  mode = "",
  scope = "all",
  selectedObjects = [],
  profile = {},
} = {}) {
  const analysisMode = resolveAnalysisMode({ mode, profile });
  const allowed = getScopeObjectTypes(scope, selectedObjects);
  return (findings || []).filter((finding) => {
    if (COMPARE_ONLY_MODES.has(analysisMode)) {
      return false;
    }
    if (analysisMode === ANALYSIS_MODE_IDS.MIGRATION_READINESS && !MIGRATION_IMPACT_VISIBLE.has(String(finding.migrationImpact || ""))) {
      return Boolean(finding.suppressed || finding.ignored);
    }
    if (allowed?.size && !allowed.has(String(finding.objectType || ""))) {
      return Boolean(finding.suppressed || finding.ignored);
    }
    return true;
  });
}

export function filterAuditForModeScope(audit = {}, context = {}) {
  const findings = filterAuditFindingsForModeScope(audit.findings || [], context);
  return {
    ...audit,
    displayFiltered: true,
    analysisMode: context.analysisMode || context.mode || "",
    compareScope: context.compareScope || context.scope || "all",
    findings,
    summary: summarizeAuditFindings(findings),
  };
}

function looksLikeBgpNeighborOnly(...texts) {
  const lines = texts
    .join("\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("//"));
  if (!lines.length) return false;
  const hasBgp = lines.some((line) => /\bbgp\b|\bneighbor\s+[\da-f:.]+|\bpeer-as\b|\bimport\b|\bexport\b/i.test(line));
  if (!hasBgp) return false;
  const unrelated = lines.some((line) =>
    /\b(sap|lag|port|static-route|static route|qos|filter|acl|subscriber-interface|group-interface|dhcp|cpu-protection)\b/i.test(line)
  );
  return !unrelated;
}

function getPlanObjectType(item = {}) {
  return String(
    item.objectType ||
    item.oldObject?.normalizedType ||
    item.newObject?.normalizedType ||
    item.oldObject?.type ||
    item.newObject?.type ||
    ""
  );
}
