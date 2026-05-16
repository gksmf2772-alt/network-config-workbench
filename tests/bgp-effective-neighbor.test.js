import test from "node:test";
import assert from "node:assert/strict";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
} from "../src/core/comparator.js";
import { runStandardsAuditForSides } from "../src/core/standardsAudit.js";
import { buildAnalysisContext, filterAuditForModeScope } from "../src/core/analysisModes.js";

function parseClassic(text) {
  return normalizeConfig({
    vendor: "nokia-classic",
    profile: {},
    configText: text,
    side: "old",
  });
}

function parseMdCli(text, profile = {}) {
  return normalizeConfig({
    vendor: "nokia-md-cli",
    profile,
    configText: text,
    side: "new",
  });
}

function compare(oldText, newText, profile = {}) {
  const oldResult = parseClassic(oldText);
  const newResult = parseMdCli(newText, profile);
  const matches = matchNormalizedObjects({
    oldObjects: oldResult.objects,
    newObjects: newResult.objects,
    manualMap: profile.manualMap || {},
    profile,
  });
  return {
    oldResult,
    newResult,
    matches,
    plan: createComparisonPlan(matches, profile),
  };
}

test("classic direct BGP neighbor equals MD-CLI group inherited neighbor", () => {
  const result = compare(
    [
      "neighbor 210.183.28.162",
      "    peer-as 4766",
      "    export SER-PEER",
    ].join("\n"),
    [
      '/configure { router "Base" bgp group "ACCESS-PEER" peer-as 4766 export policy ["SER-PEER"] }',
      '/configure { router "Base" bgp neighbor "210.183.28.162" group "ACCESS-PEER" }',
    ].join("\n"),
  );

  const item = result.plan.find((entry) => entry.objectType === "bgp");
  assert.equal(item.status, "matched");
  assert.ok(item.scoreReasons.includes("mdcli-group-based-neighbor"));
  assert.equal(item.fieldSummary["peer-as"].status, "equal");
  assert.equal(item.fieldSummary["export.policy"].status, "equal");
  assert.equal(item.fieldSummary["peer-as"].newSourceLabels[0], "group ACCESS-PEER에서 상속");
  assert.equal(item.fieldSummary.group.effectiveStatus, "structure-converted");
  assert.equal(item.policyViolationCount, 0);
  assert.equal(result.matches.some((match) => match.status === "new-only" && match.newObject?.normalizedType === "bgp-group"), false);
});

test("BGP admin-state comparison does not duplicate state alias", () => {
  const result = compare(
    [
      "neighbor 112.188.30.189",
      "    shutdown",
    ].join("\n"),
    '/configure { router "Base" bgp neighbor "112.188.30.189" admin-state disable }',
  );

  const item = result.plan.find((entry) => entry.objectType === "bgp");

  assert.equal(item.status, "matched");
  assert.equal(item.fieldSummary["admin-state"].status, "equal");
  assert.equal(item.fieldSummary.state, undefined);
  assert.deepEqual(Object.keys(item.fieldSummary).filter((field) => field === "admin-state" || field === "state"), ["admin-state"]);
});

test("MD-CLI BGP neighbor missing group definition is inheritance unresolved, not policy violation", () => {
  const result = compare(
    [
      "neighbor 210.183.28.162",
      "    peer-as 4766",
      "    export SER-PEER",
    ].join("\n"),
    '/configure { router "Base" bgp neighbor "210.183.28.162" group "ACCESS-PEER" }',
  );

  const item = result.plan.find((entry) => entry.objectType === "bgp");
  assert.equal(item.status, "matched");
  assert.equal(item.fieldSummary["peer-as"].effectiveStatus, "inheritance-unresolved");
  assert.equal(item.fieldSummary["export.policy"].effectiveStatus, "inheritance-unresolved");
  assert.equal(item.policyViolationCount, 0);
  assert.ok(item.newObject.bgpInheritance.groupDefinitionMissing);
});

