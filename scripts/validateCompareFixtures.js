import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
} from "../src/core/comparator.js";
import { buildSemanticCoverageDiagnostics } from "../src/core/coverageDiagnostics.js";
import { buildSummaryDashboardData } from "../src/core/summaryAnalytics.js";
import { VENDOR_IDS } from "../src/core/vendorPresets.js";

const args = new Set(process.argv.slice(2));
const iterations = readNumberArg("--iterations", args.has("--stress") ? 1000 : 1);
const fixtureDir = findExampleDir();
const scope = readStringArg("--scope", "full");

if (!fixtureDir) {
  console.error("예제 및 테스트 설정 디렉터리를 찾지 못했습니다.");
  process.exit(1);
}

const oldText = fs.readFileSync(path.join(fixtureDir, "Gangbuk-SEA028_config.txt"), "utf8");
const fullNewFiles = [
  "New_bgp_1.txt",
  "New_static_1.txt",
  "New_interface_1.txt",
  "New_lag_1.txt",
  "New_port_1.txt",
  "New_PIM_1.txt",
];
const scopedNewFiles = scope === "bgp" ? ["New_bgp_1.txt"] : fullNewFiles;
const newText = scopedNewFiles.map((file) => fs.readFileSync(path.join(fixtureDir, file), "utf8")).join("\n");

const profile = {
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

let firstSignature = "";
const started = Date.now();

for (let index = 0; index < iterations; index += 1) {
  const result = runFixtureComparison();
  const signature = result.signature;

  if (!firstSignature) firstSignature = signature;
  assertInvariant(signature === firstSignature, `iteration ${index + 1}: deterministic signature mismatch`);
  assertInvariant(result.oldObjects > 0, `iteration ${index + 1}: old objects missing`);
  assertInvariant(result.newObjects > 0, `iteration ${index + 1}: new objects missing`);
  assertInvariant(result.bgpObjects > 0, `iteration ${index + 1}: BGP objects missing`);
  assertInvariant(result.wrapperLineCount > 0, `iteration ${index + 1}: router-log wrapper not detected`);
  assertInvariant(result.coveragePercent > 0, `iteration ${index + 1}: false zero coverage`);
  assertInvariant(result.counts.newOnly === result.reviewCounts.unmatchedNew, `iteration ${index + 1}: new-only count mismatch`);
  assertInvariant(result.counts.oldOnly === result.reviewCounts.unmatchedOld, `iteration ${index + 1}: old-only count mismatch`);
  assertInvariant(result.counts.lowConfidence === result.reviewCounts.lowConfidence, `iteration ${index + 1}: low-confidence count mismatch`);
  assertInvariant(result.counts.ambiguous === result.reviewCounts.ambiguous, `iteration ${index + 1}: ambiguous count mismatch`);
  assertInvariant(result.ignoredPolicyFields > 0, `iteration ${index + 1}: ignored policy not applied`);
  assertInvariant(result.ignoredPolicyAbnormalCount === 0, `iteration ${index + 1}: ignored policy still abnormal`);
  assertInvariant(!result.serialized.includes("NaN"), `iteration ${index + 1}: NaN in UI data`);
  assertInvariant(!result.serialized.includes("Infinity"), `iteration ${index + 1}: Infinity in UI data`);
  assertInvariant(!result.serialized.includes("undefined"), `iteration ${index + 1}: undefined in UI data`);
}

const finalResult = runFixtureComparison();
  console.log(JSON.stringify({
  command: `node scripts/validateCompareFixtures.js --iterations ${iterations}${scope === "full" ? "" : ` --scope ${scope}`}`,
  iterations,
  passed: true,
  durationMs: Date.now() - started,
  fixtureDir,
  scope,
  newFiles: scopedNewFiles,
  result: {
    oldObjects: finalResult.oldObjects,
    newObjects: finalResult.newObjects,
    planItems: finalResult.planItems,
    bgpObjects: finalResult.bgpObjects,
    coveragePercent: finalResult.coveragePercent,
    eligibleLineCount: finalResult.eligibleLineCount,
    recognizedLineCount: finalResult.recognizedLineCount,
    ignoredLineCount: finalResult.ignoredLineCount,
    wrapperLineCount: finalResult.wrapperLineCount,
    counts: finalResult.counts,
  },
}, null, 2));

function runFixtureComparison() {
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
  const ignoredPolicyAbnormalCount = dashboard.review.abnormal.filter((item) => (item.fields || []).some((field) => ignoredFields.has(field))).length;
  const ignoredPolicyFields = plan.filter((item) =>
    item.fieldSummary?.metric?.ignored ||
    item.fieldSummary?.["authentication-key"]?.ignored ||
    item.lineMatches?.some((lineMatch) => lineMatch.ignored)
  ).length;
  const signature = JSON.stringify({
    oldObjects: oldResult.objects.length,
    newObjects: newResult.objects.length,
    planItems: plan.length,
    counts: dashboard.counts,
    coverage: coverage.coveragePercent,
    bgpObjects: plan.filter((item) => item.objectType === "bgp").length,
    ignoredPolicyFields,
  });

  return {
    oldObjects: oldResult.objects.length,
    newObjects: newResult.objects.length,
    planItems: plan.length,
    bgpObjects: plan.filter((item) => item.objectType === "bgp").length,
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
    ignoredPolicyFields,
    ignoredPolicyAbnormalCount,
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

function findExampleDir() {
  return fs.readdirSync(".", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .find((dir) => fs.existsSync(path.join(dir, "New_bgp_1.txt"))) || "";
}

function readNumberArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function readStringArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = String(process.argv[index + 1] || "").trim();
  return value || fallback;
}

function assertInvariant(condition, message) {
  if (condition) return;
  throw new Error(message);
}
