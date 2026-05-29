import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
  renderComparisonPlanHtml,
} from "../src/core/comparator.js";
import { buildSemanticCoverageDiagnostics } from "../src/core/coverageDiagnostics.js";
import { buildSummaryDashboardData } from "../src/core/summaryAnalytics.js";
import {
  attachAuditFindingsToPlan,
  runStandardsAuditForSides,
} from "../src/core/standardsAudit.js";
import { getVendorPairSupportState } from "../src/core/vendorPresets.js";

export const REPO_ROOT = process.cwd();
export const RESULTS_DIR = "validation-results";
export const MANIFEST_PATH = "validation/compare-validation.manifest.json";

const SEARCH_DIRS = [
  "examples",
  "example",
  "samples",
  "sample",
  "fixtures",
  "fixture",
  "tests",
  "test",
  "validation",
  "configs",
  "config",
  "profiles",
  "presets",
  "sessions",
  "data",
  "public",
  "src",
  "scripts",
  "예제 및 테스트 설정",
  ".",
];

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "validation-results",
]);

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".cfg",
  ".conf",
  ".json",
  ".js",
  ".mjs",
  ".md",
]);

const VALID_MIGRATION_IMPACTS = new Set([
  "no-impact",
  "review-before-migration",
  "conversion-policy-required",
  "unsupported-target",
  "target-default-risk",
  "manual-conversion-required",
  "blocks-auto-generation",
]);

export function parseCliArgs(argv = process.argv.slice(2)) {
  const result = {
    strictMissingFixtures: false,
    mode: "compare",
    writeReports: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--strict-missing-fixtures") result.strictMissingFixtures = true;
    if (arg === "--mode") result.mode = argv[index + 1] || result.mode;
    if (arg === "--no-write") result.writeReports = false;
  }

  return result;
}

export function ensureDir(relativeDir) {
  fs.mkdirSync(absPath(relativeDir), { recursive: true });
}

export function absPath(relativePath = "") {
  return path.resolve(REPO_ROOT, relativePath);
}

export function toRepoPath(filePath = "") {
  return path.relative(REPO_ROOT, filePath).replaceAll(path.sep, "/");
}

export function readText(relativePath) {
  return fs.readFileSync(resolveReadablePath(relativePath), "utf8");
}

export function readJson(relativePath, fallback = {}) {
  if (!relativePath || !fs.existsSync(resolveReadablePath(relativePath))) return fallback;
  return JSON.parse(readText(relativePath));
}

function resolveReadablePath(relativePath = "") {
  const primary = absPath(relativePath);
  if (fs.existsSync(primary)) return primary;

  const basename = path.basename(String(relativePath || ""));
  if (!basename) return primary;

  for (const fixtureDir of externalFixtureDirCandidates()) {
    const candidate = path.join(fixtureDir, basename);
    if (fs.existsSync(candidate)) return candidate;
  }

  return primary;
}

function externalFixtureDirCandidates() {
  const candidates = [
    process.env.NCW_FIXTURE_DIR || "",
    path.resolve(REPO_ROOT, "..", "network-config-workbench-home", "예제 및 테스트 설정"),
    path.resolve(REPO_ROOT, "..", "예제 및 테스트 설정"),
  ].filter(Boolean);
  const seen = new Set();

  return candidates.filter((candidate) => {
    const resolved = path.resolve(candidate);
    const key = resolved.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return fs.existsSync(resolved);
  });
}

