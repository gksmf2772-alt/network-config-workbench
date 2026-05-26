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
  renderProfileExceptionOverview,
  renderProfileExceptionRuleGroups,
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

test("profile exception overview lists saved exceptions and exclusions", () => {
  const html = renderProfileExceptionOverview([
    {
      id: "field-exception",
      scope: "profile",
      reasonKo: "state 예외",
      target: { objectType: "bgp", fieldPath: "state", ruleId: "rule", changeType: "added", displayName: "bgp 192.0.2.1" },
    },
    {
      id: "setting-exclusion",
      type: "comparison-exclusion",
      scope: "setting",
      reasonKo: "비교 제외",
      target: { settingType: "static-route", settingKey: "static-route:192.0.2.0/24", matchStatus: "old-only" },
    },
  ]);

  assert.match(html, /예외 1/);
  assert.match(html, /비교 제외 1/);
  assert.match(html, /class="app-button app-button--ghost collapsible-header"/);
  assert.match(html, /data-profile-exception-overview-toggle/);
  assert.match(html, /class="collapsible-icon"/);
  assert.match(html, /class="collapsible-title">저장된 예외\/비교 제외 규칙/);
  assert.match(html, /class="collapsible-summary">비교 실행 전 현재 프로파일에 적용될 규칙을 확인합니다\./);
  assert.match(html, /id="profile-exception-overview-content" class="collapsible-content"/);
  assert.doesNotMatch(html, /profile-exception-overview-summary/);
  assert.match(html, /<details class="profile-exception-rule-group" open>/);
  assert.match(html, /profile-exception-rule-group-head/);
  assert.match(html, /profile-exception-rule-group-body/);
  assert.doesNotMatch(html, /profile-exception-setting-group/);
  assert.doesNotMatch(html, /<details class="profile-exception-setting-group"/);
  assert.match(html, /<div>설정<\/div>/);
  assert.match(html, /<div>규칙 구분<\/div>/);
  assert.doesNotMatch(html, /<div>범위<\/div>/);
  assert.doesNotMatch(html, /<div>설정 종류<\/div>/);
  assert.match(html, /전체 설정/);
  assert.match(html, /라인\/항목 예외/);
  assert.match(html, /객체 비교 제외/);
  assert.match(html, /data-profile-exception-overview-remove="field-exception"/);
  assert.match(html, /data-profile-exception-overview-remove="setting-exclusion"/);
  assert.match(html, /static-route:192\.0\.2\.0\/24/);
});

test("profile exception overview renders one table per setting type", () => {
  const html = renderProfileExceptionOverview([
    {
      id: "bgp-profile-exception",
      scope: "profile",
      target: { objectType: "bgp", fieldPath: "admin-state", ruleId: "rule", changeType: "added", displayName: "## to-Dobong ## · 112.188.30.19" },
    },
    {
      id: "bgp-setting-exclusion",
      type: "comparison-exclusion",
      scope: "setting",
      target: { settingType: "bgp", settingKey: "61.78.43.28", matchStatus: "old-only" },
    },
  ]);

  assert.match(html, /<details class="profile-exception-rule-group" open>/);
  assert.match(html, /<strong>bgp<\/strong>/);
  assert.match(html, /## to-Dobong ## · 112\.188\.30\.19/);
  assert.match(html, /61\.78\.43\.28/);
  assert.equal((html.match(/class="profile-exception-overview-table"/g) || []).length, 1);
  assert.equal((html.match(/<div>설정<\/div>/g) || []).length, 1);
  assert.equal((html.match(/<div>규칙 구분<\/div>/g) || []).length, 1);
  assert.doesNotMatch(html, /<details class="profile-exception-setting-group"/);
  assert.doesNotMatch(html, /<section class="profile-exception-setting-group"/);
});

test("profile exception grouped rules can use summary tab removal action", () => {
  const html = renderProfileExceptionRuleGroups([
    {
      id: "setting-exclusion",
      type: "comparison-exclusion",
      scope: "setting",
      target: { settingType: "static-route", settingKey: "static-route:192.0.2.0/24", matchStatus: "old-only" },
    },
  ], {
    actionAttribute: "data-remove-exception",
    actionLabel: "auto",
  });

  assert.match(html, /data-remove-exception="setting-exclusion"/);
  assert.match(html, /비교 제외 해제/);
  assert.match(html, /객체 비교 제외/);
});
