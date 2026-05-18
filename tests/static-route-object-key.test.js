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

test("Nokia Classic interface maps MD-CLI IES interface by address and normalizes ICMP settings", () => {
  const oldConfig = [
    'interface "to-Dobong-TOU-FD09" create',
    '    description "## OLT,10B,Dobong-TOU-FD09_7/1_02018880-3696,OFD#14-12 ##"',
    "    address 112.188.24.89/30",
    "    icmp",
    "        no mask-reply",
    "        no redirects",
    "        no ttl-expired",
    "        no unreachables",
    "    exit",
    "    sap lag-114 create",
    "        ingress",
    "            qos 20",
    "            filter ip 10",
    "        exit",
    "        egress",
    "            qos 20",
    "        exit",
    "    exit",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { service ies "100" interface "renamed-to-Dobong-TOU-FD09" admin-state enable }',
    '/configure { service ies "100" interface "renamed-to-Dobong-TOU-FD09" description "## to-Dobong-TOU-FD09, Po11(Te7/1), SBY ##" }',
    '/configure { service ies "100" interface "renamed-to-Dobong-TOU-FD09" sap lag-B-6211 ingress filter ip "prtsr-backup" }',
    '/configure { service ies "100" interface "renamed-to-Dobong-TOU-FD09" sap lag-B-6211 egress qos sap-egress policy-name "SEA_ACCESS_OUT" }',
    '/configure { service ies "100" interface "renamed-to-Dobong-TOU-FD09" ipv4 icmp mask-reply false }',
    '/configure { service ies "100" interface "renamed-to-Dobong-TOU-FD09" ipv4 icmp redirects admin-state disable }',
    '/configure { service ies "100" interface "renamed-to-Dobong-TOU-FD09" ipv4 icmp ttl-expired admin-state disable }',
    '/configure { service ies "100" interface "renamed-to-Dobong-TOU-FD09" ipv4 icmp unreachables admin-state disable }',
    '/configure { service ies "100" interface "renamed-to-Dobong-TOU-FD09" ipv4 primary address 112.188.24.89 }',
    '/configure { service ies "100" interface "renamed-to-Dobong-TOU-FD09" ipv4 primary prefix-length 30 }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  const oldInterface = result.oldResult.objects.find((object) => object.normalizedType === "interface");
  const newInterface = result.newResult.objects.find((object) => object.normalizedType === "interface");
  const interfaceMatch = result.matches.find((match) => match.oldObject?.normalizedType === "interface");
  const interfacePlan = result.plan.find((item) => item.objectType === "interface");

  assert.deepEqual([...new Set(result.oldResult.objects.map((object) => object.normalizedType))], ["interface"]);
  assert.deepEqual([...new Set(result.newResult.objects.map((object) => object.normalizedType))], ["interface"]);
  assert.equal(oldInterface.normalizedIdentity, "112.188.24.89/30");
  assert.equal(newInterface.normalizedIdentity, "112.188.24.89/30");
  assert.equal(oldInterface.ipAddress, "112.188.24.89");
  assert.equal(newInterface.ipAddress, "112.188.24.89");
  assert.equal(interfaceMatch.status, "matched");
  assert.equal(interfaceMatch.reason, "prefix");
  assert.equal(interfacePlan.fieldSummary.address.status, "equal");
  assert.equal(oldInterface.fields.sap, "lag-114");
  assert.equal(oldInterface.fields["ingress-filter"], "10");
  assert.equal(oldInterface.fields["ingress-qos"], "20");
  assert.equal(oldInterface.fields["egress-qos"], "20");
  assert.equal(newInterface.fields.sap, "lag-b-6211");
  assert.equal(newInterface.fields["ingress-filter"], "prtsr-backup");
  assert.equal(newInterface.fields["egress-qos"], "SEA_ACCESS_OUT");
  assert.equal(interfacePlan.fieldSummary.sap.status, "changed");
  assert.equal(interfacePlan.fieldSummary["ingress-filter"].status, "changed");
  assert.equal(interfacePlan.fieldSummary["ingress-qos"].status, "missing");
  assert.equal(interfacePlan.fieldSummary["egress-qos"].status, "changed");

  for (const field of ["icmp.mask-reply", "icmp.redirects", "icmp.ttl-expired", "icmp.unreachables"]) {
    assert.equal(oldInterface.fields[field], "disabled");
    assert.equal(newInterface.fields[field], "disabled");
    assert.equal(interfacePlan.fieldSummary[field].status, "equal");
    assert.deepEqual(interfacePlan.fieldSummary[field].oldValues, ["disabled"]);
    assert.deepEqual(interfacePlan.fieldSummary[field].newValues, ["disabled"]);
  }

  assert.deepEqual([...new Set(result.plan.map((item) => item.objectType))], ["interface"]);
  assert.equal(interfacePlan.fieldSummary["admin-state"].status, "added");
  assert.equal(interfacePlan.fieldSummary.description.status, "changed");
});

test("legacy main compare parser keeps static route blocks as route-level objects", () => {
  const source = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const styles = fs.readFileSync("src/styles/global.css", "utf8");

  assert.match(source, /objects\.push\(finalizeObject\(current, options, source\)\);/);
  assert.match(source, /mergeStaticRouteFields\(target\.canonicalFields, safeObject\.canonicalFields\)/);
  assert.match(source, /function buildStaticRouteIdentityFromFields\(fields = \{\}, fallback = ""\)/);
  assert.match(source, /function buildInterfaceIdentityFromFields\(fields = \{\}, fallback = "", \{ preferAddress = true \} = \{\}\)/);
  assert.match(source, /function normalizeMergedObjectIdentity\(object, options, source\)/);
  assert.match(source, /canonicalType === "static-route" \|\| canonicalType === "interface"/);
  assert.match(source, /ipv4\\s\+primary\\s\+address/);
  assert.match(source, /icmp\.mask-reply/);
  assert.match(source, /function isInterfaceIcmpLine\(line = ""\)/);
  assert.match(source, /INTERFACE_CONTEXT_ONLY_FIELDS/);
  assert.match(source, /function detectBuiltinSubscriberInterfaceStart\(normalizedLine = "", source = "old"\)/);
  assert.match(source, /function buildSubscriberInterfaceIdentityFromFields\(fields = \{\}, fallback = "", \{ preferAddress = true \} = \{\}\)/);
  assert.match(source, /function extractSubscriberInterfaceCanonicalFieldsFromLines\(lines = \[\], profile = state\.profileDraft\)/);
  assert.match(source, /function collectBuiltinSubscriberInterfaceObjects\(lines = \[\], options = \{\}, source = "old"\)/);
  assert.match(source, /const builtinSubscriber = collectBuiltinSubscriberInterfaceObjects\(lines, options, source\);/);
  assert.match(source, /canonicalType === "static-route" \|\| canonicalType === "interface" \|\| canonicalType === "subscriber-interface"/);
  assert.match(source, /function inferSemanticFieldNameForLineContext\(line, context = \{\}\)/);
  assert.match(source, /function getClassicLineScope\(rawLines = \[\], lineIndex = -1\)/);
  assert.match(source, /stateScope === "dhcp"\) return "dhcp\.admin-state"/);
  assert.match(source, /renderSemanticLineTokens\(line, objectType, fields, relationByField, field\)/);
  assert.match(source, /lineIndex: oldRawIndex >= 0 \? oldRawIndex : visualLineIndex/);
  assert.match(source, /lineIndex: newRawIndex >= 0 \? newRawIndex : visualLineIndex/);
  assert.match(source, /preferredField = normalizeRelationField\(line\?\.dataset\?\.semanticField \|\| ""\)/);
  assert.match(source, /field === "ingress-filter" \|\| field === "egress-filter"/);
  const mdInterfaceFieldBody = source.slice(
    source.indexOf("function inferMdCliInterfaceLineField"),
    source.indexOf("function inferClassicInterfaceLineField")
  );
  const ingressFilterOrder = mdInterfaceFieldBody.indexOf("ingress\\s+filter\\s+ip");
  const sapOrder = mdInterfaceFieldBody.indexOf("\\bsap\\b");
  assert.ok(ingressFilterOrder >= 0 && sapOrder >= 0 && ingressFilterOrder < sapOrder);
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
  const objectTypes = new Set(result.objects.map((object) => object.normalizedType));
  const subscriber = result.objects.find((object) => object.normalizedType === "subscriber-interface");

  assert.deepEqual([...objectTypes], ["subscriber-interface"]);
  assert.equal(subscriber.normalizedIdentity, "sub1");
  assert.equal(subscriber.fields.address, "10.0.0.1/24");
  assert.equal(subscriber.fields.prefix, "10.0.0.1/24");
  assert.equal(subscriber.fields["group-interface"], "grp1");
  assert.equal(subscriber.fields["auth-policy"], "rad1");
  assert.equal(subscriber.fields.sap, "1/1/1:100");
  assert.equal(subscriber.fields["ingress-filter"], "10");
  assert.equal(subscriber.fields["egress-filter"], "20");
  assert.equal(subscriber.fields["ingress-qos"], "qin");
  assert.equal(subscriber.fields["egress-qos"], "qout");
  assert.equal(subscriber.fields["static-host"], "aa:bb:cc:dd:ee:ff");
  assert.equal(subscriber.fields["static-host.sub-profile"], "subp");
  assert.equal(subscriber.fields["default-host"], "10.0.0.50/32");
  assert.equal(subscriber.fields["default-host.next-hop"], "10.0.0.1");
  assert.equal(subscriber.fields["sub-sla-mgmt.sub-ident-policy"], "sip");
  assert.equal(subscriber.fields["sub-sla-mgmt.defaults.sla-profile"], "sla");
  assert.equal(subscriber.fields["sub-sla-mgmt.defaults.int-dest-id"], "intdest");
});

