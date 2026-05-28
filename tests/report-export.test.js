import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildExcelReportCsv,
  buildExcelReportRows,
} from "../src/core/reportExport.js";

test("Excel report rows expose MVP columns and split changed, missing, added, review states", () => {
  const rows = buildExcelReportRows({
    plan: [
      {
        id: "if-rename",
        status: "matched",
        objectType: "interface",
        score: 100,
        oldObject: {
          normalizedType: "interface",
          normalizedIdentity: "to-core",
          fields: { interface: "to-core", address: "10.0.0.1/31" },
        },
        newObject: {
          normalizedType: "interface",
          normalizedIdentity: "Te1/1/1",
          fields: { interface: "Te1/1/1", address: "10.0.0.1/31" },
        },
        fieldSummary: {
          interface: { field: "interface", status: "changed", oldValues: ["to-core"], newValues: ["Te1/1/1"] },
          address: { field: "address", status: "equal", oldValues: ["10.0.0.1/31"], newValues: ["10.0.0.1/31"] },
          group: { field: "group", status: "structure-converted", effectiveStatus: "structure-converted" },
        },
      },
      {
        id: "route-missing",
        status: "old-only",
        objectType: "static-route",
        oldObject: {
          normalizedType: "static-route",
          normalizedIdentity: "10.10.10.0/24",
          fields: { route: "10.10.10.0/24", "next-hop": "192.0.2.1" },
        },
      },
      {
        id: "bgp-added",
        status: "new-only",
        objectType: "bgp",
        newObject: {
          normalizedType: "bgp",
          normalizedIdentity: "192.0.2.10",
          fields: { neighbor: "192.0.2.10" },
        },
      },
      {
        id: "bgp-candidate",
        status: "candidate",
        objectType: "bgp",
        score: 62,
        oldObject: {
          normalizedType: "bgp",
          normalizedIdentity: "192.0.2.20",
          fields: { neighbor: "192.0.2.20" },
        },
        newObject: {
          normalizedType: "bgp",
          normalizedIdentity: "192.0.2.21",
          fields: { neighbor: "192.0.2.21" },
        },
      },
    ],
  });

  assert.deepEqual(
    rows.map((row) => [row.section, row.status, row.field]),
    [
      ["interface", "변경", "interface"],
      ["static-route", "누락", ""],
      ["bgp", "추가", ""],
      ["bgp", "검토 필요", ""],
    ],
  );
  assert.equal(rows[0].oldObject, "to-core");
  assert.equal(rows[0].newObject, "Te1/1/1");
  assert.equal(rows.some((row) => row.field === "group"), false);
});

test("Excel report CSV keeps fixed headers and escapes Excel-sensitive values", () => {
  const csv = buildExcelReportCsv([
    {
      section: "interface",
      oldObject: "old,if",
      newObject: "new \"if\"",
      status: "변경",
      field: "description",
      oldValue: "old\nvalue",
      newValue: "=cmd",
      reason: "changed",
      severity: "보통",
      actionNeeded: "변경 영향 검토",
    },
  ]);

  assert.ok(csv.startsWith("\ufeffsection,old object,new object,status,field,old value,new value,reason,severity,action needed"));
  assert.match(csv, /"old,if"/);
  assert.match(csv, /"new ""if"""/);
  assert.match(csv, /"'=cmd"/);
});

test("compare toolbar exposes Excel export as a visible text button", () => {
  const source = fs.readFileSync("src/components/ConfigInputPanel.jsx", "utf8");

  assert.match(source, /<AppButton id="exportReportBtn"[^>]*>/);
  assert.match(source, /Excel 저장/);
  assert.doesNotMatch(source, /<AppIconButton id="exportReportBtn"/);
});

test("export button click path writes Excel-compatible CSV", () => {
  const legacy = fs.readFileSync("src/core/legacyCore.js", "utf8");

  assert.match(legacy, /selectors\.exportReportBtn\.addEventListener\("click", exportReport\)/);
  assert.match(legacy, /const rows = buildExcelReportRows\(\{/);
  assert.match(legacy, /const csv = buildExcelReportCsv\(rows\);/);
  assert.match(legacy, /saveTextFile\(buildExcelReportFilename\(\{ comparedAt \}\), csv, "text\/csv;charset=utf-8"\)/);
  assert.match(legacy, /Excel 리포트 \$\{rows\.length\}행 저장/);
});
