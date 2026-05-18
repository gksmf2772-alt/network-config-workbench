import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
  renderComparisonPlanHtml,
} from "../src/core/comparator.js";
import { buildSummaryDashboardData } from "../src/core/summaryAnalytics.js";
import {
  VENDOR_OPTIONS,
  VENDOR_SUPPORT_STATE,
  getVendorPairSupportState,
} from "../src/core/vendorPresets.js";

function parse(vendor, configText, side = "old") {
  return normalizeConfig({ vendor, configText, side });
}

function compare(oldConfig, newConfig) {
  const oldResult = parse("nokia-classic", oldConfig, "old");
  const newResult = parse("nokia-md-cli", newConfig, "new");
  const matches = matchNormalizedObjects({
    oldObjects: oldResult.objects,
    newObjects: newResult.objects,
  });
  return {
    oldResult,
    newResult,
    matches,
    plan: createComparisonPlan(matches, {}),
  };
}

test("vendor support state marks placeholder vendors as non-runnable", () => {
  const arista = VENDOR_OPTIONS.find((vendor) => vendor.id === "arista-eos");
  assert.equal(arista.supportState, VENDOR_SUPPORT_STATE.PLANNED);
  assert.equal(arista.selectable, false);

  const ciscoPair = getVendorPairSupportState("cisco-ios-xe", "nokia-md-cli");
  assert.equal(ciscoPair.state, VENDOR_SUPPORT_STATE.PARTIAL);
  assert.equal(ciscoPair.runnable, true);

  const aristaPair = getVendorPairSupportState("arista-eos", "nokia-md-cli");
  assert.equal(aristaPair.state, VENDOR_SUPPORT_STATE.PLANNED);
  assert.equal(aristaPair.runnable, false);
});

test("Nokia Classic static route matches MD-CLI one-line route semantically", () => {
  const oldConfig = [
    "static-route-entry 10.10.10.0/24",
    "    next-hop 192.0.2.1",
    "    tag 100",
    "    no shutdown",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { router "Base" static-routes route 10.10.10.0/24 route-type unicast next-hop 192.0.2.1 admin-state enable }',
    '/configure { router "Base" static-routes route 10.10.10.0/24 route-type unicast next-hop 192.0.2.1 tag 100 }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  assert.equal(result.oldResult.objects.length, 1);
  assert.equal(result.newResult.objects.length, 1);
  assert.equal(result.matches[0].status, "matched");
  assert.equal(result.matches[0].score, 100);
  assert.equal(result.plan[0].fieldStats.changedFields, 0);
  assert.equal(result.plan[0].relationshipSummary[0].status, "matched");
});

test("Nokia Classic static route with multiple next-hop maps as one route object", () => {
  const oldConfig = [
    "static-route-entry 125.144.1.98/32",
    "    next-hop 14.59.5.65",
    "        no shutdown",
    "    exit",
    "    next-hop 14.59.5.69",
    "        no shutdown",
    "    exit",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { router "Base" static-routes route 125.144.1.98/32 route-type unicast next-hop 14.59.5.65 admin-state enable }',
    '/configure { router "Base" static-routes route 125.144.1.98/32 route-type unicast next-hop 14.59.5.69 admin-state enable }',
    '/configure { router "Base" static-routes route 125.144.1.98/32 route-type unicast next-hop 14.59.5.97 admin-state enable }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  assert.equal(result.oldResult.objects.length, 1);
  assert.equal(result.newResult.objects.length, 1);
  assert.equal(result.oldResult.objects[0].normalizedIdentity, "125.144.1.98/32");
  assert.equal(result.newResult.objects[0].normalizedIdentity, "125.144.1.98/32");
  assert.equal(result.oldResult.objects[0].fields["next-hop"], "14.59.5.65, 14.59.5.69");
  assert.equal(result.newResult.objects[0].fields["next-hop"], "14.59.5.65, 14.59.5.69, 14.59.5.97");
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].status, "candidate");
  assert.equal(result.plan.filter((item) => item.status === "candidate").length, 1);
});

