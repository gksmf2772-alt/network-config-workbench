import test from "node:test";
import assert from "node:assert/strict";

import {
  attachAuditFindingsToPlan,
  runStandardsAudit,
  runStandardsAuditForSides,
} from "../src/core/standardsAudit.js";
import { buildSummaryDashboardData, buildGraphData } from "../src/core/summaryAnalytics.js";

function object(type, key, fields = {}, rawLines = []) {
  return {
    id: `${type}-${key}`,
    vendor: "nokia-md-cli",
    normalizedType: type,
    normalizedIdentity: key,
    sourceName: key,
    fields,
    rawLines: rawLines.length ? rawLines : [`${type} ${key}`],
  };
}

test("QoS policy referenced by SAP is accepted when definition exists", () => {
  const audit = runStandardsAudit({
    side: "old",
    vendor: "nokia-md-cli",
    objects: [
      object("sap", "svc|sap", {
        sap: "1/1/1:100",
        "subscriber-interface": "sub",
        "group-interface": "grp",
        "ingress.qos.sap-ingress.policy-name": "Q-IN",
        "egress.qos.sap-egress.policy-name": "Q-IN",
      }),
      object("qos-policy", "Q-IN", { name: "Q-IN" }),
    ],
  });

  assert.equal(audit.findings.some((finding) => finding.ruleId === "qos.referenced-policy-undefined"), false);
  assert.equal(audit.findings.some((finding) => finding.ruleId === "qos.policy-parser-partial"), false);
});

test("missing QoS policy reference and missing SAP QoS are findings", () => {
  const audit = runStandardsAudit({
    side: "old",
    vendor: "nokia-md-cli",
    objects: [
      object("sap", "sap-a", { sap: "1/1/1:100", "egress.qos.sap-egress.policy-name": "Q-MISSING" }),
      object("qos-policy", "Q-OTHER", { name: "Q-OTHER" }),
    ],
  });

  assert.ok(audit.findings.some((finding) => finding.ruleId === "qos.sap-ingress-required"));
  assert.ok(audit.findings.some((finding) => finding.ruleId === "qos.referenced-policy-undefined"));
  assert.ok(audit.summary.active >= 2);
});

test("BGP neighbor policy missing and static route next-hop validation", () => {
  const audit = runStandardsAudit({
    side: "old",
    vendor: "nokia-classic",
    profile: {
      standardsAudit: {
        rules: {
          bgpRequiresImportPolicy: true,
          bgpRequiresExportPolicy: true,
        },
      },
    },
    objects: [
      object("bgp", "192.0.2.1", { neighbor: "192.0.2.1" }),
      object("static-route", "0.0.0.0/0", { route: "0.0.0.0/0" }),
    ],
  });

  assert.ok(audit.findings.some((finding) => finding.ruleId === "bgp.import-policy-required"));
  assert.ok(audit.findings.some((finding) => finding.ruleId === "bgp.export-policy-required"));
  assert.ok(audit.findings.some((finding) => finding.ruleId === "static-route.next-hop-invalid"));
  assert.ok(audit.findings.some((finding) => finding.migrationImpact === "blocks-auto-generation"));
});

test("subscriber relationship and duplicate static-host are findings", () => {
  const audit = runStandardsAudit({
    side: "old",
    vendor: "nokia-md-cli",
    objects: [
      object("group-interface", "grp", { "group-interface": "grp", "subscriber-interface": "missing-sub" }),
      object("static-host", "host-1", { "static-host": "10.0.0.10" }),
      object("static-host", "host-2", { "static-host": "10.0.0.10" }),
    ],
  });

  assert.ok(audit.findings.some((finding) => finding.ruleId === "service.group-subscriber-missing"));
  assert.ok(audit.findings.some((finding) => finding.ruleId === "subscriber.static-host-duplicate"));
});

test("exception rule suppresses audit finding and summary counts stay aligned", () => {
  const profile = {
    rules: {
      ignore: [{ source: "old", pattern: "sap 1/1/1:100" }],
    },
  };
  const oldObject = object("sap", "sap-a", { sap: "1/1/1:100" }, ["sap 1/1/1:100"]);
  const audit = runStandardsAuditForSides({
    oldResult: { objects: [oldObject] },
    newResult: { objects: [] },
    profile,
    oldVendor: "nokia-md-cli",
    newVendor: "nokia-md-cli",
  });
  const plan = attachAuditFindingsToPlan([
    { id: "sap-a", status: "old-only", objectType: "sap", oldObject },
  ], audit);
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan,
    audit,
    semanticSummary: {},
  });

  assert.ok(audit.findings.length > 0);
  assert.equal(audit.summary.active, 0);
  assert.equal(dashboard.counts.auditActive, 0);
  assert.equal(dashboard.counts.auditSuppressed, audit.findings.length);
});

test("graph node and edge generation includes active audit findings", () => {
  const audit = runStandardsAudit({
    side: "old",
    vendor: "nokia-md-cli",
    objects: [object("sap", "sap-a", { sap: "1/1/1:100" })],
  });
  const graph = buildGraphData({
    plan: [],
    auditFindings: audit.findings,
  });

  assert.ok(graph.nodes.some((node) => node.objectType === "standard-finding"));
  assert.ok(graph.edges.some((edge) => ["warning", "manual-review", "critical"].includes(edge.type)));
});
