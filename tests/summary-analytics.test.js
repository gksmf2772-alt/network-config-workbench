import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildFieldOverlapAnalysis,
  buildGraphData,
  buildReviewItems,
  buildSummaryDashboardData,
} from "../src/core/summaryAnalytics.js";

const plan = [
  {
    id: "route-1",
    status: "matched",
    reason: "auto",
    objectType: "static-route",
    score: 92,
    oldObject: {
      id: "old-route",
      normalizedType: "static-route",
      normalizedIdentity: "10.0.0.0/24",
      fields: {
        route: "10.0.0.0/24",
        gateway: "192.0.2.1",
        tag: "100",
      },
    },
    newObject: {
      id: "new-route",
      normalizedType: "static-route",
      normalizedIdentity: "10.0.0.0/24",
      fields: {
        route: "10.0.0.0/24",
        "next-hop": "192.0.2.1",
        tag: "200",
      },
    },
    fieldSummary: {
      route: { status: "equal" },
      gateway: { status: "equal" },
      tag: { status: "changed" },
    },
  },
  {
    id: "bgp-old",
    status: "old-only",
    objectType: "bgp",
    oldObject: {
      id: "old-bgp",
      normalizedType: "bgp",
      normalizedIdentity: "65000:192.0.2.2",
      fields: { neighbor: "192.0.2.2" },
    },
  },
  {
    id: "sap-new",
    status: "new-only",
    objectType: "sap",
    newObject: {
      id: "new-sap",
      normalizedType: "sap",
      normalizedIdentity: "1/1/1:100",
      fields: { sap: "1/1/1:100" },
    },
  },
  {
    id: "if-low",
    status: "matched",
    reason: "auto",
    objectType: "interface",
    score: 58,
    oldObject: {
      normalizedType: "interface",
      normalizedIdentity: "to-core",
      fields: { address: "10.0.0.1/31", description: "old" },
    },
    newObject: {
      normalizedType: "interface",
      normalizedIdentity: "to-core",
      fields: { address: "10.0.0.2/31", mtu: "9216" },
    },
    fieldSummary: {
      address: { status: "changed" },
      description: { status: "missing" },
      mtu: { status: "added" },
    },
    ambiguousAlternatives: [
      { id: "if-candidate", normalizedIdentity: "to-core-2", score: 55 },
    ],
    relationshipSummary: [
      { status: "changed", type: "parent", target: "lag-10" },
    ],
  },
];

function readGlobalStyles() {
  const entry = fs.readFileSync("src/styles/global.css", "utf8");
  return entry.replace(/^@import "\.\/(.+)";$/gm, (_, file) =>
    fs.readFileSync(`src/styles/${file}`, "utf8")
  );
}

test("field overlap aggregates aliases and changed fields", () => {
  const analysis = buildFieldOverlapAnalysis(plan);
  const route = analysis.pairs.find((pair) => pair.objectType === "static-route");

  assert.equal(route.sameFields, 2);
  assert.equal(route.differentFields, 1);
  assert.equal(route.aliasMatches.includes("next-hop"), true);
  assert.equal(analysis.aggregateByType.some((row) => row.objectType === "interface"), true);
});

test("summary dashboard exposes MVP section counts", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan,
    semanticSummary: {},
  });

  assert.deepEqual(dashboard.sectionSummary.map((row) => row.objectType), ["interface", "static-route", "bgp"]);

  const byType = Object.fromEntries(dashboard.sectionSummary.map((row) => [row.objectType, row]));

  assert.equal(byType.interface.total, 1);
  assert.equal(byType.interface.reviewNeeded, 1);
  assert.equal(byType.interface.changed, 1);
  assert.equal(byType["static-route"].total, 1);
  assert.equal(byType["static-route"].reviewNeeded, 1);
  assert.equal(byType["static-route"].changed, 1);
  assert.equal(byType.bgp.total, 1);
  assert.equal(byType.bgp.missing, 1);
  assert.equal(byType.bgp.reviewNeeded, 1);
});

test("static route old-only without same target prefix is real missing not matcher issue", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [
      {
        id: "static-matched",
        status: "matched",
        objectType: "static-route",
        oldObject: {
          normalizedType: "static-route",
          normalizedIdentity: "10.0.0.0/24",
          fields: { route: "10.0.0.0/24" },
        },
        newObject: {
          normalizedType: "static-route",
          normalizedIdentity: "10.0.0.0/24",
          fields: { route: "10.0.0.0/24" },
        },
      },
      {
        id: "static-missing",
        status: "old-only",
        objectType: "static-route",
        oldObject: {
          normalizedType: "static-route",
          normalizedIdentity: "10.0.1.0/24",
          fields: { route: "10.0.1.0/24" },
        },
      },
    ],
    semanticSummary: {},
  });

  assert.equal(dashboard.counts.unmatchedMatcherIssue, 0);
  assert.equal(dashboard.counts.unmatchedRealMissingTarget, 1);
});

