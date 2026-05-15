import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
} from "../src/core/comparator.js";
import { buildSemanticCoverageDiagnostics } from "../src/core/coverageDiagnostics.js";
import { evaluatePolicyContext } from "../src/core/policyEvaluator.js";
import { preprocessConfigInput } from "../src/core/routerLogPreprocessor.js";
import { buildSummaryDashboardData } from "../src/core/summaryAnalytics.js";
import { VENDOR_IDS } from "../src/core/vendorPresets.js";

test("router log extraction removes prompt command and keeps config with mapping", () => {
  const input = [
    "A:Router# admin display-config",
    "# TiMOS-C-15.0.R7",
    "exit all",
    "configure",
    "    router",
    "        bgp",
    "            neighbor 192.0.2.1",
    "                description \"peer\"",
    "            exit",
    "        exit",
    "    exit",
  ].join("\n");

  const result = preprocessConfigInput({
    text: input,
    vendor: VENDOR_IDS.NOKIA_CLASSIC,
    side: "old",
  });

  assert.equal(result.text.includes("admin display-config"), false);
  assert.equal(result.text.includes("neighbor 192.0.2.1"), true);
  assert.equal(result.lineMap[0], 3);
  assert.ok(result.skipped.some((line) => line.reason === "cli-command-echo"));
});

test("line exception suppresses new-only object from review counts", () => {
  const profile = {
    rules: {
      ignore: [
        { source: "new", pattern: "metric 100", matchMode: "contains" },
      ],
    },
  };
  const newObject = {
    id: "new-static-ignored",
    normalizedType: "static-route",
    normalizedIdentity: "fixture|192.0.2.1",
    fields: { metric: "100" },
    rawLines: ["metric 100"],
  };
  const plan = createComparisonPlan(
    matchNormalizedObjects({
      oldObjects: [],
      newObjects: [newObject],
      manualMap: {},
    }),
    profile,
  );
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan,
    semanticSummary: {},
  });

  assert.equal(plan[0].policySuppressed, true);
  assert.equal(dashboard.counts.newOnly, 0);
  assert.equal(dashboard.review.unmatchedNew.length, 0);
  assert.equal(dashboard.review.abnormal.length, 0);
});

test("advanced ignore policy suppresses ignored field from abnormal list", () => {
  const profile = {
    validationPolicies: {
      "static-route": [
        { field: "metric", policy: "ignore", message: "metric ignored" },
      ],
    },
  };
  const oldObject = {
    id: "old-static",
    normalizedType: "static-route",
    normalizedIdentity: "fixture|192.0.2.1",
    fields: { route: "fixture", "next-hop": "192.0.2.1" },
    rawLines: ["route fixture next-hop 192.0.2.1"],
  };
  const newObject = {
    id: "new-static",
    normalizedType: "static-route",
    normalizedIdentity: "fixture|192.0.2.1",
    fields: { route: "fixture", "next-hop": "192.0.2.1", metric: "100" },
    rawLines: ["route fixture next-hop 192.0.2.1 metric 100"],
  };
  const plan = createComparisonPlan(
    matchNormalizedObjects({
      oldObjects: [oldObject],
      newObjects: [newObject],
      manualMap: {},
    }),
    profile,
  );
  const metric = plan[0].fieldSummary.metric;
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan,
    semanticSummary: {},
  });

  assert.equal(metric.ignored, true);
  assert.equal(metric.effectiveStatus, "ignored");
  assert.equal(dashboard.review.abnormal.length, 0);
});

test("coverage is not false zero for parsed Classic to MD-CLI BGP objects", () => {
  const oldText = [
    "A:Router# admin display-config",
    "configure",
    "    router",
    "        bgp",
    "            neighbor 192.0.2.1",
    "                description \"peer\"",
    "                group \"ACCESS\"",
    "                no shutdown",
    "            exit",
    "        exit",
    "    exit",
  ].join("\n");
  const newText = [
    '/configure { router "Base" bgp neighbor "192.0.2.1" description "peer" }',
    '/configure { router "Base" bgp neighbor "192.0.2.1" group "ACCESS" }',
    '/configure { router "Base" bgp neighbor "192.0.2.1" admin-state enable }',
  ].join("\n");
  const profile = {};
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
  const plan = createComparisonPlan(
    matchNormalizedObjects({
      oldObjects: oldResult.objects,
      newObjects: newResult.objects,
      manualMap: {},
    }),
    profile,
  );
  const coverage = buildSemanticCoverageDiagnostics({
    oldText,
    newText,
    oldResult,
    newResult,
    plan,
    profile,
  });

  assert.ok(oldResult.objects.length > 0);
  assert.ok(newResult.objects.length > 0);
  assert.ok(coverage.coveragePercent > 0);
  assert.equal(coverage.wrapperLineCount > 0, true);
});

test("directory example fixture has non-zero coverage when present", (t) => {
  const dir = findExampleDir();
  if (!dir) {
    t.skip("local example directory not present");
    return;
  }
  const oldText = fs.readFileSync(path.join(dir, "Gangbuk-SEA028_config.txt"), "utf8");
  const newText = fs.readFileSync(path.join(dir, "New_bgp_1.txt"), "utf8");
  const profile = {};
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
  const plan = createComparisonPlan(
    matchNormalizedObjects({
      oldObjects: oldResult.objects,
      newObjects: newResult.objects,
      manualMap: {},
    }),
    profile,
  );
  const coverage = buildSemanticCoverageDiagnostics({
    oldText,
    newText,
    oldResult,
    newResult,
    plan,
    profile,
  });

  assert.ok(oldResult.preprocess.diagnostics.wrapperLineCount > 0);
  assert.ok(oldResult.objects.length > 0);
  assert.ok(newResult.objects.length > 0);
  assert.ok(coverage.coveragePercent > 0);
});

test("policy evaluator reports audit metadata", () => {
  const result = evaluatePolicyContext({
    profile: {
      rules: {
        ignore: [{ source: "new", pattern: "metric 100" }],
      },
    },
    rawLine: "metric 100",
    side: "new",
  });

  assert.equal(result.suppressed, true);
  assert.equal(result.sourcePolicy, "user-exception");
  assert.equal(result.appliesTo, "new");
});

function findExampleDir() {
  return fs.readdirSync(".", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .find((dir) => fs.existsSync(path.join(dir, "New_bgp_1.txt"))) || "";
}
