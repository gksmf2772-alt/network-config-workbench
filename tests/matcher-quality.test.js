import test from "node:test";
import assert from "node:assert/strict";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
} from "../src/core/comparator.js";

function object(type, identity, fields = {}) {
  return {
    id: `${type}-${identity}`,
    vendor: "test",
    normalizedType: type,
    sourceType: type,
    sourceName: identity,
    normalizedIdentity: identity,
    description: fields.description || null,
    fields,
    rawLines: [`${type} ${identity}`],
  };
}

function firstMatch(oldObjects, newObjects, profile = {}) {
  return matchNormalizedObjects({ oldObjects, newObjects, profile })[0];
}

test("port renamed but physically same maps strongly", () => {
  const match = firstMatch(
    [object("port", "old-port-name", { port: "old-port-name", "physical-port": "1/1/1", state: "enabled" })],
    [object("port", "new-port-name", { port: "new-port-name", "physical-port": "1/1/1", state: "enabled" })]
  );

  assert.equal(match.status, "matched");
  assert.ok(match.score >= 85);
  assert.ok(match.scoreReasons.includes("port-physical-id"));
});

test("LAG renamed but same members maps strongly", () => {
  const match = firstMatch(
    [object("lag", "10", { lag: "10", members: ["1/1/1", "1/1/2"], state: "enabled" })],
    [object("lag", "lag-a", { lag: "lag-a", members: ["1/1/1", "1/1/2"], state: "enabled" })]
  );

  assert.equal(match.status, "matched");
  assert.ok(match.matchKeyFields.includes("members"));
  assert.ok(match.scoreReasons.includes("lag-member-set-exact"));
});

test("LAG with changed member set remains candidate", () => {
  const match = firstMatch(
    [object("lag", "10", { lag: "10", members: ["1/1/1", "1/1/2"] })],
    [object("lag", "lag-a", { lag: "lag-a", members: ["1/1/1", "1/1/3"] })]
  );

  assert.equal(match.status, "candidate");
  assert.ok(match.scoreReasons.includes("lag-member-set-changed"));
});

test("LAG migrated name and member port maps by description endpoint", () => {
  const oldDescription = "##TO, lag-191(9/2/1), Dobong-TOU-FD07, Po11(Te7/1), STBY, 02018880-9792##";
  const newDescription = "## TO, lag-B-6202(6/2/c2/1), Dobong-TOU-FD07, Po11(Te7/1), SBY, 02018880-9792, Fiber ##";
  const match = firstMatch(
    [
      object("lag", "191", {
        lag: "191",
        description: oldDescription,
        members: ["9/2/1"],
      }),
    ],
    [
      object("lag", "lag-B-6202", {
        lag: "lag-B-6202",
        description: newDescription,
        members: ["6/2/c2/1"],
      }),
    ]
  );

  assert.equal(match.status, "matched");
  assert.ok(match.score >= 85);
  assert.ok(match.scoreReasons.includes("description-endpoint-match"));
});

test("object alias policy forces known mapping", () => {
  const match = firstMatch(
    [object("port", "1/1/1", { port: "1/1/1" })],
    [object("port", "xe-1", { port: "xe-1" })],
    {
      objectAliases: [
        { objectType: "port", old: "1/1/1", new: "xe-1", reason: "fixture-known-port-rename" },
      ],
    }
  );

  assert.equal(match.status, "matched");
  assert.equal(match.reason, "fixture-known-port-rename");
  assert.ok(match.scoreReasons.includes("object-alias-policy"));
});

test("SAP under same service maps strongly with parent evidence", () => {
  const match = firstMatch(
    [
      object("sap", "sap-old", {
        "service-id": "100",
        "subscriber-interface": "sub-a",
        "group-interface": "grp-a",
        sap: "lag-1:100",
      }),
    ],
    [
      object("sap", "sap-new", {
        "service-id": "100",
        "subscriber-interface": "sub-a",
        "group-interface": "grp-a",
        sap: "lag-1:100",
      }),
    ]
  );

  assert.equal(match.status, "matched");
  assert.ok(match.scoreReasons.includes("same-sap-service"));
});

test("same SAP under different service remains candidate", () => {
  const match = firstMatch(
    [object("sap", "sap-old", { "service-id": "100", sap: "lag-1:100" })],
    [object("sap", "sap-new", { "service-id": "200", sap: "lag-1:100" })]
  );

  assert.equal(match.status, "candidate");
  assert.ok(match.scoreReasons.includes("conflicting-parent:service-id"));
});

test("SAP with renamed parent interface uses relationship evidence", () => {
  const match = firstMatch(
    [
      object("sap", "sap-old", {
        "service-id": "100",
        "subscriber-interface": "sub-a",
        "group-interface": "grp-a",
        sap: "lag-1:100",
        "ingress-qos": "Q-IN",
      }),
    ],
    [
      object("sap", "sap-new", {
        "service-id": "100",
        "subscriber-interface": "sub-a",
        "group-interface": "grp-a",
        sap: "lag-renamed:100",
        "ingress-qos": "Q-IN",
      }),
    ]
  );

  assert.equal(match.status, "candidate");
  assert.ok(match.scoreReasons.includes("same-policy:ingress-qos"));
  assert.ok(match.matchKeyFields.includes("subscriber-interface"));
});

