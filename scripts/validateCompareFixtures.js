import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
} from "../src/core/comparator.js";
import { buildSemanticCoverageDiagnostics } from "../src/core/coverageDiagnostics.js";
import { buildSummaryDashboardData } from "../src/core/summaryAnalytics.js";
import { VENDOR_IDS } from "../src/core/vendorPresets.js";

export const CASE_MATRIX = [
  { id: "1", oldFile: "Gangbu-SEA027H_config.txt", newIndex: "1" },
  { id: "2", oldFile: "Gangbuk-SEA028_config.txt", newIndex: "2" },
  { id: "3", oldFile: "Gangbu-SEA029H_config.txt", newIndex: "3" },
  { id: "4", oldFile: "Gangbuk-SEA030_config.txt", newIndex: "4" },
];

export const TARGET_PARTS = {
  bgp: "New_bgp",
  static: "New_static",
  interface: "New_interface",
  lag: "New_lag",
  port: "New_port",
  pim: "New_PIM",
};

export const MD_FULL_LOG_CASES = [
  { id: "1-mdconfig", caseId: "1", oldFile: "Gangbu-SEA027H_config.txt", targetType: "MDconfig", targetIncludes: ["SEA027H", "MDconfig"] },
  { id: "1-mdfullcontext", caseId: "1", oldFile: "Gangbu-SEA027H_config.txt", targetType: "MDfullcontext", targetIncludes: ["SEA027H", "MDfullcontext"] },
  { id: "2-mdconfig", caseId: "2", oldFile: "Gangbuk-SEA028_config.txt", targetType: "MDconfig", targetIncludes: ["SEA028D", "MDconfig"] },
  { id: "2-mdfullcontext", caseId: "2", oldFile: "Gangbuk-SEA028_config.txt", targetType: "MDfullcontext", targetIncludes: ["SEA028D", "MDfullcontext"] },
];

const FULL_SCOPE = Object.keys(TARGET_PARTS);
const PROFILE = {
  name: "fixture-validation",
  rules: {
    ignore: [
      {
        source: "new",
        pattern: "metric 100",
        matchMode: "contains",
        reason: "fixture metric exception",
      },
      {
        source: "new",
        pattern: "authentication-key",
        matchMode: "contains",
        reason: "fixture auth-key exception",
      },
    ],
  },
  validationPolicies: {
    bgp: [
      {
        field: "authentication-key",
        policy: "ignore",
        message: "fixture auth-key ignore",
      },
    ],
    "static-route": [
      {
        field: "metric",
        policy: "ignore",
        message: "fixture metric ignore",
      },
    ],
  },
};

if (isMainModule()) {
  try {
    main();
  } catch (error) {
    console.error(error?.stack || error?.message || String(error));
    process.exit(1);
  }
}