test("static route real missing details split default, tunnel, loopback and multi-hop routes", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [
      {
        id: "target-static-route",
        status: "new-only",
        objectType: "static-route",
        newObject: {
          normalizedType: "static-route",
          normalizedIdentity: "10.0.0.0/24",
          fields: { route: "10.0.0.0/24" },
        },
      },
      {
        id: "default-route",
        status: "old-only",
        objectType: "static-route",
        oldObject: {
          normalizedType: "static-route",
          normalizedIdentity: "0.0.0.0/0",
          fields: { route: "0.0.0.0/0", "next-hop-type": "indirect", "tunnel-next-hop": "true" },
        },
      },
      {
        id: "indirect-tunnel",
        status: "old-only",
        objectType: "static-route",
        oldObject: {
          normalizedType: "static-route",
          normalizedIdentity: "125.144.253.0/24",
          fields: { route: "125.144.253.0/24", "next-hop": "125.144.5.1", "next-hop-type": "indirect", "tunnel-next-hop": "true" },
        },
      },
      {
        id: "loopback-host",
        status: "old-only",
        objectType: "static-route",
        oldObject: {
          normalizedType: "static-route",
          normalizedIdentity: "112.188.30.8/32",
          fields: { route: "112.188.30.8/32", "next-hop": "112.188.27.14", description: "Gangbuk-XLC008_loopback" },
        },
      },
      {
        id: "multi-next-hop",
        status: "old-only",
        objectType: "static-route",
        oldObject: {
          normalizedType: "static-route",
          normalizedIdentity: "125.144.5.1/32",
          fields: { route: "125.144.5.1/32", "next-hop": "14.59.4.65, 14.59.4.69" },
        },
      },
    ],
    semanticSummary: {},
  });

  assert.equal(dashboard.counts.unmatchedRealMissingTarget, 4);
  assert.deepEqual(dashboard.context.fixtureScope.byReason.realMissingTarget, [
    { objectType: "static-route", reason: "missing-target-default-route", count: 1 },
    { objectType: "static-route", reason: "missing-target-indirect-tunnel-route", count: 1 },
    { objectType: "static-route", reason: "missing-target-loopback-host-route", count: 1 },
    { objectType: "static-route", reason: "missing-target-multi-next-hop-route", count: 1 },
  ]);
});

test("interface old-only without target evidence is real missing not matcher issue", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [
      {
        id: "interface-target-different-address",
        status: "new-only",
        objectType: "interface",
        newObject: {
          normalizedType: "interface",
          normalizedIdentity: "10.0.0.2/30",
          fields: { interface: "to-target", prefix: "10.0.0.2/30" },
        },
      },
      {
        id: "interface-target-same-name",
        status: "new-only",
        objectType: "interface",
        newObject: {
          normalizedType: "interface",
          normalizedIdentity: "to-isis-core",
          fields: { interface: "to-isis-core" },
        },
      },
      {
        id: "interface-missing-address",
        status: "old-only",
        objectType: "interface",
        oldObject: {
          normalizedType: "interface",
          normalizedIdentity: "10.0.0.1/30",
          fields: { interface: "to-source", prefix: "10.0.0.1/30" },
        },
      },
      {
        id: "interface-missing-name",
        status: "old-only",
        objectType: "interface",
        oldObject: {
          normalizedType: "interface",
          normalizedIdentity: "to-isis-edge",
          fields: { interface: "to-isis-edge" },
        },
      },
      {
        id: "interface-same-name",
        status: "old-only",
        objectType: "interface",
        oldObject: {
          normalizedType: "interface",
          normalizedIdentity: "to-isis-core",
          fields: { interface: "to-isis-core" },
        },
      },
    ],
    semanticSummary: {},
  });

  assert.equal(dashboard.counts.unmatchedMatcherIssue, 1);
  assert.equal(dashboard.counts.unmatchedRealMissingTarget, 2);
});

test("interface real missing details show target description evidence separately", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [
      {
        id: "interface-target-description",
        status: "new-only",
        objectType: "interface",
        newObject: {
          normalizedType: "interface",
          normalizedIdentity: "10.0.0.2/30",
          fields: {
            interface: "to-target",
            prefix: "10.0.0.2/30",
            description: "## Dobong-MNC161H, hu0/4/0/43 ##",
          },
        },
      },
      {
        id: "interface-missing-address-with-description",
        status: "old-only",
        objectType: "interface",
        oldObject: {
          normalizedType: "interface",
          normalizedIdentity: "10.0.0.1/30",
          fields: {
            interface: "to-source",
            prefix: "10.0.0.1/30",
            description: "## MN,Dobong-MNC161H,Te0/8/0/0 ##",
          },
        },
      },
      {
        id: "interface-missing-address",
        status: "old-only",
        objectType: "interface",
        oldObject: {
          normalizedType: "interface",
          normalizedIdentity: "10.0.1.1/30",
          fields: {
            interface: "to-missing",
            prefix: "10.0.1.1/30",
          },
        },
      },
    ],
    semanticSummary: {},
  });

  assert.equal(dashboard.counts.unmatchedMatcherIssue, 0);
  assert.equal(dashboard.counts.unmatchedRealMissingTarget, 2);
  assert.deepEqual(dashboard.context.fixtureScope.byReason.realMissingTarget, [
    { objectType: "interface", reason: "missing-target-address", count: 1 },
    { objectType: "interface", reason: "missing-target-address-with-description-evidence", count: 1 },
  ]);
});