test("missing SAP service parent is reported as relationship gap", () => {
  const match = firstMatch(
    [object("sap", "sap-old", { "service-id": "100", sap: "lag-1:100" })],
    [object("sap", "sap-new", { sap: "lag-1:100" })]
  );

  assert.equal(match.status, "candidate");
  assert.ok(match.scoreReasons.includes("missing-parent:service-id"));
  assert.ok(match.scoreReasons.includes("missing-parent-relationship"));
});

test("static route gateway and next-hop alias match", () => {
  const match = firstMatch(
    [object("static-route", "10.0.0.0/24|192.0.2.1", { route: "10.0.0.0/24", gateway: "192.0.2.1" })],
    [object("static-route", "10.0.0.0/24|192.0.2.1", { route: "10.0.0.0/24", "next-hop": "192.0.2.1" })]
  );

  assert.equal(match.status, "matched");
  assert.equal(match.reason, "prefix-next-hop");
});

test("static route next-hop changed without policy remains manual-review candidate", () => {
  const match = firstMatch(
    [object("static-route", "10.0.0.0/24|192.0.2.1", { route: "10.0.0.0/24", "next-hop": "192.0.2.1" })],
    [object("static-route", "10.0.0.0/24|192.0.2.254", { route: "10.0.0.0/24", "next-hop": "192.0.2.254" })]
  );

  assert.equal(match.status, "candidate");
  assert.equal(match.score, 60);
  assert.ok(match.scoreReasons.includes("static-route-next-hop-mismatch"));
});

test("static route next-hop changed with conversion policy is accepted", () => {
  const match = firstMatch(
    [object("static-route", "10.0.0.0/24|192.0.2.1", { route: "10.0.0.0/24", "next-hop": "192.0.2.1" })],
    [object("static-route", "10.0.0.0/24|192.0.2.254", { route: "10.0.0.0/24", "next-hop": "192.0.2.254" })],
    {
      staticRouteConversionPolicy: {
        allowedNextHopRewrites: [
          { prefix: "10.0.0.0/24", from: "192.0.2.1", to: "192.0.2.254" },
        ],
      },
    }
  );

  assert.equal(match.status, "matched");
  assert.ok(match.scoreReasons.includes("static-route-next-hop-accepted-by-policy"));
});

test("Classic LAG parser extracts member ports", () => {
  const result = normalizeConfig({
    vendor: "nokia-classic",
    side: "old",
    configText: [
      "lag 10",
      "    port 1/1/1",
      "    port 1/1/2",
      "    no shutdown",
      "exit",
    ].join("\n"),
  });

  assert.deepEqual(result.objects[0].fields.members, ["1/1/1", "1/1/2"]);
});

test("Classic and MD-CLI migrated LAG maps by peer description and compares LAG fields", () => {
  const oldConfig = [
    "lag 191",
    "    description \"##TO, lag-191(9/2/1), Dobong-TOU-FD07, Po11(Te7/1), STBY, 02018880-9792##\"",
    "    mode access",
    "    access",
    "        adapt-qos link ",
    "    exit",
    "    port 9/2/1 ",
    "    lacp active administrative-key 191 ",
    "    lacp-xmit-interval slow",
    "    no shutdown",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { lag "lag-B-6202" admin-state disable }',
    '/configure { lag "lag-B-6202" description "## TO, lag-B-6202(6/2/c2/1), Dobong-TOU-FD07, Po11(Te7/1), SBY, 02018880-9792, Fiber, JN-HD2U#1-222 ##" }',
    '/configure { lag "lag-B-6202" mode access }',
    '/configure { lag "lag-B-6202" lacp-xmit-interval slow }',
    '/configure { lag "lag-B-6202" lacp mode active }',
    '/configure { lag "lag-B-6202" lacp administrative-key 6202 }',
    '/configure { lag "lag-B-6202" access adapt-qos mode link }',
    '/configure { lag "lag-B-6202" port 6/2/c2/1 }',
  ].join("\n");

  const oldObjects = normalizeConfig({ vendor: "nokia-classic", side: "old", configText: oldConfig }).objects;
  const newObjects = normalizeConfig({ vendor: "nokia-md-cli", side: "new", configText: newConfig }).objects;
  const match = firstMatch(oldObjects, newObjects);
  const [planItem] = createComparisonPlan([match]);

  assert.equal(match.status, "matched");
  assert.ok(match.scoreReasons.includes("description-endpoint-match"));
  assert.equal(match.oldObject.fields.mode, "access");
  assert.equal(match.oldObject.fields["access.adapt-qos.mode"], "link");
  assert.equal(match.oldObject.fields["lacp-mode"], "active");
  assert.equal(match.oldObject.fields["lacp.administrative-key"], "191");
  assert.equal(match.oldObject.fields["lacp-xmit-interval"], "slow");
  assert.equal(planItem.fieldSummary.mode.status, "equal");
  assert.equal(planItem.fieldSummary["access.adapt-qos.mode"].status, "equal");
  assert.equal(planItem.fieldSummary["lacp-mode"].status, "equal");
  assert.equal(planItem.fieldSummary["lacp-xmit-interval"].status, "equal");
  assert.equal(planItem.fieldSummary["member-port"].status, "changed");
});

test("MD-CLI BGP one-line parser extracts import and export policy references", () => {
  const result = normalizeConfig({
    vendor: "nokia-md-cli",
    side: "new",
    configText: '/configure { router "Base" bgp neighbor "192.0.2.1" import policy ["IMPORT-A"] export policy ["EXPORT-A"] }',
  });

  assert.equal(result.objects[0].fields["import.policy"], "IMPORT-A");
  assert.equal(result.objects[0].fields["export.policy"], "EXPORT-A");
});
