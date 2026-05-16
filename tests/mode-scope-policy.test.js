import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAnalysisContext,
  filterAuditForModeScope,
} from "../src/core/analysisModes.js";
import {
  createComparisonPlan,
  matchNormalizedObjects,
} from "../src/core/comparator.js";
import {
  attachAuditFindingsToPlan,
  runStandardsAudit,
  runStandardsAuditForSides,
} from "../src/core/standardsAudit.js";
import { buildSummaryDashboardData, buildGraphData } from "../src/core/summaryAnalytics.js";

function object(type, key, fields = {}, rawLines = [], side = "old") {
  return {
    id: `${side}-${type}-${key}`,
    vendor: "nokia-md-cli",
    normalizedType: type,
    normalizedIdentity: key,
    sourceName: key,
    fields,
    rawLines: rawLines.length ? rawLines : [`${type} ${key}`],
  };
}

test("BGP neighbor without import/export is clean in simple compare mode", () => {
  const bgp = object("bgp", "192.0.2.1", { neighbor: "192.0.2.1" }, ["neighbor 192.0.2.1"]);
  const audit = runStandardsAuditForSides({
    oldResult: { objects: [bgp] },
    newResult: { objects: [] },
    profile: {},
    oldVendor: "nokia-md-cli",
    newVendor: "nokia-md-cli",
  });
  const context = buildAnalysisContext({ mode: "simple-compare", scope: "bgp-neighbor-only" });
  const displayAudit = filterAuditForModeScope(audit, context);
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [],
    audit,
    analysisMode: "simple-compare",
    compareScope: "bgp-neighbor-only",
  });

  assert.equal(displayAudit.summary.active, 0);
  assert.equal(dashboard.counts.auditActive, 0);
  assert.equal(dashboard.context.standardsAuditVisible, false);
  assert.equal(dashboard.context.migrationReadinessVisible, false);
});

test("BGP import/export missing is not active when standards profile does not require it", () => {
  const audit = runStandardsAudit({
    side: "old",
    vendor: "nokia-md-cli",
    profile: {
      standardsAudit: {
        enabled: true,
        rules: {
          requireBgpImportPolicy: false,
          requireBgpExportPolicy: false,
        },
      },
    },
    objects: [object("bgp", "192.0.2.1", { neighbor: "192.0.2.1" }, ["neighbor 192.0.2.1"])],
  });

  assert.equal(audit.findings.some((finding) => finding.ruleId === "bgp.import-policy-required"), false);
  assert.equal(audit.findings.some((finding) => finding.ruleId === "bgp.export-policy-required"), false);
});

test("BGP import/export missing is active only when selected profile requires it", () => {
  const audit = runStandardsAudit({
    side: "old",
    vendor: "nokia-md-cli",
    profile: {
      standardsAudit: {
        enabled: true,
        rules: {
          requireBgpImportPolicy: true,
          requireBgpExportPolicy: true,
        },
      },
    },
    objects: [object("bgp", "192.0.2.1", { neighbor: "192.0.2.1" }, ["neighbor 192.0.2.1"])],
  });

  assert.ok(audit.findings.some((finding) => finding.ruleId === "bgp.import-policy-required" && !finding.suppressed));
  assert.ok(audit.findings.some((finding) => finding.ruleId === "bgp.export-policy-required" && !finding.suppressed));
});

test("source export policy lost in target remains a compare field difference", () => {
  const oldObject = object("bgp", "192.0.2.1", {
    neighbor: "192.0.2.1",
    "export.policy": "EXPORT-1",
  }, ["neighbor 192.0.2.1 export EXPORT-1"], "old");
  const newObject = object("bgp", "192.0.2.1", {
    neighbor: "192.0.2.1",
  }, ["neighbor 192.0.2.1"], "new");
  const matches = matchNormalizedObjects({
    oldObjects: [oldObject],
    newObjects: [newObject],
    manualMap: {},
    profile: {},
  });
  const plan = createComparisonPlan(matches, {});
  const bgp = plan[0];

  assert.equal(bgp.status, "matched");
  assert.equal(bgp.fieldSummary["export.policy"]?.status, "missing");
});

