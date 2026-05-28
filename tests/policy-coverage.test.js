import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
  renderComparisonPlanHtml,
} from "../src/core/comparator.js";
import { createObjectComparePlan } from "../src/core/comparisonPlan.js";
import { buildSemanticCoverageDiagnostics } from "../src/core/coverageDiagnostics.js";
import { buildObjectFieldReviewRows, buildObjectReviewGroups } from "../src/core/objectReviewGroups.js";
import {
  evaluatePolicyContext,
  profileExceptionMatchesContext,
} from "../src/core/policyEvaluator.js";
import { preprocessConfigInput } from "../src/core/routerLogPreprocessor.js";
import { buildGraphData, buildSummaryDashboardData } from "../src/core/summaryAnalytics.js";
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

test("line exception keeps new-only object visible as suppressed review item", () => {
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
  assert.equal(dashboard.counts.newOnly, 1);
  assert.equal(dashboard.review.unmatchedNew.length, 0);
  assert.equal(dashboard.review.suppressed.length, 1);
  assert.equal(dashboard.review.abnormal.length, 0);
});

test("manual added line rule keeps object in integrated report as suppressed", () => {
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
  assert.equal(dashboard.counts.newOnly, 1);
  assert.equal(dashboard.review.unmatchedNew.length, 0);
  assert.equal(dashboard.review.suppressed.length, 1);

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
  assert.equal(oldDashboard.counts.oldOnly, 1);
  assert.equal(oldDashboard.review.unmatchedOld.length, 0);
  assert.equal(oldDashboard.review.suppressed.length, 1);
});

test("manual line rule does not apply to other object types", () => {
  const profile = {
    exceptions: [],
    rules: { ignore: [] },
    lineRules: {
      interface: [
        { source: "new", text: "admin-state enable", action: "ignore" },
      ],
    },
  };

  assert.equal(evaluatePolicyContext({
    profile,
    rawLine: "admin-state enable",
    side: "new",
    objectType: "interface",
  }).suppressed, true);
  assert.equal(evaluatePolicyContext({
    profile,
    rawLine: "admin-state enable",
    side: "new",
    objectType: "bgp",
  }).suppressed, false);
  assert.equal(evaluatePolicyContext({
    profile,
    rawLine: "admin-state enable",
    side: "new",
    objectType: "subscriber-interface",
  }).suppressed, false);
});

test("admin-state line token does not suppress BGP normalized state field", () => {
  const profile = {
    exceptions: [],
    rules: { ignore: [] },
    lineRules: {
      bgp: [
        { source: "new", text: "admin-state enable", action: "ignore" },
      ],
    },
  };
  const oldObject = {
    id: "old-bgp-admin-state-token",
    normalizedType: "bgp",
    normalizedIdentity: "112.174.176.32",
    fields: {
      neighbor: "112.174.176.32",
    },
    rawLines: [
      "neighbor 112.174.176.32",
    ],
  };
  const newObject = {
    id: "new-bgp-admin-state-token",
    normalizedType: "bgp",
    normalizedIdentity: "112.174.176.32",
    fields: {
      neighbor: "112.174.176.32",
      state: "enabled",
      "admin-state": "enabled",
    },
    rawLines: [
      '/configure { router "Base" bgp neighbor "112.174.176.32" admin-state enable }',
    ],
  };
  const item = createObjectComparePlan(
    { status: "matched", reason: "normalized-identity", oldObject, newObject },
    0,
    profile,
    [oldObject, newObject],
  );

  assert.equal(evaluatePolicyContext({
    profile,
    rawLine: "state enabled",
    side: "new",
    objectType: "bgp",
    field: "admin-state",
  }).suppressed, false);
  assert.equal(item.fieldSummary["admin-state"].status, "added");
  assert.equal(item.fieldSummary["admin-state"].effectiveStatus, "added");
  assert.equal(item.fieldSummary["admin-state"].ignored, false);
});

