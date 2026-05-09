const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const appPath = path.join(root, "app.js");
const code = fs.readFileSync(appPath, "utf8").replace(/init\(\);\s*$/, "");

function createElement() {
  const element = {
    addEventListener() {},
    querySelector() { return createElement(); },
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {} },
    closest() { return element; },
    style: {},
    dataset: {},
    setAttribute() {},
    getBoundingClientRect() { return { width: 320, height: 180, left: 0, top: 0, right: 320, bottom: 180 }; },
    textContent: "",
    innerHTML: "",
    value: "",
    checked: true,
  };
  return element;
}

const elements = new Map();
function querySelector(selector) {
  if (!elements.has(selector)) elements.set(selector, createElement());
  return elements.get(selector);
}

const sandbox = {
  console,
  document: { querySelector, querySelectorAll() { return []; } },
  window: { addEventListener() {}, requestAnimationFrame(fn) { return fn(); }, CSS: { escape(value) { return String(value); } }, setTimeout },
  requestAnimationFrame(fn) { return fn(); },
  indexedDB: null,
  localStorage: { getItem() { return null; }, setItem() {} },
  Blob: function Blob() {},
  URL: { createObjectURL() { return ""; }, revokeObjectURL() {} },
  setTimeout,
  clearTimeout,
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const result = JSON.parse(vm.runInContext(`
  const profile = createDefaultProfile();
  const options = {
    vendor: "nokia",
    normalizeSpacing: true,
    sortObjects: false,
    ignoreComments: true,
    ignoreGenerated: true,
    selectedObjects: ["static-route"],
    profile,
    filter: "",
    resultFilter: "all",
  };
  const oldText = [
    "static-route-entry 112.174.176.73/32",
    "    next-hop 112.174.180.82",
    "    description \\"Skylife DCS Ulsan-MCE073 Lo0\\"",
    "    tag 701",
    "    no shutdown",
    "exit",
  ].join("\\n");
  const newText = [
    "route 112.174.176.73/32 route-type unicast {",
    "    next-hop \\"112.174.180.82\\" {",
    "        admin-state enable",
    "        description \\"## Skylife DCS Ulsan-MCE073 Lo0 ##\\"",
    "        tag 700",
    "    }",
    "}",
  ].join("\\n");
  selectors.oldInput.value = oldText;
  selectors.newInput.value = newText;
  const oldObjects = parseConfig(oldText, options, "old");
  const newObjects = parseConfig(newText, options, "new");
  const report = compareObjects(oldObjects, newObjects, options);
  const diffRows = buildDiffRows(oldText, newText, options);
  JSON.stringify({
    oldObject: oldObjects[0],
    newObject: newObjects[0],
    reportItems: report.items,
    diffRows: diffRows.map((row) => ({
      oldText: row.oldRow && row.oldRow.text.trim(),
      newText: row.newRow && row.newRow.text.trim(),
      oldField: row.oldRow && row.oldRow.semanticField,
      newField: row.newRow && row.newRow.semanticField,
      oldState: row.oldState,
      newState: row.newState,
      oldHighlights: row.oldRow && row.oldRow.highlights,
      newHighlights: row.newRow && row.newRow.highlights,
    })),
  });
`, sandbox));

assert.strictEqual(result.oldObject.name, "112.174.176.73/32");
assert.strictEqual(result.newObject.name, "112.174.176.73/32");
assert.strictEqual(result.oldObject.key, "static-route:112.174.176.73/32");
assert.strictEqual(result.newObject.key, "static-route:112.174.176.73/32");
assert.strictEqual(result.oldObject.canonicalFields.route, "112.174.176.73/32");
assert.strictEqual(result.newObject.canonicalFields.route, "112.174.176.73/32");
assert.ok(!result.reportItems.some((item) => item.type === "missing" || item.type === "added"));
assert.ok(result.reportItems.some((item) => item.type === "changed" && item.message.includes("tag")));

assert.ok(result.diffRows.some((row) => row.oldField === "route" && row.newField === "route"));
assert.ok(result.diffRows.some((row) => row.oldField === "description" && row.newField === "description"));
assert.ok(result.diffRows.some((row) => row.oldField === "next-hop" && row.newField === "next-hop"));
assert.ok(result.diffRows.some((row) => row.oldField === "tag" && row.newField === "tag"));
assert.ok(result.diffRows.some((row) => row.oldField === "state" || row.newField === "state"));
assert.ok(result.diffRows.some((row) => row.oldText === "exit"));

const oneLineResult = JSON.parse(vm.runInContext(`
(() => {
  const profile2 = createDefaultProfile();
  const options2 = {
    vendor: "nokia",
    normalizeSpacing: true,
    sortObjects: false,
    ignoreComments: true,
    ignoreGenerated: true,
    selectedObjects: ["static-route"],
    profile: profile2,
    filter: "",
    resultFilter: "all",
  };
  const oldText = [
    "static-route-entry 10.10.10.0/24",
    "    description \\"CMP-TEST-SAME\\"",
    "    next-hop 192.0.2.1",
    "        tag 100",
    "        no shutdown",
    "    exit",
    "exit",
  ].join("\\n");
  const newText = [
    "/configure { router \\"Base\\" static-routes route 10.10.10.0/24 route-type unicast next-hop 192.0.2.1 admin-state disable }",
    "/configure { router \\"Base\\" static-routes route 10.10.10.0/24 route-type unicast next-hop 192.0.2.1 description \\"CMP-TEST-SAME\\" }",
    "/configure { router \\"Base\\" static-routes route 10.10.10.0/24 route-type unicast next-hop 192.0.2.1 tag 100 }",
  ].join("\\n");
  selectors.oldInput.value = oldText;
  selectors.newInput.value = newText;
  const oldObjects = parseConfig(oldText, options2, "old");
  const newObjects = parseConfig(newText, options2, "new");
  const report = compareObjects(oldObjects, newObjects, options2);
  return JSON.stringify({
    oldCount: oldObjects.length,
    newCount: newObjects.length,
    newLineCount: newObjects[0].lines.length,
    oldFields: oldObjects[0].canonicalFields,
    newFields: newObjects[0].canonicalFields,
    items: report.items.map((item) => ({ type: item.type, message: item.message })),
    diffRows: report.diffRows.map((row) => ({
      oldText: row.oldRow && row.oldRow.text.trim(),
      newText: row.newRow && row.newRow.text.trim(),
      oldField: row.oldRow && row.oldRow.semanticField,
      newField: row.newRow && row.newRow.semanticField,
      oldState: row.oldState,
      newState: row.newState,
      oldHighlights: row.oldRow && row.oldRow.highlights,
      newHighlights: row.newRow && row.newRow.highlights,
    })),
  });
})()
`, sandbox));

assert.strictEqual(oneLineResult.oldCount, 1);
assert.strictEqual(oneLineResult.newCount, 1);
assert.strictEqual(oneLineResult.newLineCount, 3);
assert.strictEqual(oneLineResult.newFields.route, "10.10.10.0/24");
assert.strictEqual(oneLineResult.newFields["next-hop"], "192.0.2.1");
assert.strictEqual(oneLineResult.newFields.tag, "100");
assert.strictEqual(oneLineResult.newFields.state, "disabled");
assert.ok(oneLineResult.items.some((item) => item.type === "changed" && item.message.includes("state")));
assert.ok(oneLineResult.diffRows.some((row) => row.oldText === "exit" && !row.newText && row.oldState === "missing"));
assert.strictEqual(oneLineResult.diffRows.filter((row) => row.newText).length, 3);
assert.ok(oneLineResult.diffRows.some((row) => row.oldText === "no shutdown"));
const adminLine = oneLineResult.diffRows.find((row) => row.newText && row.newText.includes("admin-state disable"));
assert.ok(adminLine.newHighlights.some((item) => item.field === "route" && item.token === "10.10.10.0/24"));
assert.ok(adminLine.newHighlights.some((item) => item.field === "next-hop" && item.token === "192.0.2.1"));
assert.ok(adminLine.newHighlights.some((item) => item.field === "state" && item.token === "admin-state"));

const autoLearnResult = JSON.parse(vm.runInContext(`
(() => {
  state.selectedProfileObjectType = "static-route";
  state.profileDraft = createDefaultProfile();
  selectors.profileOldExampleInput.value = [
    "static-route-entry 10.10.10.0/24",
    "    next-hop 192.0.2.1",
  ].join("\\n");
  selectors.profileNewExampleInput.value = [
    "/configure { router \\"Base\\" static-routes route 10.10.10.0/24 route-type unicast next-hop 192.0.2.1 admin-state disable }",
    "/configure { router \\"Base\\" static-routes route 10.10.10.0/24 route-type unicast next-hop 192.0.2.1 description \\"CMP-TEST-SAME\\" }",
    "/configure { router \\"Base\\" static-routes route 10.10.10.0/24 route-type unicast next-hop 192.0.2.1 tag 100 }",
  ].join("\\n");
  const oldCandidates = collectAutoSemanticCandidates(selectors.profileOldExampleInput.value, "static-route", "old");
  const newCandidates = collectAutoSemanticCandidates(selectors.profileNewExampleInput.value, "static-route", "new");
  const routeNew = newCandidates.filter((item) => item.field === "route" && item.sample === "10.10.10.0/24");
  const hopNew = newCandidates.filter((item) => item.field === "next-hop" && item.sample === "192.0.2.1");
  upsertSemanticMappingGroup(
    "static-route",
    "route",
    "object-key",
    [candidateToMappingSelector(oldCandidates.find((item) => item.field === "route"))],
    routeNew.map(candidateToMappingSelector),
  );
  upsertSemanticMappingGroup(
    "static-route",
    "route",
    "object-key",
    [candidateToMappingSelector(oldCandidates.find((item) => item.field === "route"))],
    [candidateToMappingSelector(routeNew[0])],
  );
  return JSON.stringify({
    routeNewCount: routeNew.length,
    hopNewCount: hopNew.length,
    mapping: state.profileDraft.semanticMappings["static-route"][0],
  });
})()
`, sandbox));

assert.strictEqual(autoLearnResult.routeNewCount, 3);
assert.strictEqual(autoLearnResult.hopNewCount, 3);
assert.strictEqual(autoLearnResult.mapping.oldNodes.length, 1);
assert.strictEqual(autoLearnResult.mapping.newNodes.length, 3);
assert.strictEqual(autoLearnResult.mapping.cardinality, "1:N");

const pendingMappingResult = JSON.parse(vm.runInContext(`
(() => {
  state.selectedProfileObjectType = "static-route";
  state.profileDraft = createDefaultProfile();
  showSemanticMappingConfirm({
    type: "static-route",
    field: "route",
    role: "object-key",
    policy: "compare",
    oldNodes: [{ lineIndex: 0, tokenIndex: 1, selectedToken: "10.10.10.0/24", value: "10.10.10.0/24" }],
    newNodes: [{ lineIndex: 0, tokenIndex: 6, selectedToken: "10.10.10.0/24", value: "10.10.10.0/24" }],
  });
  return JSON.stringify({
    pending: Boolean(state.pendingSemanticMapping),
    savedCount: state.profileDraft.semanticMappings["static-route"].length,
  });
})()
`, sandbox));

assert.strictEqual(pendingMappingResult.pending, true);
assert.strictEqual(pendingMappingResult.savedCount, 0);

const profileRuleResult = JSON.parse(vm.runInContext(`
(() => {
  const profile = normalizeProfile({
    lineMappings: { bgp: [{ oldText: "neighbor 1.1.1.1", newText: "neighbor \\"1.1.1.1\\" {" }] },
    contextMappings: { "static-route": [{ oldText: "tag 701", newText: "tag 700", label: "tag-policy" }] },
    fieldMappings: { "static-route": [{ oldField: "static-route-entry", newField: "route" }] },
    lineRules: { bgp: [{ source: "old", text: "authentication-key", action: "required-field", message: "authentication key missing" }] },
  });
  return JSON.stringify({
    lineMapping: profile.lineMappings.bgp[0],
    contextMapping: profile.contextMappings["static-route"][0],
    fieldMapping: profile.fieldMappings["static-route"][0],
    lineRule: profile.lineRules.bgp[0],
  });
})()
`, sandbox));

assert.deepStrictEqual(profileRuleResult.lineMapping, {
  oldText: "neighbor 1.1.1.1",
  newText: 'neighbor "1.1.1.1" {',
});
assert.deepStrictEqual(profileRuleResult.contextMapping, {
  oldText: "tag 701",
  newText: "tag 700",
  label: "tag-policy",
});
assert.deepStrictEqual(profileRuleResult.fieldMapping, {
  oldField: "static-route-entry",
  newField: "route",
});
assert.deepStrictEqual(profileRuleResult.lineRule, {
  source: "old",
  text: "authentication-key",
  action: "required-field",
  message: "authentication key missing",
});

const multiObjectResult = JSON.parse(vm.runInContext(`
(() => {
  const profile = createDefaultProfile();
  const options = {
    vendor: "nokia",
    normalizeSpacing: true,
    sortObjects: false,
    ignoreComments: true,
    ignoreGenerated: true,
    selectedObjects: ["static-route"],
    profile,
    filter: "",
    resultFilter: "all",
  };
  const routes = ["10.10.10.0/24", "10.10.20.0/24", "10.10.30.0/24"];
  const oldText = routes.flatMap((route, index) => [
    \`static-route-entry \${route}\`,
    "    next-hop 192.0.2.1",
    \`    tag \${100 + index}\`,
    "    no shutdown",
    "exit",
  ]).join("\\n");
  const newText = routes.flatMap((route, index) => [
    \`/configure { router "Base" static-routes route \${route} route-type unicast next-hop 192.0.2.1 admin-state enable }\`,
    \`/configure { router "Base" static-routes route \${route} route-type unicast next-hop 192.0.2.1 tag \${100 + index} }\`,
    \`/configure { router "Base" static-routes route \${route} route-type unicast next-hop 192.0.2.1 description "R\${index}" }\`,
  ]).join("\\n");
  selectors.oldInput.value = oldText;
  selectors.newInput.value = newText;
  const oldObjects = parseConfig(oldText, options, "old");
  const newObjects = parseConfig(newText, options, "new");
  const report = compareObjects(oldObjects, newObjects, options);
  return JSON.stringify({
    oldCount: oldObjects.length,
    newCount: newObjects.length,
    routeOccurrenceCount: newObjects.reduce((sum, object) => sum + object.fieldOccurrences.filter((item) => item.field === "route" && item.token.includes("/")).length, 0),
    diffNewLineCount: report.diffRows.filter((row) => row.newRow).length,
    errorItems: report.items.filter((item) => item.type === "syntax").length,
  });
})()
`, sandbox));

assert.strictEqual(multiObjectResult.oldCount, 3);
assert.strictEqual(multiObjectResult.newCount, 3);
assert.strictEqual(multiObjectResult.routeOccurrenceCount, 9);
assert.strictEqual(multiObjectResult.diffNewLineCount, 9);
assert.strictEqual(multiObjectResult.errorItems, 0);

const groupCleanupResult = JSON.parse(vm.runInContext(`
(() => {
  state.selectedProfileObjectType = "static-route";
  state.profileDraft = createDefaultProfile();
  const tokenGroup = { id: "node-001", source: "old", type: "token-group", lineIndex: 4, tokenIndex: 0, tokenIndexes: [0, 1], selectedToken: "no shutdown", text: "no shutdown", field: "state", value: "enabled" };
  state.profileDraft.semanticNodeGroups["static-route"].push(tokenGroup);
  state.profileDraft.semanticMappings["static-route"].push({
    id: "map-001",
    field: "state",
    role: "compare-field",
    oldNodes: [tokenGroup],
    newNodes: [{ id: "node-002", lineIndex: 0, tokenIndex: 10, selectedToken: "admin-state", value: "disabled" }],
    cardinality: "1:1",
  });
  cleanupMappingsForRemovedGroups("static-route", new Set(["node-001"]));
  state.profileDraft.semanticNodeGroups["static-route"] = state.profileDraft.semanticNodeGroups["static-route"].filter((item) => item.id !== "node-001");
  return JSON.stringify({
    nodeGroups: state.profileDraft.semanticNodeGroups["static-route"].length,
    mappings: state.profileDraft.semanticMappings["static-route"].length,
  });
})()
`, sandbox));

assert.strictEqual(groupCleanupResult.nodeGroups, 0);
assert.strictEqual(groupCleanupResult.mappings, 0);

const previewGroupingResult = JSON.parse(vm.runInContext(`
(() => {
  renderProfileEditor = () => {};
  markProfileDirty = () => {};
  setProfileGuide = () => {};
  state.profileDraft = createDefaultProfile();
  state.selectedProfileObjectType = "static-route";
  state.selectedSemanticTokens = {
    old: [],
    new: [
      { id: "new:0:7", source: "new", lineIndex: 0, tokenIndex: 7, token: "admin-state", line: '/configure { router "Base" static-routes route 10.10.10.0/24 route-type unicast next-hop 192.0.2.1 admin-state disable }' },
      { id: "new:0:8", source: "new", lineIndex: 0, tokenIndex: 8, token: "disable", line: '/configure { router "Base" static-routes route 10.10.10.0/24 route-type unicast next-hop 192.0.2.1 admin-state disable }' },
    ],
  };
  state.activeSemanticSelectionSource = "new";
  createTokenGroupFromSelection();
  return JSON.stringify({
    count: state.profileDraft.semanticNodeGroups["static-route"].length,
    source: state.profileDraft.semanticNodeGroups["static-route"][0]?.source,
    field: state.profileDraft.semanticNodeGroups["static-route"][0]?.field,
  });
})()
`, sandbox));

assert.strictEqual(previewGroupingResult.count, 1);
assert.strictEqual(previewGroupingResult.source, "new");
assert.strictEqual(previewGroupingResult.field, "state");

const visualHideResult = JSON.parse(vm.runInContext(`
(() => {
  state.profileDraft = createDefaultProfile();
  const keepExit = shouldHideVisualLine("exit", "port", "old");
  state.profileDraft.normalize.remove = ["exit"];
  const hideExit = shouldHideVisualLine("exit", "port", "old");
  return JSON.stringify({ keepExit, hideExit });
})()
`, sandbox));

assert.strictEqual(visualHideResult.keepExit, false);
assert.strictEqual(visualHideResult.hideExit, true);

console.log("static-route object-key canonicalization passed");
