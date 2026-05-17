import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
} from "../src/core/comparator.js";
import { buildObjectReviewGroups } from "../src/core/objectReviewGroups.js";
import { buildSummaryDashboardData } from "../src/core/summaryAnalytics.js";
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

const groupProfileException = {
  id: "ex-profile-bgp-group-added-mdcli",
  scope: "profile",
  enabled: true,
  reasonKo: "MD-CLI BGP neighbor group 구조 전환은 현재 프로파일에서 제외",
  target: {
    vendorPair,
    objectType: "bgp",
    fieldPath: "group",
    ruleId: "semantic-compare.important-field-change",
    issueType: "field-difference",
    changeTypes: ["added", "structure-converted"],
  },
  match: {
    mode: "profile-field-rule",
    vendorPair,
    objectType: "bgp",
    fieldPath: "group",
    ruleId: "semantic-compare.important-field-change",
    issueType: "field-difference",
    changeTypes: ["added", "structure-converted"],
    valueMode: "any",
  },
};

function runCase(profileOverrides = {}) {
  const profile = {
    name: "object-review-grouping-fixture",
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
  const groups = buildObjectReviewGroups({
    review: dashboard.review,
    plan,
  });
  return { profile, plan, dashboard, groups };
}

function summarizeGroups(groups = []) {
  const activeIssues = groups.flatMap((group) => group.activeIssues || []);
  const suppressedIssues = groups.flatMap((group) => group.suppressedIssues || []);
  return {
    objectReviewGroupCount: groups.length,
    averageIssuesPerObject: groups.length
      ? Number((groups.reduce((sum, group) => sum + group.issueCount, 0) / groups.length).toFixed(2))
      : 0,
    activeIssueCount: activeIssues.length,
    suppressedIssueCount: suppressedIssues.length,
    suppressedByProfileExceptionCount: suppressedIssues.filter((issue) => issue.sourcePolicy === "profile-exception").length,
    suppressedByObjectExceptionCount: suppressedIssues.filter((issue) => issue.sourcePolicy === "object-exception").length,
    topIssueFields: countBy(activeIssues, (issue) => issue.fieldPath),
    groups: groups.map((group) => ({
      objectKey: group.objectKey,
      displayName: group.displayName,
      activeIssueCount: group.activeIssueCount,
      suppressedIssueCount: group.suppressedIssueCount,
      issueFields: group.issueFields,
      activeFields: group.activeIssues.map((issue) => issue.fieldPath),
      suppressedFields: group.suppressedIssues.map((issue) => issue.fieldPath),
      representativeReason: group.representativeReason,
    })),
  };
}

function countBy(items = [], keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item) || "object";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([field, count]) => ({ field, count }))
    .sort((left, right) => right.count - left.count || left.field.localeCompare(right.field));
}

function toMarkdown(report) {
  return [
    "# Object Review Grouping",
    "",
    `- generatedAt: ${report.generatedAt}`,
    `- activeProfile: ${report.activeProfileName}`,
    "",
    "## Summary",
    "",
    "| metric | before | after profile exception |",
    "| --- | ---: | ---: |",
    `| objectReviewGroupCount | ${report.before.objectReviewGroupCount} | ${report.after.objectReviewGroupCount} |`,
    `| activeIssueCount | ${report.before.activeIssueCount} | ${report.after.activeIssueCount} |`,
    `| suppressedIssueCount | ${report.before.suppressedIssueCount} | ${report.after.suppressedIssueCount} |`,
    `| suppressedByProfileExceptionCount | ${report.before.suppressedByProfileExceptionCount} | ${report.after.suppressedByProfileExceptionCount} |`,
    `| averageIssuesPerObject | ${report.before.averageIssuesPerObject} | ${report.after.averageIssuesPerObject} |`,
    "",
    "## Before Groups",
    ...report.before.groups.map((group) =>
      `- ${group.displayName}: active ${group.activeIssueCount}, suppressed ${group.suppressedIssueCount}, fields ${group.issueFields.join(", ")}`
    ),
    "",
    "## After Groups",
    ...report.after.groups.map((group) =>
      `- ${group.displayName}: active ${group.activeIssueCount}, suppressed ${group.suppressedIssueCount}, active ${group.activeFields.join(", ") || "-"}, suppressed ${group.suppressedFields.join(", ") || "-"}`
    ),
  ].join("\n");
}

async function main() {
  const before = summarizeGroups(runCase().groups);
  const after = summarizeGroups(runCase({ exceptions: [groupProfileException] }).groups);
  const report = {
    generatedAt: new Date().toISOString(),
    activeProfileName: "object-review-grouping-fixture",
    loadedProfileExceptionsCount: 1,
    before,
    after,
    invariants: {
      oneRowPerObjectBefore: before.objectReviewGroupCount === 2,
      groupSuppressedAcrossObjects: after.groups.every((group) => !group.activeFields.includes("group") && group.suppressedFields.includes("group")),
      stateDescriptionRemainActive: after.groups.every((group) =>
        (group.activeFields.includes("admin-state") || group.activeFields.includes("state")) && group.activeFields.includes("description")
      ),
    },
  };

  await fs.mkdir(resultDir, { recursive: true });
  await fs.writeFile(
    path.join(resultDir, "object-review-grouping.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await fs.writeFile(
    path.join(resultDir, "object-review-grouping.md"),
    `${toMarkdown(report)}\n`,
    "utf8",
  );

  if (!Object.values(report.invariants).every(Boolean)) {
    throw new Error("object review grouping invariant failed");
  }
  console.log("object review grouping validation passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
