import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
} from "../src/core/comparator.js";
import { profileExceptionMatchesContext } from "../src/core/policyEvaluator.js";
import { buildGraphData, buildSummaryDashboardData } from "../src/core/summaryAnalytics.js";
import { VENDOR_IDS } from "../src/core/vendorPresets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const resultDir = path.join(repoRoot, "validation-results");
const vendorPair = `${VENDOR_IDS.NOKIA_CLASSIC}->${VENDOR_IDS.NOKIA_MD_CLI}`;

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

const profileException = {
  id: "ex-profile-bgp-group-added-mdcli",
  scope: "profile",
  enabled: true,
  createdAt: "2026-05-17T00:00:00.000Z",
  createdFromIssueId: "fixture-bgp-group",
  reasonKo: "MD-CLI BGP neighbor group 구조 전환은 현재 프로파일에서 제외",
  target: {
    vendorPair,
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
    vendorPair,
    objectType: "bgp",
    fieldPath: "group",
    ruleId: "semantic-compare.important-field-change",
    issueType: "field-difference",
    changeTypes: ["added", "structure-converted"],
    newValuePattern: "*",
  },
};

function runCase(profileOverrides = {}) {
  const profile = {
    name: "profile-exception-application-fixture",
    oldVendor: VENDOR_IDS.NOKIA_CLASSIC,
    newVendor: VENDOR_IDS.NOKIA_MD_CLI,
    validationPolicies: {
      bgp: [
        { field: "description", policy: "compare" },
      ],
    },
    ...profileOverrides,
  };
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
  const graph = buildGraphData({ plan, auditFindings: [] });
  return { profile, oldResult, newResult, plan, dashboard, graph };
}

function issueContexts(plan = []) {
  return plan.flatMap((item) => Object.entries(item.fieldSummary || {}).map(([field, summary]) => ({
    objectType: item.objectType || "bgp",
    objectKey: `bgp:${item.oldObject?.normalizedIdentity || item.newObject?.normalizedIdentity || ""}`,
    objectIdentity: item.oldObject?.normalizedIdentity || item.newObject?.normalizedIdentity || "",
    field,
    ruleId: isImportantBgpField(field)
      ? "semantic-compare.important-field-change"
      : "semantic-compare.field-difference",
    category: "semantic-compare",
    findingType: item.status || "matched",
    issueType: "field-difference",
    changeType: normalizeChangeType(summary.effectiveStatus || summary.status || ""),
    oldValue: firstValue(summary.oldValues),
    newValue: firstValue(summary.newValues),
    vendorPair,
    ignored: Boolean(summary.ignored || summary.effectiveStatus === "ignored"),
    sourcePolicy: summary.policyHits?.[0]?.sourcePolicy || "none",
    policyId: summary.policyHits?.[0]?.policyId || "",
  })));
}

function summarize(plan = []) {
  const contexts = issueContexts(plan);
  const active = contexts.filter((item) => isActiveIssue(item));
  const suppressed = contexts.filter((item) => item.ignored);
  return {
    activeIssueCount: active.length,
    suppressedIssueCount: suppressed.length,
    activeGroupIssueCount: active.filter((item) => item.field === "group").length,
    suppressedProfileGroupIssueCount: suppressed.filter((item) =>
      item.field === "group" && item.sourcePolicy === "profile-exception"
    ).length,
    activeAdminStateIssueCount: active.filter((item) => item.field === "admin-state").length,
    activeDescriptionIssueCount: active.filter((item) => item.field === "description").length,
    activeIssues: active,
    suppressedIssues: suppressed,
  };
}

function matchDiagnostics(exception, contexts = []) {
  return contexts.map((context) => ({
    objectKey: context.objectKey,
    fieldPath: context.field,
    ruleId: context.ruleId,
    changeType: context.changeType,
    matched: profileExceptionMatchesContext(exception, {
      ...context,
      field: context.field,
      side: "both",
    }),
    matchedExceptionId: profileExceptionMatchesContext(exception, {
      ...context,
      field: context.field,
      side: "both",
    }) ? exception.id : "",
    unmatchedReason: unmatchedReason(exception, context),
  }));
}

function unmatchedReason(exception, context) {
  const match = exception.match || {};
  if (match.vendorPair && match.vendorPair !== context.vendorPair) return "vendorPair mismatch";
  if (match.objectType && match.objectType !== context.objectType) return "objectType mismatch";
  if (match.fieldPath && match.fieldPath !== context.field) return "fieldPath mismatch";
  if (match.ruleId && match.ruleId !== context.ruleId) return "ruleId mismatch";
  if (match.issueType && match.issueType !== context.issueType) return "issueType mismatch";
  const changeTypes = Array.isArray(match.changeTypes) ? match.changeTypes : [];
  if (changeTypes.length && !changeTypes.includes(context.changeType) && !(context.changeType === "structure-converted" && changeTypes.includes("added"))) {
    return "changeType mismatch";
  }
  return "";
}