test("interface real missing details split GRE and system loopback addresses", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [
      {
        id: "target-interface",
        status: "new-only",
        objectType: "interface",
        newObject: {
          normalizedType: "interface",
          normalizedIdentity: "10.0.0.2/30",
          fields: { interface: "to-target", prefix: "10.0.0.2/30" },
        },
      },
      {
        id: "loopback-missing",
        status: "old-only",
        objectType: "interface",
        oldObject: {
          normalizedType: "interface",
          normalizedIdentity: "192.168.255.2/30",
          fields: { interface: "lo255", prefix: "192.168.255.2/30" },
        },
      },
      {
        id: "system-missing",
        status: "old-only",
        objectType: "interface",
        oldObject: {
          normalizedType: "interface",
          normalizedIdentity: "61.78.43.27/32",
          fields: { interface: "system", prefix: "61.78.43.27/32" },
        },
      },
      {
        id: "gre-missing",
        status: "old-only",
        objectType: "interface",
        oldObject: {
          normalizedType: "interface",
          normalizedIdentity: "220.116.146.50/30",
          fields: { interface: "gre-to-service-1", prefix: "220.116.146.50/30" },
        },
      },
    ],
    semanticSummary: {},
  });

  assert.equal(dashboard.counts.unmatchedRealMissingTarget, 3);
  assert.deepEqual(dashboard.context.fixtureScope.byReason.realMissingTarget, [
    { objectType: "interface", reason: "missing-target-gre-address", count: 1 },
    { objectType: "interface", reason: "missing-target-system-loopback-address", count: 2 },
  ]);
});

test("port and lag old-only without target evidence are real missing not matcher issue", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [
      {
        id: "port-target-same-id",
        status: "new-only",
        objectType: "port",
        newObject: {
          normalizedType: "port",
          normalizedIdentity: "1/1/1",
          fields: { port: "1/1/1" },
        },
      },
      {
        id: "lag-target-partial-member",
        status: "new-only",
        objectType: "lag",
        newObject: {
          normalizedType: "lag",
          normalizedIdentity: "lag-a",
          fields: { lag: "lag-a", members: ["1/1/1", "1/1/3"] },
        },
      },
      {
        id: "port-missing",
        status: "old-only",
        objectType: "port",
        oldObject: {
          normalizedType: "port",
          normalizedIdentity: "1/1/2",
          fields: { port: "1/1/2" },
        },
      },
      {
        id: "port-same-id",
        status: "old-only",
        objectType: "port",
        oldObject: {
          normalizedType: "port",
          normalizedIdentity: "1/1/1",
          fields: { port: "1/1/1" },
        },
      },
      {
        id: "lag-missing",
        status: "old-only",
        objectType: "lag",
        oldObject: {
          normalizedType: "lag",
          normalizedIdentity: "10",
          fields: { lag: "10", members: ["2/1/1"] },
        },
      },
      {
        id: "lag-partial-member",
        status: "old-only",
        objectType: "lag",
        oldObject: {
          normalizedType: "lag",
          normalizedIdentity: "11",
          fields: { lag: "11", members: ["1/1/1", "1/1/2"] },
        },
      },
    ],
    semanticSummary: {},
  });

  assert.equal(dashboard.counts.unmatchedMatcherIssue, 2);
  assert.equal(dashboard.counts.unmatchedRealMissingTarget, 2);
});