test("Nokia Classic static route maps repeated MD-CLI settings by route and next-hop", () => {
  const oldConfig = [
    "static-route-entry 125.145.147.20/32",
    "    next-hop 14.59.4.2",
    "        tag 600",
    '        description "## To-Dobong-TOU-FK66_LoopBack ##"',
    "        no shutdown",
    "    exit",
    "    next-hop 14.59.4.18",
    "        tag 600",
    "        no shutdown",
    "    exit",
    "    next-hop 14.59.5.2",
    "        metric 100",
    "        tag 600",
    "        no shutdown",
    "    exit",
    "    next-hop 14.59.5.18",
    "        metric 100",
    "        tag 600",
    "        no shutdown",
    "    exit",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { router "Base" static-routes route 125.145.147.20/32 route-type unicast next-hop 14.59.4.2 admin-state disable }',
    '/configure { router "Base" static-routes route 125.145.147.20/32 route-type unicast next-hop 14.59.4.2 tag 600 }',
    '/configure { router "Base" static-routes route 125.145.147.20/32 route-type unicast next-hop 14.59.4.2 description "## To-Dobong-TOU-FK66_LoopBack ##" }',
    '/configure { router "Base" static-routes route 125.145.147.20/32 route-type unicast next-hop 14.59.4.18 admin-state disable }',
    '/configure { router "Base" static-routes route 125.145.147.20/32 route-type unicast next-hop 14.59.4.18 tag 600 }',
    '/configure { router "Base" static-routes route 125.145.147.20/32 route-type unicast next-hop 14.59.5.2 admin-state disable }',
    '/configure { router "Base" static-routes route 125.145.147.20/32 route-type unicast next-hop 14.59.5.2 tag 600 }',
    '/configure { router "Base" static-routes route 125.145.147.20/32 route-type unicast next-hop 14.59.5.2 metric 100 }',
    '/configure { router "Base" static-routes route 125.145.147.20/32 route-type unicast next-hop 14.59.5.18 admin-state disable }',
    '/configure { router "Base" static-routes route 125.145.147.20/32 route-type unicast next-hop 14.59.5.18 tag 600 }',
    '/configure { router "Base" static-routes route 125.145.147.20/32 route-type unicast next-hop 14.59.5.18 metric 100 }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  assert.equal(result.oldResult.objects.length, 1);
  assert.equal(result.newResult.objects.length, 1);
  assert.equal(result.oldResult.objects[0].normalizedIdentity, "125.145.147.20/32");
  assert.equal(result.newResult.objects[0].normalizedIdentity, "125.145.147.20/32");
  assert.equal(result.oldResult.objects[0].fields["next-hop"], "14.59.4.2, 14.59.4.18, 14.59.5.2, 14.59.5.18");
  assert.equal(result.newResult.objects[0].fields["next-hop"], "14.59.4.2, 14.59.4.18, 14.59.5.2, 14.59.5.18");
  assert.equal(result.oldResult.objects[0].fields["next-hop[14.59.5.2].metric"], "100");
  assert.equal(result.newResult.objects[0].fields["next-hop[14.59.5.2].metric"], "100");
  assert.equal(result.oldResult.objects[0].fields["next-hop[14.59.5.18].metric"], "100");
  assert.equal(result.newResult.objects[0].fields["next-hop[14.59.5.18].metric"], "100");
  assert.equal(result.oldResult.objects[0].fields["next-hop[14.59.4.2].description"], "## To-Dobong-TOU-FK66_LoopBack ##");
  assert.equal(result.newResult.objects[0].fields["next-hop[14.59.4.2].description"], "## To-Dobong-TOU-FK66_LoopBack ##");
  assert.equal(result.oldResult.objects[0].fields["next-hop[14.59.4.2].state"], "enabled");
  assert.equal(result.newResult.objects[0].fields["next-hop[14.59.4.2].state"], "disabled");
  assert.equal(result.plan[0].fieldSummary.metric.status, "equal");
  assert.deepEqual(result.plan[0].fieldSummary.metric.oldValues, ["100"]);
  assert.deepEqual(result.plan[0].fieldSummary.metric.newValues, ["100"]);
  assert.equal(result.plan[0].fieldSummary.description.status, "equal");
  assert.deepEqual(result.plan[0].fieldSummary.description.oldValues, ["## To-Dobong-TOU-FK66_LoopBack ##"]);
  assert.deepEqual(result.plan[0].fieldSummary.description.newValues, ["## To-Dobong-TOU-FK66_LoopBack ##"]);
  const unmatchedDashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: createComparisonPlan([{
      status: "old-only",
      reason: "unmatched",
      oldObject: result.oldResult.objects[0],
      newObject: null,
    }], {}),
    semanticSummary: {},
  });
  const descriptionRow = unmatchedDashboard.review.unmatchedOld[0].fieldRows.find((row) => row.field.includes("description"));
  assert.equal(descriptionRow.oldValue, "## To-Dobong-TOU-FK66_LoopBack ##");
  assert.equal(descriptionRow.newValue, "");
  assert.match(renderComparisonPlanHtml(result.plan), /semantic-object-description[\s\S]*To-Dobong-TOU-FK66_LoopBack/);
  assert.equal(result.plan.filter((item) => item.status === "matched").length, 1);
  assert.equal(result.plan.filter((item) => item.status === "new-only").length, 0);
});

