import test from "node:test";
import assert from "node:assert/strict";

import {
  createComparisonPlan,
  matchNormalizedObjects,
  normalizeConfig,
  renderComparisonPlanHtml,
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

function buildNokiaPortSemanticFixture() {
  const oldConfig = [
    "port 9/1/4",
    "    description \"## Ulsan-TOD-FN77 ge13/1(ACT) ##\"",
    "    ethernet",
    "        mode access",
    "        egress-scheduler-policy \"qos\"",
    "        crc-monitor",
    "            sd-threshold 9",
    "        exit",
    "        access",
    "            egress",
    "                queue-group \"Queue_Group\" instance 1 create",
    "                    host-match dest \"PQ_3WFQ\" create",
    "                exit",
    "            exit",
    "        exit",
    "        down-on-internal-error",
    "    exit",
    "    no shutdown",
    "exit",
  ].join("\n");
  const newConfig = [
    "port 7/1/c12/1 {",
    "    admin-state enable",
    "    description \"## TO, lag-A-7112(7/1/c12/1), Ulsan-TOD-FN77, Po10(xe13/1), ACT, 02688875-0610, Direct ##\"",
    "    ethernet {",
    "        mode access",
    "        down-on-internal-error {",
    "        }",
    "        crc-monitor {",
    "            signal-degrade {",
    "                threshold 9",
    "            }",
    "        }",
    "        access {",
    "            egress {",
    "                queue-group \"Queue_Group\" instance-id 1 {",
    "                    host-match {",
    "                        int-dest-id \"PQ_3WFQ\" { }",
    "                    }",
    "                }",
    "            }",
    "        }",
    "        egress {",
    "            port-scheduler-policy {",
    "                policy-name \"qos\"",
    "            }",
    "        }",
    "    }",
    "}",
  ].join("\n");

  const oldObjects = normalizeConfig({ vendor: "nokia-classic", side: "old", configText: oldConfig }).objects;
  const newObjects = normalizeConfig({ vendor: "nokia-md-cli", side: "new", configText: newConfig }).objects;
  const matches = matchNormalizedObjects({ oldObjects, newObjects });

  return {
    oldObjects,
    newObjects,
    matches,
    plan: createComparisonPlan(matches),
  };
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

test("LAG compact old endpoint maps to split target endpoint", () => {
  const oldDescription = "## IVC,PGangbu-IVC020_Te2/3_Po111,02020001-5029,LAG21 ##";
  const newDescription = "## IV, PGangbu-IVC020, Te2/3, 02020001-5029, 10G, Fiber ##";
  const match = firstMatch(
    [
      object("lag", "21", {
        lag: "21",
        description: oldDescription,
        members: ["2/2/3"],
      }),
    ],
    [
      object("lag", "lag-I-2114", {
        lag: "lag-I-2114",
        description: newDescription,
        members: ["2/1/c14/1"],
      }),
    ]
  );

  assert.equal(match.status, "matched");
  assert.ok(match.score >= 85);
  assert.ok(match.scoreReasons.includes("description-endpoint-match"));
});

test("LAG endpoint match ignores directional description prefix", () => {
  const oldDescription = "##TO, lag-51(5/1/1), to-Nowon-TOU-FN19, Po10(Te6/1), ACT, 02020002-3654 ##";
  const newDescription = "## TO, lag-A-2101(2/1/c1/1), Nowon-TOU-FN19, Po10(Te6/1), ACT, 02020002-6431, Fiber ##";
  const match = firstMatch(
    [
      object("lag", "51", {
        lag: "51",
        description: oldDescription,
        members: ["5/1/1"],
      }),
    ],
    [
      object("lag", "lag-A-2101", {
        lag: "lag-A-2101",
        description: newDescription,
        members: ["2/1/c1/1"],
      }),
    ]
  );

  assert.equal(match.status, "matched");
  assert.ok(match.score >= 85);
  assert.ok(match.scoreReasons.includes("description-endpoint-match"));
});

test("LAG endpoint matches underscore numeric port to parenthesized target port", () => {
  const oldDescription = "## OLT,10G(A),Dobong-TOU-FB06_6/1,02028880-0001,OFD#6-54 ##";
  const newDescription = "## TO, lag-A-6108(6/1/c8/1), Dobong-TOU-FB06, Po10(Te6/1), ACT, Direct, Fiber ##";
  const match = firstMatch(
    [
      object("lag", "11", {
        lag: "11",
        description: oldDescription,
        members: ["10/1/1"],
      }),
    ],
    [
      object("lag", "lag-A-6108", {
        lag: "lag-A-6108",
        description: newDescription,
        members: ["6/1/c8/1"],
      }),
    ]
  );

  assert.equal(match.status, "matched");
  assert.ok(match.score >= 85);
  assert.ok(match.scoreReasons.includes("description-endpoint-match"));
});

test("port endpoint match normalizes known Ganbuk spelling typo", () => {
  const oldDescription = "## OLT,10B,Ganbuk-TOU-FK53_7/1_OFD#6-74 ##";
  const newDescription = "## TO, lag-B-6205(6/2/c5/1), Gangbuk-TOU-FK53, Po11(Te7/1), SBY, 02020002-6481, Fiber ##";
  const match = firstMatch(
    [
      object("port", "9/2/1", {
        port: "9/2/1",
        description: oldDescription,
      }),
    ],
    [
      object("port", "6/2/c5/1", {
        port: "6/2/c5/1",
        description: newDescription,
      }),
    ]
  );

  assert.equal(match.status, "matched");
  assert.ok(match.score >= 85);
  assert.ok(match.scoreReasons.includes("description-endpoint-match"));
});

test("LAG endpoint falls back to underscore device token when no port token exists", () => {
  const oldDescription = "## OLT,10B,Nowon-TOU-FN05_8884-4390_#2-7 ##";
  const newDescription = "## TO, lag-B-2205(2/2/c5/1), Nowon-TOU-FN05, Po11(Te7/1), SBY, 02020002-6436, Fiber ##";
  const match = firstMatch(
    [
      object("lag", "171", {
        lag: "171",
        description: oldDescription,
        members: ["7/2/1"],
      }),
    ],
    [
      object("lag", "lag-B-2205", {
        lag: "lag-B-2205",
        description: newDescription,
        members: ["2/2/c5/1"],
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

test("description-only interface candidate keeps diagnostic score reason", () => {
  const match = firstMatch(
    [
      object("interface", "220.116.146.97/30", {
        interface: "gre-source",
        address: "220.116.146.97/30",
        description: "## gre source address ###",
      }),
    ],
    [
      object("interface", "112.188.18.2/30", {
        interface: "gre-source-1",
        address: "112.188.18.2/30",
        description: "### gre source address-1 ###",
      }),
    ],
  );

  assert.equal(match.status, "candidate");
  assert.ok(match.score > 0 && match.score < 80);
  assert.ok(match.scoreReasons.includes("description-similarity"));
});

test("Nokia GRE source primary redundancy conversion auto-matches gre-source-1", () => {
  const oldObject = {
    ...object("interface", "220.116.146.97/30", {
      interface: "gre-source",
      address: "220.116.146.97/30",
      description: "## gre source address ###",
      sap: "tunnel-1.public:1",
    }),
    vendor: "nokia-classic",
  };
  const primaryObject = {
    ...object("interface", "112.188.18.2/30", {
      interface: "gre-source-1",
      address: "112.188.18.2/30",
      description: "### gre source address-1 ###",
      sap: "pxc-1.b:1",
    }),
    vendor: "nokia-md-cli",
  };
  const secondaryObject = {
    ...object("interface", "112.188.18.6/30", {
      interface: "gre-source-2",
      address: "112.188.18.6/30",
      description: "### gre source address-2 ###",
      sap: "pxc-2.b:1",
    }),
    vendor: "nokia-md-cli",
  };
  const match = firstMatch([oldObject], [secondaryObject, primaryObject]);

  assert.equal(match.status, "matched");
  assert.equal(match.newObject.fields.interface, "gre-source-1");
  assert.ok(match.score >= 80);
  assert.ok(match.scoreReasons.includes("nokia-gre-source-primary-conversion"));
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
  assert.equal(match.score, 80);
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

test("Classic LAG maps MD-CLI block LAG by description endpoint as one object", () => {
  const oldConfig = [
    "lag 111",
    "    description \"## Ulsan-TOD-F063 xe-14/1(SBY),02600009-0822 ##\"",
    "    mode access",
    "    access",
    "        adapt-qos link",
    "    exit",
    "    port 10/2/1",
    "    lacp active administrative-key 111",
    "    lacp-xmit-interval slow",
    "    no shutdown",
    "exit",
  ].join("\n");
  const newConfig = [
    'lag "lag-B-7216" {',
    "    admin-state enable",
    '    description "## TO, lag-B-7216(7/2/c16/1), Ulsan-TOD-F063, Po11(xe14/1), SBY, Direct ##"',
    "    mode access",
    "    lacp-xmit-interval slow",
    "    lacp {",
    "        mode active",
    "        administrative-key 7216",
    "    }",
    "    access {",
    "        adapt-qos {",
    "            mode link",
    "        }",
    "    }",
    "    port 7/2/c16/1 {",
    "    }",
    "}",
  ].join("\n");

  const oldObjects = normalizeConfig({ vendor: "nokia-classic", side: "old", configText: oldConfig }).objects;
  const newObjects = normalizeConfig({ vendor: "nokia-md-cli", side: "new", configText: newConfig }).objects;
  const matches = matchNormalizedObjects({ oldObjects, newObjects });
  const [planItem] = createComparisonPlan(matches);

  assert.equal(oldObjects.filter((object) => object.normalizedType === "lag").length, 1);
  assert.equal(newObjects.filter((object) => object.normalizedType === "lag").length, 1);
  assert.equal(newObjects.filter((object) => object.normalizedType === "port").length, 0);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].status, "matched");
  assert.ok(matches[0].scoreReasons.includes("description-endpoint-match"));
  assert.equal(planItem.objectType, "lag");
  assert.equal(planItem.fieldSummary.mode.status, "equal");
  assert.equal(planItem.fieldSummary["access.adapt-qos.mode"].status, "equal");
  assert.equal(planItem.fieldSummary["lacp-mode"].status, "equal");
  assert.equal(planItem.fieldSummary["lacp-xmit-interval"].status, "equal");
  assert.equal(planItem.fieldSummary["admin-state"].status, "equal");
  assert.equal(planItem.fieldSummary["member-port"].status, "changed");
  assert.equal(planItem.fieldSummary["lacp.administrative-key"].status, "changed");
});

test("Nokia Classic and MD-CLI port block semantic fields remain matched", () => {
  const { oldObjects, newObjects, matches, plan } = buildNokiaPortSemanticFixture();
  const oldPort = oldObjects[0];
  const newPort = newObjects[0];
  const [match] = matches;
  const [planItem] = plan;
  const expectedEqualFields = {
    "admin-state": "enabled",
    "ethernet.mode": "access",
    "ethernet.egress.scheduler-policy": "qos",
    "ethernet.crc-monitor.signal-degrade.threshold": "9",
    "ethernet.down-on-internal-error": "true",
    "ethernet.access.egress.queue-group.name": "Queue_Group",
    "ethernet.access.egress.queue-group.instance": "1",
    "ethernet.access.egress.queue-group.host-match.destination": "PQ_3WFQ",
  };

  assert.equal(oldObjects.length, 1);
  assert.equal(newObjects.length, 1);
  assert.equal(oldPort.normalizedType, "port");
  assert.equal(newPort.normalizedType, "port");
  assert.equal(match.status, "matched");
  assert.ok(match.scoreReasons.includes("description-endpoint-match"));

  for (const [field, value] of Object.entries(expectedEqualFields)) {
    assert.equal(oldPort.fields[field], value);
    assert.equal(newPort.fields[field], value);
    assert.equal(planItem.fieldSummary[field].status, "equal");
  }

  assert.equal(planItem.fieldSummary.description.status, "changed");
});

test("Nokia port semantic line comparison avoids missing and added rows for equivalent settings", () => {
  const { plan } = buildNokiaPortSemanticFixture();
  const [planItem] = plan;
  const expectedFields = [
    "admin-state",
    "ethernet.mode",
    "ethernet.egress.scheduler-policy",
    "ethernet.crc-monitor.signal-degrade.threshold",
    "ethernet.down-on-internal-error",
    "ethernet.access.egress.queue-group.name",
    "ethernet.access.egress.queue-group.instance",
    "ethernet.access.egress.queue-group.host-match.destination",
  ];
  const lineByField = new Map(
    planItem.lineMatches.map((lineMatch) => [lineMatch.fieldMatches?.[0]?.field, lineMatch])
  );

  for (const field of expectedFields) {
    assert.equal(lineByField.get(field)?.status, "equal");
    assert.notEqual(lineByField.get(field)?.reason, "no-line-match");
    assert.notEqual(lineByField.get(field)?.reason, "new-line-unmatched");
  }

  assert.equal(planItem.lineMatches.filter((lineMatch) => ["missing", "added"].includes(lineMatch.status)).length, 0);
});

test("Nokia port semantic line comparison displays source config lines", () => {
  const { plan } = buildNokiaPortSemanticFixture();
  const [planItem] = plan;
  const lineByField = new Map(
    planItem.lineMatches.map((lineMatch) => [lineMatch.canonicalField, lineMatch])
  );
  const sourceText = (lineMatch, side) =>
    (side === "old" ? lineMatch.oldSourceLines : lineMatch.newSourceLines).join("\n");
  const html = renderComparisonPlanHtml(plan);

  assert.match(sourceText(lineByField.get("admin-state"), "old"), /no shutdown/);
  assert.match(sourceText(lineByField.get("admin-state"), "new"), /admin-state enable/);

  assert.match(sourceText(lineByField.get("ethernet.egress.scheduler-policy"), "old"), /egress-scheduler-policy "qos"/);
  assert.match(sourceText(lineByField.get("ethernet.egress.scheduler-policy"), "new"), /policy-name "qos"/);

  assert.match(sourceText(lineByField.get("ethernet.crc-monitor.signal-degrade.threshold"), "old"), /sd-threshold 9/);
  assert.match(sourceText(lineByField.get("ethernet.crc-monitor.signal-degrade.threshold"), "new"), /threshold 9/);

  assert.match(sourceText(lineByField.get("ethernet.access.egress.queue-group.name"), "old"), /queue-group "Queue_Group" instance 1 create/);
  assert.match(sourceText(lineByField.get("ethernet.access.egress.queue-group.name"), "new"), /queue-group "Queue_Group" instance-id 1/);

  assert.match(sourceText(lineByField.get("ethernet.access.egress.queue-group.host-match.destination"), "old"), /host-match dest "PQ_3WFQ" create/);
  assert.match(sourceText(lineByField.get("ethernet.access.egress.queue-group.host-match.destination"), "new"), /int-dest-id "PQ_3WFQ"/);

  assert.doesNotMatch(html, /<pre class="semantic-line-cell old">ethernet\.access\.egress\.queue-group\.host-match\.destination PQ_3WFQ<\/pre>/);
  assert.doesNotMatch(html, /<pre class="semantic-line-cell new">ethernet\.access\.egress\.queue-group\.host-match\.destination PQ_3WFQ<\/pre>/);
  assert.match(html, /host-match dest &quot;PQ_3WFQ&quot; create/);
  assert.match(html, /int-dest-id &quot;PQ_3WFQ&quot;/);
});

test("Nokia port scheduler policy line relation keeps source anchors", () => {
  const { oldObjects, newObjects, plan } = buildNokiaPortSemanticFixture();
  const [oldPort] = oldObjects;
  const [newPort] = newObjects;
  const [planItem] = plan;
  const field = "ethernet.egress.scheduler-policy";
  const lineMatch = planItem.lineMatches.find((item) => item.canonicalField === field);

  assert.equal(oldPort.fields[field], "qos");
  assert.equal(newPort.fields[field], "qos");
  assert.ok(lineMatch);
  assert.equal(lineMatch.status, "equal");
  assert.equal(lineMatch.reason, "canonical-field-align");
  assert.equal(lineMatch.fieldMatches?.[0]?.field, field);
  assert.equal(lineMatch.oldLines?.[0], `${field} qos`);
  assert.equal(lineMatch.newLines?.[0], `${field} qos`);
  assert.match(lineMatch.oldSourceLines.join("\n"), /egress-scheduler-policy "qos"/);
  assert.match(lineMatch.newSourceLines.join("\n"), /egress\s*\{/);
  assert.match(lineMatch.newSourceLines.join("\n"), /port-scheduler-policy\s*\{/);
  assert.match(lineMatch.newSourceLines.join("\n"), /policy-name "qos"/);
  assert.match(lineMatch.oldDisplayLine, /egress-scheduler-policy "qos"/);
  assert.match(lineMatch.newDisplayLine, /policy-name "qos"/);
});

test("Nokia MD-CLI one-line port settings merge by port prefix", () => {
  const result = normalizeConfig({
    vendor: "nokia-md-cli",
    side: "new",
    configText: [
      '/configure { port 2/1/c1/1 admin-state enable }',
      '/configure { port 2/1/c1/1 description "## Port C1 ##" }',
      '/configure { port 2/1/c1/1 ethernet mode access }',
      '/configure { port 2/1/c1/1 ethernet mtu 4484 }',
      '/configure { port 2/1/c1/1 ethernet down-on-internal-error }',
      '/configure { port 2/1/c1/1 ethernet crc-monitor signal-degrade threshold 9 }',
      '/configure { port 2/1/c1/1 ethernet egress port-scheduler-policy policy-name "qos" }',
      '/configure { port 2/1/c1/1 ethernet access egress queue-group "Queue_Group" instance-id 1 host-match int-dest-id "PQ_3WFQ" }',
      '/configure { port 2/1/c2/1 admin-state enable }',
    ].join("\n"),
  });
  const ports = result.objects.filter((item) => item.normalizedType === "port");
  const first = ports.find((item) => item.normalizedIdentity === "2/1/c1/1");
  const second = ports.find((item) => item.normalizedIdentity === "2/1/c2/1");

  assert.equal(ports.length, 2);
  assert.ok(first);
  assert.ok(second);
  assert.equal(first.rawLines.length, 8);
  assert.equal(first.fields["admin-state"], "enabled");
  assert.equal(first.fields.description, "## Port C1 ##");
  assert.equal(first.fields["ethernet.mode"], "access");
  assert.equal(first.fields["ethernet.mtu"], "4484");
  assert.equal(first.fields["ethernet.down-on-internal-error"], "true");
  assert.equal(first.fields["ethernet.crc-monitor.signal-degrade.threshold"], "9");
  assert.equal(first.fields["ethernet.egress.scheduler-policy"], "qos");
  assert.equal(first.fields["ethernet.access.egress.queue-group.name"], "Queue_Group");
  assert.equal(first.fields["ethernet.access.egress.queue-group.instance"], "1");
  assert.equal(first.fields["ethernet.access.egress.queue-group.host-match.destination"], "PQ_3WFQ");
});

test("Nokia Classic block port compares MD-CLI one-line port fields and source lines", () => {
  const oldConfig = [
    "port 2/1/6",
    "    description \"## Ulsan-TOD-FN77 ge13/1(ACT) ##\"",
    "    shutdown",
    "    ethernet",
    "        mode access",
    "        mtu 4484",
    "        egress-scheduler-policy \"qos\"",
    "        crc-monitor",
    "            sd-threshold 9",
    "        exit",
    "        access",
    "            egress",
    "                queue-group \"Queue_Group\" instance 1 create",
    "                    host-match dest \"PQ_3WFQ\" create",
    "                exit",
    "            exit",
    "        exit",
    "        down-on-internal-error",
    "    exit",
    "exit",
  ].join("\n");
  const newConfig = [
    '/configure { port 2/1/c1/1 description "## Ulsan-TOD-FN77 ge13/1(ACT) ##" }',
    '/configure { port 2/1/c1/1 admin-state disable }',
    '/configure { port 2/1/c1/1 ethernet mode access }',
    '/configure { port 2/1/c1/1 ethernet mtu 4484 }',
    '/configure { port 2/1/c1/1 ethernet down-on-internal-error }',
    '/configure { port 2/1/c1/1 ethernet crc-monitor signal-degrade threshold 9 }',
    '/configure { port 2/1/c1/1 ethernet egress port-scheduler-policy policy-name "qos" }',
    '/configure { port 2/1/c1/1 ethernet access egress queue-group "Queue_Group" instance-id 1 host-match int-dest-id "PQ_3WFQ" }',
  ].join("\n");
  const oldObjects = normalizeConfig({ vendor: "nokia-classic", side: "old", configText: oldConfig }).objects;
  const newObjects = normalizeConfig({ vendor: "nokia-md-cli", side: "new", configText: newConfig }).objects;
  const matches = matchNormalizedObjects({ oldObjects, newObjects });
  const [planItem] = createComparisonPlan(matches);
  const lineByField = new Map(planItem.lineMatches.map((lineMatch) => [lineMatch.canonicalField, lineMatch]));
  const expectedEqualFields = [
    "admin-state",
    "ethernet.mode",
    "ethernet.mtu",
    "ethernet.egress.scheduler-policy",
    "ethernet.crc-monitor.signal-degrade.threshold",
    "ethernet.down-on-internal-error",
    "ethernet.access.egress.queue-group.name",
    "ethernet.access.egress.queue-group.instance",
    "ethernet.access.egress.queue-group.host-match.destination",
  ];

  assert.equal(newObjects.filter((item) => item.normalizedType === "port").length, 1);
  assert.equal(matches[0].status, "matched");
  assert.ok(matches[0].scoreReasons.includes("description-endpoint-match"));

  for (const field of expectedEqualFields) {
    assert.equal(planItem.fieldSummary[field].status, "equal");
    assert.equal(lineByField.get(field)?.status, "equal");
    assert.match(lineByField.get(field)?.newSourceLines.join("\n") || "", /^\/configure \{ port 2\/1\/c1\/1/m);
  }
});

test("Nokia MD-CLI router interface one-line settings merge by router and interface path", () => {
  const result = normalizeConfig({
    vendor: "nokia-md-cli",
    side: "new",
    configText: [
      '/configure { router "Base" interface "to-core" description "uplink" }',
      '/configure { router "Base" interface "to-core" ipv4 primary address 192.0.2.1 prefix-length 30 }',
      '/configure { router "Other" interface "to-core" description "other uplink" }',
    ].join("\n"),
  });
  const interfaces = result.objects.filter((item) => item.normalizedType === "interface");
  const base = interfaces.find((item) => item.sourceName === "to-core" && item.rawLines.length === 2);
  const other = interfaces.find((item) => item.fields.router === "Other");

  assert.equal(interfaces.length, 2);
  assert.ok(base);
  assert.ok(other);
  assert.equal(base.rawLines.length, 2);
  assert.equal(base.fields.description, "uplink");
  assert.equal(base.fields.address, "192.0.2.1/30");
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
