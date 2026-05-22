import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultObjectFieldForType,
  defaultSemanticFieldForType,
  formatNormalizeSummary,
  getSemanticMappingNodes,
  inferValueTokenIndex,
  mergeSemanticNodes,
  parseNormalizeMap,
  renderProfileExceptionEditorTable,
  renderSemanticMappingRow,
  semanticMappingCardinality,
} from "../src/core/profileEditor.js";

test("profile editor helpers keep default fields and normalize map behavior", () => {
  assert.equal(defaultObjectFieldForType("bgp"), "neighbor");
  assert.equal(defaultSemanticFieldForType("static-route"), "route");
  assert.deepEqual(parseNormalizeMap("no shutdown => enabled\nadmin-state disable => disabled"), {
    "no shutdown": "enabled",
    "admin-state disable": "disabled",
  });
  assert.equal(formatNormalizeSummary({ remove: ["exit"], map: { "no shutdown": "enabled" } }), "remove: exit; map: no shutdown -> enabled");
});

test("profile editor semantic mapping helpers preserve node compatibility", () => {
  const first = { lineIndex: 0, tokenIndex: 1, valueTokenIndex: 2, selectedToken: "neighbor", value: "192.0.2.1" };
  const duplicate = { ...first };
  const next = { lineIndex: 0, tokenIndex: 3, valueTokenIndex: 4, selectedToken: "group", value: "ACCESS" };
  const merged = mergeSemanticNodes([first], [duplicate, next]);

  assert.equal(merged.length, 2);
  assert.equal(semanticMappingCardinality([first], [first, next]), "1:N");
  assert.equal(inferValueTokenIndex(["neighbor", "192.0.2.1"], 0, "neighbor"), 1);
  assert.deepEqual(getSemanticMappingNodes({ oldNodes: [first] }, "old"), [first]);
});

test("profile editor render helpers keep existing markup contracts", () => {
  const row = renderSemanticMappingRow({
    field: "neighbor",
    role: "object-key",
    cardinality: "1:1",
    oldNodes: [{ value: "192.0.2.1" }],
    newNodes: [{ value: "192.0.2.1" }],
  }, 0);
  const table = renderProfileExceptionEditorTable({
    objectType: "bgp",
    exceptions: [{
      id: "ex-1",
      scope: "profile",
      reasonKo: "테스트",
      target: { objectType: "bgp", fieldPath: "state", ruleId: "rule", changeType: "added" },
    }],
  });

  assert.match(row, /data-semantic-map-remove="0"/);
  assert.match(row, /neighbor/);
  assert.match(table, /data-profile-exception-remove="ex-1"/);
  assert.match(table, /프로파일 예외/);
});
