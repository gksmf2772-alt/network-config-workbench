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

test("manual added line rule suppresses new-only object from integrated review", () => {
  const rawLine = '/configure { router "Base" bgp neighbor "210.183.28.161" group "ACCESS-PEER" }';
  const profile = {
    lineRules: {
      bgp: [
        { source: "new", text: rawLine, action: "added", message: "accepted target-only line" },
      ],
    },
    rules: { ignore: [] },
  };
  const newObject = {
    id: "new-bgp-added-rule",
    normalizedType: "bgp",
    normalizedIdentity: "210.183.28.161",
    fields: {
      neighbor: "210.183.28.161",
      group: "ACCESS-PEER",
    },
    rawLines: [rawLine],
  };
  const plan = createComparisonPlan(
    matchNormalizedObjects({
      oldObjects: [],
      newObjects: [newObject],
      manualMap: {},
      profile,
    }),
    profile,
  );
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan,
    semanticSummary: {},
  });

  assert.equal(plan[0].policySuppressed, true);
  assert.equal(plan[0].lineMatches.every((lineMatch) => lineMatch.status === "ignored"), true);
  assert.equal(dashboard.counts.newOnly, 0);
  assert.equal(dashboard.review.unmatchedNew.length, 0);

  const oldLine = "neighbor 203.0.113.10";
  const oldProfile = {
    lineRules: {
      bgp: [
        { source: "old", text: oldLine, action: "missing", message: "accepted source-only line" },
      ],
    },
    rules: { ignore: [] },
  };
  const oldObject = {
    id: "old-bgp-missing-rule",
    normalizedType: "bgp",
    normalizedIdentity: "203.0.113.10",
    fields: { neighbor: "203.0.113.10" },
    rawLines: [oldLine],
  };
  const oldPlan = createComparisonPlan(
    matchNormalizedObjects({
      oldObjects: [oldObject],
      newObjects: [],
      manualMap: {},
      profile: oldProfile,
    }),
    oldProfile,
  );
  const oldDashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: oldPlan,
    semanticSummary: {},
  });

  assert.equal(oldPlan[0].policySuppressed, true);
  assert.equal(oldDashboard.counts.oldOnly, 0);
  assert.equal(oldDashboard.review.unmatchedOld.length, 0);
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

test("object scoped exception matches only the selected object key", () => {
  const profile = {
    rules: {
      ignore: [{
        source: "new",
        objectType: "static-route",
        objectKey: "static-route:10.10.10.0/24|192.0.2.1",
        pattern: "static-route:10.10.10.0/24|192.0.2.1",
      }],
    },
  };

  const matched = evaluatePolicyContext({
    profile,
    rawLine: "tag 100",
    side: "new",
    objectType: "static-route",
    objectKey: "static-route:10.10.10.0/24|192.0.2.1",
  });
  const other = evaluatePolicyContext({
    profile,
    rawLine: "tag 100",
    side: "new",
    objectType: "static-route",
    objectKey: "static-route:10.10.10.0/24|192.0.2.2",
  });

  assert.equal(matched.suppressed, true);
  assert.equal(other.suppressed, false);
});

test("profile scoped exception can target one finding type", () => {
  const profile = {
    rules: {
      ignore: [{
        source: "both",
        objectType: "static-route",
        findingType: "new-only",
        pattern: "new-only",
      }],
    },
  };

  const newOnly = evaluatePolicyContext({
    profile,
    rawLine: "route 10.10.10.0/24",
    side: "new",
    objectType: "static-route",
    findingType: "new-only",
  });
  const oldOnly = evaluatePolicyContext({
    profile,
    rawLine: "route 10.10.10.0/24",
    side: "old",
    objectType: "static-route",
    findingType: "old-only",
  });

  assert.equal(newOnly.suppressed, true);
  assert.equal(oldOnly.suppressed, false);
});