test("port and lag real missing details split id, description and member evidence", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [
      {
        id: "target-port",
        status: "new-only",
        objectType: "port",
        newObject: {
          normalizedType: "port",
          normalizedIdentity: "1/1/1",
          fields: { port: "1/1/1" },
        },
      },
      {
        id: "target-lag",
        status: "new-only",
        objectType: "lag",
        newObject: {
          normalizedType: "lag",
          normalizedIdentity: "lag-a",
          fields: { lag: "lag-a", members: ["1/1/1"] },
        },
      },
      {
        id: "port-id-only",
        status: "old-only",
        objectType: "port",
        oldObject: {
          normalizedType: "port",
          normalizedIdentity: "1/1/2",
          fields: { port: "1/1/2" },
        },
      },
      {
        id: "port-with-description",
        status: "old-only",
        objectType: "port",
        oldObject: {
          normalizedType: "port",
          normalizedIdentity: "1/1/3",
          fields: {
            port: "1/1/3",
            description: "## OLT,10A,Source-OLT,Te1/1 ##",
          },
        },
      },
      {
        id: "lag-member-only",
        status: "old-only",
        objectType: "lag",
        oldObject: {
          normalizedType: "lag",
          normalizedIdentity: "10",
          fields: { lag: "10", members: ["2/1/1"] },
        },
      },
      {
        id: "lag-member-description",
        status: "old-only",
        objectType: "lag",
        oldObject: {
          normalizedType: "lag",
          normalizedIdentity: "11",
          fields: {
            lag: "11",
            members: ["2/1/2"],
            description: "## Uplink,Source-OLT,Te1/2 ##",
          },
        },
      },
    ],
    semanticSummary: {},
  });

  assert.equal(dashboard.counts.unmatchedRealMissingTarget, 4);
  assert.deepEqual(dashboard.context.fixtureScope.byReason.realMissingTarget, [
    { objectType: "lag", reason: "missing-target-lag-members", count: 1 },
    { objectType: "lag", reason: "missing-target-lag-members-with-description", count: 1 },
    { objectType: "port", reason: "missing-target-port-id", count: 1 },
    { objectType: "port", reason: "missing-target-port-id-with-description", count: 1 },
  ]);
});

test("port real missing details split disabled and active described ports", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [
      {
        id: "target-port",
        status: "new-only",
        objectType: "port",
        newObject: {
          normalizedType: "port",
          normalizedIdentity: "1/1/1",
          fields: { port: "1/1/1" },
        },
      },
      {
        id: "target-port-shell",
        status: "new-only",
        objectType: "port",
        newObject: {
          normalizedType: "port",
          normalizedIdentity: "1/1/c5/1",
          fields: { port: "1/1/c5/1" },
        },
      },
      {
        id: "disabled-port",
        status: "old-only",
        objectType: "port",
        oldObject: {
          normalizedType: "port",
          normalizedIdentity: "1/1/2",
          fields: { port: "1/1/2", "admin-state": "disabled" },
        },
      },
      {
        id: "disabled-described-port",
        status: "old-only",
        objectType: "port",
        oldObject: {
          normalizedType: "port",
          normalizedIdentity: "1/1/3",
          fields: {
            port: "1/1/3",
            "admin-state": "disabled",
            description: "## disabled old link ##",
          },
        },
      },
      {
        id: "active-described-port",
        status: "old-only",
        objectType: "port",
        oldObject: {
          normalizedType: "port",
          normalizedIdentity: "1/1/4",
          fields: {
            port: "1/1/4",
            "admin-state": "enabled",
            description: "## active old link ##",
          },
        },
      },
      {
        id: "active-described-port-with-mdcli-shell",
        status: "old-only",
        objectType: "port",
        oldObject: {
          normalizedType: "port",
          normalizedIdentity: "1/1/5",
          fields: {
            port: "1/1/5",
            "admin-state": "enabled",
            description: "## active old link with shell only ##",
          },
        },
      },
    ],
    semanticSummary: {},
  });

  assert.deepEqual(dashboard.context.fixtureScope.byReason.realMissingTarget, [
    { objectType: "port", reason: "missing-target-active-port-with-description", count: 1 },
    { objectType: "port", reason: "missing-target-active-port-with-mdcli-port-shell", count: 1 },
    { objectType: "port", reason: "missing-target-disabled-port", count: 1 },
    { objectType: "port", reason: "missing-target-disabled-port-with-description", count: 1 },
  ]);
});

test("policy placeholder old-only without target identity is real missing not parser gap", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [
      {
        id: "route-policy-target",
        status: "new-only",
        objectType: "route-policy",
        newObject: {
          normalizedType: "route-policy",
          normalizedIdentity: "existing-policy",
          fields: { name: "existing-policy" },
        },
      },
      {
        id: "route-policy-missing",
        status: "old-only",
        objectType: "route-policy",
        oldObject: {
          normalizedType: "route-policy",
          normalizedIdentity: "missing-policy",
          fields: { name: "missing-policy" },
        },
      },
      {
        id: "prefix-list-missing",
        status: "old-only",
        objectType: "prefix-list",
        oldObject: {
          normalizedType: "prefix-list",
          normalizedIdentity: "missing-prefix",
          fields: { name: "missing-prefix" },
        },
      },
    ],
    semanticSummary: {},
  });

  assert.equal(dashboard.counts.unmatchedParserGap, 0);
  assert.equal(dashboard.counts.unmatchedRealMissingTarget, 2);
  assert.deepEqual(dashboard.context.fixtureScope.byType.realMissingTarget, [
    { objectType: "prefix-list", count: 1 },
    { objectType: "route-policy", count: 1 },
  ]);
});