test("referenced route policy without definition remains an audit finding", () => {
  const audit = runStandardsAudit({
    side: "old",
    vendor: "nokia-md-cli",
    objects: [
      object("bgp", "192.0.2.1", {
        neighbor: "192.0.2.1",
        "import.policy": "IMPORT-MISSING",
      }, ["neighbor 192.0.2.1 import IMPORT-MISSING"]),
      object("route-policy", "OTHER", { name: "OTHER" }, ["policy-options policy-statement OTHER"]),
    ],
  });

  assert.ok(audit.findings.some((finding) => finding.ruleId === "route-policy.referenced-policy-undefined"));
});

test("new-side line exception suppresses audit, summary, graph, and field violation state", () => {
  const profile = {
    rules: {
      ignore: [{ source: "new", pattern: "metric 100", matchMode: "contains", reason: "target fixture default" }],
    },
  };
  const oldObject = object("static-route", "0.0.0.0/0", {
    route: "0.0.0.0/0",
    "next-hop": "192.0.2.1",
    metric: "10",
  }, ["static-route 0.0.0.0/0 next-hop 192.0.2.1 metric 10"], "old");
  const newObject = object("static-route", "0.0.0.0/0", {
    route: "0.0.0.0/0",
    "next-hop": "192.0.2.1",
    metric: "100",
  }, ["static-route 0.0.0.0/0 next-hop 192.0.2.1 metric 100"], "new");
  const matches = matchNormalizedObjects({
    oldObjects: [oldObject],
    newObjects: [newObject],
    manualMap: {},
    profile,
  });
  const rawPlan = createComparisonPlan(matches, profile);
  const audit = runStandardsAuditForSides({
    oldResult: { objects: [] },
    newResult: { objects: [newObject] },
    profile,
    oldVendor: "nokia-md-cli",
    newVendor: "nokia-md-cli",
  });
  const plan = attachAuditFindingsToPlan(rawPlan, audit);
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan,
    audit,
    analysisMode: "standards-audit",
    compareScope: "all",
  });
  const graph = buildGraphData({ plan, auditFindings: audit.findings });

  assert.equal(plan[0].fieldSummary.metric.effectiveStatus, "ignored");
  assert.equal(plan[0].policyViolationCount, 0);
  assert.equal(audit.summary.active, 0);
  assert.ok(audit.summary.suppressed > 0);
  assert.equal(dashboard.counts.auditActive, 0);
  assert.equal(graph.nodes.some((node) => node.objectType === "standard-finding"), false);
});

test("manual mapping does not reintroduce a suppressed new-side issue", () => {
  const oldObject = object("static-route", "old-route", {
    route: "10.0.0.0/24",
    "next-hop": "192.0.2.1",
    metric: "10",
  }, ["static-route 10.0.0.0/24 next-hop 192.0.2.1 metric 10"], "old");
  const newObject = object("static-route", "new-route", {
    route: "10.0.0.0/24",
    "next-hop": "192.0.2.1",
    metric: "100",
  }, ["static-route 10.0.0.0/24 next-hop 192.0.2.1 metric 100"], "new");
  const profile = {
    rules: {
      ignore: [{ source: "new", pattern: "metric 100", matchMode: "contains" }],
    },
  };
  const matches = matchNormalizedObjects({
    oldObjects: [oldObject],
    newObjects: [newObject],
    manualMap: { [oldObject.id]: newObject.id },
    profile,
  });
  const plan = createComparisonPlan(matches, profile);

  assert.equal(plan.length, 1);
  assert.equal(plan[0].reason, "manual");
  assert.equal(plan[0].status, "matched");
  assert.equal(plan[0].policyViolationCount, 0);
  assert.equal(plan[0].fieldSummary.metric.effectiveStatus, "ignored");
});