test("legacy main compare parser keeps static route blocks as route-level objects", () => {
  const source = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const styles = fs.readFileSync("src/styles/global.css", "utf8");

  assert.match(source, /objects\.push\(finalizeObject\(current, options, source\)\);/);
  assert.match(source, /mergeStaticRouteFields\(target\.canonicalFields, safeObject\.canonicalFields\)/);
  assert.match(source, /function buildStaticRouteIdentityFromFields\(fields = \{\}, fallback = ""\)/);
  assert.match(source, /add\("metric", stripTrailingSyntax\(metric\[1\]\), "number"\);/);
  assert.match(source, /object-item-description/);
  assert.match(source, /data-review-description/);
  assert.match(source, /renderReportReviewDescriptionCell/);
  assert.match(source, /normalizeReportReviewFieldName/);
  assert.match(fs.readFileSync("src/core/compareRenderer.js", "utf8"), /semantic-object-description/);
  assert.match(styles, /\.line-mapping-connector\.field-metric/);
  assert.match(styles, /\.report-review-description-cell/);
});

test("Nokia Classic indirect static route preserves next-hop for audit and migration review", () => {
  const config = [
    "static-route-entry 125.144.253.0/24",
    "    indirect 125.144.5.1",
    "        tunnel-next-hop",
    "            resolution disabled",
    "        exit",
    "        no shutdown",
    "    exit",
    "exit",
  ].join("\n");

  const result = parse("nokia-classic", config, "old");
  assert.equal(result.objects.length, 1);
  assert.equal(result.objects[0].normalizedType, "static-route");
  assert.equal(result.objects[0].fields["next-hop"], "125.144.5.1");
  assert.equal(result.objects[0].fields["next-hop-type"], "indirect");
  assert.equal(result.objects[0].fields["tunnel-next-hop"], "true");
});

test("Nokia MD-CLI nested static route preserves route, next-hop, state and tag", () => {
  const config = [
    'router "Base" {',
    "  static-routes {",
    "    route 10.10.20.0/24 route-type unicast {",
    '      next-hop "192.0.2.2" {',
    "        admin-state enable",
    "        tag 200",
    "      }",
    "    }",
    "  }",
    "}",
  ].join("\n");

  const result = parse("nokia-md-cli", config, "new");
  assert.equal(result.objects.length, 1);
  assert.equal(result.objects[0].normalizedType, "static-route");
  assert.equal(result.objects[0].normalizedIdentity, "10.10.20.0/24");
  assert.equal(result.objects[0].fields["next-hop"], "192.0.2.2");
  assert.equal(result.objects[0].fields.state, "enabled");
  assert.equal(result.objects[0].fields.tag, "200");
});