test("policy placeholder real missing details split policy families", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [
      {
        id: "classic-ip-prefix-list",
        status: "old-only",
        objectType: "prefix-list",
        oldObject: {
          normalizedType: "prefix-list",
          normalizedIdentity: "KT_DHCP+CVNET",
          fields: { name: "KT_DHCP+CVNET" },
          rawLines: ['ip-prefix-list "KT_DHCP+CVNET" create'],
        },
      },
      {
        id: "policy-prefix-list",
        status: "old-only",
        objectType: "prefix-list",
        oldObject: {
          normalizedType: "prefix-list",
          normalizedIdentity: "Drop_Prefix",
          fields: { name: "Drop_Prefix" },
          rawLines: ['prefix-list "Drop_Prefix"'],
        },
      },
      {
        id: "community-members",
        status: "old-only",
        objectType: "community",
        oldObject: {
          normalizedType: "community",
          normalizedIdentity: "900",
          fields: { name: "900" },
          rawLines: ['community "900" members "4766:900"'],
        },
      },
      {
        id: "community-expression",
        status: "old-only",
        objectType: "community",
        oldObject: {
          normalizedType: "community",
          normalizedIdentity: "Deny-to-iCoD",
          fields: { name: "Deny-to-iCoD" },
          rawLines: ['community "Deny-to-iCoD" expression "4766:200 OR 4766:250"'],
        },
      },
      {
        id: "route-policy-deny-drop",
        status: "old-only",
        objectType: "route-policy",
        oldObject: {
          normalizedType: "route-policy",
          normalizedIdentity: "bsr_drop",
          fields: { name: "bsr_drop" },
          rawLines: ['policy-statement "bsr_drop"'],
        },
      },
      {
        id: "route-policy-icod",
        status: "old-only",
        objectType: "route-policy",
        oldObject: {
          normalizedType: "route-policy",
          normalizedIdentity: "TO-iCOD",
          fields: { name: "TO-iCOD" },
          rawLines: ['policy-statement "TO-iCOD"'],
        },
      },
      {
        id: "route-policy-peer",
        status: "old-only",
        objectType: "route-policy",
        oldObject: {
          normalizedType: "route-policy",
          normalizedIdentity: "UP-PEER",
          fields: { name: "UP-PEER" },
          rawLines: ['policy-statement "UP-PEER"'],
        },
      },
    ],
    semanticSummary: {},
  });

  assert.equal(dashboard.counts.unmatchedParserGap, 0);
  assert.equal(dashboard.counts.unmatchedRealMissingTarget, 7);
  assert.deepEqual(dashboard.context.fixtureScope.byReason.realMissingTarget, [
    { objectType: "community", reason: "missing-target-community-expression-definition", count: 1 },
    { objectType: "community", reason: "missing-target-community-members-definition", count: 1 },
    { objectType: "prefix-list", reason: "missing-target-ip-prefix-list-definition", count: 1 },
    { objectType: "prefix-list", reason: "missing-target-prefix-list-definition", count: 1 },
    { objectType: "route-policy", reason: "missing-target-route-policy-deny-drop", count: 1 },
    { objectType: "route-policy", reason: "missing-target-route-policy-icod", count: 1 },
    { objectType: "route-policy", reason: "missing-target-route-policy-peer", count: 1 },
  ]);
});

test("PIM real missing details show generic target interface evidence separately", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [
      {
        id: "target-interface",
        status: "new-only",
        objectType: "interface",
        newObject: {
          normalizedType: "interface",
          normalizedIdentity: "to-pe#1-1",
          fields: { interface: "to-pe#1-1" },
        },
      },
      {
        id: "pim-interface-only",
        status: "old-only",
        objectType: "pim",
        oldObject: {
          normalizedType: "pim",
          normalizedIdentity: "to-pe#1-1",
          fields: { interface: "to-pe#1-1" },
        },
      },
      {
        id: "pim-missing",
        status: "old-only",
        objectType: "pim",
        oldObject: {
          normalizedType: "pim",
          normalizedIdentity: "system",
          fields: { interface: "system" },
        },
      },
    ],
    semanticSummary: {},
  });

  assert.equal(dashboard.counts.unmatchedRealMissingTarget, 2);
  assert.deepEqual(dashboard.context.fixtureScope.byReason.realMissingTarget, [
    { objectType: "pim", reason: "missing-target-pim-config-with-interface-evidence", count: 1 },
    { objectType: "pim", reason: "missing-target-type", count: 1 },
  ]);
});

