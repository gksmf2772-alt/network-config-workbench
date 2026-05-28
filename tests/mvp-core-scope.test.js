import test from "node:test";
import assert from "node:assert/strict";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
} from "../src/core/comparator.js";

function parse(vendor, configText, side) {
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

test("MVP interface match uses address even when interface names change", () => {
  const oldConfig = [
    'interface "to-Dobong-MNC#1" create',
    '    description "## Dobong uplink ##"',
    "    address 10.10.10.1/30",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { router "Base" interface "Te1/1/1" description "## Dobong uplink migrated ##" }',
    '/configure { router "Base" interface "Te1/1/1" ipv4 primary address 10.10.10.1 prefix-length 30 }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  const match = result.matches.find((item) => item.oldObject?.normalizedType === "interface");
  const planItem = result.plan.find((item) => item.objectType === "interface");

  assert.equal(result.oldResult.objects.filter((item) => item.normalizedType === "interface").length, 1);
  assert.equal(result.newResult.objects.filter((item) => item.normalizedType === "interface").length, 1);
  assert.equal(match.status, "matched");
  assert.equal(match.reason, "prefix");
  assert.equal(planItem.fieldSummary.address.status, "equal");
  assert.equal(planItem.fieldSummary.interface.status, "changed");
});

test("MVP interface identity preserves router context when duplicate addresses exist", () => {
  const oldConfig = [
    'configure router "Base" interface "old-base"',
    "    address 10.10.10.1/30",
    "exit",
    'configure router "Blue" interface "old-blue"',
    "    address 10.10.10.1/30",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { router "Base" interface "Te1/1/1" ipv4 primary address 10.10.10.1 prefix-length 30 }',
    '/configure { router "Blue" interface "Te1/1/2" ipv4 primary address 10.10.10.1 prefix-length 30 }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  const oldInterfaces = result.oldResult.objects.filter((item) => item.normalizedType === "interface");
  const newInterfaces = result.newResult.objects.filter((item) => item.normalizedType === "interface");
  const interfaceMatches = result.matches.filter((item) => item.oldObject?.normalizedType === "interface");

  assert.equal(oldInterfaces.length, 2);
  assert.equal(newInterfaces.length, 2);
  assert.equal(interfaceMatches.length, 2);
  assert.deepEqual(
    interfaceMatches.map((item) => item.status).sort(),
    ["matched", "matched"]
  );
  assert.equal(new Set(oldInterfaces.map((item) => item.normalizedIdentity)).size, 2);
  assert.equal(new Set(newInterfaces.map((item) => item.normalizedIdentity)).size, 2);
});

test("MVP interface matching does not auto-match duplicate address across router contexts", () => {
  const oldConfig = [
    'configure router "Blue" interface "old-blue"',
    "    address 10.10.10.1/30",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { router "Red" interface "Te1/1/2" ipv4 primary address 10.10.10.1 prefix-length 30 }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  const interfaceMatches = result.matches.filter((item) =>
    item.oldObject?.normalizedType === "interface" ||
    item.newObject?.normalizedType === "interface"
  );

  assert.equal(interfaceMatches.some((item) => item.status === "matched"), false);
});

test("MVP MD-CLI block interface identity preserves router context with duplicate addresses", () => {
  const block = parse("nokia-md-cli", [
    'router "Base" {',
    '    interface "Te1/1/1" {',
    "        ipv4 {",
    "            primary {",
    "                address 10.10.10.1",
    "                prefix-length 30",
    "            }",
    "        }",
    "    }",
    "}",
    'router "Blue" {',
    '    interface "Te1/1/2" {',
    "        ipv4 {",
    "            primary {",
    "                address 10.10.10.1",
    "                prefix-length 30",
    "            }",
    "        }",
    "    }",
    "}",
  ].join("\n"), "new");

  const interfaces = block.objects.filter((item) => item.normalizedType === "interface");

  assert.equal(interfaces.length, 2);
  assert.equal(new Set(interfaces.map((item) => item.normalizedIdentity)).size, 2);
});

test("MVP MD-CLI one-line service interfaces with duplicate addresses remain separate objects", () => {
  const result = parse("nokia-md-cli", [
    '/configure { service ies "100" interface "To-MNC#2-1" description "## Dobong-MNC162D, hu0/4/0/43 ##" }',
    '/configure { service ies "100" interface "To-MNC#2-1" sap 2/2/c17/1 ingress qos sap-ingress policy-name "SEA_IN" }',
    '/configure { service ies "100" interface "To-MNC#2-1" ipv4 primary address 112.188.17.106 }',
    '/configure { service ies "100" interface "To-MNC#2-1" ipv4 primary prefix-length 30 }',
    '/configure { service ies "100" interface "To-MNC#2-2" description "## Dobong-MNC162D, hu0/12/0/43 ##" }',
    '/configure { service ies "100" interface "To-MNC#2-2" sap 4/2/c17/1 ingress qos sap-ingress policy-name "SEA_IN" }',
    '/configure { service ies "100" interface "To-MNC#2-2" ipv4 primary address 112.188.17.106 }',
    '/configure { service ies "100" interface "To-MNC#2-2" ipv4 primary prefix-length 30 }',
  ].join("\n"), "new");

  const interfaces = result.objects.filter((item) => item.normalizedType === "interface");

  assert.equal(interfaces.length, 2);
  assert.deepEqual(
    interfaces.map((item) => item.fields.interface).sort(),
    ["to-mnc#2-1", "to-mnc#2-2"]
  );
  assert.equal(new Set(interfaces.map((item) => item.fields.sap)).size, 2);
});

test("MVP static route same prefix with changed next-hop stays review candidate", () => {
  const oldConfig = [
    "static-route-entry 10.20.30.0/24",
    "    next-hop 192.0.2.1",
    "    no shutdown",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { router "Base" static-routes route 10.20.30.0/24 route-type unicast next-hop 192.0.2.254 admin-state enable }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  const match = result.matches.find((item) => item.oldObject?.normalizedType === "static-route");
  const planItem = result.plan.find((item) => item.objectType === "static-route");

  assert.equal(result.oldResult.objects.filter((item) => item.normalizedType === "static-route").length, 1);
  assert.equal(result.newResult.objects.filter((item) => item.normalizedType === "static-route").length, 1);
  assert.equal(match.status, "candidate");
  assert.ok(match.scoreReasons.includes("static-route-next-hop-mismatch"));
  assert.equal(planItem.status, "candidate");
});

test("MVP static route identity preserves router context when duplicate prefixes exist", () => {
  const oldConfig = [
    'configure router "Base" static-routes route 10.20.30.0/24',
    "    next-hop 192.0.2.1",
    "exit",
    'configure router "Blue" static-routes route 10.20.30.0/24',
    "    next-hop 192.0.2.1",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { router "Base" static-routes route 10.20.30.0/24 route-type unicast next-hop 192.0.2.1 admin-state enable }',
    '/configure { router "Blue" static-routes route 10.20.30.0/24 route-type unicast next-hop 192.0.2.1 admin-state enable }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  const oldRoutes = result.oldResult.objects.filter((item) => item.normalizedType === "static-route");
  const newRoutes = result.newResult.objects.filter((item) => item.normalizedType === "static-route");
  const routeMatches = result.matches.filter((item) => item.oldObject?.normalizedType === "static-route");

  assert.equal(oldRoutes.length, 2);
  assert.equal(newRoutes.length, 2);
  assert.equal(routeMatches.length, 2);
  assert.deepEqual(
    routeMatches.map((item) => item.status).sort(),
    ["matched", "matched"]
  );
  assert.equal(new Set(oldRoutes.map((item) => item.normalizedIdentity)).size, 2);
  assert.equal(new Set(newRoutes.map((item) => item.normalizedIdentity)).size, 2);
});

test("MVP static route matching does not auto-match same prefix across router contexts", () => {
  const oldConfig = [
    'configure router "Blue" static-routes route 10.20.30.0/24',
    "    next-hop 192.0.2.1",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { router "Red" static-routes route 10.20.30.0/24 route-type unicast next-hop 192.0.2.1 admin-state enable }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  const routeMatches = result.matches.filter((item) =>
    item.oldObject?.normalizedType === "static-route" ||
    item.newObject?.normalizedType === "static-route"
  );

  assert.equal(routeMatches.some((item) => item.status === "matched"), false);
});

test("MVP MD-CLI block static route identity preserves router context with duplicate prefixes", () => {
  const block = parse("nokia-md-cli", [
    'router "Base" {',
    "    static-routes {",
    "        route 10.20.30.0/24 route-type unicast {",
    '            next-hop "192.0.2.1" {',
    "                admin-state enable",
    "            }",
    "        }",
    "    }",
    "}",
    'router "Blue" {',
    "    static-routes {",
    "        route 10.20.30.0/24 route-type unicast {",
    '            next-hop "192.0.2.1" {',
    "                admin-state enable",
    "            }",
    "        }",
    "    }",
    "}",
  ].join("\n"), "new");

  const routes = block.objects.filter((item) => item.normalizedType === "static-route");

  assert.equal(routes.length, 2);
  assert.equal(new Set(routes.map((item) => item.normalizedIdentity)).size, 2);
});

test("MVP BGP neighbor matches by peer IP and exposes policy differences", () => {
  const oldConfig = [
    "neighbor 203.0.113.10",
    "    peer-as 65000",
    "    import OLD-IN",
    "    export OLD-OUT",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { router "Base" bgp neighbor "203.0.113.10" peer-as 65000 import policy ["NEW-IN"] export policy ["NEW-OUT"] }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  const match = result.matches.find((item) => item.oldObject?.normalizedType === "bgp");
  const planItem = result.plan.find((item) => item.objectType === "bgp");

  assert.equal(result.oldResult.objects.filter((item) => item.normalizedType === "bgp").length, 1);
  assert.equal(result.newResult.objects.filter((item) => item.normalizedType === "bgp").length, 1);
  assert.equal(match.status, "matched");
  assert.equal(match.reason, "peer-ip");
  assert.equal(planItem.fieldSummary["import.policy"].status, "changed");
  assert.equal(planItem.fieldSummary["export.policy"].status, "changed");
});

test("MVP MD-CLI block and one-line interface normalize to the same address identity", () => {
  const block = parse("nokia-md-cli", [
    'router "Base" {',
    '    interface "Te1/1/1" {',
    "        admin-state enable",
    '        description "uplink"',
    "        ipv4 {",
    "            primary {",
    "                address 10.10.10.1",
    "                prefix-length 30",
    "            }",
    "        }",
    "    }",
    "}",
  ].join("\n"), "new");

  const oneLine = parse("nokia-md-cli", [
    '/configure { router "Base" interface "Te1/1/1" admin-state enable }',
    '/configure { router "Base" interface "Te1/1/1" description "uplink" }',
    '/configure { router "Base" interface "Te1/1/1" ipv4 primary address 10.10.10.1 prefix-length 30 }',
  ].join("\n"), "new");

  const blockInterface = block.objects.find((item) => item.normalizedType === "interface");
  const oneLineInterface = oneLine.objects.find((item) => item.normalizedType === "interface");

  assert.equal(blockInterface.normalizedIdentity, "10.10.10.1/30");
  assert.equal(oneLineInterface.normalizedIdentity, "10.10.10.1/30");
  assert.equal(blockInterface.fields.address, oneLineInterface.fields.address);
  assert.equal(blockInterface.fields["admin-state"], oneLineInterface.fields["admin-state"]);
  assert.equal(blockInterface.fields.description, oneLineInterface.fields.description);
});

test("MVP full config input extracts interface static-route and BGP objects together", () => {
  const oldConfig = [
    "echo unrelated header",
    'interface "to-core-old" create',
    "    address 10.10.10.1/30",
    "exit",
    "static-route-entry 10.20.30.0/24",
    "    next-hop 192.0.2.1",
    "exit",
    "neighbor 203.0.113.10",
    "    peer-as 65000",
    "exit",
    "port 1/1/1",
    '    description "port helper only"',
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { router "Base" interface "Te1/1/1" ipv4 primary address 10.10.10.1 prefix-length 30 }',
    '/configure { router "Base" static-routes route 10.20.30.0/24 route-type unicast next-hop 192.0.2.1 admin-state enable }',
    '/configure { router "Base" bgp neighbor "203.0.113.10" peer-as 65000 }',
    '/configure { port 2/1/c1/1 description "port helper only" }',
  ].join("\n");

  const result = compare(oldConfig, newConfig);
  const oldTypes = new Set(result.oldResult.objects.map((item) => item.normalizedType));
  const newTypes = new Set(result.newResult.objects.map((item) => item.normalizedType));
  const planByType = new Map(result.plan.map((item) => [item.objectType, item]));

  for (const type of ["interface", "static-route", "bgp"]) {
    assert.equal(oldTypes.has(type), true, `old ${type}`);
    assert.equal(newTypes.has(type), true, `new ${type}`);
    assert.equal(planByType.get(type)?.status, "matched", `plan ${type}`);
  }
});