test("foreign line rule does not suppress subscriber-interface admin-state summary", () => {
  const profile = {
    exceptions: [],
    rules: { ignore: [] },
    lineRules: {
      interface: [
        { source: "new", text: "admin-state enable", action: "ignore" },
      ],
    },
  };
  const oldObject = {
    id: "old-sub-admin-state",
    normalizedType: "subscriber-interface",
    normalizedIdentity: "to-nowon-tou-fn17",
    fields: {
      address: "112.188.27.101/30",
      "dhcp.admin-state": "enabled",
      "sub-sla-mgmt.admin-state": "enabled",
    },
    rawLines: [
      "address 112.188.27.101/30",
      "dhcp",
      "no shutdown",
      "sub-sla-mgmt",
      "no shutdown",
    ],
  };
  const newObject = {
    id: "new-sub-admin-state",
    normalizedType: "subscriber-interface",
    normalizedIdentity: "to-nowon-tou-fn17",
    fields: {
      address: "112.188.27.101/30",
      "admin-state": "enabled",
      "dhcp.admin-state": "enabled",
      "sub-sla-mgmt.admin-state": "enabled",
    },
    rawLines: [
      '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 admin-state enable }',
      '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 ipv4 address 112.188.27.101 prefix-length 30 }',
      '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g ipv4 dhcp admin-state enable }',
      '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g sap lag-1 sub-sla-mgmt admin-state enable }',
    ],
  };
  const item = createObjectComparePlan(
    { status: "matched", reason: "normalized-identity", oldObject, newObject },
    0,
    profile,
    [oldObject, newObject],
  );

  assert.equal(item.fieldSummary["admin-state"].status, "added");
  assert.equal(item.fieldSummary["admin-state"].effectiveStatus, "added");
  assert.equal(item.fieldSummary["admin-state"].ignored, false);
  assert.equal(item.fieldSummary["dhcp.admin-state"].status, "equal");
  assert.equal(item.fieldSummary["dhcp.admin-state"].effectiveStatus, "equal");
  assert.equal(item.fieldSummary["dhcp.admin-state"].ignored, false);
  assert.equal(item.fieldSummary["sub-sla-mgmt.admin-state"].status, "equal");
  assert.equal(item.fieldSummary["sub-sla-mgmt.admin-state"].effectiveStatus, "equal");
  assert.equal(item.fieldSummary["sub-sla-mgmt.admin-state"].ignored, false);
});