test("BGP real missing details split missing SER-PEER and generic peers", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [
      {
        id: "target-bgp",
        status: "new-only",
        objectType: "bgp",
        newObject: {
          normalizedType: "bgp",
          normalizedIdentity: "112.188.30.111",
          fields: { neighbor: "112.188.30.111", group: "ACCESS-PEER" },
        },
      },
      {
        id: "ser-peer",
        status: "old-only",
        objectType: "bgp",
        oldObject: {
          normalizedType: "bgp",
          normalizedIdentity: "61.78.43.28",
          fields: { neighbor: "61.78.43.28", group: "SER-PEER" },
        },
      },
      {
        id: "generic-peer",
        status: "old-only",
        objectType: "bgp",
        oldObject: {
          normalizedType: "bgp",
          normalizedIdentity: "192.0.2.1",
          fields: { neighbor: "192.0.2.1", group: "LEGACY-PEER" },
        },
      },
      {
        id: "plain-peer",
        status: "old-only",
        objectType: "bgp",
        oldObject: {
          normalizedType: "bgp",
          normalizedIdentity: "192.0.2.2",
          fields: { neighbor: "192.0.2.2" },
        },
      },
    ],
    semanticSummary: {},
  });

  assert.equal(dashboard.counts.unmatchedRealMissingTarget, 3);
  assert.deepEqual(dashboard.context.fixtureScope.byReason.realMissingTarget, [
    { objectType: "bgp", reason: "missing-target-bgp-group", count: 1 },
    { objectType: "bgp", reason: "missing-target-bgp-peer", count: 1 },
    { objectType: "bgp", reason: "missing-target-bgp-ser-peer", count: 1 },
  ]);
});

test("common field analysis excludes suppressed fields from policy-applied rate", () => {
  const oldFields = {};
  const newFields = {};
  const fieldSummary = {};

  for (let index = 0; index < 10; index += 1) {
    const field = `same-${index}`;
    oldFields[field] = "same";
    newFields[field] = "same";
    fieldSummary[field] = { field, status: "equal", oldValues: ["same"], newValues: ["same"] };
  }
  for (let index = 0; index < 5; index += 1) {
    const field = `diff-${index}`;
    oldFields[field] = "old";
    newFields[field] = "new";
    fieldSummary[field] = { field, status: "changed", oldValues: ["old"], newValues: ["new"] };
  }
  for (let index = 0; index < 3; index += 1) {
    const field = `diff-${index}`;
    fieldSummary[field] = {
      ...fieldSummary[field],
      ignored: true,
      effectiveStatus: "ignored",
      policyHits: [{ sourcePolicy: "profile-exception" }],
    };
  }

  const analysis = buildFieldOverlapAnalysis([{
    id: "policy-rate",
    status: "matched",
    objectType: "bgp",
    score: 100,
    oldObject: { normalizedType: "bgp", normalizedIdentity: "peer", fields: oldFields },
    newObject: { normalizedType: "bgp", normalizedIdentity: "peer", fields: newFields },
    fieldSummary,
  }]);

  assert.equal(analysis.aggregate.sameFields, 10);
  assert.equal(analysis.aggregate.differentFields, 2);
  assert.equal(analysis.aggregate.suppressedFields, 3);
  assert.equal(analysis.aggregate.totalComparableFields, 12);
  assert.equal(analysis.aggregate.rawTotalComparableFields, 15);
  assert.equal(analysis.aggregate.rawDifferentFields, 5);
  assert.equal(analysis.aggregate.rawOverlapPercent, 67);
  assert.equal(analysis.aggregate.overlapPercent, 83);
});

test("profile exception changes common field analysis and type breakdown", () => {
  const exceptionPlan = [{
    id: "bgp-profile-exception",
    status: "matched",
    objectType: "bgp",
    score: 100,
    oldObject: {
      normalizedType: "bgp",
      normalizedIdentity: "peer",
      fields: { neighbor: "192.0.2.1", group: "old-group", "admin-state": "disable" },
    },
    newObject: {
      normalizedType: "bgp",
      normalizedIdentity: "peer",
      fields: { neighbor: "192.0.2.1", group: "new-group", "admin-state": "enable" },
    },
    fieldSummary: {
      neighbor: { field: "neighbor", status: "equal", oldValues: ["192.0.2.1"], newValues: ["192.0.2.1"] },
      group: {
        field: "group",
        status: "changed",
        effectiveStatus: "ignored",
        ignored: true,
        oldValues: ["old-group"],
        newValues: ["new-group"],
        policyHits: [{ sourcePolicy: "profile-exception" }],
      },
      "admin-state": {
        field: "admin-state",
        status: "changed",
        oldValues: ["disable"],
        newValues: ["enable"],
      },
    },
  }];
  const analysis = buildFieldOverlapAnalysis(exceptionPlan);
  const review = buildReviewItems(exceptionPlan);
  const bgp = analysis.aggregateByType.find((row) => row.objectType === "bgp");

  assert.equal(analysis.aggregate.rawOverlapPercent, 33);
  assert.equal(analysis.aggregate.overlapPercent, 50);
  assert.equal(analysis.aggregate.suppressedFields, 1);
  assert.equal(analysis.aggregate.differentFields, 1);
  assert.equal(bgp.changedFields, 1);
  assert.equal(bgp.suppressedFields, 1);
  assert.deepEqual(
    review.abnormal[0].fieldRows
      .filter((row) => !["same", "equal", "present"].includes(row.status))
      .map((row) => row.field),
    ["admin-state"]
  );
});

