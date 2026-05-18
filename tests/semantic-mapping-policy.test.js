import test from "node:test";
import assert from "node:assert/strict";

import {
  createComparisonPlan,
  renderComparisonPlanHtml,
} from "../src/core/comparator.js";

function subscriberMatch(oldValue = "32767", newValue = "131071") {
  return {
    status: "matched",
    reason: "manual",
    oldObject: {
      id: "old-subscriber",
      normalizedType: "subscriber-interface",
      normalizedIdentity: "sub-a",
      fields: {
        "dhcp.lease-populate.max-leases": oldValue,
      },
      rawLines: [`lease-populate l2-header ${oldValue}`],
    },
    newObject: {
      id: "new-subscriber",
      normalizedType: "subscriber-interface",
      normalizedIdentity: "sub-a",
      fields: {
        "dhcp.lease-populate.max-leases": newValue,
      },
      rawLines: [`/configure { service ies "100" subscriber-interface sub-a group-interface grp ipv4 dhcp lease-populate max-leases ${newValue} }`],
    },
  };
}

function changedPolicyProfile() {
  return {
    semanticMappings: {
      "subscriber-interface": [
        {
          id: "map-lease-max",
          field: "dhcp.lease-populate.max-leases",
          role: "compare-field",
          policy: "changed",
          oldNodes: [{ value: "32767" }],
          newNodes: [{ value: "131071" }],
        },
      ],
    },
  };
}

test("manual token mapping changed policy treats mapped values as equal", () => {
  const [item] = createComparisonPlan([subscriberMatch()], changedPolicyProfile());
  const summary = item.fieldSummary["dhcp.lease-populate.max-leases"];

  assert.equal(summary.status, "equal");
  assert.equal(summary.semanticEquivalent, true);
  assert.equal(item.policyViolationCount, 0);
  assert.equal(item.lineMatches[0].status, "equal");

  const html = renderComparisonPlanHtml([item]);
  assert.match(html, /semantic-field-policy-badge/);
  assert.match(html, /수동 정책/);
});

test("manual token mapping compare policy keeps changed values different", () => {
  const profile = changedPolicyProfile();
  profile.semanticMappings["subscriber-interface"][0].policy = "compare";

  const [item] = createComparisonPlan([subscriberMatch()], profile);
  const summary = item.fieldSummary["dhcp.lease-populate.max-leases"];

  assert.equal(summary.status, "changed");
  assert.equal(item.policyViolationCount, 1);
});