test("profile admin-state exception keeps static route visible as suppressed review row", () => {
  const profile = {
    exceptions: [{
      id: "ex-profile-static-admin-state-changed",
      scope: "profile",
      enabled: true,
      target: {
        ruleId: "semantic-compare.important-field-change",
        category: "semantic-compare",
        objectType: "static-route",
        fieldPath: "admin-state",
        side: "both",
        findingType: "changed",
        issueType: "field-difference",
        status: "changed",
        changeType: "changed",
      },
      match: {
        mode: "profile-field-rule",
        objectType: "static-route",
        fieldPath: "admin-state",
        ruleId: "semantic-compare.important-field-change",
        category: "semantic-compare",
        findingType: "changed",
        issueType: "field-difference",
        changeType: "changed",
        changeTypes: ["changed"],
        valueMode: "any",
        newValuePattern: "*",
      },
    }],
  };
  const oldResult = normalizeConfig({
    vendor: VENDOR_IDS.NOKIA_CLASSIC,
    side: "old",
    configText: [
      "static-route-entry 112.188.30.19/32",
      "    next-hop 112.188.21.198",
      "        tag 500",
      "        no shutdown",
      "    exit",
      "exit",
    ].join("\n"),
  });
  const newResult = normalizeConfig({
    vendor: VENDOR_IDS.NOKIA_MD_CLI,
    side: "new",
    configText: [
      '/configure { router "Base" static-routes route 112.188.30.19/32 route-type unicast next-hop 112.188.21.198 admin-state disable }',
      '/configure { router "Base" static-routes route 112.188.30.19/32 route-type unicast next-hop 112.188.21.198 tag 500 }',
    ].join("\n"),
  });
  const plan = createComparisonPlan(
    matchNormalizedObjects({
      oldObjects: oldResult.objects,
      newObjects: newResult.objects,
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
  const suppressedRow = dashboard.review.suppressed[0];
  const ignoredFields = plan[0].lineMatches
    .filter((lineMatch) => lineMatch.status === "ignored")
    .flatMap((lineMatch) => lineMatch.fieldMatches?.map((fieldMatch) => fieldMatch.field) || []);

  assert.equal(oldResult.objects.length, 1);
  assert.equal(newResult.objects.length, 1);
  assert.equal(plan[0].fieldSummary["admin-state"].effectiveStatus, "ignored");
  assert.ok(ignoredFields.includes("state"));
  assert.ok(ignoredFields.includes("next-hop[112.188.21.198].state"));
  assert.equal(dashboard.review.abnormal.length, 0);
  assert.equal(dashboard.review.suppressed.length, 1);
  assert.equal(suppressedRow.objectType, "static-route");
  assert.equal(suppressedRow.objectKey, "static-route:112.188.30.19/32");
  assert.equal(suppressedRow.policyId, "ex-profile-static-admin-state-changed");
  assert.ok(suppressedRow.fieldRows.some((row) => row.field === "admin-state" && row.status === "ignored"));
});

test("profile field exception is limited to originating object type", () => {
  const exception = {
    id: "ex-profile-bgp-admin-state",
    scope: "profile",
    enabled: true,
    target: {
      createdFromObjectKey: "bgp:192.0.2.1",
      fieldPath: "admin-state",
      ruleId: "semantic-compare.important-field-change",
      category: "semantic-compare",
      issueType: "field-difference",
      changeType: "changed",
    },
    match: {
      mode: "profile-field-rule",
      fieldPath: "admin-state",
      ruleId: "semantic-compare.important-field-change",
      category: "semantic-compare",
      issueType: "field-difference",
      changeTypes: ["changed"],
      valueMode: "any",
    },
  };

  const baseContext = {
    side: "both",
    field: "admin-state",
    ruleId: "semantic-compare.important-field-change",
    category: "semantic-compare",
    issueType: "field-difference",
    changeType: "changed",
  };

  assert.equal(profileExceptionMatchesContext(exception, {
    ...baseContext,
    objectType: "bgp",
    objectKey: "bgp:192.0.2.1",
  }), true);
  assert.equal(profileExceptionMatchesContext(exception, {
    ...baseContext,
    objectType: "interface",
    objectKey: "interface:to-core",
  }), false);
  assert.equal(evaluatePolicyContext({
    profile: { exceptions: [exception] },
    ...baseContext,
    objectType: "interface",
    objectKey: "interface:to-core",
  }).suppressed, false);
});

test("profile field exception without object type does not become global", () => {
  const exception = {
    id: "ex-profile-unscoped-admin-state",
    scope: "profile",
    enabled: true,
    match: {
      mode: "profile-field-rule",
      fieldPath: "admin-state",
      ruleId: "semantic-compare.important-field-change",
      category: "semantic-compare",
      issueType: "field-difference",
      changeTypes: ["changed"],
      valueMode: "any",
    },
  };

  assert.equal(profileExceptionMatchesContext(exception, {
    side: "both",
    objectType: "interface",
    objectKey: "interface:to-core",
    field: "admin-state",
    ruleId: "semantic-compare.important-field-change",
    category: "semantic-compare",
    issueType: "field-difference",
    changeType: "changed",
  }), false);
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

test("profile exception field aliases match state and admin-state", () => {
  const exception = {
    id: "admin-state-exception",
    scope: "object",
    enabled: true,
    target: {
      objectType: "bgp",
      objectKey: "bgp:112.174.176.128",
      fieldPath: "admin-state",
      ruleId: "semantic-compare.important-field-change",
      category: "semantic-compare",
      findingType: "added",
      issueType: "field-difference",
      changeType: "added",
    },
    match: {
      mode: "exact-object-field-rule",
      objectType: "bgp",
      objectKey: "bgp:112.174.176.128",
      fieldPath: "admin-state",
      ruleId: "semantic-compare.important-field-change",
      category: "semantic-compare",
      findingType: "added",
      issueType: "field-difference",
      changeTypes: ["added"],
    },
  };

  assert.equal(profileExceptionMatchesContext(exception, {
    objectType: "bgp",
    objectKey: "bgp:112.174.176.128",
    field: "state",
    ruleId: "semantic-compare.important-field-change",
    category: "semantic-compare",
    findingType: "added",
    issueType: "field-difference",
    changeType: "added",
  }), true);
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

test("profile exception persists and suppresses BGP group field on rerun", () => {
  const base = runBgpGroupExceptionFixture();
  assert.equal(countActiveFieldIssues(base.plan, "group"), 2);
  assert.equal(countSuppressedProfileFieldIssues(base.plan, "group"), 0);

  const profile = bgpGroupProfileExceptionProfile();
  const rerun = runBgpGroupExceptionFixture(profile);
  assert.equal(rerun.profile.exceptions.length, 1);
  assert.equal(countActiveFieldIssues(rerun.plan, "group"), 0);
  assert.equal(countSuppressedProfileFieldIssues(rerun.plan, "group"), 2);
});

test("object review grouping keeps one row per object with multiple issues", () => {
  const groups = buildObjectReviewGroups({
    review: {
      abnormal: [{
        planId: "pair-bgp-19",
        objectType: "bgp",
        oldKey: "bgp:112.188.30.19",
        newKey: "bgp:112.188.30.19",
        label: "112.188.30.19",
        status: "matched",
        score: 89,
        fieldRows: [
          { field: "group", status: "structure-converted", oldValue: "", newValue: "ACCESS-PEER" },
          { field: "state", status: "added", oldValue: "", newValue: "disabled" },
          { field: "description", status: "different", oldValue: "old-desc", newValue: "new-desc" },
        ],
      }],
    },
    plan: [],
  });

  assert.equal(groups.length, 1);
  assert.equal(groups[0].activeIssueCount, 2);
  assert.deepEqual(groups[0].issueFields, ["state", "description"]);
  assert.equal(groups[0].activeIssues.some((issue) => issue.fieldPath === "group"), false);
});

test("object review grouping keeps unresolved BGP inheritance suppressed", () => {
  const profile = {
    oldVendor: VENDOR_IDS.NOKIA_CLASSIC,
    newVendor: VENDOR_IDS.NOKIA_MD_CLI,
  };
  const oldResult = normalizeConfig({
    vendor: VENDOR_IDS.NOKIA_CLASSIC,
    profile,
    side: "old",
    configText: [
      "neighbor 210.183.28.162",
      "    peer-as 4766",
      "    export SER-PEER",
    ].join("\n"),
  });
  const newResult = normalizeConfig({
    vendor: VENDOR_IDS.NOKIA_MD_CLI,
    profile,
    side: "new",
    configText: [
      '/configure { router "Base" bgp neighbor "210.183.28.162" group "ACCESS-PEER" }',
      '/configure { router "Base" bgp neighbor "210.183.28.162" admin-state disable }',
    ].join("\n"),
  });
  const plan = createComparisonPlan(
    matchNormalizedObjects({
      oldObjects: oldResult.objects,
      newObjects: newResult.objects,
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
  const groups = buildObjectReviewGroups({
    review: dashboard.review,
    plan,
  });
  const group = groups.find((item) => item.objectKey === "bgp:210.183.28.162");

  assert.ok(group);
  assert.deepEqual(group.activeIssues.map((issue) => issue.fieldPath), ["admin-state"]);
  assert.equal(group.suppressedIssues.some((issue) =>
    issue.fieldPath === "group" && issue.status === "structure-converted"
  ), true);
  assert.equal(group.suppressedIssues.some((issue) =>
    issue.fieldPath === "peer-as" && issue.status === "inheritance-unresolved"
  ), true);
  assert.equal(group.suppressedIssues.some((issue) =>
    issue.fieldPath === "export.policy" && issue.status === "inheritance-unresolved"
  ), true);
});

test("profile exception applies to same BGP field rule across objects only", () => {
  const result = runBgpGroupExceptionFixture(bgpGroupProfileExceptionProfile());

  assert.equal(countSuppressedProfileFieldIssues(result.plan, "group"), 2);
  assert.equal(countActiveFieldIssues(result.plan, "admin-state"), 2);
  assert.equal(countSuppressedProfileFieldIssues(result.plan, "admin-state"), 0);
  assert.equal(countActiveFieldIssues(result.plan, "description"), 2);
});

test("object scoped exception suppresses only selected BGP object field", () => {
  const result = runBgpGroupExceptionFixture({
    exceptions: [{
      id: "ex-object-bgp-group-19",
      scope: "object",
      enabled: true,
      target: {
        vendorPair: `${VENDOR_IDS.NOKIA_CLASSIC}->${VENDOR_IDS.NOKIA_MD_CLI}`,
        objectType: "bgp",
        objectKey: "bgp:112.188.30.19",
        fieldPath: "group",
        ruleId: "semantic-compare.important-field-change",
        issueType: "field-difference",
        status: "structure-converted",
        changeType: "structure-converted",
      },
      match: {
        mode: "exact-object-field-rule",
        vendorPair: `${VENDOR_IDS.NOKIA_CLASSIC}->${VENDOR_IDS.NOKIA_MD_CLI}`,
        objectType: "bgp",
        objectKey: "bgp:112.188.30.19",
        fieldPath: "group",
        ruleId: "semantic-compare.important-field-change",
        issueType: "field-difference",
        changeTypes: ["added", "structure-converted"],
        newValuePattern: "*",
      },
    }],
  });

  const byIp = Object.fromEntries(result.plan.map((item) => [
    item.oldObject?.normalizedIdentity,
    item.fieldSummary.group,
  ]));
  assert.equal(byIp["112.188.30.19"].ignored, true);
  assert.equal(byIp["112.188.30.64"].ignored, false);
});

test("removing profile exception restores BGP group field issue", () => {
  const suppressed = runBgpGroupExceptionFixture(bgpGroupProfileExceptionProfile());
  const restored = runBgpGroupExceptionFixture({ exceptions: [] });

  assert.equal(countActiveFieldIssues(suppressed.plan, "group"), 0);
  assert.equal(countActiveFieldIssues(restored.plan, "group"), 2);
});

test("multiple issues on one BGP object remain field scoped", () => {
  const result = runBgpGroupExceptionFixture(bgpGroupProfileExceptionProfile());
  const first = result.plan.find((item) => item.oldObject?.normalizedIdentity === "112.188.30.19");

  assert.equal(first.fieldSummary.group.ignored, true);
  assert.equal(first.fieldSummary["admin-state"].ignored, false);
  assert.equal(first.fieldSummary["admin-state"].status, "added");
  assert.equal(first.fieldSummary.description.ignored, false);
  assert.equal(first.fieldSummary.description.status, "changed");
});

test("summary and graph use suppressed canonical state for profile exception", () => {
  const before = runBgpGroupExceptionFixture();
  const after = runBgpGroupExceptionFixture(bgpGroupProfileExceptionProfile());
  const beforeGraph = buildGraphData({ plan: before.plan, auditFindings: [] });
  const afterGraph = buildGraphData({ plan: after.plan, auditFindings: [] });

  assert.equal(countActiveFieldIssues(before.plan, "group"), 2);
  assert.equal(countActiveFieldIssues(after.plan, "group"), 0);
  assert.equal(after.dashboard.review.abnormal.every((item) =>
    item.fieldRows.every((row) => row.field !== "group")
  ), true);
  assert.equal(after.dashboard.review.suppressed.length, 2);
  assert.equal(after.dashboard.review.suppressed.every((item) =>
    item.fieldRows.some((row) => row.field === "group")
  ), true);
  assert.equal(beforeGraph.edges.length, afterGraph.edges.length);
  assert.equal(afterGraph.edges.every((edge) => edge.status !== "profile-exception"), true);
});

test("object review grouping reflects profile suppressed group while keeping state active", () => {
  const result = runBgpGroupExceptionFixture(bgpGroupProfileExceptionProfile());
  const groups = buildObjectReviewGroups({
    review: result.dashboard.review,
    plan: result.plan,
  });
  const group = groups.find((item) => item.objectKey === "bgp:112.188.30.19");

  assert.ok(group);
  assert.equal(group.activeIssues.some((issue) => ["state", "admin-state"].includes(issue.fieldPath)), true);
  assert.equal(group.activeIssues.some((issue) => issue.fieldPath === "group"), false);
  assert.equal(group.suppressedIssues.some((issue) =>
    issue.fieldPath === "group" && issue.sourcePolicy === "profile-exception"
  ), true);
});

test("description field review row dedupes active and suppressed issues", () => {
  const rows = buildObjectFieldReviewRows({
    objectKey: "bgp:112.188.30.19",
    activeIssues: [{
      id: "active-description",
      fieldPath: "description",
      status: "changed",
      statusLabel: "차이",
      reason: "값 변경 확인",
      oldValue: "old-desc",
      newValue: "new-desc",
      ruleId: "semantic-compare.important-field-change",
    }],
    suppressedIssues: [{
      id: "suppressed-description",
      fieldPath: "description",
      status: "ignored",
      statusLabel: "예외 처리",
      reason: "고급 비교 정책: 필드 무시",
      oldValue: "old-desc",
      newValue: "new-desc",
      ruleId: "semantic-compare.important-field-change",
      sourcePolicy: "advanced-policy",
    }, {
      id: "suppressed-group",
      fieldPath: "group",
      status: "ignored",
      statusLabel: "예외 처리",
      reason: "MD-CLI 그룹 구조",
      newValue: "ACCESS-PEER",
      ruleId: "semantic-compare.important-field-change",
      sourcePolicy: "profile-exception",
    }],
  });

  const descriptionRows = rows.filter((row) => row.fieldPath === "description");
  const activeRows = rows.filter((row) => row.activeCount > 0);
  const suppressedOnlyRows = rows.filter((row) => row.activeCount === 0 && row.suppressedCount > 0);

  assert.equal(descriptionRows.length, 1);
  assert.equal(descriptionRows[0].activeCount, 1);
  assert.equal(descriptionRows[0].suppressedCount, 1);
  assert.deepEqual(activeRows.map((row) => row.fieldPath), ["description"]);
  assert.deepEqual(suppressedOnlyRows.map((row) => row.fieldPath), ["group"]);
});

test("legacy profile exception mode/object key does not restrict profile-wide match", () => {
  const result = runBgpGroupExceptionFixture({
    exceptions: [{
      id: "legacy-profile-exact-bgp-group",
      scope: "profile",
      enabled: true,
      target: {
        vendorPair: `${VENDOR_IDS.NOKIA_CLASSIC}->${VENDOR_IDS.NOKIA_MD_CLI}`,
        objectType: "bgp",
        objectKey: "bgp:112.188.30.19",
        fieldPath: "group",
        ruleId: "semantic-compare.important-field-change · semantic-compare",
        issueType: "field-difference",
        status: "structure-converted",
      },
      match: {
        mode: "exact-object-field-rule",
        vendorPair: `${VENDOR_IDS.NOKIA_CLASSIC}->${VENDOR_IDS.NOKIA_MD_CLI}`,
        objectType: "bgp",
        objectKey: "bgp:112.188.30.19",
        fieldPath: "group",
        ruleId: "semantic-compare.important-field-change · semantic-compare",
        issueType: "field-difference",
        changeTypes: ["added", "structure-converted"],
        valueMode: "any",
      },
    }],
  });

  assert.equal(countActiveFieldIssues(result.plan, "group"), 0);
  assert.equal(countSuppressedProfileFieldIssues(result.plan, "group"), 2);
  assert.equal(countActiveFieldIssues(result.plan, "admin-state"), 2);
  assert.equal(countActiveFieldIssues(result.plan, "description"), 2);
});

test("semantic compare field cards expose exception actions outside summary detail", () => {
  const result = runBgpGroupExceptionFixture();
  const targetIds = [];
  const html = renderComparisonPlanHtml(result.plan, {
    getFieldExceptionTargetId: (item, field) => {
      targetIds.push(`${item.objectType}:${field.field}`);
      return `target-${targetIds.length}`;
    },
  });

  assert.match(html, /semantic-field-actions/);
  assert.match(html, /data-add-exception="target-\d+"/);
  assert.match(html, /data-exception-fixed-scope="profile"/);
  assert.ok(targetIds.some((id) => id === "bgp:group"));
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

function runBgpGroupExceptionFixture(profileOverrides = {}) {
  const profile = {
    oldVendor: VENDOR_IDS.NOKIA_CLASSIC,
    newVendor: VENDOR_IDS.NOKIA_MD_CLI,
    validationPolicies: {
      bgp: [
        { field: "description", policy: "compare" },
      ],
    },
    ...profileOverrides,
  };
  const oldText = [
    "configure",
    "    router",
    "        bgp",
    "            neighbor 112.188.30.19",
    "                description \"## to-Dobong-TOU-FK66 ##\"",
    "                authentication-key \"OLDKEY\" hash2",
    "            exit",
    "            neighbor 112.188.30.64",
    "                description \"## to-Nowon-TOU-FN14 ##\"",
    "                authentication-key \"OLDKEY2\" hash2",
    "            exit",
    "        exit",
    "    exit",
  ].join("\n");
  const newText = [
    '/configure { router "Base" bgp neighbor "112.188.30.19" admin-state disable }',
    '/configure { router "Base" bgp neighbor "112.188.30.19" description "## Dobong-TOU-FK66 ##" }',
    '/configure { router "Base" bgp neighbor "112.188.30.19" group "ACCESS-PEER" }',
    '/configure { router "Base" bgp neighbor "112.188.30.19" authentication-key "OLDKEY" }',
    '/configure { router "Base" bgp neighbor "112.188.30.64" admin-state disable }',
    '/configure { router "Base" bgp neighbor "112.188.30.64" description "## Nowon-TOU-FN14 ##" }',
    '/configure { router "Base" bgp neighbor "112.188.30.64" group "ACCESS-PEER" }',
    '/configure { router "Base" bgp neighbor "112.188.30.64" authentication-key "OLDKEY2" }',
  ].join("\n");

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
      profile,
    }),
    profile,
  );
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan,
    semanticSummary: {},
  });
  return { profile, oldResult, newResult, plan, dashboard };
}

function bgpGroupProfileExceptionProfile() {
  return {
    exceptions: [{
      id: "ex-profile-bgp-group-added-mdcli",
      scope: "profile",
      enabled: true,
      createdAt: "2026-05-17T00:00:00.000Z",
      createdFromIssueId: "fixture-bgp-group",
      reasonKo: "MD-CLI BGP neighbor group 구조 전환은 현재 프로파일에서 제외",
      target: {
        vendorPair: `${VENDOR_IDS.NOKIA_CLASSIC}->${VENDOR_IDS.NOKIA_MD_CLI}`,
        objectType: "bgp",
        fieldPath: "group",
        ruleId: "semantic-compare.important-field-change",
        issueType: "field-difference",
        status: "structure-converted",
        changeType: "structure-converted",
        newValue: "ACCESS-PEER",
      },
      match: {
        mode: "profile-field-rule",
        vendorPair: `${VENDOR_IDS.NOKIA_CLASSIC}->${VENDOR_IDS.NOKIA_MD_CLI}`,
        objectType: "bgp",
        fieldPath: "group",
        ruleId: "semantic-compare.important-field-change",
        issueType: "field-difference",
        changeTypes: ["added", "structure-converted"],
        newValuePattern: "*",
      },
    }],
  };
}

function countActiveFieldIssues(plan = [], field = "") {
  return plan.filter((item) => {
    const summary = item.fieldSummary?.[field];
    if (!summary || summary.ignored || summary.effectiveStatus === "ignored") return false;
    return ["added", "missing", "changed", "different", "structure-converted"].includes(String(summary.effectiveStatus || summary.status || "").toLowerCase());
  }).length;
}

function countSuppressedProfileFieldIssues(plan = [], field = "") {
  return plan.filter((item) => {
    const summary = item.fieldSummary?.[field];
    return summary?.ignored && summary.policyHits?.some((hit) => hit.sourcePolicy === "profile-exception");
  }).length;
}

function findExampleDir() {
  return fs.readdirSync(".", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .find((dir) => fs.existsSync(path.join(dir, "New_bgp_1.txt"))) || "";
}