test("profile exceptions suppress only selected object when object scoped", () => {
  const profile = {
    exceptions: [{
      id: "exception-object-static",
      scope: "object",
      enabled: true,
      target: {
        side: "new",
        objectType: "static-route",
        objectKey: "static-route:10.10.10.0/24|192.0.2.1",
        fieldPath: "tag",
        findingType: "new-only",
      },
      match: {
        mode: "exact-object",
        objectType: "static-route",
        objectKey: "static-route:10.10.10.0/24|192.0.2.1",
        fieldPath: "tag",
        findingType: "new-only",
      },
    }],
  };

  const selected = evaluatePolicyContext({
    profile,
    rawLine: "tag 100",
    side: "new",
    objectType: "static-route",
    objectKey: "static-route:10.10.10.0/24|192.0.2.1",
    field: "tag",
    findingType: "new-only",
  });
  const otherObject = evaluatePolicyContext({
    profile,
    rawLine: "tag 100",
    side: "new",
    objectType: "static-route",
    objectKey: "static-route:10.10.10.0/24|192.0.2.2",
    field: "tag",
    findingType: "new-only",
  });

  assert.equal(selected.suppressed, true);
  assert.equal(selected.sourcePolicy, "profile-exception");
  assert.equal(otherObject.suppressed, false);
});

test("profile exceptions suppress same profile field rule after reload", () => {
  const exception = {
    id: "exception-profile-bgp-description",
    scope: "profile",
    enabled: true,
    target: {
      side: "both",
      objectType: "bgp",
      fieldPath: "description",
      findingType: "matched",
    },
    match: {
      mode: "profile-field-rule",
      objectType: "bgp",
      fieldPath: "description",
      findingType: "matched",
    },
  };
  const reloadedProfile = JSON.parse(JSON.stringify({ exceptions: [exception] }));

  const matched = evaluatePolicyContext({
    profile: reloadedProfile,
    rawLine: 'description "peer"',
    side: "new",
    objectType: "bgp",
    objectKey: "bgp:192.0.2.1",
    field: "description",
    findingType: "matched",
  });
  const differentField = evaluatePolicyContext({
    profile: reloadedProfile,
    rawLine: "peer-as 65000",
    side: "new",
    objectType: "bgp",
    objectKey: "bgp:192.0.2.1",
    field: "peer-as",
    findingType: "matched",
  });

  assert.equal(matched.suppressed, true);
  assert.equal(differentField.suppressed, false);
});

test("disabled profile exception restores active policy result", () => {
  const profile = {
    exceptions: [{
      id: "disabled-exception",
      scope: "profile",
      enabled: false,
      target: { objectType: "bgp", fieldPath: "group", findingType: "new-only" },
      match: { mode: "profile-field-rule", objectType: "bgp", fieldPath: "group", findingType: "new-only" },
    }],
  };

  const result = evaluatePolicyContext({
    profile,
    rawLine: 'group "ACCESS-PEER"',
    side: "new",
    objectType: "bgp",
    objectKey: "bgp:192.0.2.1",
    field: "group",
    findingType: "new-only",
  });

  assert.equal(result.suppressed, false);
});

test("coverage unsupported count does not double subtract ignored target lines", () => {
  const coverage = buildSemanticCoverageDiagnostics({
    oldText: "system name fixture",
    newText: "metric 100",
    oldResult: {
      objects: [],
      preprocess: null,
    },
    newResult: {
      objects: [],
      preprocess: null,
    },
    plan: [],
    profile: {
      rules: {
        ignore: [
          { source: "new", pattern: "metric 100", matchMode: "contains" },
        ],
      },
    },
  });

  assert.equal(coverage.sides.old.unparsedLineCount, 1);
  assert.equal(coverage.sides.new.ignoredLineCount, 1);
  assert.equal(coverage.unparsedLineCount, 1);
});

function findExampleDir() {
  return fs.readdirSync(".", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .find((dir) => fs.existsSync(path.join(dir, "New_bgp_1.txt"))) || "";
}