export function writeJson(relativePath, data) {
  ensureDir(path.dirname(relativePath));
  fs.writeFileSync(absPath(relativePath), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function writeText(relativePath, text) {
  ensureDir(path.dirname(relativePath));
  fs.writeFileSync(absPath(relativePath), text, "utf8");
}

export function discoverInventory() {
  const files = collectCandidateFiles();
  const inventory = {
    generatedAt: new Date().toISOString(),
    searchedPaths: SEARCH_DIRS,
    foundConfigFiles: [],
    foundSourceFiles: [],
    foundTargetFiles: [],
    foundProfiles: [],
    foundPresets: [],
    foundExceptionPolicies: [],
    foundAdvancedComparePolicies: [],
    foundStandardsAuditProfiles: [],
    foundSavedSessions: [],
    foundManualMappingData: [],
    unknownOrAmbiguousFiles: [],
    missingInputs: [],
  };

  for (const file of files) {
    const classification = classifyFile(file);
    if (!classification) continue;

    if (classification.kind === "config") {
      inventory.foundConfigFiles.push(classification);
      if (classification.role === "source") inventory.foundSourceFiles.push(classification);
      if (classification.role === "target") inventory.foundTargetFiles.push(classification);
      continue;
    }
    if (classification.kind === "profile") inventory.foundProfiles.push(classification);
    else if (classification.kind === "preset") inventory.foundPresets.push(classification);
    else if (classification.kind === "exception-policy") inventory.foundExceptionPolicies.push(classification);
    else if (classification.kind === "advanced-compare-policy") inventory.foundAdvancedComparePolicies.push(classification);
    else if (classification.kind === "standards-audit-profile") inventory.foundStandardsAuditProfiles.push(classification);
    else if (classification.kind === "saved-session") inventory.foundSavedSessions.push(classification);
    else if (classification.kind === "manual-mapping") inventory.foundManualMappingData.push(classification);
    else inventory.unknownOrAmbiguousFiles.push(classification);
  }

  const realJuniper = inventory.foundSourceFiles.some((item) => item.vendor === "juniper-set" && !item.synthetic);
  if (!realJuniper) {
    inventory.missingInputs.push({
      id: "juniper-source-config",
      messageKo: "Juniper 원본 설정 파일이 없어 실제 비교 검증을 수행할 수 없습니다.",
      searchedPatterns: [
        "Juniper",
        "juniper",
        "JUNOS",
        "junos",
        "set interfaces",
        "set routing-options",
        "set protocols bgp",
        "set policy-options",
      ],
    });
  }

  sortInventory(inventory);
  return inventory;
}

export function writeInventoryReports(inventory = discoverInventory()) {
  writeJson(`${RESULTS_DIR}/inventory.json`, inventory);
  writeText(`${RESULTS_DIR}/inventory.md`, renderInventoryMarkdown(inventory));
  return inventory;
}

export function loadManifest() {
  return readJson(MANIFEST_PATH, { version: 1, cases: [] });
}

export function loadValidationProfile(testCase = {}) {
  const profile = readJson(testCase.profilePath, {
    name: `${testCase.id || "validation"}-default-profile`,
  });

  const overlays = [
    testCase.advancedComparePolicyPath,
    testCase.lineExceptionPolicyPath,
    testCase.fieldAliasesPath,
    testCase.exceptionPolicyPath && testCase.exceptionPolicyPath !== testCase.profilePath
      ? testCase.exceptionPolicyPath
      : "",
  ]
    .filter(Boolean)
    .map((policyPath) => readJson(policyPath, null))
    .filter(Boolean);

  for (const overlay of overlays) {
    mergeValidationProfile(profile, overlay);
  }

  if (testCase.standardsAuditProfile && !profile.standardsAudit?.profileId) {
    profile.standardsAudit = {
      ...(profile.standardsAudit || {}),
      profileId: testCase.standardsAuditProfile,
    };
  }

  return profile;
}

function mergeValidationProfile(target = {}, overlay = {}) {
  if (!overlay || typeof overlay !== "object") return target;

  if (overlay.rules?.ignore) {
    target.rules = {
      ...(target.rules || {}),
      ignore: [
        ...(Array.isArray(target.rules?.ignore) ? target.rules.ignore : []),
        ...(Array.isArray(overlay.rules.ignore) ? overlay.rules.ignore : []),
      ],
    };
  }

  if (overlay.validationPolicies) {
    target.validationPolicies = mergeValidationPolicies(
      target.validationPolicies || {},
      overlay.validationPolicies,
    );
  }

  if (overlay.fieldAliases) {
    target.fieldAliases = {
      ...(target.fieldAliases || {}),
      ...overlay.fieldAliases,
    };
  }

  if (overlay.semanticAliases) {
    target.semanticAliases = [
      ...(Array.isArray(target.semanticAliases) ? target.semanticAliases : []),
      ...(Array.isArray(overlay.semanticAliases) ? overlay.semanticAliases : []),
    ];
  }

  if (overlay.exceptions) {
    target.exceptions = [
      ...(Array.isArray(target.exceptions) ? target.exceptions : []),
      ...(Array.isArray(overlay.exceptions) ? overlay.exceptions : []),
    ];
  }

  if (overlay.fixturePolicy) {
    target.fixturePolicy = {
      ...(target.fixturePolicy || {}),
      ...overlay.fixturePolicy,
    };
  }

  if (overlay.standardsAudit) {
    target.standardsAudit = {
      ...(target.standardsAudit || {}),
      ...overlay.standardsAudit,
      rules: {
        ...(target.standardsAudit?.rules || {}),
        ...(overlay.standardsAudit.rules || {}),
      },
      severities: {
        ...(target.standardsAudit?.severities || {}),
        ...(overlay.standardsAudit.severities || {}),
      },
    };
  }

  return target;
}

function mergeValidationPolicies(base = {}, overlay = {}) {
  const merged = { ...base };
  for (const [objectType, entries] of Object.entries(overlay || {})) {
    const current = merged[objectType];
    if (Array.isArray(current) || Array.isArray(entries)) {
      merged[objectType] = [
        ...(Array.isArray(current) ? current : objectPolicyObjectToArray(current)),
        ...(Array.isArray(entries) ? entries : objectPolicyObjectToArray(entries)),
      ];
      continue;
    }
    merged[objectType] = {
      ...(current || {}),
      ...(entries || {}),
    };
  }
  return merged;
}

function objectPolicyObjectToArray(value = {}) {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).map(([field, policy]) => ({ field, policy }));
}

export function runManifestValidation({
  mode = "compare",
  strictMissingFixtures = false,
  writeReports = true,
} = {}) {
  const manifest = loadManifest();
  const inventory = discoverInventory();
  const cases = manifest.cases || [];
  const results = [];

  for (const testCase of cases) {
    if (isBlockedCase(testCase, inventory)) {
      const blocked = blockedCaseResult(testCase, strictMissingFixtures);
      results.push(blocked);
      if (strictMissingFixtures && blocked.status === "failed") break;
      continue;
    }
    if (!testCase.enabled) {
      results.push({
        id: testCase.id,
        status: "skipped",
        synthetic: Boolean(testCase.synthetic),
        reason: "disabled",
      });
      continue;
    }

    try {
      results.push(runValidationCase(testCase, { mode }));
    } catch (error) {
      results.push({
        id: testCase.id,
        status: "failed",
        synthetic: Boolean(testCase.synthetic),
        mode,
        reason: error.message,
        stack: error.stack,
      });
    }
  }

  const summary = summarizeValidationRun({
    command: `validate:${mode}`,
    mode,
    results,
    inventory,
  });

  if (writeReports) {
    writeJson(`${RESULTS_DIR}/${mode}-summary.json`, summary);
    writeText(`${RESULTS_DIR}/${mode}-summary.md`, renderValidationMarkdown(summary));
  }

  return summary;
}

export function writeFinalReports({
  inventory = discoverInventory(),
  validationSummaries = [],
  commandResults = [],
  qualityAnalysis = null,
} = {}) {
  const manifest = loadManifest();
  const final = {
    generatedAt: new Date().toISOString(),
    inventory,
    manifestPath: MANIFEST_PATH,
    cases: manifest.cases || [],
    validationSummaries,
    commandResults,
    qualityAnalysis,
    remainingLimitations: [
      "Juniper 실제 설정 기반 검증은 source-juniper.conf 추가 전까지 blocked 상태입니다.",
      "Synthetic Juniper smoke fixture는 production migration/comparison pass로 계산하지 않습니다.",
      "Config generation/migration 엔진은 아직 구현되지 않아 migration-readiness만 검증합니다.",
      "Filter/QoS/route-policy 본문 파싱은 placeholder/부분 지원이며 manual-review finding으로 추적합니다.",
      "UI smoke는 별도 브라우저 테스트 프레임워크 없이 pure data helper 기준으로 검증했습니다.",
    ],
  };
  writeJson(`${RESULTS_DIR}/final-validation-report.json`, final);
  writeText(`${RESULTS_DIR}/final-validation-report.md`, renderFinalMarkdown(final));
  return final;
}

export function runValidationCase(testCase, {
  mode = "compare",
} = {}) {
  const profile = loadValidationProfile(testCase);

  const sourceText = loadCaseSourceText(testCase);
  const targetText = loadCaseTargetText(testCase);

  assert(sourceText.trim().length > 0, `${testCase.id}: source config empty`);
  assert(targetText.trim().length > 0, `${testCase.id}: target config empty`);
  if (testCase.sourceVendor === "juniper-set" && testCase.sourceSyntax === "set") {
    assert(isJuniperSetStyle(sourceText), `${testCase.id}: Juniper source is not set-style`);
  }

  const oldResult = normalizeConfig({
    vendor: testCase.sourceVendor,
    profile,
    configText: sourceText,
    side: "old",
  });
  const newResult = normalizeConfig({
    vendor: testCase.targetVendor,
    profile,
    configText: targetText,
    side: "new",
  });
  assertParserResult(testCase, oldResult, "old");
  assertParserResult(testCase, newResult, "new");

  const matches = matchNormalizedObjects({
    oldObjects: oldResult.objects,
    newObjects: newResult.objects,
    manualMap: profile.manualMap || {},
    profile,
  });
  const rawPlan = createComparisonPlan(matches, profile);
  const audit = runStandardsAuditForSides({
    oldResult,
    newResult,
    profile,
    oldVendor: testCase.sourceVendor,
    newVendor: testCase.targetVendor,
  });
  const plan = attachAuditFindingsToPlan(rawPlan, audit);
  const coverage = buildSemanticCoverageDiagnostics({
    oldText: sourceText,
    newText: targetText,
    oldResult,
    newResult,
    plan,
    profile,
  });
  const semanticSummary = buildSemanticSummary(plan, coverage);
  const support = getVendorPairSupportState(testCase.sourceVendor, testCase.targetVendor);
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan,
    semanticSummary,
    manualMap: profile.manualMap || {},
    vendorPair: {
      oldVendor: testCase.sourceVendor,
      newVendor: testCase.targetVendor,
    },
    support,
    profileName: profile.name || "",
    sessionName: testCase.id,
    coverageDiagnostics: coverage,
    audit,
    fixtureScope: profile.fixturePolicy || { status: testCase.fixtureCompleteness },
  });
  const compareHtml = renderComparisonPlanHtml(plan);
  const migrationReadiness = buildMigrationReadiness(audit);
  const result = {
    id: testCase.id,
    status: "passed",
    synthetic: Boolean(testCase.synthetic),
    productionValidation: testCase.productionValidation !== false && !testCase.synthetic,
    mode,
    sourcePath: testCase.sourceConfigPath,
    targetPaths: getTargetPaths(testCase),
    sourceVendor: testCase.sourceVendor,
    targetVendor: testCase.targetVendor,
    parser: {
      oldObjects: oldResult.objects.length,
      newObjects: newResult.objects.length,
      oldEligibleLines: coverage.sides.old.eligibleLineCount,
      newEligibleLines: coverage.sides.new.eligibleLineCount,
      recognizedLines: coverage.recognizedLineCount,
      unsupportedLines: coverage.unparsedLineCount,
      routerLogWrapperLines: coverage.wrapperLineCount,
      sourceLineMappingStatus: coverage.linesWithoutSourceMapping ? "partial" : "ok",
    },
    semantic: {
      planItems: plan.length,
      matched: dashboard.counts.matched,
      unmatchedOld: dashboard.counts.oldOnly,
      unmatchedNew: dashboard.counts.newOnly,
      ambiguous: dashboard.counts.ambiguous,
      lowConfidence: dashboard.counts.lowConfidence,
      fieldOverlapPercent: dashboard.fieldAnalysis.aggregate.overlapPercent,
      coveragePercent: coverage.coveragePercent,
      suppressedLines: coverage.ignoredLineCount,
    },
    policy: {
      ignoredPolicyFields: countIgnoredPolicyFields(plan),
      suppressedAuditFindings: audit.summary.suppressed,
      activeAuditFindings: audit.summary.active,
    },
    audit: {
      summary: audit.summary,
      categories: audit.summary.byCategory,
      migrationImpact: audit.summary.byMigrationImpact,
      findingCount: audit.findings.length,
    },
    report: {
      summaryCounts: dashboard.counts,
      reviewCounts: getReviewCounts(dashboard.review),
      severity: dashboard.severity,
    },
    graph: {
      nodes: dashboard.graph.nodes.length,
      edges: dashboard.graph.edges.length,
      invalidEdges: findInvalidGraphEdges(dashboard.graph),
    },
    migrationReadiness,
    compare: {
      htmlLength: compareHtml.length,
      hasUndefined: compareHtml.includes("undefined"),
      hasNaN: compareHtml.includes("NaN"),
    },
    diagnostics: {
      coverageReason: coverage.reason,
      oldUnparsedSample: coverage.sides.old.unparsedLines.slice(0, 8),
      newUnparsedSample: coverage.sides.new.unparsedLines.slice(0, 8),
    },
  };

  validateCanonicalResult({
    testCase,
    oldResult,
    newResult,
    plan,
    audit,
    coverage,
    dashboard,
    compareHtml,
    result,
  });
  result.signature = buildResultSignature(result);
  return result;
}