test("Nokia Classic subscriber-interface maps MD-CLI subscriber-interface as one object", () => {
  const oldConfig = [
    'subscriber-interface "to-Nowon-TOU-FN17" create',
    '    description "## to-Nowon-TOU-FN17, Po10(Te6/1), ACT ##"',
    "    allow-unmatching-subnets",
    "    address 112.188.27.101/30",
    '    group-interface "g-to-Nowon-TOU-FN17" create',
    "        arp-populate",
    "        dhcp",
    "            filter 60",
    "            server 121.128.86.26",
    "            trusted",
    "            lease-populate l2-header 32767",
    "            no shutdown",
    "        exit",
    '        authentication-policy "RADIUS"',
    "        sap lag-53 create",
    "            cpu-protection 200 ip-src-monitoring",
    "            default-host 112.188.27.101/30 next-hop 112.188.27.102",
    "            ingress",
    "                qos 20",
    "                filter ip 10",
    "            exit",
    "            egress",
    "                qos 20",
    "            exit",
    "            sub-sla-mgmt",
    '                def-inter-dest-id string "PQ_3WFQ"',
    "                def-sub-id use-auto-id",
    '                def-sub-profile "IN_SEA_NTOPIA"',
    '                def-sla-profile "IN_SEA_NTOPIA"',
    '                sub-ident-policy "sub-id-pol"',
    "                multi-sub-sap 32767",
    "                no shutdown",
    "            exit",
    "            static-host ip 112.188.27.102 create",
    '                inter-dest-id "PQ_3WFQ"',
    '                sla-profile "IN_SEA_NTOPIA"',
    '                sub-profile "SI_PIM"',
    "                subscriber-sap-id",
    "                no shutdown",
    "            exit",
    "        exit",
    "    exit",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 admin-state enable }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 description "## to-Nowon-TOU-FN17, Po10(Te6/1), ACT ##" }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 ipv4 allow-unmatching-subnets true }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 ipv4 address 112.188.27.101 prefix-length 30 }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 radius-auth-policy "RADIUS" }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 ipv4 neighbor-discovery populate true }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 ipv4 dhcp admin-state enable }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 ipv4 dhcp filter 60 }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 ipv4 dhcp server [121.128.86.26] }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 ipv4 dhcp trusted true }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 ipv4 dhcp lease-populate max-leases 131071 }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 ipv4 dhcp lease-populate l2-header }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 ingress filter ip "prtsr-active" }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 egress qos sap-egress policy-name "SEA_ACCESS_OUT" }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 cpu-protection policy-id 200 }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 cpu-protection ip-src-monitoring }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 sub-sla-mgmt admin-state enable }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 sub-sla-mgmt sub-ident-policy "sub-id-pol" }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 sub-sla-mgmt subscriber-limit 131071 }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 sub-sla-mgmt defaults sub-profile "IN_SEA_DEFAULT" }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 sub-sla-mgmt defaults sla-profile "IN_SEA_DEFAULT" }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 sub-sla-mgmt defaults subscriber-id auto-id }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 sub-sla-mgmt defaults int-dest-id string "PQ_3WFQ" }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 static-host ipv4 112.188.27.102 mac 00:00:00:00:00:00 admin-state enable }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 static-host ipv4 112.188.27.102 mac 00:00:00:00:00:00 sub-profile "SI_PIM" }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 static-host ipv4 112.188.27.102 mac 00:00:00:00:00:00 sla-profile "IN_SEA_DEFAULT" }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 static-host ipv4 112.188.27.102 mac 00:00:00:00:00:00 int-dest-id "PQ_3WFQ" }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 static-host ipv4 112.188.27.102 mac 00:00:00:00:00:00 subscriber-id use-sap-id }',
    '/configure { service ies "100" subscriber-interface to-Nowon-TOU-FN17 group-interface g-to-Nowon-TOU-FN17 sap lag-A-2103 default-host ipv4 112.188.27.101 prefix-length 30 next-hop 112.188.27.102 }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  const oldTypes = new Set(result.oldResult.objects.map((object) => object.normalizedType));
  const newTypes = new Set(result.newResult.objects.map((object) => object.normalizedType));
  const subscriberPlan = result.plan.find((item) => item.objectType === "subscriber-interface");

  assert.deepEqual([...oldTypes], ["subscriber-interface"]);
  assert.deepEqual([...newTypes], ["subscriber-interface"]);
  assert.equal(result.oldResult.objects[0].normalizedIdentity, "to-nowon-tou-fn17");
  assert.equal(result.newResult.objects[0].normalizedIdentity, "to-nowon-tou-fn17");
  assert.equal(subscriberPlan.status, "matched");
  assert.equal(subscriberPlan.fieldSummary.address.status, "equal");
  assert.equal(subscriberPlan.fieldSummary["group-interface"].status, "equal");
  assert.equal(subscriberPlan.fieldSummary["auth-policy"].status, "equal");
  assert.equal(subscriberPlan.fieldSummary["dhcp.admin-state"].status, "equal");
  assert.equal(subscriberPlan.fieldSummary["dhcp.filter"].status, "equal");
  assert.equal(subscriberPlan.fieldSummary["dhcp.server"].status, "equal");
  assert.equal(subscriberPlan.fieldSummary["sub-sla-mgmt.admin-state"].status, "equal");
  assert.equal(subscriberPlan.fieldSummary["static-host.admin-state"].status, "equal");
  assert.equal(subscriberPlan.fieldSummary["static-host"].status, "equal");
  assert.equal(subscriberPlan.fieldSummary["default-host"].status, "equal");
  assert.equal(subscriberPlan.fieldSummary["sub-sla-mgmt.sub-ident-policy"].status, "equal");
  assert.equal(subscriberPlan.lineMatches.some((line) => line.fieldMatches?.some((field) => field.field === "sap")), true);
  assert.equal(subscriberPlan.lineMatches.some((line) => line.fieldMatches?.some((field) => field.field === "dhcp.admin-state" && field.status === "equal")), true);
  assert.equal(subscriberPlan.lineMatches.some((line) => line.fieldMatches?.some((field) => field.field === "sub-sla-mgmt.admin-state" && field.status === "equal")), true);
  assert.equal(subscriberPlan.lineMatches.some((line) => line.fieldMatches?.some((field) => field.field === "static-host.admin-state" && field.status === "equal")), true);
});