test("Nokia MD-CLI nested static route with multiple next-hop creates one route object", () => {
  const config = [
    'router "Base" {',
    "  static-routes {",
    "    route 10.10.20.0/24 route-type unicast {",
    '      next-hop "192.0.2.2" {',
    "        admin-state enable",
    "      }",
    '      next-hop "192.0.2.3" {',
    "        admin-state enable",
    "        tag 200",
    "      }",
    "    }",
    "  }",
    "}",
  ].join("\n");

  const result = parse("nokia-md-cli", config, "new");

  assert.equal(result.objects.length, 1);
  assert.equal(result.objects[0].normalizedIdentity, "10.10.20.0/24");
  assert.equal(result.objects[0].fields["next-hop"], "192.0.2.2, 192.0.2.3");
  assert.equal(result.objects[0].fields["next-hop[192.0.2.3].tag"], "200");
});

test("Nokia MD-CLI one-line service objects normalize subscriber, SAP, hosts and sub-sla fields", () => {
  const config = [
    '/configure { service ies "100" subscriber-interface "sub1" ipv4 address 10.0.0.1 prefix-length 24 admin-state enable }',
    '/configure { service ies "100" subscriber-interface "sub1" group-interface "grp1" radius-auth-policy "rad1" }',
    '/configure { service ies "100" subscriber-interface "sub1" group-interface "grp1" sap 1/1/1:100 ingress filter ip 10 egress filter ip 20 ingress qos sap-ingress policy-name "qin" egress qos sap-egress policy-name "qout" }',
    '/configure { service ies "100" subscriber-interface "sub1" group-interface "grp1" sap 1/1/1:100 static-host "AA:BB:CC:DD:EE:FF" mac AA:BB:CC:DD:EE:FF sub-profile "subp" sla-profile "slap" }',
    '/configure { service ies "100" subscriber-interface "sub1" group-interface "grp1" sap 1/1/1:100 default-host ipv4 10.0.0.50 prefix-length 32 next-hop 10.0.0.1 }',
    '/configure { service ies "100" subscriber-interface "sub1" group-interface "grp1" sap 1/1/1:100 sub-sla-mgmt admin-state enable sub-ident-policy "sip" subscriber-limit 10 defaults sub-profile "sub" sla-profile "sla" subscriber-id "subid" int-dest-id string "intdest" }',
  ].join("\n");

  const result = parse("nokia-md-cli", config, "new");
  const byType = new Map(result.objects.map((object) => [object.normalizedType, object]));

  assert.equal(byType.get("subscriber-interface").fields.address, "10.0.0.1/24");
  assert.equal(byType.get("subscriber-interface").fields.prefix, "10.0.0.1/24");
  assert.equal(byType.get("group-interface").fields["auth-policy"], "rad1");
  assert.equal(byType.get("sap").fields["ingress-filter"], "10");
  assert.equal(byType.get("sap").fields["egress-filter"], "20");
  assert.equal(byType.get("sap").fields["ingress-qos"], "qin");
  assert.equal(byType.get("sap").fields["egress-qos"], "qout");
  assert.equal(byType.get("static-host").fields["static-host"], "aa:bb:cc:dd:ee:ff");
  assert.equal(byType.get("default-host").fields["default-host"], "10.0.0.50/32");
  assert.equal(byType.get("sub-sla-mgmt").fields["sub-sla-mgmt.sub-ident-policy"], "sip");
  assert.equal(byType.get("sub-sla-mgmt").fields["sub-sla-mgmt.defaults.sla-profile"], "sla");
  assert.equal(byType.get("sub-sla-mgmt").fields["sub-sla-mgmt.defaults.int-dest-id"], "intdest");
});