export function main(argv = process.argv.slice(2)) {
  const options = readCliOptions(argv);
  const fixtureDir = findExampleDir({
    cwd: process.cwd(),
    explicitDir: options.fixtureDir,
  });

  if (!fixtureDir) {
    throw new Error("example fixture directory not found");
  }

  const cases = options.mdFullLogs
    ? resolveMdFullLogCases({
        fixtureDir,
        caseId: options.caseId,
        allCases: options.allCases,
        availableCases: options.availableCases,
      })
    : resolveFixtureCases({
        fixtureDir,
        scope: options.scope,
        caseId: options.caseId,
        allCases: options.allCases,
        availableCases: options.availableCases,
      });
  const started = Date.now();
  const firstSignatures = new Map();
  const finalResults = new Map();

  for (let index = 0; index < options.iterations; index += 1) {
    for (const fixtureCase of cases) {
      const result = runFixtureComparison({
        oldText: fs.readFileSync(fixtureCase.oldPath, "utf8"),
        newText: fixtureCase.newPaths.map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n"),
        profile: PROFILE,
      });
      const signatureKey = `${fixtureCase.id}:${fixtureCase.scope || options.scope}`;
      const previousSignature = firstSignatures.get(signatureKey);

      if (!previousSignature) firstSignatures.set(signatureKey, result.signature);
      assertInvariant(
        !previousSignature || result.signature === previousSignature,
        `${fixtureCase.label} iteration ${index + 1}: deterministic signature mismatch`,
      );
      assertFixtureResult({
        result,
        fixtureCase,
        scope: fixtureCase.scope || options.scope,
        iteration: index + 1,
      });
      finalResults.set(signatureKey, result);
    }
  }

  const summary = {
    command: buildCommandSummary(options),
    iterations: options.iterations,
    passed: true,
    durationMs: Date.now() - started,
    fixtureDir,
    scope: options.mdFullLogs ? "md-full-logs" : options.scope,
    cases: cases.map((fixtureCase) => {
      const result = finalResults.get(`${fixtureCase.id}:${fixtureCase.scope || options.scope}`);
      return {
        id: fixtureCase.id,
        oldFile: fixtureCase.oldFile,
        newFiles: fixtureCase.newFiles,
        targetType: fixtureCase.targetType || "",
        result: summarizeFixtureResult(result),
      };
    }),
  };

  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

export function findExampleDir({
  cwd = process.cwd(),
  explicitDir = process.env.NCW_FIXTURE_DIR || "",
} = {}) {
  const candidates = buildFixtureDirCandidates({ cwd, explicitDir });
  const seen = new Set();

  for (const candidate of candidates) {
    const absolute = path.resolve(candidate);
    const key = absolute.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (isFixtureDir(absolute)) return absolute;
  }
  return "";
}

export function resolveFixtureCases({
  fixtureDir,
  scope = "full",
  caseId = "1",
  allCases = false,
  availableCases = false,
} = {}) {
  const normalizedScope = normalizeScope(scope);
  const selected = allCases || availableCases
    ? CASE_MATRIX
    : [CASE_MATRIX.find((entry) => entry.id === String(caseId))].filter(Boolean);

  if (!selected.length) {
    throw new Error(`unknown fixture case: ${caseId}`);
  }

  const resolved = selected.map((entry) => {
    const newFiles = resolveNewFilesForScope(fixtureDir, normalizedScope, entry.newIndex);
    const oldPath = path.join(fixtureDir, entry.oldFile);
    const newPaths = newFiles.map((file) => path.join(fixtureDir, file));
    const missing = [oldPath, ...newPaths].filter((filePath) => !fs.existsSync(filePath));

    if (missing.length) {
      if (availableCases) return null;
      throw new Error(`missing fixture files for case ${entry.id}: ${missing.map((filePath) => path.basename(filePath)).join(", ")}`);
    }

    return {
      ...entry,
      label: `case ${entry.id}`,
      scope: normalizedScope,
      oldPath,
      newFiles,
      newPaths,
    };
  }).filter(Boolean);

  if (!resolved.length) {
    throw new Error(`no available fixture cases for scope: ${normalizedScope}`);
  }

  return resolved;
}

export function resolveMdFullLogCases({
  fixtureDir,
  caseId = "1",
  allCases = false,
  availableCases = false,
} = {}) {
  const selected = allCases || availableCases
    ? MD_FULL_LOG_CASES
    : MD_FULL_LOG_CASES.filter((entry) => entry.caseId === String(caseId));

  if (!selected.length) {
    throw new Error(`unknown MD full log fixture case: ${caseId}`);
  }

  const resolved = selected.map((entry) => {
    const oldPath = path.join(fixtureDir, entry.oldFile);
    const newFile = resolveMdFullLogFileName(fixtureDir, entry.targetIncludes);
    const newPaths = [path.join(fixtureDir, newFile)];
    const missing = [oldPath, ...newPaths].filter((filePath) => !fs.existsSync(filePath));

    if (missing.length) {
      if (availableCases) return null;
      throw new Error(`missing MD full log fixture files for ${entry.id}: ${missing.map((filePath) => path.basename(filePath)).join(", ")}`);
    }

    return {
      ...entry,
      label: `case ${entry.caseId} ${entry.targetType}`,
      scope: "full",
      oldPath,
      newFiles: [newFile],
      newPaths,
    };
  }).filter(Boolean);

  if (!resolved.length) {
    throw new Error("no available MD full log fixture cases");
  }

  return resolved;
}

export function getNewFilesForScope(scope = "full", index = "1") {
  const normalizedScope = normalizeScope(scope);
  const parts = normalizedScope === "full" ? FULL_SCOPE : [normalizedScope];
  return parts.map((part) => `${TARGET_PARTS[part]}_${index}.txt`);
}

function resolveNewFilesForScope(fixtureDir, scope = "full", index = "1") {
  return getNewFilesForScope(scope, index).map((fileName) =>
    resolveFixtureFileName(fixtureDir, fileName)
  );
}

function resolveFixtureFileName(fixtureDir, fileName) {
  const exactPath = path.join(fixtureDir, fileName);
  if (fs.existsSync(exactPath)) return fileName;
  if (!fs.existsSync(fixtureDir)) return fileName;

  const parsed = path.parse(fileName);
  const variantPrefix = `${parsed.name}_`;
  const candidates = fs.readdirSync(fixtureDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((entryName) => entryName.startsWith(variantPrefix) && path.extname(entryName) === parsed.ext)
    .sort((left, right) => left.localeCompare(right));

  if (candidates.length === 1) return candidates[0];
  return fileName;
}

function resolveMdFullLogFileName(fixtureDir, targetIncludes = []) {
  if (!fs.existsSync(fixtureDir)) return `${targetIncludes.join("_")}.log`;
  const loweredIncludes = targetIncludes.map((item) => String(item || "").toLowerCase());
  const candidates = fs.readdirSync(fixtureDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((entryName) => {
      const lowered = entryName.toLowerCase();
      return path.extname(entryName).toLowerCase() === ".log" &&
        loweredIncludes.every((token) => lowered.includes(token));
    })
    .sort((left, right) => left.localeCompare(right));

  return candidates[0] || `${targetIncludes.join("_")}.log`;
}

function runFixtureComparison({ oldText, newText, profile }) {
  const oldResult = normalizeConfig({
    vendor: VENDOR_IDS.NOKIA_CLASSIC,
    profile,
    configText: oldText,
    side: "old",
  });
  const newResult = normalizeConfig({
    vendor: VENDOR_IDS.NOKIA_MD_CLI,
    profile,
    configText: newText,
    side: "new",
  });
  const matches = matchNormalizedObjects({
    oldObjects: oldResult.objects,
    newObjects: newResult.objects,
    manualMap: {},
    profile,
  });
  const plan = createComparisonPlan(matches, profile);
  const coverage = buildSemanticCoverageDiagnostics({
    oldText,
    newText,
    oldResult,
    newResult,
    plan,
    profile,
  });
  const semanticSummary = buildSemanticSummary(plan, coverage);
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan,
    semanticSummary,
    profileName: profile.name,
  });
  const ignoredFields = new Set(["metric", "authentication-key"]);
  const ignoredPolicyAbnormalCount = dashboard.review.abnormal.filter((item) =>
    (item.fields || []).some((field) => ignoredFields.has(field))
  ).length;
  const ignoredPolicyFields = plan.filter((item) =>
    item.fieldSummary?.metric?.ignored ||
    item.fieldSummary?.["authentication-key"]?.ignored ||
    item.lineMatches?.some((lineMatch) => lineMatch.ignored)
  ).length;
  const typeCounts = countObjectTypes(plan);
  const matchedTypeCounts = countObjectTypes(plan.filter((item) => item.status === "matched"));
  const signature = JSON.stringify({
    oldObjects: oldResult.objects.length,
    newObjects: newResult.objects.length,
    planItems: plan.length,
    counts: dashboard.counts,
    coverage: coverage.coveragePercent,
    typeCounts,
    matchedTypeCounts,
    ignoredPolicyFields,
  });

  return {
    oldObjects: oldResult.objects.length,
    newObjects: newResult.objects.length,
    planItems: plan.length,
    bgpObjects: typeCounts.bgp || 0,
    wrapperLineCount: coverage.wrapperLineCount,
    coveragePercent: coverage.coveragePercent,
    eligibleLineCount: coverage.eligibleLineCount,
    recognizedLineCount: coverage.recognizedLineCount,
    ignoredLineCount: coverage.ignoredLineCount,
    counts: dashboard.counts,
    reviewCounts: {
      unmatchedOld: dashboard.review.unmatchedOld.length,
      unmatchedNew: dashboard.review.unmatchedNew.length,
      lowConfidence: dashboard.review.lowConfidence.length,
      ambiguous: dashboard.review.ambiguous.length,
    },
    typeCounts,
    matchedTypeCounts,
    ignoredPolicyFields,
    ignoredPolicyAbnormalCount,
    fixtureScope: dashboard.context.fixtureScope,
    serialized: JSON.stringify({ dashboard, coverage }),
    signature,
  };
}

function buildSemanticSummary(plan = [], coverage = {}) {
  const scored = plan.filter((item) => Number.isFinite(Number(item.score)));
  const matched = plan.filter((item) => item.status === "matched" && !item.policySuppressed).length;
  return {
    totalObjects: plan.length,
    matched,
    oldOnly: plan.filter((item) => item.status === "old-only" && !item.policySuppressed).length,
    newOnly: plan.filter((item) => item.status === "new-only" && !item.policySuppressed).length,
    ambiguous: plan.filter((item) => item.ambiguousAlternatives?.length && !item.policySuppressed).length,
    averageScore: scored.length
      ? Math.round(scored.reduce((sum, item) => sum + Number(item.score), 0) / scored.length)
      : 0,
    matchPercent: plan.length ? Math.round((matched / plan.length) * 100) : 0,
    coveragePercent: coverage.coveragePercent,
    lineCovered: coverage.recognizedLineCount,
    lineTotal: coverage.eligibleLineCount,
    noopSuppressed: coverage.ignoredLineCount,
    coverageDiagnostics: coverage,
  };
}

function assertFixtureResult({ result, fixtureCase, scope, iteration }) {
  const prefix = `${fixtureCase.label} iteration ${iteration}`;

  assertInvariant(result.oldObjects > 0, `${prefix}: old objects missing`);
  assertInvariant(result.newObjects > 0, `${prefix}: new objects missing`);
  assertInvariant(result.wrapperLineCount > 0, `${prefix}: router-log wrapper not detected`);
  assertInvariant(result.coveragePercent > 0, `${prefix}: false zero coverage`);
  assertInvariant(result.counts.newOnly === result.reviewCounts.unmatchedNew, `${prefix}: new-only count mismatch`);
  assertInvariant(result.counts.oldOnly === result.reviewCounts.unmatchedOld, `${prefix}: old-only count mismatch`);
  assertInvariant(result.counts.lowConfidence === result.reviewCounts.lowConfidence, `${prefix}: low-confidence count mismatch`);
  assertInvariant(result.counts.ambiguous === result.reviewCounts.ambiguous, `${prefix}: ambiguous count mismatch`);
  assertInvariant(result.ignoredPolicyAbnormalCount === 0, `${prefix}: ignored policy still abnormal`);
  if (["full", "bgp", "static"].includes(scope)) {
    assertInvariant(result.ignoredPolicyFields > 0, `${prefix}: ignored policy not applied`);
  }
  if (["full", "bgp"].includes(scope)) {
    assertInvariant(result.bgpObjects > 0, `${prefix}: BGP objects missing`);
  }
  if (["full", "pim"].includes(scope)) {
    assertInvariant((result.matchedTypeCounts?.pim || 0) > 0, `${prefix}: PIM objects did not match`);
  }
  assertInvariant(!result.serialized.includes("NaN"), `${prefix}: NaN in UI data`);
  assertInvariant(!result.serialized.includes("Infinity"), `${prefix}: Infinity in UI data`);
  assertInvariant(!result.serialized.includes("undefined"), `${prefix}: undefined in UI data`);
}

function summarizeFixtureResult(result = {}) {
  return {
    oldObjects: result.oldObjects,
    newObjects: result.newObjects,
    planItems: result.planItems,
    bgpObjects: result.bgpObjects,
    coveragePercent: result.coveragePercent,
    eligibleLineCount: result.eligibleLineCount,
    recognizedLineCount: result.recognizedLineCount,
    ignoredLineCount: result.ignoredLineCount,
    wrapperLineCount: result.wrapperLineCount,
    counts: result.counts,
    fixtureScope: result.fixtureScope,
    typeCounts: result.typeCounts,
    matchedTypeCounts: result.matchedTypeCounts,
  };
}

function countObjectTypes(plan = []) {
  return plan.reduce((counts, item) => {
    const type = item.objectType || item.oldObject?.normalizedType || item.newObject?.normalizedType || "unknown";
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
}

function buildFixtureDirCandidates({ cwd, explicitDir }) {
  const candidates = [];
  if (explicitDir) candidates.push(explicitDir);
  candidates.push(cwd);

  for (const root of ancestorPaths(cwd, 3)) {
    candidates.push(path.join(root, "예제 및 테스트 설정"));
    candidates.push(path.join(root, "network-config-workbench-home", "예제 및 테스트 설정"));
  }

  if (fs.existsSync(cwd)) {
    for (const entry of fs.readdirSync(cwd, { withFileTypes: true })) {
      if (entry.isDirectory()) candidates.push(path.join(cwd, entry.name));
    }
  }

  return candidates;
}

function ancestorPaths(cwd, depth) {
  const result = [];
  let current = path.resolve(cwd);
  for (let index = 0; index <= depth; index += 1) {
    result.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return result;
}

function isFixtureDir(candidate) {
  return fs.existsSync(path.join(candidate, "New_bgp_1.txt"));
}

function normalizeScope(scope = "full") {
  const normalized = String(scope || "full").toLowerCase();
  if (normalized === "full" || TARGET_PARTS[normalized]) return normalized;
  throw new Error(`unknown fixture scope: ${scope}`);
}

function readCliOptions(argv) {
  return {
    iterations: readNumberArg(argv, "--iterations", 1),
    fixtureDir: readStringArg(argv, "--fixture-dir", process.env.NCW_FIXTURE_DIR || ""),
    scope: normalizeScope(readStringArg(argv, "--scope", "full")),
    caseId: readStringArg(argv, "--case", "1"),
    allCases: argv.includes("--all-cases"),
    availableCases: argv.includes("--available-cases"),
    mdFullLogs: argv.includes("--md-full-logs"),
  };
}

function readNumberArg(argv, name, fallback) {
  const index = argv.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(argv[index + 1]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function readStringArg(argv, name, fallback) {
  const index = argv.indexOf(name);
  if (index < 0) return fallback;
  const value = String(argv[index + 1] || "").trim();
  return value || fallback;
}

function buildCommandSummary(options) {
  return [
    "node scripts/validateCompareFixtures.js",
    `--iterations ${options.iterations}`,
    options.availableCases ? "--available-cases" : (options.allCases ? "--all-cases" : `--case ${options.caseId}`),
    options.mdFullLogs ? "--md-full-logs" : "",
    options.scope === "full" ? "" : `--scope ${options.scope}`,
  ].filter(Boolean).join(" ");
}

function assertInvariant(condition, message) {
  if (condition) return;
  throw new Error(message);
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}