test("BGP import/export absence is not a finding when profile does not require it", () => {
  const oldResult = parseClassic("neighbor 192.0.2.1\n    peer-as 64500");
  const newResult = parseMdCli('/configure { router "Base" bgp neighbor "192.0.2.1" peer-as 64500 }');
  const audit = runStandardsAuditForSides({
    oldResult,
    newResult,
    profile: {},
    oldVendor: "nokia-classic",
    newVendor: "nokia-md-cli",
  });

  assert.equal(audit.findings.some((finding) => finding.ruleId === "bgp.import-policy-required"), false);
  assert.equal(audit.findings.some((finding) => finding.ruleId === "bgp.export-policy-required"), false);
});

test("source export policy lost after group resolution remains compare difference", () => {
  const result = compare(
    [
      "neighbor 210.183.28.162",
      "    peer-as 4766",
      "    export SER-PEER",
    ].join("\n"),
    [
      '/configure { router "Base" bgp group "ACCESS-PEER" peer-as 4766 }',
      '/configure { router "Base" bgp neighbor "210.183.28.162" group "ACCESS-PEER" }',
    ].join("\n"),
  );

  const item = result.plan.find((entry) => entry.objectType === "bgp");
  assert.equal(item.status, "matched");
  assert.equal(item.fieldSummary["peer-as"].status, "equal");
  assert.equal(item.fieldSummary["export.policy"].status, "missing");
  assert.ok(item.policyViolationCount > 0);
});

test("group line exception does not create downstream BGP policy violation", () => {
  const profile = {
    rules: {
      ignore: [{ source: "new", pattern: 'neighbor "210.183.28.162" group "ACCESS-PEER"', matchMode: "contains" }],
    },
  };
  const result = compare(
    [
      "neighbor 210.183.28.162",
      "    peer-as 4766",
      "    export SER-PEER",
    ].join("\n"),
    [
      '/configure { router "Base" bgp group "ACCESS-PEER" peer-as 4766 export policy ["SER-PEER"] }',
      '/configure { router "Base" bgp neighbor "210.183.28.162" group "ACCESS-PEER" }',
    ].join("\n"),
    profile,
  );
  const audit = runStandardsAuditForSides({
    oldResult: result.oldResult,
    newResult: result.newResult,
    profile,
    oldVendor: "nokia-classic",
    newVendor: "nokia-md-cli",
  });
  const simpleAudit = filterAuditForModeScope(audit, buildAnalysisContext({ mode: "simple-compare", scope: "bgp-neighbor-only" }));
  const item = result.plan.find((entry) => entry.objectType === "bgp");

  assert.equal(item.policyViolationCount, 0);
  assert.equal(simpleAudit.summary.active, 0);
  assert.equal(item.fieldSummary["export.policy"].status, "equal");
});

test("manual mapping uses effective BGP group inheritance", () => {
  const oldResult = parseClassic([
    "neighbor 210.183.28.162",
    "    peer-as 4766",
    "    export SER-PEER",
  ].join("\n"));
  const newResult = parseMdCli([
    '/configure { router "Base" bgp group "ACCESS-PEER" peer-as 4766 export policy ["SER-PEER"] }',
    '/configure { router "Base" bgp neighbor "210.183.28.162" group "ACCESS-PEER" }',
  ].join("\n"));
  const oldBgp = oldResult.objects.find((object) => object.normalizedType === "bgp");
  const newBgp = newResult.objects.find((object) => object.normalizedType === "bgp");
  const profile = { manualMap: { [oldBgp.id]: newBgp.id } };
  const matches = matchNormalizedObjects({
    oldObjects: oldResult.objects,
    newObjects: newResult.objects,
    manualMap: profile.manualMap,
    profile,
  });
  const plan = createComparisonPlan(matches, profile);
  const item = plan.find((entry) => entry.objectType === "bgp");

  assert.equal(item.reason, "manual");
  assert.equal(item.status, "matched");
  assert.equal(item.fieldSummary["peer-as"].status, "equal");
  assert.equal(item.fieldSummary["export.policy"].status, "equal");
  assert.equal(item.policyViolationCount, 0);
});