test("profile policy ignored field is not labelled as user exception", () => {
  const review = buildReviewItems([{
    id: "bgp-policy-ignore",
    status: "matched",
    objectType: "bgp",
    score: 100,
    oldObject: {
      normalizedType: "bgp",
      normalizedIdentity: "192.0.2.1",
      fields: { neighbor: "192.0.2.1", "admin-state": "disable", "authentication-key": "old-secret" },
    },
    newObject: {
      normalizedType: "bgp",
      normalizedIdentity: "192.0.2.1",
      fields: { neighbor: "192.0.2.1", "admin-state": "enable", "authentication-key": "new-secret" },
    },
    fieldSummary: {
      neighbor: { field: "neighbor", status: "equal", oldValues: ["192.0.2.1"], newValues: ["192.0.2.1"] },
      "admin-state": { field: "admin-state", status: "changed", oldValues: ["disable"], newValues: ["enable"] },
      "authentication-key": {
        field: "authentication-key",
        status: "changed",
        effectiveStatus: "ignored",
        ignored: true,
        oldValues: ["old-secret"],
        newValues: ["new-secret"],
      },
    },
  }]);

  assert.equal(review.suppressed.length, 1);
  assert.equal(review.abnormal.length, 1);
  assert.equal(review.suppressed[0].reason, "프로파일 정책으로 제외된 항목");
  assert.equal(review.suppressed[0].classification, "정책 제외됨");
  assert.deepEqual(review.suppressed[0].suppressionSources, ["field-policy"]);
});

test("summary dashboard computes raw and effective field overlap", () => {
  const dashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [{
      id: "report-rate",
      status: "matched",
      objectType: "interface",
      score: 100,
      oldObject: { normalizedType: "interface", normalizedIdentity: "lag-1", fields: { name: "lag-1", description: "old" } },
      newObject: { normalizedType: "interface", normalizedIdentity: "lag-1", fields: { name: "lag-1", description: "new" } },
      fieldSummary: {
        name: { field: "name", status: "equal", oldValues: ["lag-1"], newValues: ["lag-1"] },
        description: {
          field: "description",
          status: "changed",
          ignored: true,
          effectiveStatus: "ignored",
          policyHits: [{ sourcePolicy: "user-exception" }],
        },
      },
    }],
    semanticSummary: {},
  });
  assert.equal(dashboard.fieldAnalysis.aggregate.rawOverlapPercent, 50);
  assert.equal(dashboard.fieldAnalysis.aggregate.overlapPercent, 100);
});

test("review table label shows both identities for migrated matched objects", () => {
  const review = buildReviewItems([{
    id: "lag-rename",
    status: "matched",
    objectType: "lag",
    score: 85,
    oldObject: { normalizedType: "lag", normalizedIdentity: "111", fields: { lag: "111" } },
    newObject: { normalizedType: "lag", normalizedIdentity: "lag-B-7216", fields: { lag: "lag-B-7216" } },
    fieldSummary: {
      lag: { field: "lag", status: "changed", oldValues: ["111"], newValues: ["lag-B-7216"] },
    },
  }]);

  assert.equal(review.abnormal[0].label, "111 -> lag-B-7216");
  assert.equal(review.abnormal[0].oldKey, "lag:111");
  assert.equal(review.abnormal[0].newKey, "lag:lag-B-7216");
});

test("summary dashboard rebuild reflects changed exception state", () => {
  const activeDashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [{
      id: "fresh-active",
      status: "matched",
      objectType: "bgp",
      score: 100,
      oldObject: { normalizedType: "bgp", normalizedIdentity: "192.0.2.1", fields: { neighbor: "192.0.2.1", group: "old" } },
      newObject: { normalizedType: "bgp", normalizedIdentity: "192.0.2.1", fields: { neighbor: "192.0.2.1", group: "new" } },
      fieldSummary: {
        neighbor: { field: "neighbor", status: "equal" },
        group: { field: "group", status: "changed" },
      },
    }],
    semanticSummary: {},
  });
  const suppressedDashboard = buildSummaryDashboardData({
    report: { summary: {}, diffRows: [] },
    plan: [{
      id: "fresh-suppressed",
      status: "matched",
      objectType: "bgp",
      score: 100,
      oldObject: { normalizedType: "bgp", normalizedIdentity: "192.0.2.1", fields: { neighbor: "192.0.2.1", group: "old" } },
      newObject: { normalizedType: "bgp", normalizedIdentity: "192.0.2.1", fields: { neighbor: "192.0.2.1", group: "new" } },
      fieldSummary: {
        neighbor: { field: "neighbor", status: "equal" },
        group: {
          field: "group",
          status: "changed",
          ignored: true,
          effectiveStatus: "ignored",
          policyHits: [{ sourcePolicy: "user-exception" }],
        },
      },
    }],
    semanticSummary: {},
  });

  assert.equal(activeDashboard.fieldAnalysis.aggregate.reviewNeeded, 1);
  assert.equal(suppressedDashboard.fieldAnalysis.aggregate.reviewNeeded, 0);
  assert.equal(suppressedDashboard.fieldAnalysis.aggregate.suppressedFields, 1);
});

