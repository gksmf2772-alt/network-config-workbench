import test from "node:test";
import assert from "node:assert/strict";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
} from "../src/core/comparator.js";
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
  assert.equal(result.objects[0].normalizedIdentity, "10.10.20.0/24|192.0.2.2");
  assert.equal(result.objects[0].fields["next-hop"], "192.0.2.2");
  assert.equal(result.objects[0].fields.state, "enabled");
  assert.equal(result.objects[0].fields.tag, "200");
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
