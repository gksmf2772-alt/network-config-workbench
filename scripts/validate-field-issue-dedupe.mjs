import fs from "node:fs";
import path from "node:path";

import { buildObjectFieldReviewRows } from "../src/core/objectReviewGroups.js";

const RESULTS_DIR = "validation-results";

function ensureResultsDir() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function runFieldIssueDedupeValidation() {
  const object = {
    objectType: "bgp",
    objectKey: "bgp:112.188.30.19",
    displayName: "## Dobong-TOU-FK66 ## · 112.188.30.19",
    activeIssues: [
      {
        id: "active-description",
        fieldPath: "description",
        status: "changed",
        statusLabel: "차이",
        reason: "값 변경 확인",
        oldValue: "## to-Dobong-TOU-FK66 ##",
        newValue: "## Dobong-TOU-FK66 ##",
        ruleId: "semantic-compare.important-field-change",
      },
      {
        id: "active-state",
        fieldPath: "state",
        status: "added",
        statusLabel: "추가",
        reason: "신규값 추가 확인",
        oldValue: "",
        newValue: "disabled",
        ruleId: "semantic-compare.important-field-change",
      },
    ],
    suppressedIssues: [
      {
        id: "suppressed-description",
        fieldPath: "description",
        status: "ignored",
        statusLabel: "예외 처리",
        reason: "고급 비교 정책: 필드 무시",
        oldValue: "## to-Dobong-TOU-FK66 ##",
        newValue: "## Dobong-TOU-FK66 ##",
        ruleId: "semantic-compare.important-field-change",
        sourcePolicy: "advanced-policy",
      },
      {
        id: "suppressed-group",
        fieldPath: "group",
        status: "ignored",
        statusLabel: "예외 처리",
        reason: "현재 프로파일 예외: MD-CLI BGP group 구조 전환",
        oldValue: "",
        newValue: "ACCESS-PEER",
        ruleId: "semantic-compare.important-field-change",
        sourcePolicy: "profile-exception",
      },
    ],
  };

  const beforeRows = [...object.activeIssues, ...object.suppressedIssues];
  const fieldRows = buildObjectFieldReviewRows(object);
  const activeRows = fieldRows.filter((row) => row.activeCount > 0);
  const suppressedOnlyRows = fieldRows.filter((row) => row.activeCount === 0 && row.suppressedCount > 0);
  const descriptionRows = fieldRows.filter((row) => row.fieldPath === "description");
  const duplicateFieldRowsBefore = beforeRows.length - new Set(beforeRows.map((issue) => issue.fieldPath)).size;
  const duplicateFieldRowsAfter = fieldRows.length - new Set(fieldRows.map((row) => row.fieldPath)).size;

  const summary = {
    command: "validate:field-dedupe",
    status: descriptionRows.length === 1 &&
      descriptionRows[0]?.activeCount === 1 &&
      descriptionRows[0]?.suppressedCount === 1 &&
      !activeRows.some((row, index, rows) => rows.findIndex((item) => item.fieldPath === row.fieldPath) !== index)
      ? "passed"
      : "failed",
    object: object.displayName,
    duplicateFieldRowsBefore,
    duplicateFieldRowsAfter,
    descriptionDuplicateCountBefore: beforeRows.filter((issue) => issue.fieldPath === "description").length,
    descriptionDuplicateCountAfter: descriptionRows.length,
    activeFieldRows: activeRows.map((row) => ({
      fieldPath: row.fieldPath,
      activeCount: row.activeCount,
      suppressedCount: row.suppressedCount,
      displayStatus: row.displayStatus,
    })),
    suppressedOnlyFieldRows: suppressedOnlyRows.map((row) => ({
      fieldPath: row.fieldPath,
      activeCount: row.activeCount,
      suppressedCount: row.suppressedCount,
      displayStatus: row.displayStatus,
    })),
    checks: {
      descriptionMerged: descriptionRows.length === 1,
      descriptionActiveCount: descriptionRows[0]?.activeCount || 0,
      descriptionSuppressedCount: descriptionRows[0]?.suppressedCount || 0,
      suppressedOnlyGroupExcludedFromActiveRows: !activeRows.some((row) => row.fieldPath === "group"),
      suppressedOnlyGroupVisibleInSuppressedRows: suppressedOnlyRows.some((row) => row.fieldPath === "group"),
    },
  };

  return summary;
}

function writeReports(summary) {
  ensureResultsDir();
  fs.writeFileSync(path.join(RESULTS_DIR, "field-issue-dedupe.json"), `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(path.join(RESULTS_DIR, "field-issue-dedupe.md"), [
    "# Field Issue Dedupe Validation",
    "",
    `- status: ${summary.status}`,
    `- object: ${summary.object}`,
    `- duplicate field rows before dedupe: ${summary.duplicateFieldRowsBefore}`,
    `- duplicate field rows after dedupe: ${summary.duplicateFieldRowsAfter}`,
    `- description duplicate count before: ${summary.descriptionDuplicateCountBefore}`,
    `- description duplicate count after: ${summary.descriptionDuplicateCountAfter}`,
    "",
    "## Active Field Rows",
    ...summary.activeFieldRows.map((row) => `- ${row.fieldPath}: active ${row.activeCount}, suppressed ${row.suppressedCount}, status ${row.displayStatus}`),
    "",
    "## Suppressed Only Field Rows",
    ...summary.suppressedOnlyFieldRows.map((row) => `- ${row.fieldPath}: active ${row.activeCount}, suppressed ${row.suppressedCount}, status ${row.displayStatus}`),
    "",
  ].join("\n"));
}

const summary = runFieldIssueDedupeValidation();
writeReports(summary);
console.log(JSON.stringify(summary, null, 2));
if (summary.status !== "passed") process.exit(1);

