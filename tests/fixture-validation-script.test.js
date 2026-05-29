import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CASE_MATRIX,
  MD_FULL_LOG_CASES,
  TARGET_PARTS,
  findExampleDir,
  getNewFilesForScope,
  resolveFixtureCases,
  resolveMdFullLogCases,
  runFixtureComparison,
} from "../scripts/validateCompareFixtures.js";
import {
  buildUnmatchedScopeSummary,
  classifyActualMissingRecord,
  stripFinalGeneratedQualitySections,
} from "../scripts/analyze-validation-quality.mjs";

test("fixture discovery finds sibling home example directory", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ncw-fixture-discovery-"));

  try {
    const cwd = path.join(root, "network-config-workbench-mvp-work");
    const fixtureDir = path.join(root, "network-config-workbench-home", "예제 및 테스트 설정");

    fs.mkdirSync(cwd, { recursive: true });
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(path.join(fixtureDir, "New_bgp_1.txt"), "bgp\n", "utf8");

    assert.equal(findExampleDir({ cwd }), fixtureDir);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fixture case matrix resolves all cases and target scopes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ncw-fixture-cases-"));

  try {
    const fixtureDir = path.join(root, "예제 및 테스트 설정");
    fs.mkdirSync(fixtureDir, { recursive: true });

    for (const fixtureCase of CASE_MATRIX) {
      fs.writeFileSync(path.join(fixtureDir, fixtureCase.oldFile), "old\n", "utf8");
      for (const prefix of Object.values(TARGET_PARTS)) {
        fs.writeFileSync(path.join(fixtureDir, `${prefix}_${fixtureCase.newIndex}.txt`), "new\n", "utf8");
      }
    }

    const cases = resolveFixtureCases({
      fixtureDir,
      scope: "static",
      allCases: true,
    });

    assert.equal(cases.length, 4);
    assert.deepEqual(cases.map((item) => item.oldFile), [
      "Gangbu-SEA027H_config.txt",
      "Gangbuk-SEA028_config.txt",
      "Gangbu-SEA029H_config.txt",
      "Gangbuk-SEA030_config.txt",
    ]);
    assert.deepEqual(cases.map((item) => item.newFiles), [
      ["New_static_1.txt"],
      ["New_static_2.txt"],
      ["New_static_3.txt"],
      ["New_static_4.txt"],
    ]);
    assert.deepEqual(getNewFilesForScope("full", "2"), [
      "New_bgp_2.txt",
      "New_static_2.txt",
      "New_interface_2.txt",
      "New_lag_2.txt",
      "New_port_2.txt",
      "New_PIM_2.txt",
    ]);
    assert.equal(cases[0].fixtureScope.status, "partial-assembled-target");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("feature split fixture comparison reports excess source objects as partial scope", () => {
  const result = runFixtureComparison({
    oldText: [
      "port 1/1/1",
      "exit",
      "port 1/1/2",
      "exit",
    ].join("\n"),
    newText: [
      "/configure { port 1/1/1 admin-state enable }",
    ].join("\n"),
    profile: { name: "fixture-scope-test" },
    fixtureScope: { status: "partial-assembled-target" },
  });

  assert.equal(result.fixtureScope.status, "partial-assembled-target");
  assert.equal(result.counts.unmatchedPartialTargetScope, 1);
  assert.equal(result.counts.unmatchedMatcherIssue, 0);
});

test("fixture case matrix accepts single suffixed target file variants", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ncw-fixture-suffix-cases-"));

  try {
    const fixtureDir = path.join(root, "테스트 config");
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(path.join(fixtureDir, CASE_MATRIX[0].oldFile), "old\n", "utf8");
    fs.writeFileSync(path.join(fixtureDir, "New_bgp_1.txt"), "new\n", "utf8");
    fs.writeFileSync(path.join(fixtureDir, "New_static_1_sorted.txt"), "new\n", "utf8");
    fs.writeFileSync(path.join(fixtureDir, "New_interface_1.txt"), "new\n", "utf8");
    fs.writeFileSync(path.join(fixtureDir, "New_lag_1.txt"), "new\n", "utf8");
    fs.writeFileSync(path.join(fixtureDir, "New_port_1.txt"), "new\n", "utf8");
    fs.writeFileSync(path.join(fixtureDir, "New_PIM_1_checked.txt"), "new\n", "utf8");

    const cases = resolveFixtureCases({
      fixtureDir,
      scope: "full",
      caseId: "1",
    });

    assert.deepEqual(cases[0].newFiles, [
      "New_bgp_1.txt",
      "New_static_1_sorted.txt",
      "New_interface_1.txt",
      "New_lag_1.txt",
      "New_port_1.txt",
      "New_PIM_1_checked.txt",
    ]);
    assert.deepEqual(cases[0].newPaths.map((item) => path.basename(item)), cases[0].newFiles);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("fixture case matrix can select only available cases", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ncw-fixture-available-cases-"));

  try {
    const fixtureDir = path.join(root, "test-config");
    fs.mkdirSync(fixtureDir, { recursive: true });

    for (const fixtureCase of CASE_MATRIX.slice(0, 2)) {
      fs.writeFileSync(path.join(fixtureDir, fixtureCase.oldFile), "old\n", "utf8");
      for (const prefix of Object.values(TARGET_PARTS)) {
        fs.writeFileSync(path.join(fixtureDir, `${prefix}_${fixtureCase.newIndex}.txt`), "new\n", "utf8");
      }
    }

    const cases = resolveFixtureCases({
      fixtureDir,
      scope: "full",
      availableCases: true,
    });

    assert.deepEqual(cases.map((item) => item.id), ["1", "2"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("MD full log fixture matrix resolves block and full-context log targets", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ncw-md-log-cases-"));

  try {
    const fixtureDir = path.join(root, "test-config");
    fs.mkdirSync(fixtureDir, { recursive: true });

    for (const fixtureCase of CASE_MATRIX.slice(0, 2)) {
      fs.writeFileSync(path.join(fixtureDir, fixtureCase.oldFile), "old\n", "utf8");
    }

    fs.writeFileSync(path.join(fixtureDir, "2026-05-28_15-13-31_Dobong-SEA027H_full_MDconfig.log"), "new\n", "utf8");
    fs.writeFileSync(path.join(fixtureDir, "2026-05-28_15-14-13_Dobong-SEA027H_full_MDfullcontext.log"), "new\n", "utf8");
    fs.writeFileSync(path.join(fixtureDir, "2026-05-28_15-13-55_Dobong-SEA028D_full_MDconfig.log"), "new\n", "utf8");
    fs.writeFileSync(path.join(fixtureDir, "2026-05-28_15-14-41_Dobong-SEA028D_full_MDfullcontext.log"), "new\n", "utf8");

    const cases = resolveMdFullLogCases({
      fixtureDir,
      allCases: true,
    });

    assert.equal(cases.length, MD_FULL_LOG_CASES.length);
    assert.deepEqual(cases.map((item) => item.id), [
      "1-mdconfig",
      "1-mdfullcontext",
      "2-mdconfig",
      "2-mdfullcontext",
    ]);
    assert.deepEqual(cases.map((item) => item.targetType), [
      "MDconfig",
      "MDfullcontext",
      "MDconfig",
      "MDfullcontext",
    ]);
    assert.deepEqual(cases.map((item) => path.basename(item.newPaths[0])), [
      "2026-05-28_15-13-31_Dobong-SEA027H_full_MDconfig.log",
      "2026-05-28_15-14-13_Dobong-SEA027H_full_MDfullcontext.log",
      "2026-05-28_15-13-55_Dobong-SEA028D_full_MDconfig.log",
      "2026-05-28_15-14-41_Dobong-SEA028D_full_MDfullcontext.log",
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("quality unmatched summary uses source-side dashboard buckets", () => {
  const artifacts = {
    oldResult: {
      objects: [
        { normalizedType: "port", normalizedIdentity: "1/1/1" },
        { normalizedType: "route-policy", normalizedIdentity: "legacy-policy" },
      ],
    },
    newResult: {
      objects: [
        { normalizedType: "port", normalizedIdentity: "1/1/c1/1" },
        { normalizedType: "pim", normalizedIdentity: "target-only" },
      ],
    },
    profile: { fixturePolicy: { status: "partial-assembled-target" } },
    testCase: {},
  };
  const records = [
    { side: "old", objectType: "port", likelyReason: "target fixture is partial" },
    {
      side: "old",
      objectType: "route-policy",
      likelyReason: "source object has no target counterpart",
      fixtureUnmatchedCategory: "realMissingTarget",
    },
    { side: "new", objectType: "pim", likelyReason: "target object has no source counterpart" },
  ];

  const summary = buildUnmatchedScopeSummary({ artifacts, records });

  assert.equal(summary.unmatchedDuePartialTargetScope, 1);
  assert.equal(summary.unmatchedDueLikelyMatcherIssue, 0);
  assert.equal(summary.unmatchedDueParserGap, 0);
  assert.equal(summary.unmatchedDueRealMissingTarget, 1);
  assert.equal(summary.unmatchedTargetOnly, 1);
});

test("actual missing classification does not mark confirmed gaps as matcher false negatives", () => {
  const artifacts = {
    oldResult: {
      objects: [
        { normalizedType: "port", normalizedIdentity: "1/1/1" },
        { normalizedType: "pim", normalizedIdentity: "source-pim" },
      ],
    },
    newResult: {
      objects: [
        { normalizedType: "port", normalizedIdentity: "1/1/c1/1" },
        { normalizedType: "pim", normalizedIdentity: "target-pim" },
      ],
    },
    profile: { fixturePolicy: { status: "partial-assembled-target" } },
    testCase: {},
  };

  const confirmedSourceMissing = classifyActualMissingRecord({
    side: "old",
    objectType: "port",
    fixtureUnmatchedCategory: "realMissingTarget",
  }, artifacts);
  const targetOnly = classifyActualMissingRecord({
    side: "new",
    objectType: "pim",
  }, artifacts);

  assert.equal(confirmedSourceMissing.completenessStatus, "true-missing-from-target-fixture");
  assert.equal(confirmedSourceMissing.parserOrMatcherStatus, "confirmed-source-missing");
  assert.equal(confirmedSourceMissing.manualMappingCouldResolve, false);
  assert.equal(targetOnly.completenessStatus, "target-object-has-no-source-counterpart");
  assert.equal(targetOnly.parserOrMatcherStatus, "target-only-object");
  assert.equal(targetOnly.manualMappingCouldResolve, false);
});

test("final quality update strips stale duplicated quality sections", () => {
  const markdown = [
    "# Final Validation Report",
    "",
    "## 10. Remaining Limitations",
    "- base",
    "",
    "## 11. Validation Quality Analysis",
    "- stale quality",
    "",
    "## 12. Validation Quality Analysis",
    "- duplicate quality",
    "",
    "## 13. Profile Exception Application",
    "- stale extension",
  ].join("\n");

  assert.equal(stripFinalGeneratedQualitySections(markdown), [
    "# Final Validation Report",
    "",
    "## 10. Remaining Limitations",
    "- base",
  ].join("\n"));
});

test("final report writer does not preload stale quality files", () => {
  const source = fs.readFileSync("scripts/validationWorkflow.mjs", "utf8");

  assert.match(source, /qualityAnalysis = null/);
  assert.doesNotMatch(source, /loadQualityAnalysisSummary/);
});