function isActiveIssue(context) {
  if (context.ignored) return false;
  return ["added", "missing", "changed", "different", "structure-converted"].includes(context.changeType);
}

function normalizeChangeType(status = "") {
  const value = String(status || "").toLowerCase();
  if (value === "missing-old") return "added";
  if (value === "missing-new") return "missing";
  if (value === "different") return "changed";
  return value;
}

function isImportantBgpField(field = "") {
  return [
    "neighbor",
    "peerip",
    "group",
    "peer-as",
    "import.policy",
    "export.policy",
    "state",
    "admin-state",
    "description",
    "authentication-key",
  ].includes(String(field || "").toLowerCase());
}

function firstValue(values = []) {
  const list = Array.isArray(values) ? values : [values];
  return String(list.find((value) => value != null && String(value).trim()) ?? "");
}

function toMarkdown(report) {
  const before = report.before.summary;
  const after = report.after.summary;
  return [
    "# Profile Exception Application",
    "",
    `- generatedAt: ${report.generatedAt}`,
    `- activeProfile: ${report.activeProfileName}`,
    `- loadedProfileExceptions: ${report.loadedProfileExceptionsCount}`,
    `- matchedExceptionId: ${report.matchedExceptionIds.join(", ") || "-"}`,
    "",
    "## Counts",
    "",
    "| metric | before | after |",
    "| --- | ---: | ---: |",
    `| activeIssueCount | ${before.activeIssueCount} | ${after.activeIssueCount} |`,
    `| suppressedIssueCount | ${before.suppressedIssueCount} | ${after.suppressedIssueCount} |`,
    `| activeGroupIssueCount | ${before.activeGroupIssueCount} | ${after.activeGroupIssueCount} |`,
    `| suppressedProfileGroupIssueCount | ${before.suppressedProfileGroupIssueCount} | ${after.suppressedProfileGroupIssueCount} |`,
    `| activeAdminStateIssueCount | ${before.activeAdminStateIssueCount} | ${after.activeAdminStateIssueCount} |`,
    `| activeDescriptionIssueCount | ${before.activeDescriptionIssueCount} | ${after.activeDescriptionIssueCount} |`,
    "",
    "## Match Attempts",
    "",
    "| object | field | ruleId | changeType | matched | unmatchedReason |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.exceptionMatchAttempts.map((item) =>
      `| ${item.objectKey} | ${item.fieldPath} | ${item.ruleId} | ${item.changeType} | ${item.matched ? "yes" : "no"} | ${item.unmatchedReason || "-"} |`
    ),
  ].join("\n");
}

async function main() {
  const before = runCase();
  const after = runCase({ exceptions: [profileException] });
  const beforeSummary = summarize(before.plan);
  const afterSummary = summarize(after.plan);
  const attempts = matchDiagnostics(profileException, issueContexts(before.plan));
  const report = {
    generatedAt: new Date().toISOString(),
    activeProfileName: after.profile.name,
    loadedProfileExceptionsCount: after.profile.exceptions.length,
    matchedExceptionIds: [...new Set(attempts.filter((item) => item.matched).map((item) => item.matchedExceptionId))],
    before: {
      objectCount: before.plan.length,
      summary: beforeSummary,
      dashboardCounts: before.dashboard.counts,
      graph: { nodes: before.graph.nodes.length, edges: before.graph.edges.length },
    },
    after: {
      objectCount: after.plan.length,
      summary: afterSummary,
      dashboardCounts: after.dashboard.counts,
      graph: { nodes: after.graph.nodes.length, edges: after.graph.edges.length },
    },
    exceptionMatchAttempts: attempts,
    invariant: {
      profileGroupSuppressed: afterSummary.activeGroupIssueCount === 0 && afterSummary.suppressedProfileGroupIssueCount === 2,
      adminStateStillActive: afterSummary.activeAdminStateIssueCount === 2,
      graphEdgesStable: before.graph.edges.length === after.graph.edges.length,
    },
  };

  await fs.mkdir(resultDir, { recursive: true });
  await fs.writeFile(
    path.join(resultDir, "profile-exception-application.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(resultDir, "profile-exception-application.md"),
    `${toMarkdown(report)}\n`,
    "utf8",
  );

  if (!Object.values(report.invariant).every(Boolean)) {
    throw new Error("profile exception application invariant failed");
  }
  console.log("profile exception application validation passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