test("integrated report table hides suppressed duplicate rows for active review objects", () => {
  const source = fs.readFileSync("src/core/legacyCore.js", "utf8");

  assert.match(source, /const rows = buildReportReviewRows\(review\);/);
  assert.match(source, /function buildReportReviewRows\(review = \{\}\)/);
  assert.match(source, /const activeKeys = new Set\(/);
  assert.match(source, /filter\(\(item\) => !activeKeys\.has\(reportReviewObjectDedupKey\(item\)\)\)/);
});

test("policy violation panel includes semantic field policy violations", () => {
  const source = fs.readFileSync("src/core/legacyCore.js", "utf8");

  assert.match(source, /function renderReportPolicyList\(report\)/);
  assert.match(source, /filterItems\(\s*buildSemanticPolicyReportItems\(state\.lastSemanticPlan \|\| \[\]\),\s*getOptions\(\)\s*\)/);
  assert.match(source, /filterLegacyPolicyReportItems\(report\.visibleItems \|\| \[\], semanticItems, state\.lastSemanticPlan \|\| \[\]\)/);
  assert.match(source, /buildSemanticPolicyReportItems\(state\.lastSemanticPlan \|\| \[\]\)/);
  assert.match(source, /activeSemanticPolicyViolations\(item\)\.length > 0/);
  assert.match(source, /if \(!\["changed", "required"\]\.includes\(item\.type\)\) return true;/);
  assert.match(source, /message: `의미 기반 비교 위반 \$\{violations\.length\}건`/);
  assert.match(source, /renderReportPolicyList\(state\.lastReport\);/);
});

test("integrated report table exposes checkbox value filters", () => {
  const source = fs.readFileSync("src/core/legacyCore.js", "utf8");
  const styles = readGlobalStyles();

  assert.match(source, /data-report-check-value/);
  assert.match(source, /reportReviewChecklistMatches/);
  assert.match(source, /data-report-check-all/);
  assert.match(source, /reportReviewFilterPanelStyle/);
  assert.match(styles, /\.report-review-checklist/);
  assert.match(styles, /\.report-review-check-option input\[type="checkbox"\]/);
  assert.match(styles, /width: clamp\(220px, var\(--report-filter-width, 28ch\), 520px\)/);
  assert.match(styles, /text-overflow: ellipsis/);
  assert.match(styles, /\.report-review-checklist \{[\s\S]*?min-width: 0;/);
});

test("review items expose unmatched, ambiguous, low confidence, and relationship changes", () => {
  const review = buildReviewItems(plan);

  assert.equal(review.unmatchedOld.length, 1);
  assert.equal(review.unmatchedNew.length, 1);
  assert.equal(review.unmatchedOld[0].unmatchedCategory, "realMissingTarget");
  assert.equal(review.unmatchedOld[0].diagnosticReason, "missing-target-bgp-peer");
  assert.equal(review.ambiguous.length, 1);
  assert.equal(review.lowConfidence.length, 1);
  assert.equal(review.relationshipChanges.length, 1);
  assert.ok(review.critical.length >= 2);
});

test("graph data creates mapping and relationship edges", () => {
  const graph = buildGraphData({ plan });

  assert.ok(graph.nodes.some((node) => node.side === "old"));
  assert.ok(graph.nodes.some((node) => node.side === "new"));
  assert.ok(graph.edges.some((edge) => edge.type === "mapping"));
  assert.ok(graph.edges.some((edge) => edge.type === "relationship"));
});

test("dashboard data derives operator severity and line metrics", () => {
  const dashboard = buildSummaryDashboardData({
    report: {
      summary: { total: 3, changed: 1, missing: 1, added: 1 },
      diffRows: [
        { oldState: "equal", newState: "equal" },
        { oldState: "missing", newState: "placeholder" },
        { oldState: "placeholder", newState: "added" },
      ],
    },
    plan,
    semanticSummary: {
      totalObjects: plan.length,
      matchPercent: 50,
      coveragePercent: 25,
      lineCovered: 1,
      lineTotal: 4,
    },
    support: { state: "supported", label: "지원됨" },
  });

  assert.equal(dashboard.lineSummary.removed, 1);
  assert.equal(dashboard.lineSummary.added, 1);
  assert.equal(dashboard.lowCoverage, true);
  assert.equal(dashboard.severity.level, "critical");
});