function collectCandidateFiles() {
  const files = [];
  const seen = new Set();
  for (const dir of SEARCH_DIRS) {
    const absolute = absPath(dir);
    if (!fs.existsSync(absolute)) continue;
    const stat = fs.statSync(absolute);
    if (stat.isFile()) addFile(absolute);
    else walk(absolute, addFile);
  }
  return files;

  function addFile(filePath) {
    const relative = toRepoPath(filePath);
    if (seen.has(relative)) return;
    seen.add(relative);
    const ext = path.extname(relative).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) return;
    files.push({
      path: relative,
      absPath: filePath,
      size: fs.statSync(filePath).size,
    });
  }
}

function walk(dir, addFile) {
  const baseName = path.basename(dir);
  if (EXCLUDED_DIRS.has(baseName)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) walk(absolute, addFile);
      continue;
    }
    if (entry.isFile()) addFile(absolute);
  }
}

function classifyFile(file) {
  let text = "";
  try {
    text = fs.readFileSync(file.absPath, "utf8");
  } catch {
    return null;
  }
  const lowerPath = file.path.toLowerCase();
  const ext = path.extname(file.path).toLowerCase();
  const configLikeFile = [".txt", ".cfg", ".conf"].includes(ext);
  const sample = text.slice(0, 240000);
  const signals = [];
  const synthetic = lowerPath.includes("/synthetic/");

  const juniperSignals = [
    /juniper/i,
    /junos/i,
    /^set interfaces /im,
    /^set routing-options /im,
    /^set protocols bgp /im,
    /^set policy-options /im,
  ].filter((regex) => regex.test(sample)).length;
  if (configLikeFile && juniperSignals) {
    signals.push("juniper");
    return {
      kind: "config",
      role: "source",
      path: file.path,
      size: file.size,
      vendor: "juniper-set",
      syntax: /^set /im.test(sample) ? "set" : "unknown",
      synthetic,
      confidence: juniperSignals >= 2 ? "high" : "medium",
      signals,
    };
  }

  if (configLikeFile && /TiMOS-C-15|admin display-config|A:\S+#|static-route-entry|Nokia 7750/i.test(sample) && !/^\/configure\s*\{/im.test(sample)) {
    signals.push("nokia-classic", /A:\S+#/.test(sample) ? "router-log" : "config");
    return {
      kind: "config",
      role: "source",
      path: file.path,
      size: file.size,
      vendor: "nokia-classic",
      syntax: "classic-cli",
      version: /TiMOS-C-15/i.test(sample) ? "15" : "unknown",
      routerLog: /admin display-config|A:\S+#/.test(sample),
      synthetic,
      confidence: "high",
      signals,
    };
  }

  if (configLikeFile && (/^\/configure\s*\{/im.test(sample) || /\brouter "Base"\b/i.test(sample))) {
    signals.push("nokia-md-cli");
    return {
      kind: "config",
      role: "target",
      path: file.path,
      size: file.size,
      vendor: "nokia-md-cli",
      syntax: "md-cli",
      version: lowerPath.includes("22") ? "22" : "unknown",
      synthetic,
      confidence: "high",
      signals,
    };
  }

  if (
    ext === ".json" &&
    !lowerPath.includes("/profiles/") &&
    !lowerPath.includes("manifest") &&
    (
      lowerPath.includes("advanced-policy") ||
      lowerPath.includes("field-aliases") ||
      /advanced compare|field aliases|fieldAliases|validationPolicies|policy":\s*"(ignore|exception|required)"/i.test(sample)
    )
  ) {
    return { kind: "advanced-compare-policy", path: file.path, size: file.size, signals: ["advanced-policy"] };
  }
  if (ext === ".json" && !lowerPath.includes("/profiles/") && (lowerPath.includes("line-exceptions") || /rules"\s*:\s*\{\s*"ignore|matchMode|sourcePolicy/i.test(sample))) {
    return { kind: "exception-policy", path: file.path, size: file.size, signals: ["exception-policy"] };
  }
  if (lowerPath.includes("profile") && ext === ".json") {
    return { kind: "profile", path: file.path, size: file.size, signals: ["profile-json"] };
  }
  if (/vendorPreset|VENDOR_PRESET|VENDOR_IDS|vendorPresets/i.test(sample)) {
    return { kind: "preset", path: file.path, size: file.size, signals: ["vendor-preset"] };
  }
  if (/standardsAudit|STANDARDS_AUDIT|default-network-standard|classic-to-mdcli-migration-standard/i.test(sample)) {
    return { kind: "standards-audit-profile", path: file.path, size: file.size, signals: ["standards-audit"] };
  }
  if (/manualMap|manual-mapping|manualMappings/i.test(sample)) {
    return { kind: "manual-mapping", path: file.path, size: file.size, signals: ["manual-map"] };
  }
  if (/sessionName|lastComparedAt|saved session/i.test(sample)) {
    return { kind: "saved-session", path: file.path, size: file.size, signals: ["session"] };
  }

  if (/(config|profile|preset|session|fixture|예제|설정)/i.test(lowerPath)) {
    return { kind: "unknown", path: file.path, size: file.size, signals: ["ambiguous-name"] };
  }
  return null;
}

function sortInventory(inventory) {
  for (const key of Object.keys(inventory)) {
    if (Array.isArray(inventory[key])) {
      inventory[key].sort((left, right) => String(left.path || left.id || "").localeCompare(String(right.path || right.id || "")));
    }
  }
}

function renderInventoryMarkdown(inventory) {
  const sections = [
    ["Found Config Files", inventory.foundConfigFiles],
    ["Found Old/Source Files", inventory.foundSourceFiles],
    ["Found New/Target Files", inventory.foundTargetFiles],
    ["Found Profiles", inventory.foundProfiles],
    ["Found Presets", inventory.foundPresets],
    ["Found Exception/Ignore Policies", inventory.foundExceptionPolicies],
    ["Found Advanced Compare Policies", inventory.foundAdvancedComparePolicies],
    ["Found Standards Audit Profiles", inventory.foundStandardsAuditProfiles],
    ["Found Saved Sessions", inventory.foundSavedSessions],
    ["Found Manual Mapping Data", inventory.foundManualMappingData],
    ["Unknown Or Ambiguous Files", inventory.unknownOrAmbiguousFiles],
  ];

  return [
    "# Validation Inventory",
    "",
    `Generated: ${inventory.generatedAt}`,
    "",
    "## Searched Paths",
    ...inventory.searchedPaths.map((item) => `- ${item}`),
    "",
    ...sections.flatMap(([title, rows]) => [
      `## ${title}`,
      rows.length
        ? rows.map((item) => `- ${item.path}${item.vendor ? ` (${item.vendor}${item.syntax ? `, ${item.syntax}` : ""})` : ""}${item.synthetic ? " [synthetic]" : ""}`).join("\n")
        : "- none",
      "",
    ]),
    "## Missing Inputs",
    inventory.missingInputs.length
      ? inventory.missingInputs.map((item) => `- ${item.id}: ${item.messageKo || item.reason || ""}`).join("\n")
      : "- none",
    "",
  ].join("\n");
}

function isBlockedCase(testCase, inventory) {
  if (testCase.status === "blocked" || testCase.enabled === false && testCase.blockedReason) return true;
  if (testCase.id === "juniper-to-nokia-mdcli-22") {
    return !inventory.foundSourceFiles.some((item) => item.vendor === "juniper-set" && !item.synthetic);
  }
  return false;
}

function blockedCaseResult(testCase, strictMissingFixtures) {
  return {
    id: testCase.id,
    status: strictMissingFixtures ? "failed" : "blocked",
    synthetic: Boolean(testCase.synthetic),
    reason: testCase.blockedReason || "blocked",
    messageKo: testCase.notesKo || "필수 입력이 없어 검증을 수행할 수 없습니다.",
    requiredInputs: testCase.requiredInputs || [],
  };
}

function loadCaseSourceText(testCase) {
  assert(testCase.sourceConfigPath, `${testCase.id}: sourceConfigPath missing`);
  assert(fs.existsSync(resolveReadablePath(testCase.sourceConfigPath)), `${testCase.id}: source config missing: ${testCase.sourceConfigPath}`);
  return readText(testCase.sourceConfigPath);
}

function loadCaseTargetText(testCase) {
  const paths = getTargetPaths(testCase);
  assert(paths.length > 0, `${testCase.id}: target config path missing`);
  return paths.map((targetPath) => {
    assert(fs.existsSync(resolveReadablePath(targetPath)), `${testCase.id}: target config missing: ${targetPath}`);
    return readText(targetPath);
  }).join("\n");
}

function getTargetPaths(testCase) {
  if (Array.isArray(testCase.targetConfigPaths)) return testCase.targetConfigPaths;
  if (testCase.targetConfigPath) return [testCase.targetConfigPath];
  return [];
}

function isJuniperSetStyle(text = "") {
  const configLines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const setLines = configLines.filter((line) => /^set\s+/.test(line));
  return setLines.length > 0 && setLines.length / configLines.length >= 0.5;
}

function assertParserResult(testCase, result, side) {
  assert(Array.isArray(result.objects), `${testCase.id}: ${side} parser did not return objects`);
  assert(result.objects.length > 0, `${testCase.id}: ${side} parsed object count is 0`);
  for (const object of result.objects) {
    const type = object.normalizedType || object.type;
    const key = object.normalizedIdentity || object.sourceName || object.id;
    assert(type && !/undefined|nan/i.test(String(type)), `${testCase.id}: invalid object type`);
    assert(key && !/undefined|nan/i.test(String(key)), `${testCase.id}: invalid object key for ${type}`);
    assert(Array.isArray(object.rawLines) && object.rawLines.length > 0, `${testCase.id}: source line reference missing for ${side} ${type}:${key}`);
  }
}

function buildSemanticSummary(plan, coverage) {
  const reviewable = plan.filter((item) => !item.policySuppressed);
  const scored = reviewable.filter((item) => Number.isFinite(Number(item.score)));
  const matched = reviewable.filter((item) => item.status === "matched").length;
  return {
    totalObjects: reviewable.length,
    matched,
    oldOnly: reviewable.filter((item) => item.status === "old-only").length,
    newOnly: reviewable.filter((item) => item.status === "new-only").length,
    ambiguous: reviewable.filter((item) => item.ambiguousAlternatives?.length).length,
    lowConfidence: reviewable.filter((item) => Number(item.score || 0) > 0 && Number(item.score || 0) < 80).length,
    averageScore: scored.length
      ? Math.round(scored.reduce((sum, item) => sum + Number(item.score), 0) / scored.length)
      : 0,
    matchPercent: reviewable.length ? Math.round((matched / reviewable.length) * 100) : 0,
    coveragePercent: coverage.coveragePercent,
    lineCovered: coverage.recognizedLineCount,
    lineTotal: coverage.eligibleLineCount,
    noopSuppressed: coverage.ignoredLineCount,
    coverageDiagnostics: coverage,
  };
}

function validateCanonicalResult({
  testCase,
  oldResult,
  newResult,
  plan,
  audit,
  coverage,
  dashboard,
  compareHtml,
  result,
}) {
  assert(coverage.eligibleLineCount > 0, `${testCase.id}: eligible config line count is 0`);
  assert(coverage.coveragePercent !== 0 || coverage.recognizedLineCount === 0, `${testCase.id}: false 0% coverage`);
  assert(coverage.coveragePercent !== null || coverage.eligibleLineCount === 0, `${testCase.id}: coverage unavailable with eligible lines`);
  assert(dashboard.counts.oldOnly === dashboard.review.unmatchedOld.length, `${testCase.id}: Summary old-only count mismatch`);
  assert(dashboard.counts.newOnly === dashboard.review.unmatchedNew.length, `${testCase.id}: Summary new-only count mismatch`);
  assert(dashboard.counts.ambiguous === dashboard.review.ambiguous.length, `${testCase.id}: Summary ambiguous count mismatch`);
  assert(dashboard.counts.lowConfidence === dashboard.review.lowConfidence.length, `${testCase.id}: Summary low-confidence count mismatch`);
  assert(dashboard.counts.auditActive === audit.summary.active, `${testCase.id}: audit active count mismatch`);
  assert(dashboard.counts.auditSuppressed === audit.summary.suppressed, `${testCase.id}: audit suppressed count mismatch`);
  assert(compareHtml.length > 0, `${testCase.id}: compare HTML empty`);
  assert(!compareHtml.includes("undefined"), `${testCase.id}: undefined visible in compare data`);
  assert(!compareHtml.includes("NaN"), `${testCase.id}: NaN visible in compare data`);
  assertNoDuplicateObjectIds(testCase, oldResult.objects, "old");
  assertNoDuplicateObjectIds(testCase, newResult.objects, "new");
  assertNoObjectStatusConflict(testCase, plan);
  assertGraphValid(testCase, dashboard.graph);
  assertFindingsValid(testCase, audit.findings);

  if (testCase.id === "nokia-classic15-to-nokia-mdcli-22") {
    assert(oldResult.preprocess?.diagnostics?.wrapperLineCount > 0, `${testCase.id}: router-log wrapper not detected`);
    assert(coverage.wrapperLineCount > 0, `${testCase.id}: wrapper lines not reported`);
    assert(plan.some((item) => item.objectType === "bgp" && item.status === "matched"), `${testCase.id}: Classic BGP did not map to MD-CLI BGP`);
    if ((result.targetPaths || []).some((targetPath) => /static/i.test(targetPath))) {
      assert(plan.some((item) => item.objectType === "static-route" && ["matched", "candidate"].includes(item.status)), `${testCase.id}: Classic static route did not produce MD-CLI static route mapping candidates`);
    }
    assert(countIgnoredPolicyFields(plan) > 0, `${testCase.id}: exception/advanced policy not applied`);
    assert(dashboard.review.abnormal.every((item) => !(item.fields || []).some((field) => ["metric", "authentication-key"].includes(field))), `${testCase.id}: ignored field counted as abnormal`);
    assert(audit.summary.suppressed > 0, `${testCase.id}: standards audit did not respect exception policy`);
  }

  if (testCase.sourceVendor === "juniper-set") {
    assert(oldResult.objects.length > 0, `${testCase.id}: Juniper parser produced no objects`);
    if (testCase.synthetic) {
      result.notesKo = "Juniper 실제 설정 기반 검증은 수행되지 않았습니다. Synthetic smoke fixture만 사용했습니다.";
    }
  }
}

function assertNoDuplicateObjectIds(testCase, objects, side) {
  const seen = new Set();
  for (const object of objects) {
    const key = object.id;
    assert(key, `${testCase.id}: missing ${side} object id`);
    assert(!seen.has(key), `${testCase.id}: duplicate ${side} object id ${key}`);
    seen.add(key);
  }
}

function assertNoObjectStatusConflict(testCase, plan) {
  const matchedOld = new Set();
  const unmatchedOld = new Set();
  const matchedNew = new Set();
  const unmatchedNew = new Set();
  for (const item of plan) {
    if (item.status === "matched") {
      if (item.oldObject?.id) matchedOld.add(item.oldObject.id);
      if (item.newObject?.id) matchedNew.add(item.newObject.id);
    }
    if (item.status === "old-only" && item.oldObject?.id) unmatchedOld.add(item.oldObject.id);
    if (item.status === "new-only" && item.newObject?.id) unmatchedNew.add(item.newObject.id);
  }
  for (const id of matchedOld) assert(!unmatchedOld.has(id), `${testCase.id}: object appears matched and old-only: ${id}`);
  for (const id of matchedNew) assert(!unmatchedNew.has(id), `${testCase.id}: object appears matched and new-only: ${id}`);
}

function assertGraphValid(testCase, graph = {}) {
  const nodeIds = new Set((graph.nodes || []).map((node) => node.id));
  for (const node of graph.nodes || []) {
    assert(node.id && !/undefined|nan|null/i.test(String(node.id)), `${testCase.id}: invalid graph node id`);
    assert(node.label != null && !/undefined|nan/i.test(String(node.label)), `${testCase.id}: invalid graph node label`);
  }
  for (const edge of graph.edges || []) {
    assert(nodeIds.has(edge.source), `${testCase.id}: graph edge source missing ${edge.source}`);
    assert(nodeIds.has(edge.target), `${testCase.id}: graph edge target missing ${edge.target}`);
  }
  for (const node of graph.nodes || []) {
    assert(!(node.status === "suppressed" && node.side === "relation"), `${testCase.id}: suppressed finding rendered as active relation node`);
  }
}

function assertFindingsValid(testCase, findings = []) {
  for (const finding of findings) {
    for (const field of ["id", "ruleId", "category", "severity", "titleKo", "descriptionKo", "recommendationKo", "objectType", "objectKey", "side", "vendor", "migrationImpact", "policyProfile"]) {
      assert(finding[field] !== undefined && finding[field] !== null && finding[field] !== "", `${testCase.id}: audit finding missing ${field}`);
    }
    assert(Array.isArray(finding.sourceLines), `${testCase.id}: audit finding sourceLines missing`);
    assert(Array.isArray(finding.relatedObjects), `${testCase.id}: audit finding relatedObjects missing`);
    assert(VALID_MIGRATION_IMPACTS.has(finding.migrationImpact), `${testCase.id}: invalid migration impact ${finding.migrationImpact}`);
    if (finding.suppressed) {
      assert(finding.severity === "suppressed", `${testCase.id}: suppressed finding severity mismatch`);
    }
  }
}

function countIgnoredPolicyFields(plan) {
  return plan.filter((item) =>
    Object.values(item.fieldSummary || {}).some((field) => field?.ignored || field?.effectiveStatus === "ignored") ||
    item.lineMatches?.some((lineMatch) => lineMatch.ignored || lineMatch.suppressed)
  ).length;
}

function getReviewCounts(review = {}) {
  return {
    unmatchedOld: review.unmatchedOld?.length || 0,
    unmatchedNew: review.unmatchedNew?.length || 0,
    ambiguous: review.ambiguous?.length || 0,
    lowConfidence: review.lowConfidence?.length || 0,
    abnormal: review.abnormal?.length || 0,
    relationshipChanges: review.relationshipChanges?.length || 0,
  };
}

function findInvalidGraphEdges(graph = {}) {
  const nodeIds = new Set((graph.nodes || []).map((node) => node.id));
  return (graph.edges || []).filter((edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target));
}

function buildMigrationReadiness(audit = {}) {
  const impact = audit.summary?.byMigrationImpact || {};
  const blocking = (impact["blocks-auto-generation"] || 0) + (impact["unsupported-target"] || 0);
  const manual = (impact["manual-conversion-required"] || 0) + (impact["conversion-policy-required"] || 0);
  return {
    generationImplemented: false,
    generationValidationStatus: "not-applicable",
    status: blocking ? "blocked" : manual ? "manual-review" : "ready-with-review",
    impact,
    unsupportedObjects: impact["unsupported-target"] || 0,
    manualReviewObjects: manual + (impact["review-before-migration"] || 0),
    targetDefaultRisk: impact["target-default-risk"] || 0,
    messageKo: "Config 생성 기능은 아직 구현되지 않아 migration-readiness만 검증했습니다.",
  };
}

function buildResultSignature(result) {
  const stable = {
    id: result.id,
    sourcePath: result.sourcePath,
    targetPaths: result.targetPaths,
    parser: result.parser,
    semantic: result.semantic,
    policy: result.policy,
    audit: result.audit,
    report: result.report,
    graph: result.graph,
    migrationReadiness: result.migrationReadiness,
  };
  return crypto.createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

function summarizeValidationRun({ command, mode, results, inventory }) {
  const failed = results.filter((item) => item.status === "failed");
  return {
    command,
    mode,
    generatedAt: new Date().toISOString(),
    status: failed.length ? "failed" : "passed",
    pass: failed.length === 0,
    counts: {
      passed: results.filter((item) => item.status === "passed").length,
      failed: failed.length,
      skipped: results.filter((item) => item.status === "skipped").length,
      blocked: results.filter((item) => item.status === "blocked").length,
    },
    juniperRealValidationStatus: results.find((item) => item.id === "juniper-to-nokia-mdcli-22")?.status || "not-found",
    searchedPaths: inventory.searchedPaths,
    missingInputs: inventory.missingInputs,
    results,
  };
}

function renderValidationMarkdown(summary) {
  return [
    `# Validation ${summary.mode}`,
    "",
    `Status: ${summary.status}`,
    `Generated: ${summary.generatedAt}`,
    "",
    "## Counts",
    `- passed: ${summary.counts.passed}`,
    `- failed: ${summary.counts.failed}`,
    `- skipped: ${summary.counts.skipped}`,
    `- blocked: ${summary.counts.blocked}`,
    "",
    "## Cases",
    ...summary.results.map((item) => [
      `### ${item.id}`,
      `- status: ${item.status}`,
      `- synthetic: ${Boolean(item.synthetic)}`,
      item.reason ? `- reason: ${item.reason}` : "",
      item.messageKo ? `- messageKo: ${item.messageKo}` : "",
      item.parser ? `- parsed objects: old ${item.parser.oldObjects}, new ${item.parser.newObjects}` : "",
      item.semantic ? `- semantic: matched ${item.semantic.matched}, old-only ${item.semantic.unmatchedOld}, new-only ${item.semantic.unmatchedNew}, coverage ${item.semantic.coveragePercent}%` : "",
      item.audit ? `- audit: active ${item.audit.summary.active}, suppressed ${item.audit.summary.suppressed}` : "",
      item.graph ? `- graph: nodes ${item.graph.nodes}, edges ${item.graph.edges}` : "",
    ].filter(Boolean).join("\n")),
    "",
  ].join("\n");
}

function renderFinalMarkdown(final) {
  const summaries = final.validationSummaries || [];
  const primary = summaries.flatMap((summary) => summary.results || []).find((item) => item.id === "nokia-classic15-to-nokia-mdcli-22");
  const juniper = summaries.flatMap((summary) => summary.results || []).find((item) => item.id === "juniper-to-nokia-mdcli-22");
  const synthetic = summaries.flatMap((summary) => summary.results || []).find((item) => item.id === "synthetic-juniper-set-smoke");
  const hasQuality = Boolean(final.qualityAnalysis);
  const quality = final.qualityAnalysis || {};
  const unmatched = quality.unmatched?.summary || {};
  const unsupported = quality.unsupportedLines?.summary || {};
  const findingPriority = quality.findingPriority?.summary || {};
  const fixtureCompleteness = quality.fixtureCompleteness?.summary || {};
  const parserBacklog = quality.parserBacklog?.summary || {};
  const blocksAutoGeneration = quality.blocksAutoGeneration?.summary || {};
  const conversionPolicyRequired = quality.conversionPolicyRequired?.summary || {};
  const actualMissing = quality.actualMissing?.summary || {};
  const matcherEffectiveness = quality.matcherEffectiveness?.summary || {};
  const modeScopeValidation = quality.modeScopeValidation?.summary || {};
  const lineAccounting = unsupported.lineAccounting || {};
  const commandLines = (final.commandResults || []).map((item) => `- ${item.command}: ${item.status}`);
  const validationCases = [
    juniper ? `- ${juniper.id}: ${juniper.status} (${juniper.reason || "no reason"})` : "- juniper-to-nokia-mdcli-22: blocked (missing-source-config)",
    synthetic ? `- ${synthetic.id}: ${synthetic.status} synthetic smoke` : "- synthetic-juniper-set-smoke: not-run",
    primary ? `- ${primary.id}: ${primary.status}` : "- nokia-classic15-to-nokia-mdcli-22: not-run",
  ];

  return [
    "# Final Validation Report",
    "",
    `Generated: ${final.generatedAt}`,
    "",
    "## 1. Repository Validation Inventory",
    `- configs found: ${final.inventory.foundConfigFiles.length}`,
    `- profiles found: ${final.inventory.foundProfiles.length}`,
    `- policies found: ${final.inventory.foundExceptionPolicies.length + final.inventory.foundAdvancedComparePolicies.length}`,
    `- sessions found: ${final.inventory.foundSavedSessions.length}`,
    `- ambiguous/missing inputs: ${final.inventory.unknownOrAmbiguousFiles.length} ambiguous, ${final.inventory.missingInputs.length} missing`,
    "",
    "## 2. Validation Cases",
    ...validationCases,
    "",
    "### Juniper → Nokia MD-CLI 22",
    `- Status: ${juniper?.status || "blocked"}`,
    "- Reason: Juniper source config not found in repository",
    `- Searched paths: ${final.inventory.searchedPaths.join(", ")}`,
    `- Synthetic smoke test: ${synthetic?.status || "not-run"}`,
    "- Required files: source-juniper.conf, target-nokia-mdcli22.conf, profile.json, exceptions.json, audit-profile.json, manual-mappings.json",
    "- Not counted as passed",
    "",
    "### Nokia Classic CLI 15 → Nokia MD-CLI 22",
    `- Status: ${primary?.status || "not-run"}`,
    "",
    "## 3. Parser Results",
    primary?.parser ? `- Nokia Classic→MD-CLI: old objects ${primary.parser.oldObjects}, new objects ${primary.parser.newObjects}` : "- primary case not run",
    primary?.parser ? `- eligible lines ${primary.parser.oldEligibleLines + primary.parser.newEligibleLines}, recognized ${primary.parser.recognizedLines}, unsupported ${primary.parser.unsupportedLines}` : "",
    primary?.parser ? `- router-log wrapper lines ${primary.parser.routerLogWrapperLines}, source-line mapping ${primary.parser.sourceLineMappingStatus}` : "",
    synthetic?.parser ? `- Synthetic Juniper smoke: old objects ${synthetic.parser.oldObjects}, new objects ${synthetic.parser.newObjects}, unsupported ${synthetic.parser.unsupportedLines}` : "",
    "",
    "## 4. Semantic Comparison Results",
    primary?.semantic ? `- matched ${primary.semantic.matched}, unmatched source ${primary.semantic.unmatchedOld}, unmatched target ${primary.semantic.unmatchedNew}` : "- primary case not run",
    primary?.semantic ? `- ambiguous ${primary.semantic.ambiguous}, low-confidence ${primary.semantic.lowConfidence}, field overlap ${primary.semantic.fieldOverlapPercent}%` : "",
    primary?.semantic ? `- semantic line coverage ${primary.semantic.coveragePercent}%, suppressed/ignored lines ${primary.semantic.suppressedLines}` : "",
    "",
    "## 5. Exception/Policy Validation",
    primary?.policy ? `- ignored fields ${primary.policy.ignoredPolicyFields}` : "- primary case not run",
    primary?.policy ? `- active audit findings ${primary.policy.activeAuditFindings}, suppressed audit findings ${primary.policy.suppressedAuditFindings}` : "",
    "- ignored/suppressed items are separated from active risk in Summary/Report/Graph validation.",
    "",
    "## 6. Standards Audit Results",
    primary?.audit ? `- QoS/policy/routing/service/security categories: ${JSON.stringify(primary.audit.categories)}` : "- primary case not run",
    primary?.audit ? `- migration impacts: ${JSON.stringify(primary.audit.migrationImpact)}` : "",
    primary?.audit ? `- total findings ${primary.audit.findingCount}, active ${primary.audit.summary.active}, suppressed ${primary.audit.summary.suppressed}` : "",
    "",
    "## 7. Summary/Compare/Report/Graph Consistency",
    ...summaries.map((summary) => `- ${summary.mode}: ${summary.status} (${summary.counts.passed} passed, ${summary.counts.blocked} blocked, ${summary.counts.failed} failed)`),
    primary?.graph ? `- primary graph nodes ${primary.graph.nodes}, edges ${primary.graph.edges}, invalid edges ${primary.graph.invalidEdges.length}` : "",
    primary?.compare ? `- compare HTML length ${primary.compare.htmlLength}, undefined ${primary.compare.hasUndefined}, NaN ${primary.compare.hasNaN}` : "",
    "",
    "## 8. Migration/Generation Validation",
    primary?.migrationReadiness ? `- migration readiness: ${primary.migrationReadiness.status}` : "- primary case not run",
    primary?.migrationReadiness ? `- generation validation: ${primary.migrationReadiness.generationValidationStatus}` : "",
    primary?.migrationReadiness ? `- target-default-risk ${primary.migrationReadiness.targetDefaultRisk}, manual-review objects ${primary.migrationReadiness.manualReviewObjects}` : "",
    "- full config generation is not implemented; no generation success was claimed.",
    "",
    "## 9. Build/Test Results",
    ...(commandLines.length ? commandLines : ["- see command output"]),
    "",
    "## 10. Remaining Limitations",
    ...final.remainingLimitations.map((item) => `- ${item}`),
    "",
    "## 11. Validation Quality Analysis",
    hasQuality
      ? `- fixture completeness: ${fixtureCompleteness.status || "not-run"}`
      : "- not run",
    hasQuality ? `- high unmatched expected: ${Boolean(fixtureCompleteness.highUnmatchedExpected)}` : "",
    hasQuality ? `- unmatched: source ${unmatched.unmatchedSource || 0}, target ${unmatched.unmatchedTarget || 0}, weak mappings ${unmatched.weakMappings || 0}` : "",
    hasQuality ? `- full source objects: ${unmatched.fullSourceObjectCount || 0}, target fixture objects: ${unmatched.targetFixtureObjectCount || 0}` : "",
    hasQuality ? `- in target scope: ${unmatched.sourceObjectsInTargetScope || 0}, outside target scope: ${unmatched.sourceObjectsOutsideTargetScope || 0}` : "",
    hasQuality ? `- Target fixture 범위 밖 미매칭: ${unmatched.unmatchedDuePartialTargetScope || 0}` : "",
    hasQuality ? `- Matcher 개선 필요: ${unmatched.unmatchedDueLikelyMatcherIssue || 0}` : "",
    hasQuality ? `- Parser 미지원 가능성: ${unmatched.unmatchedDueParserGap || 0}` : "",
    hasQuality ? `- 실제 누락 가능성: ${unmatched.unmatchedDueRealMissingTarget || 0}` : "",
    hasQuality ? `- line accounting: eligible ${lineAccounting.eligibleLines || 0}, recognized ${lineAccounting.recognizedAnalyzedLines || 0}, parser-unmapped ${lineAccounting.parserUnmappedLines || unsupported.totalUnsupported || 0}, ignored/suppressed ${lineAccounting.ignoredSuppressedLines || 0}, wrapper ${lineAccounting.routerLogWrapperLines || 0}` : "",
    hasQuality ? `- active findings: ${findingPriority.activeFindings || 0}, suppressed ${findingPriority.suppressedFindings || 0}` : "",
    hasQuality ? `- blocks auto-generation drill-down: baseline ${blocksAutoGeneration.baselineTotal || 0}, current ${blocksAutoGeneration.total || 0}, resolved ${blocksAutoGeneration.resolvedFromBaseline || 0}, parser extension ${blocksAutoGeneration.parserExtension || 0}, target fixture completion ${blocksAutoGeneration.targetFixtureCompletion || 0}, actual config correction ${blocksAutoGeneration.actualConfigCorrection || 0}` : "",
    hasQuality ? `- conversion-policy drill-down: total ${conversionPolicyRequired.total || 0}, static-route rewrite candidates ${conversionPolicyRequired.staticRouteNextHopRewriteCandidates || 0}, SAP/service mapping ${conversionPolicyRequired.sapServiceParentMapping || 0}, QoS/filter mapping ${conversionPolicyRequired.qosFilterReferenceMapping || 0}, vendor default ${conversionPolicyRequired.vendorDefaultBehavior || 0}` : "",
    hasQuality ? `- actual missing drill-down: total ${actualMissing.total || 0}, true missing ${actualMissing.trueMissingFromTargetFixture || 0}, target-only ${actualMissing.targetObjectHasNoSourceCounterpart || 0}, outside scope ${actualMissing.outsidePartialTargetScope || 0}, parser/matcher false negative ${actualMissing.parserMatcherFalseNegative || 0}` : "",
    hasQuality ? `- matcher status: port/LAG rename candidates, SAP parent relationship evidence, static-route next-hop policy handling added` : "",
    hasQuality ? `- matcher effectiveness: port/LAG candidates ${matcherEffectiveness.portLagCandidateCount || 0}, SAP candidates ${matcherEffectiveness.sapCandidateCount || 0}, static-route manual-review candidates ${matcherEffectiveness.staticRouteCandidateManualReviewCount || 0}, false exact match prevention ${matcherEffectiveness.falseExactMatchPreventionCount || 0}` : "",
    hasQuality ? `- mode/scope validation: simple active ${modeScopeValidation.simpleCompareActiveFindingCount || 0}, BGP-only active ${modeScopeValidation.bgpNeighborOnlyCompareActiveFindingCount || 0}, standards active ${modeScopeValidation.standardsAuditActiveFindingCount || 0}, migration active ${modeScopeValidation.migrationReadinessActiveFindingCount || 0}, suppressed ${modeScopeValidation.suppressedIgnoredFindingCount || 0}` : "",
    hasQuality ? "- parser improvement: Classic indirect/tunnel-next-hop static route extraction added; static-route next-hop blockers removed." : "",
    hasQuality ? `- parser backlog groups: ${parserBacklog.groupCount || 0}` : "",
    hasQuality ? `- advanced policy files: ${(fixtureCompleteness.advancedPolicyFiles || []).join(", ") || "none"}` : "",
    hasQuality ? "- Detail reports: validation-results/unmatched-analysis.md, unsupported-line-analysis.md, finding-priority-analysis.md, fixture-completeness-analysis.md, parser-backlog.md, blocks-auto-generation-analysis.md, conversion-policy-required-analysis.md, actual-missing-analysis.md, matcher-effectiveness-analysis.md" : "",
    "",
  ].filter((line) => line !== "").join("\n");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
