const objectTypes = ["port", "lag", "interface", "static-route", "pim", "bgp"];
const lineActions = ["same", "added", "ignore", "missing", "required", "required-field"];

const selectors = {
  compareTabBtn: document.querySelector("#compareTabBtn"),
  profilesTabBtn: document.querySelector("#profilesTabBtn"),
  summaryPageTabBtn: document.querySelector("#summaryPageTabBtn"),
  compareTab: document.querySelector("#compareTab"),
  profilesTab: document.querySelector("#profilesTab"),
  summaryTab: document.querySelector("#summaryTab"),
  historySelect: document.querySelector("#historySelect"),
  loadHistoryBtn: document.querySelector("#loadHistoryBtn"),
  saveSessionBtn: document.querySelector("#saveSessionBtn"),
  profileSelect: document.querySelector("#profileSelect"),
  loadProfileBtn: document.querySelector("#loadProfileBtn"),
  normalizeSpacingToggle: document.querySelector("#normalizeSpacingToggle"),
  sortObjectsToggle: document.querySelector("#sortObjectsToggle"),
  autoAlignToggle: document.querySelector("#autoAlignToggle"),
  ignoreCommentsToggle: document.querySelector("#ignoreCommentsToggle"),
  ignoreGeneratedToggle: document.querySelector("#ignoreGeneratedToggle"),
  objectToggles: document.querySelector("#objectToggles"),
  themeSelect: document.querySelector("#themeSelect"),
  fontSelect: document.querySelector("#fontSelect"),
  filterInput: document.querySelector("#filterInput"),
  resultFilterSelect: document.querySelector("#resultFilterSelect"),
  compareStatus: document.querySelector("#compareStatus"),
  lastComparedAt: document.querySelector("#lastComparedAt"),
  oldMeta: document.querySelector("#oldMeta"),
  newMeta: document.querySelector("#newMeta"),
  oldDropZone: document.querySelector("#oldDropZone"),
  newDropZone: document.querySelector("#newDropZone"),
  oldInput: document.querySelector("#oldConfigInput"),
  newInput: document.querySelector("#newConfigInput"),
  oldLineNumbers: document.querySelector("#oldLineNumbers"),
  newLineNumbers: document.querySelector("#newLineNumbers"),
  moveOldUpBtn: document.querySelector("#moveOldUpBtn"),
  moveOldDownBtn: document.querySelector("#moveOldDownBtn"),
  moveNewUpBtn: document.querySelector("#moveNewUpBtn"),
  moveNewDownBtn: document.querySelector("#moveNewDownBtn"),
  restoreOldBtn: document.querySelector("#restoreOldBtn"),
  restoreNewBtn: document.querySelector("#restoreNewBtn"),
  clearOldBtn: document.querySelector("#clearOldBtn"),
  clearNewBtn: document.querySelector("#clearNewBtn"),
  clearAllBtn: document.querySelector("#clearAllBtn"),
  saveOldBtn: document.querySelector("#saveOldBtn"),
  saveNewBtn: document.querySelector("#saveNewBtn"),
  toggleControlsBtn: document.querySelector("#toggleControlsBtn"),
  compareBtn: document.querySelector("#compareBtn"),
  alignBtn: document.querySelector("#alignBtn"),
  exportReportBtn: document.querySelector("#exportReportBtn"),
  summaryTabBtn: document.querySelector("#summaryTabBtn"),
  objectsTabBtn: document.querySelector("#objectsTabBtn"),
  overviewTabBtn: document.querySelector("#overviewTabBtn"),
  summaryResultPanel: document.querySelector("#summaryResultPanel"),
  objectsResultPanel: document.querySelector("#objectsResultPanel"),
  overviewResultPanel: document.querySelector("#overviewResultPanel"),
  overviewReport: document.querySelector("#overviewReport"),
  objectSearchInput: document.querySelector("#objectSearchInput"),
  objectSortSelect: document.querySelector("#objectSortSelect"),
  restoreInitialBtn: document.querySelector("#restoreInitialBtn"),
  summaryCards: document.querySelector("#summaryCards"),
  reportList: document.querySelector("#reportList"),
  objectList: document.querySelector("#objectList"),
  oldDiffPane: document.querySelector("#oldDiffPane"),
  newDiffPane: document.querySelector("#newDiffPane"),
  oldDiffObjectToolbar: document.querySelector("#oldDiffObjectToolbar"),
  newDiffObjectToolbar: document.querySelector("#newDiffObjectToolbar"),
  diffConnectorSvg: document.querySelector("#diffConnectorSvg"),
  profileNameInput: document.querySelector("#profileNameInput"),
  vendorSelect: document.querySelector("#vendorSelect"),
  newProfileBtn: document.querySelector("#newProfileBtn"),
  saveProfileBtn: document.querySelector("#saveProfileBtn"),
  saveProfileAsBtn: document.querySelector("#saveProfileAsBtn"),
  mappingEditor: document.querySelector("#mappingEditor"),
  identityRuleEditor: document.querySelector("#identityRuleEditor"),
  policyEditor: document.querySelector("#policyEditor"),
  normalizeEditor: document.querySelector("#normalizeEditor"),
  semanticRuleEditor: document.querySelector("#semanticRuleEditor"),
  parserRuleEditor: document.querySelector("#parserRuleEditor"),
  profileObjectTypeSelect: document.querySelector("#profileObjectTypeSelect"),
  profileOldExampleInput: document.querySelector("#profileOldExampleInput"),
  profileNewExampleInput: document.querySelector("#profileNewExampleInput"),
  profileOldPreview: document.querySelector("#profileOldPreview"),
  profileNewPreview: document.querySelector("#profileNewPreview"),
  profileExampleConnectorSvg: document.querySelector("#profileExampleConnectorSvg"),
  profileRulePopover: document.querySelector("#profileRulePopover"),
  profileMappingReactRoot: document.querySelector("#profileMappingReactRoot"),
  profileMappingRows: document.querySelector("#profileMappingRows"),
  profileContextMappingRows: document.querySelector("#profileContextMappingRows"),
  profileFieldMappingRows: document.querySelector("#profileFieldMappingRows"),
  profileRuleRows: document.querySelector("#profileRuleRows"),
  profileStatus: document.querySelector("#profileStatus"),
  profileSelectionGuide: document.querySelector("#profileSelectionGuide"),
  profileChangesList: document.querySelector("#profileChangesList"),
  undoProfileBtn: document.querySelector("#undoProfileBtn"),
  rollbackProfileBtn: document.querySelector("#rollbackProfileBtn"),
  savedProfilesList: document.querySelector("#savedProfilesList"),
  deleteProfileBtn: document.querySelector("#deleteProfileBtn"),
  autoLearnRulesBtn: document.querySelector("#autoLearnRulesBtn"),
  addLineMappingBtn: document.querySelector("#addLineMappingBtn"),
  addContextMappingBtn: document.querySelector("#addContextMappingBtn"),
  addFieldMappingBtn: document.querySelector("#addFieldMappingBtn"),
  createTokenGroupBtn: document.querySelector("#createTokenGroupBtn"),
  createLineGroupBtn: document.querySelector("#createLineGroupBtn"),
  addOldLineRuleBtn: document.querySelector("#addOldLineRuleBtn"),
  addNewLineRuleBtn: document.querySelector("#addNewLineRuleBtn"),
};

const vendorRules = {
  nokia: [
    { type: "port", pattern: /^configure port ([\w/-]+)/ },
    { type: "lag", pattern: /^configure lag ([\w/-]+)/ },
    { type: "interface", pattern: /^(?:configure router interface|interface) ["']?([\w./:-]+)["']?/ },
    { type: "interface", pattern: /^configure router [^ ]+ interface ["']?([\w./:-]+)["']?/ },
    { type: "static-route", pattern: /^(?:configure router static-route|static-route) ([\w./:-]+)/ },
    { type: "static-route", pattern: /^static-route-entry ([\w./:-]+)/ },
    { type: "static-route", pattern: /^\/?configure\s+(?:\{\s+)?router\s+"?[^"]+"?\s+static-routes\s+route\s+([\w./:-]+)/ },
    { type: "static-route", pattern: /^configure router [^ ]+ static-routes route ([\w./:-]+)/ },
    { type: "static-route", pattern: /^route\s+"?([^"\s{}]+)"?(?:\s+route-type\b|\s|\{|$)/ },
    { type: "static-route", pattern: /\broute\s+"?(\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2})"?\b/ },
    { type: "pim", pattern: /^(?:configure router pim|pim) ?([\w./:-]*)/ },
    { type: "bgp", pattern: /^neighbor "?([\w./:-]+)"?(?:\s|\{|$)/ },
    { type: "bgp", pattern: /^(?:configure router bgp|router bgp|bgp) ?([\w./:-]*)/ },
  ],
  cisco: [
    { type: "interface", pattern: /^interface ([\w./:-]+)/ },
    { type: "bgp", pattern: /^neighbor ([\w./:-]+)/ },
    { type: "bgp", pattern: /^router bgp ([\w./:-]+)/ },
    { type: "static-route", pattern: /^ip route ([\w./:-]+)/ },
  ],
  juniper: [
    { type: "interface", pattern: /^set interfaces ([\w./:-]+)/ },
    { type: "bgp", pattern: /^set protocols bgp group [\w.-]+ neighbor ([\w./:-]+)/ },
    { type: "bgp", pattern: /^set protocols bgp group ([\w./:-]+)/ },
    { type: "static-route", pattern: /^set routing-options static route ([\w./:-]+)/ },
  ],
};

const state = {
  activeProfileId: null,
  selectedProfileObjectType: "static-route",
  lastReport: null,
  initialConfigSnapshot: null,
  syncingEditorScroll: false,
  syncingDiffScroll: false,
  connectorFrame: null,
  draggingProfileLine: null,
  selectedProfileLineLink: null,
  pendingProfileLineRef: null,
  lastProfileExampleSource: "",
  selectedProfileLibraryId: null,
  compareDirty: false,
  profileChanges: [],
  profileSavedSnapshot: null,
  profileUndoStack: [],
  selectedSemanticTokens: { old: [], new: [] },
  activeSemanticSelectionSource: "",
  draggingProfileToken: null,
  suppressNextPreviewTokenClick: false,
  pendingSemanticMapping: null,
  activeDiffObjectKey: "",
  profileDraft: createDefaultProfile(),
};

const defaultSamples = {
  oldConfig: [
    "static-route-entry 112.174.176.73/32",
    "    next-hop 112.174.180.82",
    '    description "Skylife DCS Ulsan-MCE073 Lo0"',
    "    tag 701",
    "    no shutdown",
    "exit",
  ].join("\n"),
  newConfig: [
    "route 112.174.176.73/32 route-type unicast {",
    '    next-hop "112.174.180.82" {',
    "        admin-state enable",
    '        description "## Skylife DCS Ulsan-MCE073 Lo0 ##"',
    "        tag 700",
    "    }",
    "}",
  ].join("\n"),
};

function createDefaultProfile() {
  return {
    id: null,
    name: "Nokia 기본 검증",
    vendor: "nokia",
    mappings: objectTypes.map((type) => ({ oldType: type, newType: type })),
    objects: createDefaultSemanticObjects(),
    normalize: createDefaultNormalizeRules(),
    rules: { ignore: [], required: [] },
    examples: createDefaultExamples(),
    identityRules: createDefaultIdentityRules(),
    lineMappings: createEmptyRulesByType(),
    contextMappings: createEmptyRulesByType(),
    fieldMappings: createEmptyRulesByType(),
    lineRules: createEmptyRulesByType(),
    validationPolicies: createDefaultValidationPolicies(),
    semanticRules: createDefaultSemanticRules(),
    semanticMappings: Object.fromEntries(objectTypes.map((type) => [type, []])),
    semanticNodeGroups: createEmptyRulesByType(),
    semanticLineGroups: createEmptyRulesByType(),
    parserRules: createDefaultParserRules(),
  };
}

function createEmptyProfile(vendor = state.profileDraft?.vendor || "nokia") {
  return {
    ...createDefaultProfile(),
    id: null,
    name: "새 프로파일",
    vendor,
    semanticMappings: Object.fromEntries(objectTypes.map((type) => [type, []])),
    semanticNodeGroups: createEmptyRulesByType(),
    semanticLineGroups: createEmptyRulesByType(),
  };
}

function createEmptyRulesByType() {
  return Object.fromEntries(objectTypes.map((type) => [type, []]));
}

function createDefaultIdentityRules() {
  return Object.fromEntries(objectTypes.map((type) => [
    type,
    createDefaultIdentityRuleForType(type),
  ]));
}

function createDefaultIdentityRuleForType(type) {
  const rule = { mode: ["port", "lag", "interface"].includes(type) ? "description" : "header", pattern: "" };
  return { old: { ...rule }, new: { ...rule } };
}

function createDefaultSemanticObjects() {
  return {
    port: {
      objectKey: ["port"],
      fields: {
        port: { patterns: ["port {value}", "configure port {value}"] },
        description: { patterns: ['description "{value}"', "description {value}"] },
        "admin-state": { patterns: ["no shutdown -> enabled", "shutdown -> disabled", "admin-state enable -> enabled", "admin-state disable -> disabled"] },
      },
      policies: { port: "presence", description: "compare", "admin-state": "compare" },
    },
    lag: {
      objectKey: ["lag"],
      fields: {
        lag: { patterns: ["lag {value}", "configure lag {value}"] },
        description: { patterns: ['description "{value}"', "description {value}"] },
        "admin-state": { patterns: ["no shutdown -> enabled", "shutdown -> disabled", "admin-state enable -> enabled", "admin-state disable -> disabled"] },
      },
      policies: { lag: "presence", description: "compare", "admin-state": "compare" },
    },
    interface: {
      objectKey: ["interface"],
      fields: {
        interface: { patterns: ['interface "{value}"', "interface {value}", 'configure router interface "{value}"', "configure router interface {value}"] },
        address: { patterns: ["address {value}", "ip address {value}"] },
        description: { patterns: ['description "{value}"', "description {value}"] },
        "admin-state": { patterns: ["no shutdown -> enabled", "shutdown -> disabled", "admin-state enable -> enabled", "admin-state disable -> disabled"] },
      },
      policies: { interface: "presence", address: "compare", description: "compare", "admin-state": "compare" },
    },
    "static-route": {
      objectKey: ["route"],
      fields: {
        route: { patterns: ["static-route-entry {value}", "route {value}", "ip route {value}", "static route {value}", 'static-routes route {value}'] },
        "next-hop": { patterns: ['next-hop "{value}"', "next-hop {value}"] },
        tag: { patterns: ["tag {value}"] },
        state: { patterns: ["no shutdown -> enabled", "shutdown -> disabled", "admin-state enable -> enabled", "admin-state disable -> disabled"] },
        description: { patterns: ['description "{value}"', "description {value}"] },
      },
      policies: { route: "compare", "next-hop": "compare", state: "compare", tag: "compare", description: "ignore" },
    },
    pim: {
      objectKey: ["interface"],
      fields: {
        interface: { patterns: ['interface "{value}"', "interface {value}"] },
        "admin-state": { patterns: ["no shutdown -> enabled", "shutdown -> disabled", "admin-state enable -> enabled", "admin-state disable -> disabled"] },
      },
      policies: { interface: "compare", "admin-state": "compare" },
    },
    bgp: {
      objectKey: ["neighbor"],
      fields: {
        neighbor: { patterns: ['neighbor "{value}"', "neighbor {value}"] },
        "peer-as": { patterns: ["peer-as {value}", "remote-as {value}"] },
        "authentication-key": { patterns: ['authentication-key "{value}"', "authentication-key {value}"] },
        description: { patterns: ['description "{value}"', "description {value}"] },
        group: { patterns: ['group "{value}"', "group {value}"] },
      },
      policies: { neighbor: "compare", "peer-as": "compare", "authentication-key": "presence", description: "ignore" },
    },
  };
}

function createDefaultNormalizeRules() {
  return {
    remove: [],
    map: {
      "no shutdown": "enabled",
      "admin-state enable": "enabled",
      shutdown: "disabled",
      "admin-state disable": "disabled",
    },
  };
}

function createDefaultValidationPolicies() {
  return {
    port: [
      { field: "description", policy: "compare" },
      { field: "admin-state", policy: "compare" },
    ],
    lag: [
      { field: "description", policy: "compare" },
      { field: "admin-state", policy: "compare" },
    ],
    interface: [
      { field: "address", policy: "compare" },
      { field: "description", policy: "compare" },
      { field: "admin-state", policy: "compare" },
    ],
    "static-route": [
      { field: "route", policy: "compare" },
      { field: "next-hop", policy: "compare" },
      { field: "tag", policy: "compare" },
      { field: "state", policy: "compare" },
      { field: "description", policy: "ignore" },
    ],
    pim: [
      { field: "interface", policy: "compare" },
      { field: "admin-state", policy: "compare" },
    ],
    bgp: [
      { field: "neighbor", policy: "compare" },
      { field: "peer-as", policy: "compare" },
      { field: "authentication-key", policy: "presence" },
      { field: "description", policy: "ignore" },
    ],
  };
}

function createDefaultSemanticRules() {
  return Object.fromEntries(objectTypes.map((type) => [type, []]));
}

function createDefaultParserRules() {
  return {
    port: [],
    lag: [],
    interface: [],
    "static-route": [
      {
        pattern: 'configure router "*" static-routes route {route} route-type * next-hop {next-hop} * tag {tag} *',
        objectField: "route",
        message: "MD-CLI static-route 한줄 형식",
      },
    ],
    pim: [],
    bgp: [],
  };
}

function createDefaultExamples() {
  const examples = Object.fromEntries(objectTypes.map((type) => [type, { old: "", new: "" }]));
  examples["static-route"] = {
    old: [
      "static-route-entry 10.10.10.0/24",
      '    description "CMP-TEST-SAME"',
      "    next-hop 192.0.2.1",
      "        tag 100",
      "        no shutdown",
      "    exit",
      "exit",
    ].join("\n"),
    new: [
      "route 10.10.10.0/24 {",
      '    description "CMP-TEST-SAME"',
      "    next-hop 192.0.2.1 {",
      "        tag 100",
      "        admin-state enable",
      "    }",
      "}",
    ].join("\n"),
  };
  return examples;
}

async function init() {
  selectors.oldInput.value = defaultSamples.oldConfig;
  selectors.newInput.value = defaultSamples.newConfig;
  captureInitialConfigSnapshot(true);
  renderObjectToggles();
  renderProfileEditor();
  bindEvents();
  loadUiPreferences();
  updateLineNumbers();
  await refreshHistorySelect();
  await refreshProfileSelect();
  await renderSavedProfiles();
  commitProfileSnapshot();
  showEditMode();
}

function bindEvents() {
  selectors.compareTabBtn.addEventListener("click", () => setActiveTab("compare"));
  selectors.profilesTabBtn.addEventListener("click", () => setActiveTab("profiles"));
  selectors.summaryPageTabBtn?.addEventListener("click", () => setActiveTab("summary"));
  selectors.loadHistoryBtn.addEventListener("click", loadSelectedSession);
  selectors.saveSessionBtn.addEventListener("click", saveSession);
  selectors.loadProfileBtn.addEventListener("click", loadSelectedProfile);
  selectors.deleteProfileBtn.addEventListener("click", deleteSelectedProfile);
  selectors.newProfileBtn?.addEventListener("click", createNewEmptyProfile);
  selectors.saveProfileBtn.addEventListener("click", saveProfile);
  selectors.saveProfileAsBtn?.addEventListener("click", saveProfileAs);
  selectors.toggleControlsBtn.addEventListener("click", toggleCompareControls);
  selectors.compareBtn.addEventListener("click", runCompare);
  selectors.alignBtn.addEventListener("click", alignNewConfigToOldOrder);
  selectors.exportReportBtn.addEventListener("click", exportReport);
  selectors.summaryTabBtn?.addEventListener("click", () => setResultTab("summary"));
  selectors.objectsTabBtn?.addEventListener("click", () => setResultTab("objects"));
  selectors.overviewTabBtn?.addEventListener("click", () => setResultTab("overview"));
  selectors.objectSearchInput?.addEventListener("input", renderObjectNavigator);
  selectors.objectSortSelect?.addEventListener("input", renderObjectNavigator);
  selectors.restoreInitialBtn?.addEventListener("click", restoreInitialConfigSnapshot);
  selectors.restoreOldBtn?.addEventListener("click", () => restoreInitialConfigSnapshot("old"));
  selectors.restoreNewBtn?.addEventListener("click", () => restoreInitialConfigSnapshot("new"));

  selectors.saveOldBtn.addEventListener("click", () => saveTextFile("old-config.txt", selectors.oldInput.value));
  selectors.saveNewBtn.addEventListener("click", () => saveTextFile("new-config.txt", selectors.newInput.value));
  selectors.clearOldBtn.addEventListener("click", () => clearConfigInput("old"));
  selectors.clearNewBtn.addEventListener("click", () => clearConfigInput("new"));
  selectors.clearAllBtn.addEventListener("click", () => clearConfigInput("all"));
  selectors.moveOldUpBtn.addEventListener("click", () => moveSelectedBlock(selectors.oldInput, -1));
  selectors.moveOldDownBtn.addEventListener("click", () => moveSelectedBlock(selectors.oldInput, 1));
  selectors.moveNewUpBtn.addEventListener("click", () => moveSelectedBlock(selectors.newInput, -1));
  selectors.moveNewDownBtn.addEventListener("click", () => moveSelectedBlock(selectors.newInput, 1));
  selectors.undoProfileBtn?.addEventListener("click", undoProfileLastChange);
  selectors.rollbackProfileBtn?.addEventListener("click", rollbackProfileChanges);

  selectors.autoLearnRulesBtn?.addEventListener("click", autoLearnRulesFromExamples);
  selectors.addLineMappingBtn?.addEventListener("click", addManualLineMapping);
  selectors.addContextMappingBtn?.addEventListener("click", addManualContextMapping);
  selectors.addFieldMappingBtn?.addEventListener("click", addManualFieldMapping);
  selectors.createTokenGroupBtn?.addEventListener("click", createTokenGroupFromSelection);
  selectors.createLineGroupBtn?.addEventListener("click", createLineGroupFromSelection);
  selectors.addOldLineRuleBtn?.addEventListener("click", () => addManualLineRule("old"));
  selectors.addNewLineRuleBtn?.addEventListener("click", () => addManualLineRule("new"));

  [selectors.oldInput, selectors.newInput].forEach((input) => {
    input.addEventListener("input", () => {
      captureInitialConfigSnapshot();
      updateLineNumbers();
      markCompareStale();
    });
    input.addEventListener("scroll", syncEditorScroll);
  });
  selectors.oldDiffPane.addEventListener("scroll", syncDiffScroll);
  selectors.newDiffPane.addEventListener("scroll", syncDiffScroll);
  window.addEventListener("pointermove", moveProfileLineDrag);
  window.addEventListener("pointerup", finishProfileLineDrag);
  window.addEventListener("pointermove", moveSemanticPreviewTokenDrag);
  window.addEventListener("pointerup", finishSemanticPreviewTokenDrag);
  selectors.oldDiffPane.addEventListener("dblclick", showEditMode);
  selectors.newDiffPane.addEventListener("dblclick", showEditMode);
  window.addEventListener("resize", scheduleDiffConnectorRender);
  window.addEventListener("resize", scheduleProfileExampleConnectorRender);

  [
    [selectors.profileOldExampleInput, "old"],
    [selectors.profileNewExampleInput, "new"],
  ].forEach(([input, source]) => {
    input.addEventListener("focus", () => {
      state.lastProfileExampleSource = source;
      pushProfileUndoSnapshot(`example-edit:${state.selectedProfileObjectType}`);
    }, { once: false });
    input.addEventListener("input", () => {
      state.lastProfileExampleSource = source;
      saveCurrentProfileExamples();
      renderExamplePreviews();
      markProfileDirty("Example", "수정", state.selectedProfileObjectType);
    });
    ["mouseup", "keyup", "select"].forEach((eventName) => {
      input.addEventListener(eventName, () => {
        state.lastProfileExampleSource = source;
        renderExamplePreviews();
      });
    });
  });

  bindDropZone(selectors.oldDropZone, selectors.oldInput, selectors.oldMeta);
  bindDropZone(selectors.newDropZone, selectors.newInput, selectors.newMeta);

  [
    selectors.normalizeSpacingToggle,
    selectors.sortObjectsToggle,
    selectors.autoAlignToggle,
    selectors.ignoreCommentsToggle,
    selectors.ignoreGeneratedToggle,
    selectors.filterInput,
    selectors.resultFilterSelect,
  ].forEach((control) => control.addEventListener("input", markCompareStale));

  selectors.profileNameInput.addEventListener("focus", () => pushProfileUndoSnapshot("profile-name"));
  selectors.profileNameInput.addEventListener("input", () => {
    state.profileDraft.name = selectors.profileNameInput.value.trim() || "이름 없는 프로파일";
    markProfileDirty("Profile", "수정", "프로파일 이름");
  });
  selectors.vendorSelect.addEventListener("input", () => {
    pushProfileUndoSnapshot("profile-vendor");
    state.profileDraft.vendor = selectors.vendorSelect.value;
    markProfileDirty("Profile", "수정", "벤더");
    markCompareStale();
  });
  selectors.profileObjectTypeSelect.addEventListener("input", () => {
    hideProfileRulePopover();
    saveCurrentProfileExamples();
    state.selectedProfileObjectType = selectors.profileObjectTypeSelect.value;
    renderProfileEditor();
    markCompareStale();
  });
  selectors.themeSelect.addEventListener("input", saveUiPreferences);
  selectors.fontSelect.addEventListener("input", saveUiPreferences);
}

function setActiveTab(tab, options = {}) {
  if (!options.skipConfirm && tab === "compare" && !confirmUnsavedProfileAction("프로파일 변경 후 비교 탭으로 이동")) return false;
  if (!options.skipConfirm && tab === "summary" && !confirmUnsavedProfileAction("프로파일 변경 후 비교 요약 탭으로 이동")) return false;
  hideProfileRulePopover();
  const compare = tab === "compare";
  const profiles = tab === "profiles";
  const summary = tab === "summary";
  selectors.compareTabBtn.classList.toggle("active", compare);
  selectors.profilesTabBtn.classList.toggle("active", profiles);
  selectors.summaryPageTabBtn?.classList.toggle("active", summary);
  selectors.compareTab.classList.toggle("active", compare);
  selectors.profilesTab.classList.toggle("active", profiles);
  selectors.summaryTab?.classList.toggle("active", summary);
  if (summary) renderObjectNavigator();
  return true;
}

function renderObjectToggles() {
  selectors.objectToggles.innerHTML = objectTypes
    .map((type) => `<label><input type="checkbox" data-object-type="${type}" checked />${type}</label>`)
    .join("");
  selectors.objectToggles.querySelectorAll("input").forEach((input) => input.addEventListener("input", markCompareStale));
}

function renderProfileEditor() {
  hideProfileRulePopover();
  ensureProfileExamples(state.profileDraft);
  selectors.profileNameInput.value = state.profileDraft.name;
  selectors.vendorSelect.value = state.profileDraft.vendor;
  selectors.profileObjectTypeSelect.innerHTML = objectTypes
    .map((type) => `<option value="${type}" ${state.selectedProfileObjectType === type ? "selected" : ""}>${type}</option>`)
    .join("");
  const examples = state.profileDraft.examples?.[state.selectedProfileObjectType] || { old: "", new: "" };
  selectors.profileOldExampleInput.value = examples.old || "";
  selectors.profileNewExampleInput.value = examples.new || "";

  selectors.mappingEditor.innerHTML = state.profileDraft.mappings
    .map(
      (mapping, index) => `
        <div class="mapping-row">
          <select data-map-index="${index}" data-map-side="old">
            ${objectTypes.map((type) => `<option value="${type}" ${mapping.oldType === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
          <div class="mapping-arrow">→</div>
          <select data-map-index="${index}" data-map-side="new">
            ${objectTypes.map((type) => `<option value="${type}" ${mapping.newType === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
        </div>
      `,
    )
    .join("");

  selectors.mappingEditor.querySelectorAll("select").forEach((select) => {
    select.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.mapIndex);
      const side = event.target.dataset.mapSide;
      state.profileDraft.mappings[index][side === "old" ? "oldType" : "newType"] = event.target.value;
      markProfileDirty();
      markCompareStale();
    });
  });

  renderIdentityRuleEditor();
  renderParserRuleEditor();
  renderNormalizeEditor();
  renderLineMappings();
  renderContextMappings();
  renderFieldMappings();
  renderSemanticRuleEditor();
  renderPolicyEditor();
  renderLineRules();
  renderProfileChanges();
  renderExamplePreviews();
  renderReactProfileMappingPanel();
}

function renderReactProfileMappingPanel() {
  window.ProfileMappingBridge = createProfileMappingBridge();
  if (typeof window.renderProfileMappingReactPanel === "function") {
    window.renderProfileMappingReactPanel(window.ProfileMappingBridge.getSnapshot(), window.ProfileMappingBridge);
  }
}

function createProfileMappingBridge() {
  return {
    getSnapshot: getProfileMappingSnapshot,
    deleteLineMapping,
    deleteTokenMapping,
    focusLineMapping,
    focusTokenMapping,
    deleteLineGroup: (groupId) => removeSemanticGroup("line", groupId),
    deleteTokenGroup: (groupId) => removeSemanticGroup("token", groupId),
    renameLineGroup,
    selectLineGroup,
    clearFocus: clearProfileMappingFocus,
  };
}

function getProfileMappingSnapshot() {
  const type = state.selectedProfileObjectType;
  const lineMappings = (state.profileDraft.lineMappings?.[type] || []).map((mapping, index) => ({
    id: mapping.id || `line-map-${index}`,
    index,
    kind: inferLineMappingKind(mapping),
    oldLabel: formatLineMappingSide(mapping, "old"),
    newLabel: formatLineMappingSide(mapping, "new"),
    oldRef: mapping.oldRef || null,
    newRef: mapping.newRef || null,
    oldText: mapping.oldText || "",
    newText: mapping.newText || "",
    selected: profileLineRefsEquivalent(mapping.oldRef, state.selectedProfileLineLink?.oldRef)
      && profileLineRefsEquivalent(mapping.newRef, state.selectedProfileLineLink?.newRef),
  }));
  const tokenMappings = (state.profileDraft.semanticMappings?.[type] || []).map((mapping, index) => {
    const oldNodes = getSemanticMappingNodes(mapping, "old");
    const newNodes = getSemanticMappingNodes(mapping, "new");
    return {
      id: mapping.id || mapping.groupId || `token-map-${index}`,
      index,
      kind: "token",
      field: mapping.field || "",
      role: mapping.role || "compare-field",
      cardinality: mapping.cardinality || semanticMappingCardinality(oldNodes, newNodes),
      oldLabel: oldNodes.map(formatSemanticNodeLabel).filter(Boolean).join(", ") || "-",
      newLabel: newNodes.map(formatSemanticNodeLabel).filter(Boolean).join(", ") || "-",
      oldNodes: deepClone(oldNodes),
      newNodes: deepClone(newNodes),
      selected: state.pendingSemanticMapping?.id === mapping.id,
    };
  });
  const lineGroups = (state.profileDraft.semanticLineGroups?.[type] || []).map((group) => ({
    id: group.id,
    source: group.source,
    label: group.lineNumber || group.label || "Group",
    lineNumber: group.lineNumber || group.label || "",
    lineIndexes: group.lineIndexes || [],
    linesLabel: (group.lineIndexes || []).map((lineIndex) => lineIndex + 1).join(", "),
    text: group.text || Object.entries(group.fields || {}).map(([field, value]) => `${field}=${value}`).join(", "),
    mapped: isProfileLineRefMapped(buildProfileGroupRef(group)),
    selected: isProfileLineRefSelected(buildProfileGroupRef(group)),
  }));
  const tokenGroups = (state.profileDraft.semanticNodeGroups?.[type] || []).map((group) => ({
    id: group.id,
    source: group.source,
    field: group.field || "",
    value: group.value || "",
    lineIndex: group.lineIndex,
    tokenIndexes: group.tokenIndexes || [group.tokenIndex].filter((item) => Number.isFinite(Number(item))),
    text: group.text || group.selectedToken || group.value || "",
  }));
  return {
    objectType: type,
    hasReact: Boolean(window.React && window.ReactDOM),
    lineMappings,
    tokenMappings,
    lineGroups,
    tokenGroups,
    selected: {
      pendingLineRef: state.pendingProfileLineRef || null,
      selectedLineLink: state.selectedProfileLineLink || null,
      semanticTokens: {
        old: state.selectedSemanticTokens.old || [],
        new: state.selectedSemanticTokens.new || [],
      },
    },
    counts: {
      lineMappings: lineMappings.length,
      tokenMappings: tokenMappings.length,
      oldLineGroups: lineGroups.filter((group) => group.source === "old").length,
      newLineGroups: lineGroups.filter((group) => group.source === "new").length,
      tokenGroups: tokenGroups.length,
    },
  };
}

function inferLineMappingKind(mapping) {
  const oldKind = mapping.oldRef?.kind || "line";
  const newKind = mapping.newRef?.kind || "line";
  if (oldKind === "group" && newKind === "group") return "group-to-group";
  if (oldKind === "group") return "group-to-line";
  if (newKind === "group") return "line-to-group";
  return "line-to-line";
}

function deleteLineMapping(index) {
  const type = state.selectedProfileObjectType;
  const mappings = state.profileDraft.lineMappings?.[type] || [];
  if (!Number.isInteger(index) || !mappings[index]) return;
  pushProfileUndoSnapshot(`line-map-remove:${index}`);
  mappings.splice(index, 1);
  state.selectedProfileLineLink = null;
  state.pendingProfileLineRef = null;
  renderProfileEditor();
  setProfileGuide("라인 매핑을 삭제했습니다.", "ok");
  markProfileDirty("Line Mapping", "삭제", type);
  markCompareStale();
}

function deleteTokenMapping(index) {
  const type = state.selectedProfileObjectType;
  const mappings = state.profileDraft.semanticMappings?.[type] || [];
  if (!Number.isInteger(index) || !mappings[index]) return;
  pushProfileUndoSnapshot(`semantic-map-remove:${index}`);
  mappings.splice(index, 1);
  state.selectedSemanticTokens = { old: [], new: [] };
  state.activeSemanticSelectionSource = "";
  state.pendingSemanticMapping = null;
  renderProfileEditor();
  setProfileGuide("토큰 매핑을 삭제했습니다.", "ok");
  markProfileDirty("Field Extraction", "삭제", type);
  markCompareStale();
}

function focusLineMapping(index) {
  const mapping = (state.profileDraft.lineMappings?.[state.selectedProfileObjectType] || [])[index];
  if (!mapping) return;
  state.selectedProfileLineLink = {
    oldLineIndex: firstLineIndexFromRef(mapping.oldRef),
    newLineIndex: firstLineIndexFromRef(mapping.newRef),
    oldRef: mapping.oldRef,
    newRef: mapping.newRef,
  };
  state.pendingProfileLineRef = null;
  renderExamplePreviews();
  renderReactProfileMappingPanel();
  setProfileGuide(`라인 매핑 선택: ${formatLineMappingSide(mapping, "old")} ↔ ${formatLineMappingSide(mapping, "new")}`, "info");
}

function focusTokenMapping(index) {
  const mapping = (state.profileDraft.semanticMappings?.[state.selectedProfileObjectType] || [])[index];
  if (!mapping) return;
  const selected = { old: [], new: [] };
  ["old", "new"].forEach((source) => {
    selected[source] = getSemanticMappingNodes(mapping, source).map((node) => ({
      ...node,
      id: `${source}:${Number(node.lineIndex) || 0}:${Number(node.tokenIndex) || 0}`,
      source,
      token: node.selectedToken || node.token || node.value || "",
      line: getExampleLine(source, Number(node.lineIndex) || 0),
    }));
  });
  state.selectedSemanticTokens = selected;
  state.activeSemanticSelectionSource = selected.old.length ? "old" : selected.new.length ? "new" : "";
  state.pendingSemanticMapping = { id: mapping.id || mapping.groupId || `token-map-${index}` };
  state.selectedProfileLineLink = null;
  renderExamplePreviews();
  renderReactProfileMappingPanel();
  setProfileGuide(`토큰 매핑 선택: ${mapping.field || "field"} (${mapping.role || "compare-field"})`, "info");
}

function renameLineGroup(groupId, nextName) {
  const type = state.selectedProfileObjectType;
  const group = (state.profileDraft.semanticLineGroups?.[type] || []).find((item) => item.id === groupId);
  const value = canonicalizeGroupLineNumber(nextName);
  if (!group || !value || value === group.lineNumber) return;
  pushProfileUndoSnapshot(`line-group-rename:${groupId}`);
  group.lineNumber = value;
  group.label = value;
  renderProfileEditor();
  setProfileGuide(`라인 그룹 이름 변경: ${value}`, "ok");
  markProfileDirty("Line Group", "수정", value);
  markCompareStale();
}

function selectLineGroup(groupId) {
  const group = findSemanticLineGroupById(groupId);
  if (!group) return;
  applyProfileLineRefSelection(buildProfileGroupRef(group));
}

function clearProfileMappingFocus() {
  state.selectedProfileLineLink = null;
  state.pendingProfileLineRef = null;
  state.selectedSemanticTokens = { old: [], new: [] };
  state.activeSemanticSelectionSource = "";
  state.pendingSemanticMapping = null;
  renderExamplePreviews();
  renderReactProfileMappingPanel();
  setProfileGuide("매핑 선택을 해제했습니다.", "info");
}

function renderParserRuleEditor() {
  const type = state.selectedProfileObjectType;
  const rules = state.profileDraft.parserRules?.[type] || [];
  const semanticFields = state.profileDraft.objects?.[type]?.fields || {};
  selectors.parserRuleEditor.innerHTML = `
    <div class="parser-rule-guide">
      <div class="small-note">현재 객체: ${escapeHtml(type)}. 아래 Field Extraction 패턴이 우선 적용됩니다. 기존 파서 규칙은 호환용이며, 새 규칙은 가능한 한 필드 패턴으로 옮기세요.</div>
        <button type="button" id="draftParserRuleBtn">Field Extraction 후보 만들기</button>
      <button type="button" id="addParserRuleBtn">파서 규칙 추가</button>
    </div>
    <div class="semantic-object-summary">
      ${Object.entries(semanticFields).map(([field, rule]) => `
        <div class="semantic-object-field">
          <strong>${escapeHtml(field)}</strong>
          <span>${escapeHtml((rule.patterns || []).join(" | "))}</span>
        </div>
      `).join("")}
      <div class="semantic-object-field">
        <strong>normalize</strong>
        <span>${escapeHtml(formatNormalizeSummary(state.profileDraft.normalize))}</span>
      </div>
    </div>
    <div class="parser-rule-rows">
      ${rules.length ? rules.map(renderParserRuleRow).join("") : `<div class="small-note">학습된 파서 규칙이 없습니다.</div>`}
    </div>
  `;

  selectors.parserRuleEditor.querySelector("#addParserRuleBtn").addEventListener("click", () => {
    state.profileDraft.parserRules[type].push({ pattern: "", objectField: defaultObjectFieldForType(type), message: "" });
    renderProfileEditor();
    markProfileDirty("Field Extraction", "추가", type);
    markCompareStale();
  });

  selectors.parserRuleEditor.querySelector("#draftParserRuleBtn").addEventListener("click", () => {
    const source = getSelectedText(selectors.profileOldExampleInput) ? "old" : "new";
    const selected = getSelectedText(selectors.profileOldExampleInput) || getSelectedText(selectors.profileNewExampleInput);
    if (!selected || selected.includes("\n")) {
      setProfileGuide("파서 규칙 초안 실패: 예제에서 한 줄만 선택하세요.", "error");
      return;
    }
    state.profileDraft.parserRules[type].push({ source, pattern: selected, objectField: defaultObjectFieldForType(type), message: `${source} 선택 라인 기반 후보` });
    renderProfileEditor();
    setProfileGuide("Field Extraction 후보가 추가되었습니다. 값 위치를 {route}, {next-hop}, {tag} 같은 필드로 바꾸세요.", "ok");
    markProfileDirty("Field Extraction", "추가", type);
    markCompareStale();
  });

  selectors.parserRuleEditor.querySelectorAll("[data-parser-index]").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.parserIndex);
      const key = input.dataset.parserKey;
      state.profileDraft.parserRules[type][index][key] = input.value.trim();
      markProfileDirty("Field Extraction", "수정", key);
      markCompareStale();
    });
  });

  selectors.parserRuleEditor.querySelectorAll("[data-parser-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.parserRemove);
      state.profileDraft.parserRules[type].splice(index, 1);
      renderProfileEditor();
      markProfileDirty("Field Extraction", "삭제", type);
      markCompareStale();
    });
  });
}

function formatNormalizeSummary(normalizeRules = {}) {
  const remove = (normalizeRules.remove || []).join(", ");
  const mapped = Object.entries(normalizeRules.map || {}).map(([from, to]) => `${from} -> ${to}`).join(" | ");
  return [`remove: ${remove || "-"}`, `map: ${mapped || "-"}`].join("; ");
}

function renderSemanticRuleEditor() {
  const type = state.selectedProfileObjectType;
  const rules = state.profileDraft.semanticRules?.[type] || [];
  const mappings = state.profileDraft.semanticMappings?.[type] || [];
  const tokenGroups = state.profileDraft.semanticNodeGroups?.[type] || [];
  selectors.semanticRuleEditor.innerHTML = `
    <div class="semantic-rule-toolbar">
      <input id="semanticFieldInput" value="${escapeHtml(defaultSemanticFieldForType(type))}" placeholder="의미 필드: route, next-hop, tag, neighbor" />
      <select id="semanticRoleSelect">
        <option value="object-key">객체 매칭 기준</option>
        <option value="compare-field">비교 필드</option>
      </select>
      <button type="button" id="linkSemanticRuleBtn">좌우 선택 연결</button>
      <button type="button" id="linkSemanticTokensBtn">선택 토큰 매핑</button>
      <button type="button" id="addOldSemanticRuleBtn">기존 선택 등록</button>
      <button type="button" id="addNewSemanticRuleBtn">신규 선택 등록</button>
    </div>
    <div class="small-note">예제에서 값 토큰 하나를 선택한 뒤 의미 필드로 등록하세요. 도구가 선택 위치 주변 토큰으로 같은 형식의 값을 찾습니다.</div>
    <div class="semantic-rule-rows">
      ${tokenGroups.length || mappings.length ? `<div class="small-note">토큰 그룹과 토큰 매핑은 위 프로파일 매핑 스튜디오에서 관리합니다. 현재 토큰 그룹 ${tokenGroups.length}개, 토큰 매핑 ${mappings.length}개.</div>` : ""}
      ${rules.length ? rules.map(renderSemanticRuleRow).join("") : `<div class="small-note">학습된 의미 필드가 없습니다.</div>`}
    </div>
  `;

  selectors.semanticRuleEditor.querySelector("#linkSemanticRuleBtn").addEventListener("click", addLinkedSemanticRulesFromSelection);
  selectors.semanticRuleEditor.querySelector("#linkSemanticTokensBtn").addEventListener("click", addSemanticMappingFromPreviewTokens);
  selectors.semanticRuleEditor.querySelector("#addOldSemanticRuleBtn").addEventListener("click", () => addSemanticRuleFromSelection("old"));
  selectors.semanticRuleEditor.querySelector("#addNewSemanticRuleBtn").addEventListener("click", () => addSemanticRuleFromSelection("new"));

  selectors.semanticRuleEditor.querySelectorAll("[data-semantic-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.semanticRemove);
      pushProfileUndoSnapshot(`semantic-rule-remove:${index}`);
      state.profileDraft.semanticRules[type].splice(index, 1);
      renderProfileEditor();
      markProfileDirty("Object Match", "삭제", type);
      markCompareStale();
    });
  });

  selectors.semanticRuleEditor.querySelectorAll(".semantic-group-row").forEach((row) => {
    row.addEventListener("mouseenter", () => setProfilePreviewHoverState(row.dataset.groupId || ""));
    row.addEventListener("mouseleave", clearProfilePreviewHoverState);
  });
}

function renderSemanticMappingRow(row, index) {
  const oldNodes = getSemanticMappingNodes(row, "old");
  const newNodes = getSemanticMappingNodes(row, "new");
  return `
    <div class="semantic-rule-row semantic-mapping-row">
      <div class="profile-rule-line">${escapeHtml(row.field || "")}</div>
      <div class="small-note">${escapeHtml(row.role || "compare-field")} / ${escapeHtml(row.cardinality || "1:1")}</div>
      <div class="small-note">기존 ${oldNodes.length}개 ↔ 신규 ${newNodes.length}개</div>
      <div class="profile-rule-line">${escapeHtml(oldNodes.map(formatSemanticNodeLabel).join(", "))} → ${escapeHtml(newNodes.map(formatSemanticNodeLabel).join(", "))}</div>
      <button type="button" data-semantic-map-remove="${index}">삭제</button>
    </div>
  `;
}

function getSemanticMappingNodes(mapping, source) {
  if (!mapping) return [];
  if (source === "old") return mapping.oldNodes || mapping.oldSelectors || [];
  return mapping.newNodes || mapping.newSelectors || [];
}

function formatSemanticNodeLabel(node) {
  return node.value || node.selectedToken || node.token || "";
}

function addSemanticMappingFromPreviewTokens() {
  saveCurrentProfileExamples();
  const type = state.selectedProfileObjectType;
  const field = canonicalizeComparableLine(selectors.semanticRuleEditor.querySelector("#semanticFieldInput").value || "");
  const role = selectors.semanticRuleEditor.querySelector("#semanticRoleSelect").value;
  const oldTokens = state.selectedSemanticTokens.old || [];
  const newTokens = state.selectedSemanticTokens.new || [];
  if (!field || !oldTokens.length || !newTokens.length) {
    setProfileGuide("토큰 매핑 실패: 의미 필드명과 기존/신규 토큰을 선택하세요.", "error");
    return;
  }
  showSemanticMappingConfirm({
    type,
    field,
    role,
    policy: "compare",
    oldNodes: oldTokens.map((item) => buildSemanticTokenSelector(item, field)),
    newNodes: newTokens.map((item) => buildSemanticTokenSelector(item, field)),
  });
  state.selectedSemanticTokens = { old: [], new: [] };
  state.activeSemanticSelectionSource = "";
  renderExamplePreviews();
  setProfileGuide(`semantic mapping '${field}'를 확인한 뒤 저장하세요.`, "info");
}

function upsertSemanticMappingGroup(type, field, role, oldNodes, newNodes) {
  const mappings = state.profileDraft.semanticMappings[type];
  const target = findCompatibleSemanticMapping(mappings, field, role, oldNodes, newNodes);
  if (target) {
    target.oldNodes = mergeSemanticNodes(getSemanticMappingNodes(target, "old"), oldNodes);
    target.newNodes = mergeSemanticNodes(getSemanticMappingNodes(target, "new"), newNodes);
    delete target.oldSelectors;
    delete target.newSelectors;
    target.cardinality = semanticMappingCardinality(target.oldNodes, target.newNodes);
    return target;
  }

  const groupId = createId();
  const mapping = {
    id: groupId,
    field,
    role,
    oldNodes: mergeSemanticNodes([], oldNodes),
    newNodes: mergeSemanticNodes([], newNodes),
    cardinality: semanticMappingCardinality(oldNodes, newNodes),
    groupId,
  };
  mappings.push(mapping);
  return mapping;
}

function findCompatibleSemanticMapping(mappings, field, role, oldNodes, newNodes) {
  const oldValues = new Set(oldNodes.map((node) => canonicalizeComparableLine(node.value || node.selectedToken || node.token)));
  const newValues = new Set(newNodes.map((node) => canonicalizeComparableLine(node.value || node.selectedToken || node.token)));
  return mappings.find((mapping) => {
    if (mapping.field !== field || mapping.role !== role) return false;
    const existingOld = getSemanticMappingNodes(mapping, "old").map((node) => canonicalizeComparableLine(node.value || node.selectedToken || node.token));
    const existingNew = getSemanticMappingNodes(mapping, "new").map((node) => canonicalizeComparableLine(node.value || node.selectedToken || node.token));
    return existingOld.some((value) => oldValues.has(value)) || existingNew.some((value) => newValues.has(value));
  });
}

function mergeSemanticNodes(current, incoming) {
  const result = [...current];
  const seen = new Set(result.map(semanticNodeKey));
  incoming.forEach((node) => {
    const key = semanticNodeKey(node);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(node);
  });
  return result;
}

function semanticNodeKey(node) {
  return [
    node.lineIndex,
    node.tokenIndex,
    node.valueTokenIndex,
    canonicalizeComparableLine(node.selectedToken || node.token || ""),
    canonicalizeComparableLine(node.value || ""),
  ].join(":");
}

function semanticMappingCardinality(oldNodes, newNodes) {
  if (oldNodes.length === 1 && newNodes.length > 1) return "1:N";
  if (oldNodes.length > 1 && newNodes.length === 1) return "N:1";
  if (oldNodes.length === 1 && newNodes.length === 1) return "1:1";
  return "N:N";
}

function showSemanticMappingConfirm(mapping) {
  state.pendingSemanticMapping = {
    ...mapping,
    cardinality: semanticMappingCardinality(mapping.oldNodes || [], mapping.newNodes || []),
  };
  renderSemanticMappingConfirmPopover();
}

function renderSemanticMappingConfirmPopover() {
  const popover = selectors.profileRulePopover;
  const pending = state.pendingSemanticMapping;
  if (!popover || !pending) return;
  const grid = selectors.profileOldPreview.closest(".profile-example-grid");
  const rect = grid.getBoundingClientRect();
  popover.innerHTML = `
    <strong>매핑 규칙 확인</strong>
    <label>field <input id="pendingMappingField" value="${escapeHtml(pending.field || "")}" /></label>
    <label>role
      <select id="pendingMappingRole">
        <option value="object-key" ${pending.role === "object-key" ? "selected" : ""}>object-key</option>
        <option value="compare-field" ${pending.role !== "object-key" ? "selected" : ""}>compare-field</option>
      </select>
    </label>
    <label>policy
      <select id="pendingMappingPolicy">
        ${[
          ["compare", "값 동일 비교"],
          ["presence", "존재 여부"],
          ["required", "신규 필수"],
          ["conditional", "기존 있으면 신규 필수"],
          ["ignore", "비교 제외"],
          ["normalize", "정규화 후 비교"],
        ].map(([value, label]) => `<option value="${value}" ${pending.policy === value ? "selected" : ""}>${label}</option>`).join("")}
      </select>
    </label>
    <label>cardinality
      <select id="pendingMappingCardinality">
        ${["1:1", "1:N", "N:1", "N:N"].map((value) => `<option value="${value}" ${pending.cardinality === value ? "selected" : ""}>${value}</option>`).join("")}
      </select>
    </label>
    <button type="button" id="confirmSemanticMappingBtn">규칙 생성</button>
    <button type="button" id="cancelSemanticMappingBtn">취소</button>
  `;
  popover.style.left = `${Math.max(12, Math.min(rect.width - 300, rect.width / 2 - 150))}px`;
  popover.style.top = "16px";
  popover.hidden = false;
  popover.classList.add("active", "mapping-confirm");
  popover.querySelector("#confirmSemanticMappingBtn").addEventListener("click", confirmPendingSemanticMapping);
  popover.querySelector("#cancelSemanticMappingBtn").addEventListener("click", cancelPendingSemanticMapping);
}

function confirmPendingSemanticMapping() {
  const pending = state.pendingSemanticMapping;
  if (!pending) return;
  const popover = selectors.profileRulePopover;
  const field = canonicalizeComparableLine(popover.querySelector("#pendingMappingField")?.value || pending.field);
  const role = popover.querySelector("#pendingMappingRole")?.value || pending.role;
  const policy = popover.querySelector("#pendingMappingPolicy")?.value || pending.policy || "compare";
  const cardinality = popover.querySelector("#pendingMappingCardinality")?.value || pending.cardinality;
  if (!field) {
    setProfileGuide("매핑 저장 실패: field 이름이 필요합니다.", "error");
    return;
  }
  if (!state.profileDraft.semanticMappings[pending.type]) state.profileDraft.semanticMappings[pending.type] = [];
  pushProfileUndoSnapshot(`mapping:${field}`);
  const mapping = upsertSemanticMappingGroup(pending.type, field, role, pending.oldNodes || [], pending.newNodes || []);
  mapping.cardinality = cardinality;
  applyMappingPolicy(pending.type, field, policy);
  state.pendingSemanticMapping = null;
  hideProfileRulePopover();
  renderProfileEditor();
  setProfileGuide(`매핑 규칙 '${field}'가 저장되었습니다.`, "ok");
  markProfileDirty("Field Mapping", "추가", field);
  markCompareStale();
}

function cancelPendingSemanticMapping() {
  state.pendingSemanticMapping = null;
  hideProfileRulePopover();
  renderExamplePreviews();
  setProfileGuide("임시 매핑을 취소했습니다.", "info");
}

function applyMappingPolicy(type, field, policy) {
  if (!["compare", "presence", "required", "conditional", "ignore", "normalize"].includes(policy)) return;
  const profilePolicy = policy === "normalize" ? "compare" : policy;
  const policies = state.profileDraft.validationPolicies[type] || [];
  const existing = policies.find((item) => canonicalizeComparableLine(item.field) === field);
  if (existing) existing.policy = profilePolicy;
  else policies.push({ field, policy: profilePolicy, oldValues: "", newValue: "", message: "" });
  state.profileDraft.validationPolicies[type] = policies;
  if (policy === "normalize" && state.profileDraft.objects?.[type]?.policies) {
    state.profileDraft.objects[type].policies[field] = "normalize";
  }
}

function buildSemanticTokenSelector(item, field) {
  if (item.type === "token-group" || item.type === "line-group") {
    return {
      ...item,
      selectedToken: canonicalizeComparableLine(item.selectedToken || item.text || item.value || field),
      value: canonicalizeComparableLine(item.value || ""),
      valueTokenIndex: Number.isFinite(item.valueTokenIndex) ? item.valueTokenIndex : Number.isFinite(item.tokenIndex) ? item.tokenIndex : 0,
      tokenIndex: Number.isFinite(item.tokenIndex) ? item.tokenIndex : 0,
    };
  }
  const tokens = getSemanticLineTokens(item.line);
  const selectedToken = canonicalizeComparableLine(item.token);
  const tokenIndex = Number.isFinite(item.tokenIndex) ? item.tokenIndex : tokens.findIndex((token) => canonicalizeComparableLine(token) === selectedToken);
  const explicitTokenOnly = item.explicitTokenOnly === true;
  const valueTokenIndex = explicitTokenOnly ? tokenIndex : inferValueTokenIndex(tokens, tokenIndex, field);
  const value = explicitTokenOnly
    ? selectedToken
    : extractKnownFieldValue(item.line, field) || canonicalizeComparableLine(tokens[valueTokenIndex] || selectedToken);
  return {
    lineIndex: item.lineIndex,
    tokenIndex,
    selectedToken,
    valueTokenIndex,
    value,
    explicitTokenOnly,
    anchorBefore: tokens.slice(Math.max(0, tokenIndex - 2), tokenIndex).join(" "),
    anchorAfter: tokens.slice(tokenIndex + 1, tokenIndex + 3).join(" "),
  };
}

function createTokenGroupFromSelection() {
  const type = state.selectedProfileObjectType;
  const source = state.activeSemanticSelectionSource && state.selectedSemanticTokens[state.activeSemanticSelectionSource]?.length
    ? state.activeSemanticSelectionSource
    : state.selectedSemanticTokens.old.length && !state.selectedSemanticTokens.new.length
      ? "old"
      : state.selectedSemanticTokens.new.length && !state.selectedSemanticTokens.old.length
        ? "new"
        : "";
  const selected = source ? state.selectedSemanticTokens[source] : [];
  if (!source || selected.length < 2) {
    setProfileGuide("토큰 그룹 실패: 같은 줄에서 묶을 토큰을 2개 이상 선택하세요.", "error");
    return;
  }
  const lineIndex = selected[0].lineIndex;
  if (!selected.every((item) => item.lineIndex === lineIndex)) {
    setProfileGuide("토큰 그룹 실패: 하나의 줄 안에서만 토큰을 묶을 수 있습니다.", "error");
    return;
  }
  const ordered = [...selected].sort((left, right) => left.tokenIndex - right.tokenIndex);
  const text = ordered.map((item) => item.token).join(" ");
  const field = inferGroupedField(text);
  const value = inferGroupedValue(text, field);
  pushProfileUndoSnapshot(`token-group:${source}`);
  const group = {
    id: createId(),
    source,
    type: "token-group",
    lineIndex,
    tokenIndex: ordered[0].tokenIndex,
    tokenIndexes: ordered.map((item) => item.tokenIndex),
    selectedToken: text,
    text,
    field,
    value,
  };
  if (!state.profileDraft.semanticNodeGroups[type]) state.profileDraft.semanticNodeGroups[type] = [];
  state.profileDraft.semanticNodeGroups[type].push(group);
  state.selectedSemanticTokens[source] = ordered;
  state.activeSemanticSelectionSource = source;
  renderProfileEditor();
  setProfileGuide(`토큰 그룹 '${text}'를 ${field}=${value}로 묶었습니다. 반대쪽 토큰과 연결 후 규칙을 확정하세요.`, "ok");
  markProfileDirty("Semantic Node", "추가", field);
}

function createLineGroupFromSelection() {
  saveCurrentProfileExamples();
  const type = state.selectedProfileObjectType;
  const oldText = getSelectedText(selectors.profileOldExampleInput);
  const newText = getSelectedText(selectors.profileNewExampleInput);
  const focusedSource = document.activeElement === selectors.profileNewExampleInput
    ? "new"
    : document.activeElement === selectors.profileOldExampleInput
      ? "old"
      : state.lastProfileExampleSource || "";
  const source = focusedSource === "new" && newText
    ? "new"
    : focusedSource === "old" && oldText
      ? "old"
      : oldText
        ? "old"
        : newText
          ? "new"
          : "";
  const selectedText = source === "old" ? oldText : newText;
  if (!source || !selectedText) {
    setProfileGuide("라인 그룹 실패: 기존 또는 신규 예제에서 묶을 라인을 선택하세요.", "error");
    return;
  }
  const textarea = source === "old" ? selectors.profileOldExampleInput : selectors.profileNewExampleInput;
  const lineIndexes = getSelectedLineIndexes(textarea);
  const fields = splitComparableBlock(selectedText).reduce((result, line) => ({ ...result, ...extractFieldsFromLine(line, state.profileDraft, type) }), {});
  pushProfileUndoSnapshot(`line-group:${source}`);
  const group = {
    id: createId(),
    source,
    type: "line-group",
    lineNumber: nextSemanticLineGroupNumber(type),
    lineIndexes,
    text: normalizeSelectedBlock(selectedText),
    field: Object.keys(fields)[0] || defaultSemanticFieldForType(type),
    value: Object.values(fields)[0] || "",
    fields,
  };
  if (!state.profileDraft.semanticLineGroups[type]) state.profileDraft.semanticLineGroups[type] = [];
  state.profileDraft.semanticLineGroups[type].push(group);
  state.selectedSemanticTokens[source] = [group];
  state.activeSemanticSelectionSource = source;
  renderProfileEditor();
  setProfileGuide(`라인 그룹 ${group.lineNumber}(${lineIndexes.map((item) => item + 1).join(", ")})을 만들었습니다. 그룹 번호 또는 라인 번호로 매핑하세요.`, "ok");
  markProfileDirty("Line Group", "추가", group.field);
}

function nextSemanticLineGroupNumber(type) {
  const groups = state.profileDraft.semanticLineGroups?.[type] || [];
  const used = new Set(groups.map((group) => String(group.lineNumber || "").toUpperCase()));
  for (let index = 1; index < 10000; index += 1) {
    const candidate = `G${index}`;
    if (!used.has(candidate)) return candidate;
  }
  return `G${Date.now()}`;
}

function inferGroupedField(text) {
  const normalized = canonicalizeComparableLine(text);
  if (/\bno\s+shutdown\b|\bshutdown\b|\badmin-state\b/.test(normalized)) return "state";
  return inferSemanticFieldName(normalized) || "field";
}

function inferGroupedValue(text, field) {
  const normalized = canonicalizeComparableLine(text);
  const mapped = state.profileDraft.normalize?.map?.[normalized];
  if (mapped) return mapped;
  if (field === "state") {
    if (/\bno\s+shutdown\b|\badmin-state\s+enable\b/.test(normalized)) return "enabled";
    if (/^shutdown$|\badmin-state\s+disable\b/.test(normalized)) return "disabled";
  }
  return extractFieldValue(normalized, field) || normalized;
}

function inferValueTokenIndex(tokens, tokenIndex, field) {
  if (field === "state" || field === "admin-state") return tokenIndex;
  const selected = canonicalizeComparableLine(tokens[tokenIndex] || "");
  if (selected === field || ["route", "static-route-entry", "next-hop", "tag", "description", "neighbor"].includes(selected)) {
    return Math.min(tokens.length - 1, tokenIndex + 1);
  }
  return tokenIndex;
}

function renderSemanticRuleRow(row, index) {
  return `
    <div class="semantic-rule-row">
      <div class="profile-rule-line">${escapeHtml(row.field || "")}</div>
      <div class="small-note">${row.role === "object-key" ? "객체 기준" : "비교 필드"}</div>
      <div class="small-note">${row.source === "new" ? "신규" : "기존"}${row.groupId ? " 연결" : ""}</div>
      <div class="profile-rule-line">${escapeHtml(row.selector?.anchorBefore || "")} → ${escapeHtml(row.sample || "")}</div>
      <button type="button" data-semantic-remove="${index}">삭제</button>
    </div>
  `;
}

function addSemanticRuleFromSelection(source) {
  saveCurrentProfileExamples();
  const type = state.selectedProfileObjectType;
  const textarea = source === "old" ? selectors.profileOldExampleInput : selectors.profileNewExampleInput;
  const selected = getSelectedText(textarea);
  if (!selected || selected.includes("\n") || selected.split(/\s+/).length > 1) {
    setProfileGuide("의미 필드 등록 실패: 예제에서 IP, tag 값처럼 값 토큰 하나만 선택하세요.", "error");
    return;
  }

  const field = canonicalizeComparableLine(selectors.semanticRuleEditor.querySelector("#semanticFieldInput").value || "");
  const role = selectors.semanticRuleEditor.querySelector("#semanticRoleSelect").value;
  if (!field) {
    setProfileGuide("의미 필드 등록 실패: 의미 필드명을 입력하세요.", "error");
    return;
  }
  const line = getSelectionLine(textarea);
  const resolved = resolveSemanticSelection(line, selected, field);
  if (!resolved) {
    setProfileGuide("의미 필드 등록 실패: 선택 토큰 주변에서 값을 찾지 못했습니다.", "error");
    return;
  }

  state.profileDraft.semanticRules[type].push({
    source,
    field,
    role,
    valueType: inferSemanticValueType(resolved.value),
    selector: resolved.selector,
    sample: canonicalizeComparableLine(resolved.value),
  });
  renderProfileEditor();
  setProfileGuide(`의미 필드 '${field}'가 등록되었습니다.`, "ok");
  markProfileDirty(role === "object-key" ? "Object Match" : "Field Extraction", "추가", field);
  markCompareStale();
}

function addLinkedSemanticRulesFromSelection() {
  saveCurrentProfileExamples();
  const type = state.selectedProfileObjectType;
  const oldRule = buildSemanticRuleFromTextarea("old", selectors.profileOldExampleInput);
  const newRule = buildSemanticRuleFromTextarea("new", selectors.profileNewExampleInput);
  if (!oldRule || !newRule) {
    setProfileGuide("좌우 연결 실패: 기존/신규 예제에서 값 토큰을 각각 하나씩 선택하세요.", "error");
    return;
  }

  const groupId = createId();
  state.profileDraft.semanticRules[type].push({ ...oldRule, groupId });
  state.profileDraft.semanticRules[type].push({ ...newRule, groupId });
  renderProfileEditor();
  setProfileGuide(`좌우 선택이 의미 필드 '${oldRule.field}'로 연결되었습니다.`, "ok");
  markProfileDirty("Field Extraction", "추가", oldRule.field);
  markCompareStale();
}

function buildSemanticRuleFromTextarea(source, textarea) {
  const type = state.selectedProfileObjectType;
  const selected = getSelectedText(textarea);
  if (!selected || selected.includes("\n") || selected.split(/\s+/).length > 1) return null;
  const line = getSelectionLine(textarea);
  const field = canonicalizeComparableLine(selectors.semanticRuleEditor.querySelector("#semanticFieldInput").value || "");
  const role = selectors.semanticRuleEditor.querySelector("#semanticRoleSelect").value;
  if (!field) return null;
  const resolved = resolveSemanticSelection(line, selected, field);
  if (!resolved) return null;
  return {
    source,
    field,
    role,
    valueType: inferSemanticValueType(resolved.value),
    selector: resolved.selector,
    sample: canonicalizeComparableLine(resolved.value),
    objectType: type,
  };
}

function defaultSemanticFieldForType(type) {
  return {
    "static-route": "route",
    bgp: "neighbor",
    interface: "interface",
    port: "port",
    lag: "lag",
    pim: "interface",
  }[type] || "field";
}

function renderParserRuleRow(row, index) {
  return `
    <div class="parser-rule-row">
      <input data-parser-index="${index}" data-parser-key="pattern" value="${escapeHtml(row.pattern || "")}" placeholder='예: configure router "*" static-routes route {route} route-type * next-hop {next-hop} * tag {tag} *' />
      <input data-parser-index="${index}" data-parser-key="objectField" value="${escapeHtml(row.objectField || "")}" placeholder="객체 ID 필드: route" />
      <input data-parser-index="${index}" data-parser-key="message" value="${escapeHtml(row.message || "")}" placeholder="설명(선택)" />
      <button type="button" data-parser-remove="${index}">삭제</button>
    </div>
  `;
}

function defaultObjectFieldForType(type) {
  return {
    "static-route": "route",
    bgp: "neighbor",
    interface: "interface",
    port: "port",
    lag: "lag",
    pim: "interface",
  }[type] || "name";
}

function renderPolicyEditor() {
  const type = state.selectedProfileObjectType;
  const policies = state.profileDraft.validationPolicies?.[type] || [];
  selectors.policyEditor.innerHTML = `
    <div class="policy-toolbar">
      <button type="button" id="addPolicyRowBtn">필드 정책 추가</button>
      <div class="small-note">일반 검증은 여기서 고르고, 예외나 특수 문법만 고급 규칙을 사용하세요.</div>
    </div>
    <div class="policy-rows">
      ${policies.length ? policies.map(renderPolicyRow).join("") : `<div class="small-note">정책이 없습니다. 필드 정책을 추가하세요.</div>`}
    </div>
  `;

  selectors.policyEditor.querySelector("#addPolicyRowBtn").addEventListener("click", () => {
    state.profileDraft.validationPolicies[type].push({ field: "", policy: "compare", oldValues: "", newValue: "", message: "" });
    renderProfileEditor();
    markProfileDirty("Compare Policy", "추가", type);
    markCompareStale();
  });

  selectors.policyEditor.querySelectorAll("[data-policy-index]").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.policyIndex);
      const key = input.dataset.policyKey;
      state.profileDraft.validationPolicies[type][index][key] = input.value.trim();
      markProfileDirty("Compare Policy", "수정", key);
      markCompareStale();
    });
  });

  selectors.policyEditor.querySelectorAll("[data-policy-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.policyRemove);
      state.profileDraft.validationPolicies[type].splice(index, 1);
      renderProfileEditor();
      markProfileDirty("Compare Policy", "삭제", type);
      markCompareStale();
    });
  });
}

function renderPolicyRow(row, index) {
  return `
    <div class="policy-row">
      <input data-policy-index="${index}" data-policy-key="field" value="${escapeHtml(row.field || "")}" placeholder="필드명: tag, authentication-key" />
      <select data-policy-index="${index}" data-policy-key="policy">
        ${[
          ["compare", "값 동일"],
          ["required", "신규 필수"],
          ["presence", "존재 여부 동일"],
          ["conditional", "기존에 있으면 신규 필수"],
          ["ignore", "무시"],
          ["exception", "예외 허용"],
        ].map(([value, label]) => `<option value="${value}" ${row.policy === value ? "selected" : ""}>${label}</option>`).join("")}
      </select>
      <input data-policy-index="${index}" data-policy-key="oldValues" value="${escapeHtml(row.oldValues || "")}" placeholder="기존 허용값: 700,701" />
      <input data-policy-index="${index}" data-policy-key="newValue" value="${escapeHtml(row.newValue || "")}" placeholder="신규 기준값: 700" />
      <input data-policy-index="${index}" data-policy-key="message" value="${escapeHtml(row.message || "")}" placeholder="요약 로그(선택)" />
      <button type="button" data-policy-remove="${index}">삭제</button>
    </div>
  `;
}

function renderNormalizeEditor() {
  const normalize = state.profileDraft.normalize || { remove: [], map: {} };
  selectors.normalizeEditor.innerHTML = `
    <div class="normalize-row">
      <label>
        비교/visual 제외 라인
        <input id="normalizeRemoveInput" value="${escapeHtml((normalize.remove || []).join(", "))}" placeholder="예: exit, create" />
      </label>
      <label>
        값 정규화 매핑
        <textarea id="normalizeMapInput" spellcheck="false" rows="4" placeholder="no shutdown => enabled&#10;admin-state enable => enabled">${escapeHtml(Object.entries(normalize.map || {}).map(([from, to]) => `${from} => ${to}`).join("\n"))}</textarea>
      </label>
    </div>
    <div class="small-note">여기에 넣은 remove 라인만 비교/visual diff에서 제외됩니다. 코드에서 exit/create를 자동 제거하지 않습니다.</div>
  `;

  selectors.normalizeEditor.querySelector("#normalizeRemoveInput").addEventListener("input", (event) => {
    state.profileDraft.normalize.remove = event.target.value
      .split(",")
      .map(canonicalizeComparableLine)
      .filter(Boolean);
    renderExamplePreviews();
    markProfileDirty("Normalize", "수정", "remove");
    markCompareStale();
  });

  selectors.normalizeEditor.querySelector("#normalizeMapInput").addEventListener("input", (event) => {
    state.profileDraft.normalize.map = parseNormalizeMap(event.target.value);
    markProfileDirty("Normalize", "수정", "map");
    markCompareStale();
  });
}

function parseNormalizeMap(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.split(/\s*=>\s*/))
    .filter((parts) => parts.length === 2 && parts[0].trim() && parts[1].trim())
    .reduce((map, [from, to]) => {
      map[canonicalizeComparableLine(from)] = canonicalizeComparableLine(to);
      return map;
    }, {});
}

function renderIdentityRuleEditor() {
  const type = state.selectedProfileObjectType;
  const oldRule = getIdentityRuleForSource(state.profileDraft.identityRules?.[type], "old", type);
  const newRule = getIdentityRuleForSource(state.profileDraft.identityRules?.[type], "new", type);
  selectors.identityRuleEditor.innerHTML = `
    <div class="identity-rule-split">
      ${renderIdentityRuleSide("old", oldRule)}
      ${renderIdentityRuleSide("new", newRule)}
    </div>
    <div class="small-note">기존 단일 Identity Rule 데이터는 old/new 양쪽에 같은 값으로 자동 적용됩니다. 신규 저장부터는 old/new를 분리해 저장합니다.</div>
  `;

  selectors.identityRuleEditor.querySelectorAll("[data-identity-side]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const side = event.target.dataset.identitySide;
      const key = event.target.dataset.identityKey;
      if (!["old", "new"].includes(side) || !["mode", "pattern"].includes(key)) return;
      const current = state.profileDraft.identityRules[type] || createDefaultIdentityRuleForType(type);
      const normalized = normalizeIdentityRuleBySide(current, type);
      normalized[side][key] = key === "pattern" ? event.target.value.trim() : event.target.value;
      state.profileDraft.identityRules[type] = normalized;
      markProfileDirty("Identity Rule", "수정", `${type}:${side}`);
      markCompareStale();
    });
  });
}

function renderIdentityRuleSide(side, rule) {
  const label = side === "old" ? "Old identity rule" : "New identity rule";
  return `
    <div class="identity-rule-card">
      <strong>${label}</strong>
      <label>
        기준
        <select data-identity-side="${side}" data-identity-key="mode">
          <option value="header" ${rule.mode === "header" ? "selected" : ""}>객체 시작 라인/header</option>
          <option value="description" ${rule.mode === "description" ? "selected" : ""}>description 값</option>
          <option value="regex" ${rule.mode === "regex" ? "selected" : ""}>사용자 정규식</option>
        </select>
      </label>
      <label>
        추출 정규식
        <input data-identity-side="${side}" data-identity-key="pattern" value="${escapeHtml(rule.pattern || "")}" placeholder='예: /configure { router "Base" bgp neighbor 또는 ^neighbor\\s+([^\\s{]+)' />
      </label>
    </div>
  `;
}

function renderLineMappings() {
  const mappings = state.profileDraft.lineMappings[state.selectedProfileObjectType] || [];
  const lineGroups = state.profileDraft.semanticLineGroups?.[state.selectedProfileObjectType] || [];
  selectors.profileMappingRows.innerHTML = mappings.length
    ? mappings
        .map(
          (row, index) => `
            <div class="profile-mapping-row">
              <div class="profile-rule-line">${escapeHtml(formatLineMappingSide(row, "old"))}</div>
              <div class="small-note">라인 매핑</div>
              <div class="profile-rule-line">${escapeHtml(formatLineMappingSide(row, "new"))}</div>
              <button type="button" data-line-map-index="${index}">삭제</button>
            </div>
          `,
        )
        .join("")
    : `<div class="small-note">라인 매핑이 없습니다. preview의 라인 번호 또는 그룹 번호를 기존/신규 순서로 클릭하거나 드래그하세요.</div>`;
  selectors.profileMappingRows.insertAdjacentHTML("beforeend", `
    ${lineGroups.length ? `<div class="small-note">라인 그룹</div>${lineGroups.map(renderLineGroupRow).join("")}` : ""}
  `);

  selectors.profileMappingRows.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.lineGroupId) {
        removeSemanticGroup("line", button.dataset.lineGroupId);
        return;
      }
      const index = Number(button.dataset.lineMapIndex);
      if (!Number.isFinite(index)) return;
      pushProfileUndoSnapshot(`line-map-remove:${index}`);
      state.profileDraft.lineMappings[state.selectedProfileObjectType].splice(index, 1);
      renderProfileEditor();
      markProfileDirty();
      markCompareStale();
    });
  });
  selectors.profileMappingRows.querySelectorAll("input[data-line-group-name]").forEach((input) => {
    input.addEventListener("change", () => {
      const groupId = input.dataset.lineGroupName;
      const group = (state.profileDraft.semanticLineGroups?.[state.selectedProfileObjectType] || []).find((item) => item.id === groupId);
      if (!group) return;
      const value = canonicalizeGroupLineNumber(input.value);
      if (!value) {
        input.value = group.lineNumber || "";
        return;
      }
      pushProfileUndoSnapshot(`line-group-rename:${groupId}`);
      group.lineNumber = value;
      group.label = value;
      renderProfileEditor();
      markProfileDirty("Line Group", "수정", value);
      markCompareStale();
    });
  });
  selectors.profileMappingRows.querySelectorAll(".semantic-group-row").forEach((row) => {
    row.addEventListener("mouseenter", () => setProfilePreviewHoverState(row.dataset.groupId || ""));
    row.addEventListener("mouseleave", clearProfilePreviewHoverState);
  });
}

function canonicalizeGroupLineNumber(value) {
  return String(value || "").trim().replace(/\s+/g, "-").slice(0, 24);
}

function formatLineMappingSide(row, source) {
  const ref = source === "old" ? row.oldRef : row.newRef;
  const text = source === "old" ? row.oldText : row.newText;
  if (ref?.kind === "group") return `${ref.label || ref.lineNumber || "Group"} (${source}, lines ${(ref.lineIndexes || []).map((item) => item + 1).join(", ")})`;
  if (ref?.kind === "line") return `L${ref.lineNumber || (ref.lineIndex + 1)} (${source})`;
  return text || "-";
}

function renderTokenGroupRow(group) {
  return `
    <div class="profile-mapping-row semantic-group-row ${semanticColorClassForId(group.id)}" data-group-id="${escapeHtml(group.id)}">
      <div class="profile-rule-line">${escapeHtml(group.text || group.selectedToken || "")}</div>
      <div class="small-note">${escapeHtml(group.source)} token-group</div>
      <div class="profile-rule-line">${escapeHtml(group.field)} = ${escapeHtml(group.value)}</div>
      <button type="button" data-token-group-id="${escapeHtml(group.id)}">토큰 묶기 해제</button>
    </div>
  `;
}

function renderLineGroupRow(group) {
  return `
    <div class="profile-mapping-row semantic-group-row ${semanticColorClassForId(group.id)}" data-group-id="${escapeHtml(group.id)}">
      <div>
        <input data-line-group-name="${escapeHtml(group.id)}" value="${escapeHtml(group.lineNumber || group.label || "")}" aria-label="라인 그룹 번호" />
        <div class="small-note">lines ${(group.lineIndexes || []).map((item) => item + 1).join(", ")}</div>
      </div>
      <div class="small-note">${escapeHtml(group.source)} line-group</div>
      <div class="profile-rule-line">${escapeHtml(group.text || Object.entries(group.fields || {}).map(([field, value]) => `${field}=${value}`).join(", "))}</div>
      <button type="button" data-line-group-id="${escapeHtml(group.id)}">라인 그룹 해제</button>
    </div>
  `;
}

function removeSemanticGroup(kind, groupId) {
  const type = state.selectedProfileObjectType;
  const groupsKey = kind === "token" ? "semanticNodeGroups" : "semanticLineGroups";
  const groups = state.profileDraft[groupsKey]?.[type] || [];
  const group = groups.find((item) => item.id === groupId);
  if (!group) return;
  const linked = findMappingsReferencingGroup(type, groupId);
  const linkedLineMappings = findLineMappingsReferencingGroup(type, groupId);
  if ((linked.length || linkedLineMappings.length) && !(window.confirm?.("이 그룹에 연결된 매핑도 삭제됩니다. 계속하시겠습니까?") ?? true)) return;
  pushProfileUndoSnapshot(`${kind}-group-remove:${groupId}`);
  state.profileDraft[groupsKey][type] = groups.filter((item) => item.id !== groupId);
  cleanupMappingsForRemovedGroups(type, new Set([groupId]));
  cleanupLineMappingsForRemovedGroups(type, new Set([groupId]));
  state.selectedSemanticTokens = {
    old: (state.selectedSemanticTokens.old || []).filter((item) => item.id !== groupId),
    new: (state.selectedSemanticTokens.new || []).filter((item) => item.id !== groupId),
  };
  renderProfileEditor();
  setProfileGuide(kind === "token" ? "토큰 묶기를 해제했습니다." : "라인 그룹을 해제했습니다.", "ok");
  markProfileDirty(kind === "token" ? "Semantic Node" : "Line Group", "삭제", group.field || groupId);
  markCompareStale();
}

function cleanupLineMappingsForRemovedGroups(type, removedIds) {
  state.profileDraft.lineMappings[type] = (state.profileDraft.lineMappings?.[type] || []).filter((mapping) =>
    !removedIds.has(mapping.oldRef?.groupId) && !removedIds.has(mapping.newRef?.groupId),
  );
}

function findLineMappingsReferencingGroup(type, groupId) {
  return (state.profileDraft.lineMappings?.[type] || []).filter((mapping) =>
    mapping.oldRef?.groupId === groupId || mapping.newRef?.groupId === groupId,
  );
}

function findMappingsReferencingGroup(type, groupId) {
  return (state.profileDraft.semanticMappings?.[type] || []).filter((mapping) =>
    [...getSemanticMappingNodes(mapping, "old"), ...getSemanticMappingNodes(mapping, "new")].some((node) => node.id === groupId),
  );
}

function cleanupMappingsForRemovedGroups(type, removedIds) {
  state.profileDraft.semanticMappings[type] = (state.profileDraft.semanticMappings?.[type] || []).filter((mapping) => {
    const oldNodes = getSemanticMappingNodes(mapping, "old").filter((node) => !removedIds.has(node.id));
    const newNodes = getSemanticMappingNodes(mapping, "new").filter((node) => !removedIds.has(node.id));
    if (!oldNodes.length || !newNodes.length) return false;
    mapping.oldNodes = oldNodes;
    mapping.newNodes = newNodes;
    mapping.cardinality = semanticMappingCardinality(oldNodes, newNodes);
    return true;
  });
}

function renderContextMappings() {
  const mappings = state.profileDraft.contextMappings?.[state.selectedProfileObjectType] || [];
  selectors.profileContextMappingRows.innerHTML = mappings.length
    ? mappings
        .map(
          (row, index) => `
            <div class="profile-mapping-row context-mapping-row">
              <div class="profile-rule-line">${escapeHtml(row.oldText)}</div>
              <div>
                <div class="small-note">컨텍스트 그룹</div>
                <input data-context-map-label="${index}" value="${escapeHtml(row.label || "")}" placeholder="그룹명(선택)" />
              </div>
              <div class="profile-rule-line">${escapeHtml(row.newText)}</div>
              <button type="button" data-context-map-index="${index}">삭제</button>
            </div>
          `,
        )
        .join("")
    : `<div class="small-note">컨텍스트 그룹 매핑이 없습니다. 1:N 또는 N:1로 바뀐 기능 블록은 양쪽 예제에서 드래그해 그룹으로 묶으세요.</div>`;

  selectors.profileContextMappingRows.querySelectorAll("input[data-context-map-label]").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.contextMapLabel);
      pushProfileUndoSnapshot(`context-label:${index}`);
      state.profileDraft.contextMappings[state.selectedProfileObjectType][index].label = input.value.trim();
      renderExamplePreviews();
      markProfileDirty();
      markCompareStale();
    });
  });

  selectors.profileContextMappingRows.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.contextMapIndex);
      pushProfileUndoSnapshot(`context-remove:${index}`);
      state.profileDraft.contextMappings[state.selectedProfileObjectType].splice(index, 1);
      renderProfileEditor();
      markProfileDirty();
      markCompareStale();
    });
  });
}

function renderFieldMappings() {
  const mappings = state.profileDraft.fieldMappings?.[state.selectedProfileObjectType] || [];
  selectors.profileFieldMappingRows.innerHTML = mappings.length
    ? mappings
        .map(
          (row, index) => `
            <div class="profile-mapping-row">
              <div class="profile-rule-line">${escapeHtml(row.oldField)}</div>
              <div class="small-note">필드 매핑</div>
              <div class="profile-rule-line">${escapeHtml(row.newField)}</div>
              <button type="button" data-field-map-index="${index}">삭제</button>
            </div>
          `,
        )
        .join("")
    : `<div class="small-note">필드 매핑이 없습니다. 양쪽 예제 라인에서 명령어/필드명만 선택하세요.</div>`;

  selectors.profileFieldMappingRows.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.fieldMapIndex);
      pushProfileUndoSnapshot(`field-remove:${index}`);
      state.profileDraft.fieldMappings[state.selectedProfileObjectType].splice(index, 1);
      renderProfileEditor();
      markProfileDirty();
      markCompareStale();
    });
  });
}

function renderLineRules() {
  const rules = state.profileDraft.lineRules[state.selectedProfileObjectType] || [];
  selectors.profileRuleRows.innerHTML = rules.length
    ? rules
        .map(
          (row, index) => `
            <div class="profile-rule-row">
              <div class="profile-rule-line">${escapeHtml(row.text)}</div>
              <div class="small-note">${row.source === "new" ? "신규" : "기존"}</div>
              <select data-line-rule-index="${index}">
                ${lineActions.map((action) => `<option value="${action}" ${row.action === action ? "selected" : ""}>${lineActionLabel(action)}</option>`).join("")}
              </select>
              <input data-line-rule-message="${index}" value="${escapeHtml(row.message || "")}" placeholder="요약 로그(선택)" />
              <button type="button" data-line-rule-remove="${index}">삭제</button>
            </div>
          `,
        )
        .join("")
    : `<div class="small-note">수동 라인 규칙이 없습니다. 좌우 예제에서 라인을 선택해 추가하세요.</div>`;

  selectors.profileRuleRows.querySelectorAll("select").forEach((select) => {
    select.addEventListener("input", () => {
      const index = Number(select.dataset.lineRuleIndex);
      pushProfileUndoSnapshot(`line-rule-action:${index}`);
      state.profileDraft.lineRules[state.selectedProfileObjectType][index].action = select.value;
      renderExamplePreviews();
      markProfileDirty();
      markCompareStale();
    });
  });

  selectors.profileRuleRows.querySelectorAll("input[data-line-rule-message]").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.lineRuleMessage);
      pushProfileUndoSnapshot(`line-rule-message:${index}`);
      state.profileDraft.lineRules[state.selectedProfileObjectType][index].message = input.value.trim();
      markProfileDirty();
      markCompareStale();
    });
  });

  selectors.profileRuleRows.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.lineRuleRemove);
      pushProfileUndoSnapshot(`line-rule-remove:${index}`);
      state.profileDraft.lineRules[state.selectedProfileObjectType].splice(index, 1);
      renderProfileEditor();
      markProfileDirty();
      markCompareStale();
    });
  });
}

function renderRulesList(kind) {
  const target = kind === "ignore" ? selectors.ignoreRulesList : selectors.requiredRulesList;
  const rules = state.profileDraft.rules[kind];
  target.innerHTML = rules.length
    ? rules
        .map(
          (rule, index) => `
            <div class="rule-item">
              <div>
                <strong>${rule.source === "old" ? "기존" : "신규"}</strong>
                <code>${escapeHtml(rule.pattern)}</code>
              </div>
              <button type="button" data-rule-kind="${kind}" data-rule-index="${index}">삭제</button>
            </div>
          `,
        )
        .join("")
    : `<div class="small-note">${kind === "ignore" ? "무시 규칙이 없습니다." : "필수 규칙이 없습니다."}</div>`;

  target.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const kindName = button.dataset.ruleKind;
      const index = Number(button.dataset.ruleIndex);
      state.profileDraft.rules[kindName].splice(index, 1);
      renderRulesList(kindName);
      markCompareStale();
    });
  });
}

function renderExamplePreviews() {
  renderExamplePreview("old");
  renderExamplePreview("new");
  renderReactProfileMappingPanel();
}

function saveCurrentProfileExamples() {
  ensureProfileExamples(state.profileDraft);
  const current = state.profileDraft.examples[state.selectedProfileObjectType] || { old: "", new: "" };
  const oldValue = selectors.profileOldExampleInput.value;
  const newValue = selectors.profileNewExampleInput.value;
  state.profileDraft.examples[state.selectedProfileObjectType] = {
    old: oldValue.trim() ? oldValue : current.old,
    new: newValue.trim() ? newValue : current.new,
  };
}

function ensureProfileExamples(profile) {
  const defaults = createDefaultExamples();
  if (!profile.examples || typeof profile.examples !== "object") profile.examples = {};
  objectTypes.forEach((type) => {
    const current = profile.examples[type] || {};
    profile.examples[type] = {
      old: current.old || defaults[type]?.old || "",
      new: current.new || defaults[type]?.new || "",
    };
  });
  return profile.examples;
}

function renderExamplePreview(source) {
  const textarea = source === "old" ? selectors.profileOldExampleInput : selectors.profileNewExampleInput;
  const preview = source === "old" ? selectors.profileOldPreview : selectors.profileNewPreview;
  const lines = textarea.value.replace(/\r\n/g, "\n").split("\n");
  const lineGroups = semanticLineGroupsByLine(source);
  const linePolicies = linePoliciesByLine(source);

  preview.innerHTML = lines.length
    ? lines
        .map((line, index) => {
          const classes = ["preview-line"];
          const groupEntries = lineGroups.get(index) || [];
          if (groupEntries.length) {
            classes.push("line-group");
            classes.push(...groupEntries.map((entry) => entry.colorClass));
            if (groupEntries.some((entry) => entry.mapped)) classes.push("mapped");
            if (groupEntries.some((entry) => entry.selected)) classes.push("selected-line-ref");
            if (groupEntries.some((entry) => entry.isFirst)) classes.push("line-group-start");
            if (groupEntries.some((entry) => entry.isLast)) classes.push("line-group-end");
          }
          const policyEntries = linePolicies.get(index) || [];
          if (policyEntries.length) classes.push(...policyEntries.map((entry) => entry.policyClass));
          const lineRef = buildProfileLineRef(source, index);
          if (isProfileLineRefMapped(lineRef)) classes.push("mapped");
          if (isProfileLineRefSelected(lineRef)) classes.push("selected-line-ref");
          return `
            <div class="${classes.join(" ")}" data-profile-preview-line="${index}" data-source="${source}" data-line-ref="${escapeHtml(JSON.stringify(lineRef))}" data-line-group-ids="${escapeHtml(groupEntries.map((entry) => entry.id).join(" "))}">
              <button type="button" class="preview-line-number line-ref-button" data-line-ref="${escapeHtml(JSON.stringify(lineRef))}" title="${source === "old" ? "기존" : "신규"} 라인 ${index + 1}">${index + 1}</button>
              <div class="semantic-preview">${renderSemanticPreviewTokens(line, source, index)}</div>
              <div class="preview-badges">${renderPreviewBadges(groupEntries, policyEntries)}</div>
            </div>
          `;
        })
        .join("")
    : `<div class="small-note">예제 라인이 없습니다.</div>`;

  preview.querySelectorAll(".preview-line").forEach((line) => {
    line.addEventListener("pointerdown", startProfileLineDrag);
  });
  preview.querySelectorAll(".line-ref-button, .line-group-number").forEach((button) => {
    button.addEventListener("click", handleProfileLineRefClick);
  });
  preview.querySelectorAll(".semantic-token").forEach((token) => {
    token.addEventListener("pointerdown", startSemanticPreviewTokenDrag);
    token.addEventListener("click", () => {
      if (state.suppressNextPreviewTokenClick) {
        state.suppressNextPreviewTokenClick = false;
        return;
      }
      toggleSemanticPreviewToken(token);
    });
    token.addEventListener("mouseenter", () => setProfilePreviewTokenHoverState(token));
    token.addEventListener("mouseleave", clearProfilePreviewHoverState);
  });
  preview.querySelectorAll(".preview-line").forEach((line) => {
    line.addEventListener("mouseenter", () => setProfilePreviewHoverState(line.dataset.lineGroupIds || ""));
    line.addEventListener("mouseleave", clearProfilePreviewHoverState);
  });
  scheduleProfileExampleConnectorRender();
}

function semanticLineGroupsByLine(source) {
  const type = state.selectedProfileObjectType;
  const groups = state.profileDraft.semanticLineGroups?.[type] || [];
  return groups.reduce((result, group) => {
    if (group.source !== source) return result;
    const colorClass = semanticColorClassForId(group.id, 8);
    const lineIndexes = [...(group.lineIndexes || [])].sort((left, right) => left - right);
    lineIndexes.forEach((lineIndex, position) => {
      const current = result.get(lineIndex) || [];
      const ref = buildProfileGroupRef(group);
      current.push({
        id: group.id,
        label: group.lineNumber || group.label || group.field || "group",
        title: `${group.lineNumber || group.label || "Group"}: ${(group.lineIndexes || []).map((item) => item + 1).join(", ")}`,
        colorClass,
        source: group.source,
        ref,
        isFirst: position === 0,
        isLast: position === lineIndexes.length - 1,
        mapped: isProfileLineRefMapped(ref),
        selected: isProfileLineRefSelected(ref),
      });
      result.set(lineIndex, current);
    });
    return result;
  }, new Map());
}

function linePoliciesByLine(source) {
  const type = state.selectedProfileObjectType;
  const rules = state.profileDraft.lineRules?.[type] || [];
  const lines = source === "old" ? selectors.profileOldExampleInput.value.replace(/\r\n/g, "\n").split("\n") : selectors.profileNewExampleInput.value.replace(/\r\n/g, "\n").split("\n");
  return rules.reduce((result, rule) => {
    if (!rule || rule.source !== source) return result;
    lines.forEach((line, lineIndex) => {
      if (canonicalizeComparableLine(line) !== canonicalizeComparableLine(rule.text)) return;
      const current = result.get(lineIndex) || [];
      current.push({
        id: rule.id || `${source}:${lineIndex}:${rule.action}`,
        policyClass: rule.action,
        label: lineActionBadgeLabel(rule.action),
      });
      result.set(lineIndex, current);
    });
    return result;
  }, new Map());
}

function lineActionBadgeLabel(action) {
  return ({
    ignore: "무시",
    missing: "사라짐",
    added: "추가",
    required: "필수",
    "required-field": "필수 변수",
    same: "동일",
  })[action] || action;
}

function renderPreviewBadges(groupEntries, policyEntries) {
  const groupBadges = groupEntries
    .filter((entry) => entry.isFirst)
    .map((entry) => `<button type="button" class="preview-badge group line-group-number ${entry.colorClass} ${entry.mapped ? "mapped" : ""} ${entry.selected ? "selected" : ""}" data-group-hover-id="${escapeHtml(entry.id)}" data-line-ref="${escapeHtml(JSON.stringify(entry.ref))}" title="${escapeHtml(entry.title || entry.label)}">${escapeHtml(entry.label)}</button>`);
  const policyBadges = policyEntries.map((entry) => `<span class="preview-badge policy ${escapeHtml(entry.policyClass)}">${escapeHtml(entry.label)}</span>`);
  return [...groupBadges, ...policyBadges].join("");
}

function buildProfileLineRef(source, lineIndex) {
  return {
    kind: "line",
    source,
    lineIndex,
    lineNumber: lineIndex + 1,
    label: `L${lineIndex + 1}`,
  };
}

function buildProfileGroupRef(group) {
  return {
    kind: "group",
    source: group.source,
    groupId: group.id,
    lineNumber: group.lineNumber || group.label || "Group",
    label: group.lineNumber || group.label || "Group",
    lineIndexes: group.lineIndexes || [],
  };
}

function isProfileLineRefMapped(ref) {
  return (state.profileDraft.lineMappings?.[state.selectedProfileObjectType] || []).some((mapping) =>
    profileLineRefsEquivalent(ref, mapping.oldRef) || profileLineRefsEquivalent(ref, mapping.newRef),
  );
}

function isProfileLineRefSelected(ref) {
  if (profileLineRefsEquivalent(ref, state.pendingProfileLineRef)) return true;
  const link = state.selectedProfileLineLink;
  return profileLineRefsEquivalent(ref, link?.oldRef) || profileLineRefsEquivalent(ref, link?.newRef);
}

function profileLineRefsEquivalent(left, right) {
  if (!left || !right || left.kind !== right.kind || left.source !== right.source) return false;
  if (left.kind === "group") return left.groupId && left.groupId === right.groupId;
  return Number(left.lineIndex) === Number(right.lineIndex);
}

function renderSemanticPreviewTokens(line, source, lineIndex) {
  const parts = String(line || " ").split(/(\s+)/);
  const mapped = semanticTokenClasses(source, lineIndex);
  let tokenIndex = 0;
  return parts.map((part) => {
    if (!part.trim()) return escapeHtml(part);
    const clean = stripTrailingSyntax(part.replace(/^"|"$/g, ""));
    if (!clean) return escapeHtml(part);
    const currentIndex = tokenIndex++;
    const id = `${source}:${lineIndex}:${currentIndex}`;
    const tokenMeta = mapped.get(`${currentIndex}:${canonicalizeComparableLine(clean)}`) || mapped.get(`${currentIndex}:*`) || { classes: [] };
    const selected = isSemanticTokenSelected(source, id) ? "selected" : "";
    const groupIds = tokenMeta.groupIds?.join(" ") || "";
    return `<span class="semantic-token ${[...tokenMeta.classes, selected].filter(Boolean).join(" ")}" data-token-id="${escapeHtml(id)}" data-source="${source}" data-line-index="${lineIndex}" data-logical-line-index="${lineIndex}" data-token-index="${currentIndex}" data-token="${escapeHtml(clean)}" data-group-ids="${escapeHtml(groupIds)}">${escapeHtml(part)}</span>`;
  }).join("");
}

function semanticTokenClasses(source, lineIndex) {
  const type = state.selectedProfileObjectType;
  const mappings = state.profileDraft.semanticMappings?.[type] || [];
  const classes = new Map();
  mappings.forEach((mapping, mappingIndex) => {
    const nodes = getSemanticMappingNodes(mapping, source);
    (nodes || []).forEach((selector) => {
      if (selector.lineIndex !== lineIndex) return;
      const color = semanticColorClassForId(mapping.id || `mapping-${mappingIndex}`, 8);
      appendSemanticTokenClass(classes, `${selector.tokenIndex}:${canonicalizeComparableLine(selector.selectedToken)}`, color, mapping.id || `mapping-${mappingIndex}`);
      if (!selector.explicitTokenOnly && selector.valueTokenIndex !== selector.tokenIndex) appendSemanticTokenClass(classes, `${selector.valueTokenIndex}:${canonicalizeComparableLine(selector.value)}`, color, mapping.id || `mapping-${mappingIndex}`);
    });
  });
  (state.profileDraft.semanticNodeGroups?.[type] || []).forEach((group, groupIndex) => {
    if (group.source !== source || group.lineIndex !== lineIndex) return;
    const color = semanticColorClassForId(group.id || `node-group-${groupIndex}`, 8);
    (group.tokenIndexes || [group.tokenIndex]).forEach((tokenIndex) => {
      appendSemanticTokenClass(classes, `${tokenIndex}:*`, `token-group ${color}`, group.id || `node-group-${groupIndex}`);
    });
  });
  return classes;
}

function appendSemanticTokenClass(map, key, className, groupId = "") {
  const current = map.get(key) || { classes: [], groupIds: [] };
  className.split(/\s+/).filter(Boolean).forEach((item) => {
    if (!current.classes.includes(item)) current.classes.push(item);
  });
  if (groupId && !current.groupIds.includes(groupId)) current.groupIds.push(groupId);
  map.set(key, current);
}

function semanticColorClassForId(id, modulo = 8) {
  const text = String(id || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash) + text.charCodeAt(index);
  return `mapped-group-${(Math.abs(hash) % modulo) + 1}`;
}

function isSemanticTokenSelected(source, tokenId) {
  return (state.selectedSemanticTokens?.[source] || []).some((item) => item.id === tokenId);
}

function setProfilePreviewHoverState(groupIdsText) {
  const groupIds = String(groupIdsText || "").split(/\s+/).filter(Boolean);
  if (!groupIds.length) return;
  document.querySelectorAll(".profile-example-preview [data-group-ids], .profile-example-preview [data-line-group-ids], .profile-rule-popover [data-group-hover-id], .profile-mapping-row.semantic-group-row").forEach((element) => {
    const elementGroupIds = [
      ...(element.dataset.groupIds || "").split(/\s+/).filter(Boolean),
      ...(element.dataset.lineGroupIds || "").split(/\s+/).filter(Boolean),
      ...(element.dataset.groupHoverId ? [element.dataset.groupHoverId] : []),
      ...(element.dataset.groupId ? [element.dataset.groupId] : []),
    ];
    const active = elementGroupIds.some((groupId) => groupIds.includes(groupId));
    element.classList.toggle("group-hover", active);
  });
  selectors.profileExampleConnectorSvg?.querySelectorAll(".profile-example-connector").forEach((path) => {
    const active = groupIds.some((groupId) => path.classList.contains(semanticColorClassForId(groupId)));
    path.classList.toggle("group-hover", active);
  });
}

function clearProfilePreviewHoverState() {
  document.querySelectorAll(".group-hover").forEach((element) => element.classList.remove("group-hover"));
  document.querySelectorAll(".token-hover").forEach((element) => element.classList.remove("token-hover"));
}

function setProfilePreviewTokenHoverState(token) {
  const tokenId = token?.dataset?.tokenId || "";
  if (!tokenId) return;
  clearProfilePreviewHoverState();
  token.classList.add("token-hover");
  const connectorSelector = [
    `.profile-example-connector[data-from-token-id="${cssEscape(tokenId)}"]`,
    `.profile-example-connector[data-to-token-id="${cssEscape(tokenId)}"]`,
  ].join(", ");
  document.querySelectorAll(connectorSelector).forEach((path) => {
    path.classList.add("token-hover");
    const otherTokenId = path.dataset.fromTokenId === tokenId ? path.dataset.toTokenId : path.dataset.fromTokenId;
    if (!otherTokenId) return;
    document.querySelector(`.profile-example-preview .semantic-token[data-token-id="${cssEscape(otherTokenId)}"]`)?.classList.add("token-hover");
  });
}

function toggleSemanticPreviewToken(token) {
  const source = token.dataset.source;
  const current = state.selectedSemanticTokens[source] || [];
  const item = {
    id: token.dataset.tokenId,
    source,
    lineIndex: Number(token.dataset.lineIndex),
    tokenIndex: Number(token.dataset.tokenIndex),
    token: canonicalizeComparableLine(token.dataset.token || token.textContent),
    line: getExampleLine(source, Number(token.dataset.lineIndex)),
    explicitTokenOnly: true,
  };
  const existing = current.findIndex((candidate) => candidate.id === item.id);
  if (existing >= 0) current.splice(existing, 1);
  else current.push(item);
  state.selectedSemanticTokens[source] = current;
  state.activeSemanticSelectionSource = source;
  renderExamplePreviews();
  setProfileGuide(`선택 토큰: 기존 ${state.selectedSemanticTokens.old.length}개 / 신규 ${state.selectedSemanticTokens.new.length}개`, "info");
}

function startSemanticPreviewTokenDrag(event) {
  event.stopPropagation();
  if (event.button !== 0) return;
  const token = event.target.closest(".semantic-token");
  if (!token) return;
  state.draggingProfileToken = {
    source: token.dataset.source,
    node: buildSemanticNodeFromToken(token),
    element: token,
    startPoint: connectorAnchorPoint(token, token.dataset.source === "old" ? "right" : "left"),
  };
  token.classList.add("dragging");
  renderProfileDraftConnector(state.draggingProfileToken.startPoint, { x: event.clientX, y: event.clientY });
}

function moveSemanticPreviewTokenDrag(event) {
  if (!state.draggingProfileToken) return;
  renderProfileDraftConnector(state.draggingProfileToken.startPoint, { x: event.clientX, y: event.clientY });
}

function finishSemanticPreviewTokenDrag(event) {
  if (!state.draggingProfileToken) return;
  const start = state.draggingProfileToken;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".semantic-token");
  start.element?.classList.remove("dragging");
  state.draggingProfileToken = null;
  clearProfileDraftConnector();
  if (!target || target.dataset.source === start.source) return;

  const end = {
    source: target.dataset.source,
    node: buildSemanticNodeFromToken(target),
  };
  const oldNode = start.source === "old" ? start.node : end.node;
  const newNode = start.source === "new" ? start.node : end.node;
  const type = state.selectedProfileObjectType;
  const field = inferFieldFromTokenNodes(oldNode, newNode, type);
  const role = field === defaultObjectFieldForType(type) ? "object-key" : "compare-field";
  state.suppressNextPreviewTokenClick = true;
  showSemanticMappingConfirm({
    type,
    field,
    role,
    policy: "compare",
    oldNodes: [oldNode],
    newNodes: [newNode],
  });
  setProfileGuide(`토큰 매핑 '${field}'를 확인한 뒤 저장하세요.`, "info");
}

function buildSemanticNodeFromToken(token) {
  const source = token.dataset.source;
  const lineIndex = Number(token.dataset.lineIndex);
  const line = getExampleLine(source, lineIndex);
  const tokenIndex = Number(token.dataset.tokenIndex);
  const selectedToken = canonicalizeComparableLine(token.dataset.token || token.textContent);
  const field = inferFieldFromTokenNode(line, { tokenIndex, selectedToken, value: selectedToken }, state.selectedProfileObjectType)
    || inferSemanticFieldName(line)
    || "";
  return buildSemanticTokenSelector({
    source,
    lineIndex,
    tokenIndex,
    token: selectedToken,
    line,
    explicitTokenOnly: true,
  }, field);
}

function inferFieldFromTokenNodes(oldNode, newNode, type) {
  const oldLine = getExampleLine("old", oldNode.lineIndex);
  const newLine = getExampleLine("new", newNode.lineIndex);
  const oldField = inferFieldFromTokenNode(oldLine, oldNode, type);
  const newField = inferFieldFromTokenNode(newLine, newNode, type);
  if (oldField && newField && oldField === newField) return oldField;
  return oldField || newField || defaultSemanticFieldForType(type);
}

function inferFieldFromTokenNode(line, node, type) {
  const selected = canonicalizeComparableLine(node.selectedToken || node.token || "");
  const tokens = getSemanticLineTokens(line).map(canonicalizeComparableLine);
  const selectedIndex = Number.isFinite(node.tokenIndex) ? node.tokenIndex : tokens.indexOf(selected);
  if (["static-route-entry", "route"].includes(selected)) return "route";
  if (["next-hop", "tag", "description", "neighbor", "peer-as", "authentication-key", "admin-state"].includes(selected)) {
    return selected === "admin-state" ? "state" : selected;
  }
  const previous = selectedIndex > 0 ? tokens[selectedIndex - 1] : "";
  if (["static-route-entry", "route"].includes(previous)) return "route";
  if (["next-hop", "tag", "description", "neighbor", "peer-as", "authentication-key", "admin-state"].includes(previous)) {
    return previous === "admin-state" ? "state" : previous;
  }
  const fields = extractFieldsFromLine(line, state.profileDraft, type);
  return Object.entries(fields).find(([, value]) => canonicalizeComparableLine(value) === canonicalizeComparableLine(node.value))?.[0] || "";
}

function buildContextLineBadges(lines, mappings, source) {
  const badges = new Map();
  mappings.forEach((mapping, mappingIndex) => {
    const blockLines = splitComparableBlock(source === "old" ? mapping.oldText : mapping.newText);
    const matches = findBlockMatches(lines.map(canonicalizeComparableLine), blockLines);
    matches.forEach((startIndex) => {
      blockLines.forEach((_, offset) => {
        const lineIndex = startIndex + offset;
        const current = badges.get(lineIndex) || [];
        current.push(mapping.label || `C${mappingIndex + 1}`);
        badges.set(lineIndex, current);
      });
    });
  });
  return badges;
}

function addManualLineMapping() {
  saveCurrentProfileExamples();
  const oldText = getSelectedText(selectors.profileOldExampleInput);
  const newText = getSelectedText(selectors.profileNewExampleInput);
  if (!oldText || !newText) {
    setProfileGuide("라인 매핑 실패: preview의 라인 번호/그룹 번호를 클릭하거나 기존/신규 예제 양쪽에서 매핑할 라인을 선택하세요.", "error");
    return;
  }
  if (!selectionMatchesWholeLine(selectors.profileOldExampleInput, oldText) || !selectionMatchesWholeLine(selectors.profileNewExampleInput, newText)) {
    setProfileGuide("라인 매핑 실패: 라인 매핑은 양쪽 모두 전체 라인을 드래그해야 합니다.", "error");
    return;
  }
  const oldIndexes = [...getSelectedLineIndexes(selectors.profileOldExampleInput)];
  const newIndexes = [...getSelectedLineIndexes(selectors.profileNewExampleInput)];
  pushProfileUndoSnapshot("line-mapping");
  state.profileDraft.lineMappings[state.selectedProfileObjectType].push(createLineMappingRecord(
    oldIndexes.length === 1 ? buildProfileLineRef("old", oldIndexes[0]) : null,
    newIndexes.length === 1 ? buildProfileLineRef("new", newIndexes[0]) : null,
    oldText,
    newText,
  ));
  renderProfileEditor();
  setProfileGuide("라인 매핑이 추가되었습니다.", "ok");
  markProfileDirty();
  markCompareStale();
}

function createLineMappingRecord(oldRef, newRef, oldText = "", newText = "") {
  const oldResolved = resolveProfileLineRef(oldRef, "old", oldText);
  const newResolved = resolveProfileLineRef(newRef, "new", newText);
  return {
    id: createId(),
    type: "line-mapping",
    oldRef: oldResolved.ref,
    newRef: newResolved.ref,
    oldText: oldResolved.text,
    newText: newResolved.text,
  };
}

function resolveProfileLineRef(ref, source, fallbackText = "") {
  if (!ref) return { ref: null, text: normalizeSelectedBlock(fallbackText) };
  if (ref.kind === "group") {
    const group = findSemanticLineGroupById(ref.groupId);
    const normalizedRef = group ? buildProfileGroupRef(group) : ref;
    return { ref: normalizedRef, text: normalizeSelectedBlock(group?.text || fallbackText) };
  }
  const lineIndex = Number(ref.lineIndex);
  const line = Number.isFinite(lineIndex) ? getExampleLine(source, lineIndex) : fallbackText;
  return {
    ref: { ...ref, source, lineNumber: Number.isFinite(lineIndex) ? lineIndex + 1 : ref.lineNumber },
    text: normalizeSelectedBlock(line),
  };
}

function findSemanticLineGroupById(groupId) {
  const type = state.selectedProfileObjectType;
  return (state.profileDraft.semanticLineGroups?.[type] || []).find((group) => group.id === groupId) || null;
}

function addManualContextMapping() {
  saveCurrentProfileExamples();
  const oldText = getSelectedText(selectors.profileOldExampleInput);
  const newText = getSelectedText(selectors.profileNewExampleInput);
  if (!oldText || !newText) {
    setProfileGuide("컨텍스트 매핑 실패: 기존/신규 예제 양쪽에서 같은 기능 컨텍스트를 드래그하세요.", "error");
    return;
  }
  if (!state.profileDraft.contextMappings[state.selectedProfileObjectType]) state.profileDraft.contextMappings[state.selectedProfileObjectType] = [];
  const index = state.profileDraft.contextMappings[state.selectedProfileObjectType].length + 1;
  pushProfileUndoSnapshot("context-mapping");
  state.profileDraft.contextMappings[state.selectedProfileObjectType].push({
    oldText: normalizeSelectedBlock(oldText),
    newText: normalizeSelectedBlock(newText),
    label: `context-${index}`,
  });
  renderProfileEditor();
  setProfileGuide("컨텍스트 그룹 매핑이 추가되었습니다. 여러 줄↔한 줄 문법 차이는 비교 시 같은 기능 블록으로 정규화됩니다.", "ok");
  markProfileDirty();
  markCompareStale();
}

function startProfileLineDrag(event) {
  if (event.button !== 0) return;
  if (!event.target.closest(".line-ref-button, .line-group-number")) return;
  const line = event.target.closest(".preview-line");
  if (!line) return;
  const ref = parseProfileLineRef(event.target.closest("[data-line-ref]")?.dataset.lineRef || line.dataset.lineRef);
  hideProfileRulePopover();
  state.draggingProfileLine = {
    source: line.dataset.source,
    lineIndex: Number(line.dataset.profilePreviewLine),
    ref,
    element: line,
    startPoint: connectorAnchorPoint(event.target.closest(".line-ref-button, .line-group-number") || line, line.dataset.source === "old" ? "right" : "left"),
  };
  line.classList.add("link-dragging");
  renderProfileDraftConnector(state.draggingProfileLine.startPoint, { x: event.clientX, y: event.clientY });
}

function moveProfileLineDrag(event) {
  if (!state.draggingProfileLine) return;
  renderProfileDraftConnector(state.draggingProfileLine.startPoint, { x: event.clientX, y: event.clientY });
}

function finishProfileLineDrag(event) {
  if (!state.draggingProfileLine) return;
  const start = state.draggingProfileLine;
  const targetElement = document.elementFromPoint(event.clientX, event.clientY);
  const target = targetElement?.closest(".preview-line");
  start.element?.classList.remove("link-dragging");
  state.draggingProfileLine = null;
  clearProfileDraftConnector();

  if (!target || target.dataset.source === start.source) return;
  const targetRef = parseProfileLineRef(targetElement?.closest("[data-line-ref]")?.dataset.lineRef || target.dataset.lineRef);
  const end = {
    source: target.dataset.source,
    lineIndex: Number(target.dataset.profilePreviewLine),
    ref: targetRef,
    element: target,
  };
  const oldLine = start.source === "old" ? start : end;
  const newLine = start.source === "new" ? start : end;
  state.selectedProfileLineLink = {
    oldLineIndex: oldLine.lineIndex,
    newLineIndex: newLine.lineIndex,
    oldRef: oldLine.ref || buildProfileLineRef("old", oldLine.lineIndex),
    newRef: newLine.ref || buildProfileLineRef("new", newLine.lineIndex),
  };
  renderProfileExampleConnectors();
  showProfileRulePopover(oldLine.element, newLine.element);
}

function handleProfileLineRefClick(event) {
  event.preventDefault();
  event.stopPropagation();
  const ref = parseProfileLineRef(event.currentTarget.dataset.lineRef);
  if (!ref) return;
  applyProfileLineRefSelection(ref);
}

function applyProfileLineRefSelection(ref) {
  if (!state.pendingProfileLineRef || state.pendingProfileLineRef.source === ref.source) {
    state.pendingProfileLineRef = ref;
    state.selectedProfileLineLink = null;
    renderExamplePreviews();
    setProfileGuide(`${ref.source === "old" ? "기존" : "신규"} ${formatProfileLineRef(ref)} 선택됨. 반대쪽 라인 번호 또는 그룹 번호를 클릭하세요.`, "info");
    return;
  }
  const oldRef = ref.source === "old" ? ref : state.pendingProfileLineRef;
  const newRef = ref.source === "new" ? ref : state.pendingProfileLineRef;
  state.selectedProfileLineLink = {
    oldLineIndex: firstLineIndexFromRef(oldRef),
    newLineIndex: firstLineIndexFromRef(newRef),
    oldRef,
    newRef,
  };
  state.pendingProfileLineRef = null;
  pushProfileUndoSnapshot("line-mapping-click");
  state.profileDraft.lineMappings[state.selectedProfileObjectType].push(createLineMappingRecord(oldRef, newRef));
  renderProfileEditor();
  setProfileGuide(`라인 매핑 저장: ${formatProfileLineRef(oldRef)} ↔ ${formatProfileLineRef(newRef)}`, "ok");
  markProfileDirty("Line Mapping", "추가", `${formatProfileLineRef(oldRef)} ↔ ${formatProfileLineRef(newRef)}`);
  markCompareStale();
}

function parseProfileLineRef(value) {
  if (!value) return null;
  try {
    const ref = JSON.parse(value);
    return ref && ["old", "new"].includes(ref.source) && ["line", "group"].includes(ref.kind) ? ref : null;
  } catch {
    return null;
  }
}

function firstLineIndexFromRef(ref) {
  if (ref?.kind === "group") return Number(ref.lineIndexes?.[0]) || 0;
  return Number(ref?.lineIndex) || 0;
}

function formatProfileLineRef(ref) {
  if (!ref) return "-";
  if (ref.kind === "group") return ref.label || ref.lineNumber || "Group";
  return `L${ref.lineNumber || (Number(ref.lineIndex) + 1)}`;
}

function showProfileRulePopover(oldElement, newElement) {
  const popover = selectors.profileRulePopover;
  if (!popover) return;
  const grid = selectors.profileOldPreview.closest(".profile-example-grid");
  const gridRect = grid.getBoundingClientRect();
  const oldRect = oldElement.getBoundingClientRect();
  const newRect = newElement.getBoundingClientRect();
  const top = ((oldRect.top + oldRect.bottom + newRect.top + newRect.bottom) / 4) - gridRect.top;
  const left = Math.min(gridRect.width - 260, Math.max(12, ((oldRect.right + newRect.left) / 2) - gridRect.left - 120));

  popover.innerHTML = `
    <strong>연결 규칙 적용</strong>
    <button type="button" data-profile-link-action="line-map">라인 매핑 저장</button>
    <button type="button" data-profile-link-action="required">신규 필수</button>
    <button type="button" data-profile-link-action="presence">존재 정책</button>
    <button type="button" data-profile-link-action="ignore-policy">필드 무시</button>
  `;
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  popover.hidden = false;
  popover.classList.add("active");
  popover.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => applyProfileLineLinkAction(button.dataset.profileLinkAction));
  });
}

function hideProfileRulePopover() {
  document.querySelectorAll(".profile-rule-popover").forEach((popover) => {
    popover.classList.remove("active", "mapping-confirm");
    popover.hidden = true;
  });
}

function applyProfileLineLinkAction(action) {
  const link = state.selectedProfileLineLink;
  if (!link) return;
  saveCurrentProfileExamples();
  const oldLine = getExampleLine("old", link.oldLineIndex);
  const newLine = getExampleLine("new", link.newLineIndex);
  const type = state.selectedProfileObjectType;

  if (action === "line-map") {
    pushProfileUndoSnapshot("line-mapping-link");
    state.profileDraft.lineMappings[type].push(createLineMappingRecord(link.oldRef || buildProfileLineRef("old", link.oldLineIndex), link.newRef || buildProfileLineRef("new", link.newLineIndex), oldLine, newLine));
    setProfileGuide(`라인 매핑을 저장했습니다: ${formatProfileLineRef(link.oldRef)} ↔ ${formatProfileLineRef(link.newRef)}`, "ok");
  } else if (action === "semantic-compare" || action === "semantic-key") {
    addSemanticRulesFromLinkedLines(oldLine, newLine, action === "semantic-key" ? "object-key" : "compare-field");
  } else if (action === "required") {
    const field = inferFieldFromLinkedLines(oldLine, newLine);
    if (field) pushProfileUndoSnapshot(`line-policy:${field}`);
    if (field) state.profileDraft.validationPolicies[type].push({ field, policy: "required", oldValues: "", newValue: "", message: "" });
    setProfileGuide(field ? `필드 '${field}' 신규 필수 정책을 추가했습니다.` : "신규 필수 정책 실패: 필드를 찾지 못했습니다.", field ? "ok" : "error");
  } else if (action === "presence") {
    const field = inferFieldFromLinkedLines(oldLine, newLine);
    if (field) pushProfileUndoSnapshot(`line-policy:${field}`);
    if (field) state.profileDraft.validationPolicies[type].push({ field, policy: "presence", oldValues: "", newValue: "", message: "" });
    setProfileGuide(field ? `필드 '${field}' 존재 정책을 추가했습니다.` : "존재 정책 실패: 필드를 찾지 못했습니다.", field ? "ok" : "error");
  } else if (action === "ignore-policy") {
    const field = inferFieldFromLinkedLines(oldLine, newLine);
    if (field) pushProfileUndoSnapshot(`line-policy:${field}`);
    if (field) state.profileDraft.validationPolicies[type].push({ field, policy: "ignore", oldValues: "", newValue: "", message: "" });
    setProfileGuide(field ? `필드 '${field}' 무시 정책을 추가했습니다.` : "무시 정책 실패: 필드를 찾지 못했습니다.", field ? "ok" : "error");
  }

  hideProfileRulePopover();
  renderProfileEditor();
  markProfileDirty();
  markCompareStale();
}

function getExampleLine(source, lineIndex) {
  const textarea = source === "old" ? selectors.profileOldExampleInput : selectors.profileNewExampleInput;
  return normalizeSelectedBlock(textarea.value.replace(/\r\n/g, "\n").split("\n")[lineIndex] || "");
}

function addSemanticRulesFromLinkedLines(oldLine, newLine, role) {
  const type = state.selectedProfileObjectType;
  const field = inferFieldFromLinkedLines(oldLine, newLine);
  const oldValue = inferValueForField(oldLine, field);
  const newValue = inferValueForField(newLine, field);
  if (!field || !oldValue || !newValue) {
    setProfileGuide("의미 규칙 실패: 연결한 라인에서 공통 필드/값을 찾지 못했습니다.", "error");
    return;
  }

  const groupId = createId();
  pushProfileUndoSnapshot(`semantic-rule:${field}`);
  state.profileDraft.semanticRules[type].push({
    source: "old",
    field,
    role,
    valueType: inferSemanticValueType(oldValue),
    selector: resolveSemanticSelection(oldLine, oldValue, field)?.selector || { anchorBefore: field, anchorAfter: "" },
    sample: canonicalizeComparableLine(oldValue),
    groupId,
  });
  state.profileDraft.semanticRules[type].push({
    source: "new",
    field,
    role,
    valueType: inferSemanticValueType(newValue),
    selector: resolveSemanticSelection(newLine, newValue, field)?.selector || { anchorBefore: field, anchorAfter: "" },
    sample: canonicalizeComparableLine(newValue),
    groupId,
  });
  setProfileGuide(`연결한 라인을 의미 필드 '${field}' 규칙으로 저장했습니다.`, "ok");
}

function inferFieldFromLinkedLines(oldLine, newLine) {
  const oldField = inferSemanticFieldName(oldLine);
  const newField = inferSemanticFieldName(newLine);
  if (oldField && newField && oldField === newField) return oldField;
  return oldField || newField || "";
}

function inferSemanticFieldName(line) {
  const normalized = canonicalizeComparableLine(line);
  if (/(?:^|\s)(?:static-route-entry|route)\s+[\d./]+/.test(normalized)) return "route";
  if (/\bnext-hop\b/.test(normalized)) return "next-hop";
  if (/\btag\b/.test(normalized)) return "tag";
  if (/\bno\s+shutdown\b|\badmin-state\b/.test(normalized)) return "state";
  return extractFieldName(normalized);
}

function inferValueForField(line, field) {
  const normalized = canonicalizeComparableLine(line);
  if (field === "route") return stripTrailingSyntax(normalized.match(/(?:^|\s)(?:static-route-entry|route)\s+"?([^"\s{}]+)"?/)?.[1] || "");
  if (field === "next-hop") return stripTrailingSyntax(normalized.match(/\bnext-hop\s+"?([^"\s{}]+)"?/)?.[1] || "");
  if (field === "tag") return stripTrailingSyntax(normalized.match(/\btag\s+([^"\s{}]+)/)?.[1] || "");
  if (field === "state") {
    if (/\bno\s+shutdown\b|\badmin-state\s+enable\b/.test(normalized)) return "enabled";
    if (/\bshutdown\b|\badmin-state\s+disable\b/.test(normalized)) return "disabled";
  }
  return field ? extractFieldValue(normalized, field) : "";
}

function scheduleProfileExampleConnectorRender() {
  requestAnimationFrame(renderProfileExampleConnectors);
}

function renderProfileExampleConnectors() {
  const svg = selectors.profileExampleConnectorSvg;
  const link = state.selectedProfileLineLink;
  if (!svg) return;
  prepareProfileConnectorSvg();
  const paths = [];
  const type = state.selectedProfileObjectType;
  const mappings = state.profileDraft.semanticMappings?.[state.selectedProfileObjectType] || [];
  mappings.forEach((mapping) => {
    const oldNodes = getSemanticMappingNodes(mapping, "old");
    const newNodes = getSemanticMappingNodes(mapping, "new");
    oldNodes.forEach((oldNode) => {
      const oldElement = findSemanticTokenElement("old", oldNode);
      if (!oldElement) return;
      newNodes.forEach((newNode) => {
        const newElement = findSemanticTokenElement("new", newNode);
        if (!newElement) return;
        const points = connectorPointsBetweenElements(oldElement, newElement);
        const selected = state.pendingSemanticMapping?.id === mapping.id ? "selected" : "";
        const oldTokenId = semanticNodeTokenId("old", oldNode);
        const newTokenId = semanticNodeTokenId("new", newNode);
        const attrs = `data-mapping-id="${escapeHtml(mapping.id || `${mapping.field}:${mapping.role}`)}" data-from-token-id="${escapeHtml(oldTokenId)}" data-to-token-id="${escapeHtml(newTokenId)}"`;
        paths.push(buildProfileConnectorPath(points.from, points.to, `semantic-connector ${selected} ${semanticColorClassForId(mapping.id || `${mapping.field}:${mapping.role}`)}`, attrs));
      });
    });
  });

  (state.profileDraft.lineMappings?.[type] || []).forEach((mapping) => {
    const oldElement = findProfileLineRefElement("old", mapping.oldRef);
    const newElement = findProfileLineRefElement("new", mapping.newRef);
    if (!oldElement || !newElement) return;
    const points = connectorPointsBetweenPreviewRefs(oldElement, newElement);
    const selected = profileLineRefsEquivalent(mapping.oldRef, state.selectedProfileLineLink?.oldRef)
      && profileLineRefsEquivalent(mapping.newRef, state.selectedProfileLineLink?.newRef)
      ? "selected"
      : "";
    const refClasses = [mapping.oldRef, mapping.newRef]
      .filter((ref) => ref?.kind === "group" && ref.groupId)
      .map((ref) => semanticColorClassForId(ref.groupId))
      .join(" ");
    paths.push(buildProfileConnectorPath(points.from, points.to, `line-mapping-connector ${selected} ${refClasses} ${semanticColorClassForId(mapping.id || `${mapping.oldText}:${mapping.newText}`)}`));
  });

  if (link) {
    const oldLine = selectors.profileOldPreview.querySelector(`[data-profile-preview-line="${link.oldLineIndex}"]`);
    const newLine = selectors.profileNewPreview.querySelector(`[data-profile-preview-line="${link.newLineIndex}"]`);
    if (oldLine && newLine) {
      const points = connectorPointsBetweenPreviewRefs(oldLine, newLine);
      paths.push(buildProfileConnectorPath(points.from, points.to, "saved"));
    }
  }
  svg.innerHTML = paths.join("");
}

function findProfileLineRefElement(source, ref) {
  const preview = source === "old" ? selectors.profileOldPreview : selectors.profileNewPreview;
  if (ref?.kind === "group" && ref.groupId) {
    return preview.querySelector(`.line-group-number[data-group-hover-id="${cssEscape(ref.groupId)}"]`)
      || preview.querySelector(`[data-line-group-ids~="${cssEscape(ref.groupId)}"]`);
  }
  if (ref?.kind === "line" && Number.isFinite(Number(ref.lineIndex))) {
    return preview.querySelector(`.preview-line[data-profile-preview-line="${Number(ref.lineIndex)}"] .preview-line-number`);
  }
  if (!ref) return null;
  return null;
}

function connectorPointsBetweenPreviewRefs(oldElement, newElement) {
  const oldRect = oldElement.getBoundingClientRect();
  const newRect = newElement.getBoundingClientRect();
  const oldPaneRect = selectors.profileOldPreview.getBoundingClientRect();
  const newPaneRect = selectors.profileNewPreview.getBoundingClientRect();
  const offset = 5;
  return {
    from: {
      x: oldPaneRect.right + offset,
      y: oldRect.top + (oldRect.height / 2),
    },
    to: {
      x: newPaneRect.left - offset,
      y: newRect.top + (newRect.height / 2),
    },
  };
}

function findSemanticGroupElements(source, group) {
  const preview = source === "old" ? selectors.profileOldPreview : selectors.profileNewPreview;
  const line = preview.querySelector(`[data-profile-preview-line="${group.lineIndex}"]`);
  if (!line) return [];
  const groupIds = new Set([group.id]);
  return [...line.querySelectorAll(".semantic-token")]
    .filter((item) => (item.dataset.groupIds || "").split(/\s+/).some((id) => groupIds.has(id)))
    .sort((left, right) => Number(left.dataset.tokenIndex) - Number(right.dataset.tokenIndex));
}

function findSemanticLineGroupElements(source, group) {
  const preview = source === "old" ? selectors.profileOldPreview : selectors.profileNewPreview;
  return (group.lineIndexes || [])
    .map((lineIndex) => preview.querySelector(`[data-profile-preview-line="${lineIndex}"]`))
    .filter(Boolean);
}

function findSemanticTokenElement(source, node) {
  const preview = source === "old" ? selectors.profileOldPreview : selectors.profileNewPreview;
  if (node.type === "line-group" && Array.isArray(node.lineIndexes) && node.lineIndexes.length) {
    const firstLine = preview.querySelector(`[data-profile-preview-line="${node.lineIndexes[0]}"]`);
    const lastLine = preview.querySelector(`[data-profile-preview-line="${node.lineIndexes[node.lineIndexes.length - 1]}"]`);
    return firstLine || lastLine || null;
  }
  const line = preview.querySelector(`[data-profile-preview-line="${node.lineIndex}"]`);
  if (!line) return null;
  if (node.type === "token-group" && node.id) {
    const grouped = [...line.querySelectorAll(".semantic-token")].filter((item) => (item.dataset.groupIds || "").split(/\s+/).includes(node.id));
    if (grouped.length) return grouped[0];
  }
  const token = line.querySelector(`.semantic-token[data-token-index="${node.tokenIndex}"]`);
  if (token) return token;
  return [...line.querySelectorAll(".semantic-token")]
    .find((item) => canonicalizeComparableLine(item.dataset.token || item.textContent) === canonicalizeComparableLine(node.selectedToken || node.token));
}

function semanticNodeTokenId(source, node) {
  if (!node || !Number.isFinite(Number(node.lineIndex)) || !Number.isFinite(Number(node.tokenIndex))) return "";
  return `${source}:${Number(node.lineIndex)}:${Number(node.tokenIndex)}`;
}

function renderProfileDraftConnector(startPoint, endPoint) {
  const svg = selectors.profileExampleConnectorSvg;
  if (!svg) return;
  prepareProfileConnectorSvg();
  renderProfileExampleConnectors();
  svg.insertAdjacentHTML("beforeend", buildProfileConnectorPath(startPoint, endPoint, "draft"));
}

function clearProfileDraftConnector() {
  selectors.profileExampleConnectorSvg?.querySelectorAll(".profile-example-connector.draft").forEach((path) => path.remove());
}

function buildProfileConnectorPath(startPoint, endPoint, stateName, attrs = "") {
  const grid = selectors.profileOldPreview.closest(".profile-example-grid");
  const rect = grid.getBoundingClientRect();
  const x1 = startPoint.x - rect.left;
  const y1 = startPoint.y - rect.top;
  const x2 = endPoint.x - rect.left;
  const y2 = endPoint.y - rect.top;
  const gutterOnly = /\b(line-mapping-connector|saved)\b/.test(stateName);
  const mid = gutterOnly
    ? Math.max(4, Math.abs(x2 - x1) * 0.5)
    : Math.max(40, Math.abs(x2 - x1) * 0.45);
  return `<path class="profile-example-connector ${stateName}" ${attrs} d="M ${x1} ${y1} C ${x1 + mid} ${y1}, ${x2 - mid} ${y2}, ${x2} ${y2}" />`;
}

function connectorAnchorPoint(element, preferredEdge = "right") {
  const rect = element.getBoundingClientRect();
  const offset = 6;
  if (preferredEdge === "left") return { x: rect.left - offset, y: rect.top + (rect.height / 2) };
  if (preferredEdge === "top") return { x: rect.left + (rect.width / 2), y: rect.top - offset };
  if (preferredEdge === "bottom") return { x: rect.left + (rect.width / 2), y: rect.bottom + offset };
  return { x: rect.right + offset, y: rect.top + (rect.height / 2) };
}

function connectorPointsBetweenElements(fromElement, toElement) {
  const fromRect = fromElement.getBoundingClientRect();
  const toRect = toElement.getBoundingClientRect();
  if (fromRect.right <= toRect.left) {
    return {
      from: connectorAnchorPoint(fromElement, "right"),
      to: connectorAnchorPoint(toElement, "left"),
    };
  }
  if (toRect.right <= fromRect.left) {
    return {
      from: connectorAnchorPoint(fromElement, "left"),
      to: connectorAnchorPoint(toElement, "right"),
    };
  }
  const fromMiddle = fromRect.top + (fromRect.height / 2);
  const toMiddle = toRect.top + (toRect.height / 2);
  return fromMiddle <= toMiddle
    ? { from: connectorAnchorPoint(fromElement, "bottom"), to: connectorAnchorPoint(toElement, "top") }
    : { from: connectorAnchorPoint(fromElement, "top"), to: connectorAnchorPoint(toElement, "bottom") };
}

function prepareProfileConnectorSvg() {
  const svg = selectors.profileExampleConnectorSvg;
  const grid = selectors.profileOldPreview.closest(".profile-example-grid");
  if (!svg || !grid) return;
  const rect = grid.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${Math.max(0, rect.width)} ${Math.max(0, rect.height)}`);
  svg.setAttribute("width", Math.max(0, rect.width));
  svg.setAttribute("height", Math.max(0, rect.height));
}

function addManualFieldMapping() {
  saveCurrentProfileExamples();
  const oldField = getSelectedText(selectors.profileOldExampleInput);
  const newField = getSelectedText(selectors.profileNewExampleInput);
  if (!oldField || !newField) {
    setProfileGuide("필드 매핑 실패: 기존/신규 예제에서 매핑할 필드명만 각각 선택하세요.", "error");
    return;
  }
  if (oldField.includes("\n") || newField.includes("\n") || oldField.split(/\s+/).length > 2 || newField.split(/\s+/).length > 2) {
    setProfileGuide("필드 매핑 실패: 라인 전체가 아니라 static-route-entry, route 같은 필드명만 선택하세요.", "error");
    return;
  }
  if (!state.profileDraft.fieldMappings[state.selectedProfileObjectType]) state.profileDraft.fieldMappings[state.selectedProfileObjectType] = [];
  pushProfileUndoSnapshot("field-mapping");
  state.profileDraft.fieldMappings[state.selectedProfileObjectType].push({
    oldField: canonicalizeComparableLine(oldField),
    newField: canonicalizeComparableLine(newField),
  });
  renderProfileEditor();
  setProfileGuide("필드 매핑이 추가되었습니다. 비교 시 IP/CIDR 값이 있으면 그 값을 우선 비교합니다.", "ok");
  markProfileDirty();
  markCompareStale();
}

function addManualLineRule(source) {
  saveCurrentProfileExamples();
  const textarea = source === "old" ? selectors.profileOldExampleInput : selectors.profileNewExampleInput;
  const text = getSelectedText(textarea);
  if (!text) {
    setProfileGuide("규칙 추가 실패: 예제 라인 또는 필드명을 드래그해서 선택하세요.", "error");
    return;
  }
  if (!selectionMatchesWholeLine(textarea, text) && !extractFieldName(text)) {
    setProfileGuide("규칙 추가 실패: 전체 라인을 선택하거나 authentication-key 같은 필드명을 선택하세요.", "error");
    return;
  }
  text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      if (!state.__lineRuleUndoPushed) {
        pushProfileUndoSnapshot(`line-rule:${source}`);
        state.__lineRuleUndoPushed = true;
      }
      state.profileDraft.lineRules[state.selectedProfileObjectType].push({
        id: createId(),
        source,
        text: line,
        action: source === "old" ? "missing" : "added",
      });
    });
  delete state.__lineRuleUndoPushed;
  renderProfileEditor();
  setProfileGuide(selectionMatchesWholeLine(textarea, text) ? "규칙이 추가되었습니다." : "필드 규칙이 추가되었습니다. 필드명 선택 규칙은 '필수 변수'로 설정하세요.", "ok");
  markProfileDirty();
  markCompareStale();
}

function getSelectedText(textarea) {
  return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd).trim();
}

function normalizeSelectedBlock(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
    .join("\n");
}

function splitComparableBlock(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(canonicalizeComparableLine)
    .filter(Boolean);
}

function findBlockMatches(lines, blockLines) {
  if (!blockLines.length || blockLines.length > lines.length) return [];
  const matches = [];
  for (let index = 0; index <= lines.length - blockLines.length; index += 1) {
    if (blockMatchesAt(lines, index, blockLines)) matches.push(index);
  }
  return matches;
}

function blockMatchesAt(lines, startIndex, blockLines) {
  if (!blockLines.length || startIndex + blockLines.length > lines.length) return false;
  return blockLines.every((line, offset) => lines[startIndex + offset] === line);
}

function getSelectedLineIndexes(textarea) {
  const indexes = new Set();
  if (textarea.selectionStart === textarea.selectionEnd) return [];
  const value = textarea.value.replace(/\r\n/g, "\n");
  const start = textarea.selectionStart;
  const end = Math.max(start, textarea.selectionEnd - 1);
  const beforeStart = value.slice(0, start);
  const selected = value.slice(start, end + 1);
  const firstLine = beforeStart.split("\n").length - 1;
  const lineCount = selected.split("\n").length;
  for (let offset = 0; offset < lineCount; offset += 1) indexes.add(firstLine + offset);
  return [...indexes];
}

function getSelectionLine(textarea) {
  const value = textarea.value.replace(/\r\n/g, "\n");
  const start = textarea.selectionStart;
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEnd = value.indexOf("\n", start);
  return value.slice(lineStart, lineEnd >= 0 ? lineEnd : value.length);
}

function getSemanticLineTokens(line) {
  return tokenizeConfigLine(line)
    .map((item) => item.token)
    .filter(Boolean);
}

function buildSemanticSelector(line, selected) {
  const normalizedLine = canonicalizeComparableLine(line);
  const normalizedSelected = canonicalizeComparableLine(selected);
  const selectedIndex = normalizedLine.indexOf(normalizedSelected);
  if (selectedIndex < 0) return null;
  const before = normalizedLine.slice(0, selectedIndex).trim();
  const after = normalizedLine.slice(selectedIndex + normalizedSelected.length).trim();
  return {
    anchorBefore: semanticAnchorTail(before),
    anchorAfter: semanticAnchorHead(after),
  };
}

function resolveSemanticSelection(line, selected, field) {
  const normalizedLine = canonicalizeComparableLine(line);
  const normalizedSelected = canonicalizeComparableLine(selected);
  const selectedIndex = normalizedLine.indexOf(normalizedSelected);
  if (selectedIndex < 0) return null;
  const directSelector = buildSemanticSelector(line, selected);
  const nextToken = tokenAfterSelection(normalizedLine, selectedIndex, normalizedSelected);
  if (nextToken?.value && shouldUseNextTokenAsSemanticValue(normalizedSelected, field)) {
    return {
      value: nextToken.value,
      selector: {
        anchorBefore: semanticAnchorTail(normalizedLine.slice(0, selectedIndex + normalizedSelected.length)),
        anchorAfter: semanticAnchorHead(normalizedLine.slice(nextToken.endIndex)),
      },
    };
  }
  return directSelector ? { value: selected, selector: directSelector } : null;
}

function tokenAfterSelection(line, selectedIndex, selected) {
  const rest = line.slice(selectedIndex + selected.length).trim();
  const match = rest.match(/^"?([^"\s{}]+)"?/);
  if (!match) return null;
  const value = stripTrailingSyntax(match[1]);
  const valueIndex = line.indexOf(match[0], selectedIndex + selected.length);
  return { value, endIndex: valueIndex + match[0].length };
}

function shouldUseNextTokenAsSemanticValue(selected, field) {
  return selected === field || [
    "static-route-entry",
    "route",
    "next-hop",
    "tag",
    "neighbor",
    "admin-state",
    "description",
  ].includes(selected);
}

function semanticAnchorTail(text) {
  const tokens = tokenizeSemanticAnchor(text);
  return tokens.slice(-4).join(" ");
}

function semanticAnchorHead(text) {
  const tokens = tokenizeSemanticAnchor(text);
  return tokens.slice(0, 2).join(" ");
}

function tokenizeSemanticAnchor(text) {
  return canonicalizeComparableLine(text)
    .replace(/[{}"]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !/^\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?$/.test(token));
}

function inferSemanticValueType(value) {
  const normalized = canonicalizeComparableLine(value);
  if (/^\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}$/.test(normalized)) return "ip-prefix";
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) return "ip";
  if (/^\d+$/.test(normalized)) return "number";
  return "token";
}

function selectionMatchesWholeLine(textarea, selectedText) {
  const normalizedSelected = canonicalizeComparableLine(selectedText);
  return textarea.value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .some((line) => canonicalizeComparableLine(line) === normalizedSelected);
}

function lineActionLabel(action) {
  return previewActionLabel(action);
}

function previewActionLabel(action) {
  return {
    same: "동일",
    added: "추가됨",
    ignore: "무시",
    missing: "사라짐",
    required: "필수 존재",
    "required-field": "필수 변수",
  }[action] || action;
}

function bindDropZone(zone, input, meta) {
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("drag-over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
  zone.addEventListener("drop", async (event) => {
    event.preventDefault();
    zone.classList.remove("drag-over");
    const [file] = event.dataTransfer.files;
    if (!file) return;
    input.value = await file.text();
    meta.textContent = `${file.name} | 마지막 수정 ${formatDate(file.lastModified)}`;
    captureInitialConfigSnapshot(true);
    updateLineNumbers();
    markCompareStale();
  });
}

function captureInitialConfigSnapshot(force = false) {
  const oldValue = selectors.oldInput?.value || "";
  const newValue = selectors.newInput?.value || "";
  if (!force && state.initialConfigSnapshot) return;
  if (!force && !oldValue.trim() && !newValue.trim()) return;
  state.initialConfigSnapshot = {
    oldConfig: oldValue,
    newConfig: newValue,
    capturedAt: Date.now(),
  };
}

function restoreInitialConfigSnapshot(side = "all") {
  if (!state.initialConfigSnapshot) {
    selectors.compareStatus.textContent = "원복할 초기값 없음";
    return;
  }
  if (side === "old" || side === "all") selectors.oldInput.value = state.initialConfigSnapshot.oldConfig;
  if (side === "new" || side === "all") selectors.newInput.value = state.initialConfigSnapshot.newConfig;
  updateLineNumbers();
  markCompareStale();
  selectors.compareStatus.textContent = "초기값 원복 완료";
}

function resetInitialConfigSnapshot() {
  state.initialConfigSnapshot = null;
}

function updateLineNumbers() {
  selectors.oldLineNumbers.textContent = buildLineNumbers(selectors.oldInput.value);
  selectors.newLineNumbers.textContent = buildLineNumbers(selectors.newInput.value);
}

function clearConfigInput(target) {
  resetInitialConfigSnapshot();
  if (target === "old" || target === "all") {
    selectors.oldInput.value = "";
    selectors.oldMeta.textContent = "파일 없음";
  }
  if (target === "new" || target === "all") {
    selectors.newInput.value = "";
    selectors.newMeta.textContent = "파일 없음";
  }
  updateLineNumbers();
  markCompareStale();
}

function markCompareStale() {
  state.compareDirty = true;
  showEditMode();
  selectors.compareStatus.textContent = "비교 필요";
  selectors.lastComparedAt.textContent = "마지막 비교 이후 변경됨";
}

function toggleCompareControls() {
  const workspace = selectors.compareTab.querySelector(".workspace");
  const hidden = workspace.classList.toggle("controls-hidden");
  selectors.toggleControlsBtn.textContent = hidden ? "›" : "‹";
  selectors.toggleControlsBtn.title = hidden ? "비교 옵션 보이기" : "비교 옵션 숨기기";
  selectors.toggleControlsBtn.setAttribute("aria-label", selectors.toggleControlsBtn.title);
  scheduleDiffConnectorRender();
}

function setResultTab(tabName) {
  const target = ["summary", "objects", "overview"].includes(tabName) ? tabName : "summary";
  [
    [selectors.summaryTabBtn, selectors.summaryResultPanel, "summary"],
    [selectors.objectsTabBtn, selectors.objectsResultPanel, "objects"],
    [selectors.overviewTabBtn, selectors.overviewResultPanel, "overview"],
  ].forEach(([button, panel, name]) => {
    const active = name === target;
    button?.classList.toggle("active", active);
    button?.setAttribute("aria-selected", String(active));
    panel?.classList.toggle("active", active);
    if (panel) panel.hidden = !active;
  });
}

function setProfileStatus(message, kind = "info") {
  if (!selectors.profileStatus) return;
  selectors.profileStatus.textContent = message;
  selectors.profileStatus.dataset.kind = kind;
}

function serializeProfileDraft(profile = state.profileDraft) {
  return JSON.stringify(profile || {});
}

function pushProfileUndoSnapshot(reason = "") {
  const current = serializeProfileDraft();
  const last = state.profileUndoStack[state.profileUndoStack.length - 1];
  if (last?.serialized === current) return false;
  state.profileUndoStack.push({
    snapshot: deepClone(state.profileDraft),
    serialized: current,
    reason,
    timestamp: Date.now(),
  });
  state.profileUndoStack = state.profileUndoStack.slice(-80);
  return true;
}

function undoProfileLastChange() {
  const entry = state.profileUndoStack.pop();
  if (!entry) {
    setProfileStatus("되돌릴 직전 변경이 없습니다.", "info");
    return;
  }
  state.profileDraft = deepClone(entry.snapshot);
  state.profileChanges = [];
  state.selectedSemanticTokens = { old: [], new: [] };
  state.activeSemanticSelectionSource = "";
  state.activeSemanticSelectionSource = "";
  state.pendingSemanticMapping = null;
  state.selectedProfileLineLink = null;
  state.pendingProfileLineRef = null;
  renderProfileEditor();
  setProfileStatus(`직전 변경을 취소했습니다${entry.reason ? `: ${entry.reason}` : ""}.`, "saved");
  markCompareStale();
}

function markProfileDirty(section = "Profile", action = "수정", field = "") {
  state.profileChanges.unshift({
    section,
    action,
    field,
    timestamp: Date.now(),
  });
  state.profileChanges = state.profileChanges.slice(0, 40);
  setProfileStatus(`프로파일 변경됨 - 저장 필요 (${state.profileChanges.length}건)`, "dirty");
  renderProfileChanges();
}

function renderProfileChanges() {
  if (!selectors.profileChangesList) return;
  selectors.profileChangesList.innerHTML = state.profileChanges.length
    ? state.profileChanges.map((change) => `
      <div class="profile-change-item">
        <strong>[${escapeHtml(change.action)}] ${escapeHtml(change.section)}</strong>
        <span>${escapeHtml(change.field || "-")}</span>
        <small>${escapeHtml(formatDate(change.timestamp))}</small>
      </div>
    `).join("")
    : `<div class="small-note">저장 이후 변경사항이 없습니다.</div>`;
}

function commitProfileSnapshot() {
  state.profileSavedSnapshot = deepClone(state.profileDraft);
  state.profileChanges = [];
  state.profileUndoStack = [];
  renderProfileChanges();
}

function rollbackProfileChanges() {
  if (!state.profileSavedSnapshot) return;
  state.profileDraft = deepClone(state.profileSavedSnapshot);
  state.profileChanges = [];
  state.selectedSemanticTokens = { old: [], new: [] };
  state.activeSemanticSelectionSource = "";
  state.activeSemanticSelectionSource = "";
  state.pendingSemanticMapping = null;
  state.selectedProfileLineLink = null;
  state.pendingProfileLineRef = null;
  renderProfileEditor();
  setProfileStatus("마지막 저장 상태로 복원했습니다.", "saved");
  markCompareStale();
}

function hasUnsavedProfileChanges() {
  return state.profileChanges.length > 0 && JSON.stringify(state.profileDraft) !== JSON.stringify(state.profileSavedSnapshot);
}

function confirmUnsavedProfileAction(actionLabel) {
  if (!hasUnsavedProfileChanges()) return true;
  const shouldSave = window.confirm?.(`저장되지 않은 변경사항이 있습니다. ${actionLabel} 전에 저장하시겠습니까?`);
  if (shouldSave) {
    saveProfile();
    return true;
  }
  return window.confirm?.("저장하지 않고 계속 진행할까요?") ?? false;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setProfileGuide(message, kind = "info") {
  if (!selectors.profileSelectionGuide) return;
  selectors.profileSelectionGuide.textContent = message;
  selectors.profileSelectionGuide.dataset.kind = kind;
}

function showEditMode() {
  selectors.oldInput.closest(".code-frame").classList.remove("diff-mode");
  selectors.newInput.closest(".code-frame").classList.remove("diff-mode");
  selectors.diffConnectorSvg.closest(".editor-grid").classList.remove("diff-connectors-active");
  selectors.diffConnectorSvg.innerHTML = "";
  clearSelectedDiffTokens();
}

function showDiffMode() {
  selectors.oldInput.closest(".code-frame").classList.add("diff-mode");
  selectors.newInput.closest(".code-frame").classList.add("diff-mode");
  selectors.diffConnectorSvg.closest(".editor-grid").classList.add("diff-connectors-active");
  scheduleDiffConnectorRender();
}

function buildLineNumbers(value) {
  return Array.from({ length: Math.max(1, value.split(/\r?\n/).length) }, (_, index) => index + 1).join("\n");
}

function syncEditorScroll(event) {
  const sourceInput = event.target;
  const sourceLineNumbers = sourceInput === selectors.oldInput ? selectors.oldLineNumbers : selectors.newLineNumbers;
  const targetInput = sourceInput === selectors.oldInput ? selectors.newInput : selectors.oldInput;
  const targetLineNumbers = sourceInput === selectors.oldInput ? selectors.newLineNumbers : selectors.oldLineNumbers;

  sourceLineNumbers.scrollTop = sourceInput.scrollTop;
  if (state.syncingEditorScroll) return;

  state.syncingEditorScroll = true;
  targetInput.scrollTop = sourceInput.scrollTop;
  targetInput.scrollLeft = sourceInput.scrollLeft;
  targetLineNumbers.scrollTop = sourceInput.scrollTop;
  state.syncingEditorScroll = false;
}

function syncDiffScroll(event) {
  if (state.syncingDiffScroll) return;
  const sourcePane = event.target;
  const targetPane = sourcePane === selectors.oldDiffPane ? selectors.newDiffPane : selectors.oldDiffPane;

  state.syncingDiffScroll = true;
  targetPane.scrollTop = sourcePane.scrollTop;
  targetPane.scrollLeft = sourcePane.scrollLeft;
  state.syncingDiffScroll = false;
  scheduleDiffConnectorRender();
}

function clearSelectedDiffTokens() {
  document.querySelectorAll(".diff-token-match.selected").forEach((item) => item.classList.remove("selected"));
  document.querySelectorAll(".diff-token-match.dragging").forEach((item) => item.classList.remove("dragging"));
}

function getOptions() {
  return {
    vendor: state.profileDraft.vendor,
    normalizeSpacing: selectors.normalizeSpacingToggle.checked,
    sortObjects: selectors.sortObjectsToggle.checked,
    autoAlignObjects: selectors.autoAlignToggle.checked,
    ignoreComments: selectors.ignoreCommentsToggle.checked,
    ignoreGenerated: selectors.ignoreGeneratedToggle.checked,
    selectedObjects: [...selectors.objectToggles.querySelectorAll("input:checked")].map((input) => input.dataset.objectType),
    filter: selectors.filterInput.value.trim().toLowerCase(),
    resultFilter: selectors.resultFilterSelect.value,
    profile: state.profileDraft,
  };
}

function runCompare() {
  try {
    selectors.compareStatus.textContent = "비교 중";
    const options = getOptions();
    const oldObjects = safeStep("기존 config 파싱", () => parseConfig(selectors.oldInput.value, options, "old"));
    const newObjects = safeStep("신규 config 파싱", () => parseConfig(selectors.newInput.value, options, "new"));
    const report = safeStep("객체 비교", () => compareObjects(oldObjects, newObjects, options));
    state.lastReport = report;
    safeStep("리포트 렌더링", () => renderReportV2(report));
    safeStep("diff 렌더링", () => renderDiff(report.diffRows || []));
    showDiffMode();
    state.compareDirty = false;
    selectors.compareStatus.textContent = report.items.length ? `차이 ${report.items.length}건` : "차이 없음";
    selectors.lastComparedAt.textContent = `마지막 비교: ${formatDate(Date.now())}`;
  } catch (error) {
    handleCompareError(error);
  }
}

function safeStep(label, callback) {
  try {
    return callback();
  } catch (error) {
    error.message = `${label}: ${error.message}`;
    throw error;
  }
}

function handleCompareError(error) {
  console.error("Network Config Workbench compare error", error);
  selectors.compareStatus.textContent = "비교 오류";
  selectors.lastComparedAt.textContent = `오류 발생: ${formatDate(Date.now())}`;
  selectors.summaryCards.innerHTML = "";
  selectors.reportList.innerHTML = `<li data-type="syntax">비교 중 오류: ${escapeHtml(error?.message || String(error))}</li>`;
  selectors.objectList.innerHTML = "";
  state.lastReport = null;
  try {
    showEditMode();
  } catch (renderError) {
    console.error("Failed to render compare error state", renderError);
  }
}

function parseConfig(text, options, source) {
  try {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const objects = [];
  let current = null;
  const flushCurrent = () => {
    if (!current) return;
    objects.push(finalizeObject(current, options, source));
    current = null;
  };

  lines.forEach((rawLine, index) => {
    const normalized = normalizeLine(rawLine, options);

    const canonicalObject = buildCanonicalObject(rawLine, options, source, index + 1);
    if (canonicalObject) {
      flushCurrent();
      objects.push(canonicalObject);
      return;
    }

    const detected = detectObjectStart(normalized, options, source);
    if (detected) {
      flushCurrent();
      current = {
        type: source === "new" ? mapNewObjectTypeToOld(detected.type, options.profile.mappings) : detected.type,
        sourceType: detected.type,
        name: detected.name,
        key: buildObjectKey(detected.type, detected.name, source, options.profile.mappings),
        startLine: index + 1,
        lines: [normalized],
        rawLines: [rawLine],
      };
      return;
    }
    if (!current) current = { type: "global", sourceType: "global", name: "global", key: "global:global", startLine: index + 1, lines: [], rawLines: [] };
    current.lines.push(normalized);
    current.rawLines.push(rawLine);
  });
  flushCurrent();
  const filtered = objects.filter((object) => object.type === "global" || options.selectedObjects.includes(object.type));
  const merged = mergeObjectsByCanonicalKey(filtered, options, source);
  return options.sortObjects ? sortObjects(merged) : merged;
  } catch (error) {
    console.error(`parseConfig failed (${source})`, error);
    throw error;
  }
}

function tokenizeConfigLine(line) {
  const source = String(line || "");
  const tokens = [];
  const regex = /"([^"]*)"|[{}]|\S+/g;
  let match;
  while ((match = regex.exec(source))) {
    const raw = match[0];
    const quotedValue = match[1];
    const token = stripTrailingSyntax((quotedValue !== undefined ? quotedValue : raw).replace(/^"|"$/g, ""));
    tokens.push({
      raw,
      token,
      normalized: canonicalizeComparableLine(token),
      start: match.index,
      end: match.index + raw.length,
      quoted: quotedValue !== undefined,
    });
  }
  return tokens;
}

function buildCanonicalObject(rawLine, options, source, lineNumber = 1) {
  const normalized = normalizeLine(rawLine, options);
  const type = inferCanonicalLineObjectType(normalized, options, source);
  if (!type) return null;

  const canonicalType = source === "new" ? mapNewObjectTypeToOld(type, options.profile.mappings) : type;
  const fields = extractFieldsFromLine(rawLine, options.profile, canonicalType);
  const objectField = defaultObjectFieldForType(canonicalType);
  const objectName = fields[objectField] || fields.route || fields.neighbor || fields.interface || "";
  if (!objectName) return null;

  const lines = [normalized];
  const fieldOccurrences = extractFieldOccurrencesFromLine(rawLine, canonicalType, 0);
  const object = {
    type: canonicalType,
    sourceType: type,
    name: objectName,
    key: `${canonicalType}:${objectName}`,
    startLine: lineNumber,
    endLine: lineNumber,
    lines,
    rawLines: [rawLine],
    canonicalFields: fields,
    fields,
    fieldOccurrences,
    canonicalOnly: true,
    source,
  };
  object.comparableText = semanticObjectToComparableLines({
    type: object.type,
    source,
    fields,
  }, options.profile, source).map(canonicalizeComparableLine).join("\n");
  return object;
}

function inferCanonicalLineObjectType(normalizedLine, options, source) {
  const line = canonicalizeComparableLine(normalizedLine);
  if (isOneLineStaticRoute(line)) return "static-route";

  for (const type of objectTypes) {
    if (type === "static-route") continue;
    const fields = extractFieldsFromLine(line, options.profile, type);
    const objectField = defaultObjectFieldForType(type);
    if (fields[objectField] && Object.keys(fields).length > 1) return type;
  }
  return "";
}

function isOneLineStaticRoute(line) {
  const normalized = canonicalizeComparableLine(line);
  if (!/(?:^|[\s{])(?:static-routes\s+)?route\s+"?\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}"?/.test(normalized)) return false;
  return /^\/?configure\b/.test(normalized)
    || /\bstatic-routes\b/.test(normalized)
    || (/\bnext-hop\b/.test(normalized) && (/\badmin-state\b|\bdescription\b|\btag\b/.test(normalized)));
}

function extractFieldsFromLine(line, profile = state.profileDraft, objectType = "") {
  const normalized = canonicalizeComparableLine(line);
  const fields = {};
  const setField = (field, value) => {
    const normalizedField = canonicalizeComparableLine(field);
    const normalizedValue = normalizeParserFieldValue(normalizedField, stripTrailingSyntax(value || ""));
    if (normalizedField && normalizedValue && fields[normalizedField] === undefined) fields[normalizedField] = normalizedValue;
  };

  if (!objectType || objectType === "static-route") {
    setField("route", normalized.match(/(?:^|[\s{])(?:static-route-entry|route)\s+"?(\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2})"?/)?.[1]);
    setField("next-hop", normalized.match(/\bnext-hop\s+"?([^"\s{}]+)"?/)?.[1]);
    setField("tag", normalized.match(/\btag\s+([^"\s{}]+)/)?.[1]);
    setField("description", extractDescriptionValue(line));
    if (/\bno\s+shutdown\b|\badmin-state\s+enable\b/.test(normalized)) setField("state", "enabled");
    if (/\bshutdown\b|\badmin-state\s+disable\b/.test(normalized)) setField("state", "disabled");
  }

  if (!objectType || objectType === "bgp") {
    setField("neighbor", normalized.match(/\bneighbor\s+"?([^"\s{}]+)"?/)?.[1]);
    setField("peer-as", normalized.match(/\bpeer-as\s+([^"\s{}]+)/)?.[1]);
    setField("authentication-key", normalized.match(/\bauthentication-key\s+"?([^"\s{}]+)"?/)?.[1]);
    setField("description", extractDescriptionValue(line));
  }

  const objectProfile = profile?.objects?.[objectType];
  Object.entries(objectProfile?.fields || {}).forEach(([field, rule]) => {
    if (fields[field] !== undefined) return;
    const value = extractSemanticFieldFromLine(normalized, rule, field, profile?.normalize);
    if (value) fields[field] = value;
  });

  return fields;
}

function extractFieldOccurrencesFromLine(line, objectType = "", rawLineIndex = 0) {
  const source = String(line || "");
  const normalized = canonicalizeComparableLine(source);
  const occurrences = [];
  const add = (field, value, token, role = "terminal") => {
    const normalizedField = canonicalizeComparableLine(field);
    const normalizedValue = normalizeParserFieldValue(normalizedField, stripTrailingSyntax(value || ""));
    if (!normalizedField || !normalizedValue) return;
    const tokenValue = token || value;
    occurrences.push({
      field: normalizedField,
      value: normalizedValue,
      role,
      rawLineIndex,
      token: String(tokenValue || ""),
    });
  };

  if (!objectType || objectType === "static-route") {
    const route = normalized.match(/(?:^|[\s{])(?:static-route-entry|route)\s+"?(\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2})"?/);
    if (route) {
      add("route", route[1], "route", "context");
      add("route", route[1], route[1], "context");
    }
    const nextHop = normalized.match(/\bnext-hop\s+"?([^"\s{}]+)"?/);
    if (nextHop) {
      add("next-hop", nextHop[1], "next-hop", "context");
      add("next-hop", nextHop[1], nextHop[1], "context");
    }
    const description = extractDescriptionValue(source);
    if (description) {
      add("description", description, "description", "terminal");
      add("description", description, description, "terminal");
      add("description", description, `"${description}"`, "terminal");
    }
    const tag = normalized.match(/\btag\s+([^"\s{}]+)/);
    if (tag) {
      add("tag", tag[1], "tag", "terminal");
      add("tag", tag[1], tag[1], "terminal");
    }
    if (/\bno\s+shutdown\b/.test(normalized)) {
      add("state", "enabled", "no shutdown", "terminal");
      add("state", "enabled", "no", "terminal");
      add("state", "enabled", "shutdown", "terminal");
    }
    if (/\badmin-state\s+enable\b/.test(normalized)) {
      add("state", "enabled", "admin-state", "terminal");
      add("state", "enabled", "enable", "terminal");
    }
    if (/\badmin-state\s+disable\b/.test(normalized)) {
      add("state", "disabled", "admin-state", "terminal");
      add("state", "disabled", "disable", "terminal");
    }
  }
  return occurrences;
}

function extractDescriptionValue(line) {
  const source = String(line || "");
  const quoted = source.match(/\bdescription\s+"([^"]+)"/i);
  if (quoted) return quoted[1];
  const normalized = canonicalizeComparableLine(source);
  return normalized.match(/\bdescription\s+([^{}\s]+)/)?.[1] || "";
}

function mergeObjectsByCanonicalKey(objects, options, source) {
  const merged = new Map();
  const output = [];
  objects.forEach((object, index) => {
    const safeObject = ensureObjectShape(object, source, index);
    if (safeObject.type === "global") {
      output.push(safeObject);
      return;
    }
    if (!merged.has(safeObject.key)) {
      merged.set(safeObject.key, {
        ...safeObject,
        lines: [...safeObject.lines],
        rawLines: [...safeObject.rawLines],
        canonicalFields: { ...(safeObject.canonicalFields || {}) },
        fieldOccurrences: [...(safeObject.fieldOccurrences || [])],
      });
      merged.get(safeObject.key).fields = merged.get(safeObject.key).canonicalFields;
      output.push(merged.get(safeObject.key));
      return;
    }
    const target = merged.get(safeObject.key);
    const lineOffset = target.lines.length;
    target.startLine = Math.min(target.startLine, safeObject.startLine);
    target.endLine = Math.max(target.endLine, safeObject.endLine);
    target.lines.push(...safeObject.lines);
    target.rawLines.push(...safeObject.rawLines);
    target.fieldOccurrences.push(...(safeObject.fieldOccurrences || []).map((item) => ({ ...item, rawLineIndex: item.rawLineIndex + lineOffset })));
    target.canonicalFields = mergeCanonicalFields(target.canonicalFields, safeObject.canonicalFields);
    target.fields = target.canonicalFields;
    target.comparableText = semanticObjectToComparableLines({
      type: target.type,
      source,
      fields: target.canonicalFields,
    }, options.profile, source).map(canonicalizeComparableLine).join("\n");
  });
  return output;
}

function ensureObjectShape(object, source, index = 0) {
  const type = object?.type || "global";
  const name = object?.name || `${source || "object"}-${index + 1}`;
  const key = object?.key || `${type}:${name}`;
  const lines = Array.isArray(object?.lines) ? object.lines : [];
  const rawLines = Array.isArray(object?.rawLines) ? object.rawLines : lines;
  const startLine = Number.isFinite(object?.startLine) ? object.startLine : 1;
  return {
    ...object,
    type,
    name,
    key,
    source: object?.source || source,
    startLine,
    endLine: Number.isFinite(object?.endLine) ? object.endLine : startLine + Math.max(0, rawLines.length - 1),
    lines,
    rawLines,
    canonicalFields: object?.canonicalFields || {},
    fields: object?.fields || object?.canonicalFields || {},
    fieldOccurrences: Array.isArray(object?.fieldOccurrences) ? object.fieldOccurrences : [],
    comparableText: object?.comparableText || "",
  };
}

function mergeCanonicalFields(current = {}, incoming = {}) {
  return Object.entries(incoming || {}).reduce((result, [field, value]) => {
    if (value === undefined || value === "") return result;
    result[field] = value;
    return result;
  }, { ...(current || {}) });
}

function normalizeLine(line, options) {
  let value = line.trimEnd();
  if (options.normalizeSpacing) value = value.trim().replace(/\s+/g, " ");
  value = value.replace(/^\/configure\s+\{\s*/i, "configure ");
  return value;
}

function shouldIgnoreLine(normalizedLine, rawLine, options, source) {
  const lower = normalizedLine.trim().toLowerCase();
  if (options.ignoreComments && (!lower || lower.startsWith("#") || lower.startsWith("//") || lower.startsWith("!"))) return true;
  if (options.ignoreGenerated && /timestamp|last modified|generated|created by|time:|date:/.test(lower)) return true;
  return options.profile.rules.ignore.some((rule) => rule.source === source && canonicalizeComparableLine(rawLine).includes(canonicalizeComparableLine(rule.pattern)));
}

function detectObjectStart(line, options, source = "old") {
  const normalized = canonicalizeComparableLine(line);
  const profileObjectDetected = detectSemanticProfileObjectStart(normalized, options, source);
  if (profileObjectDetected) return profileObjectDetected;

  const semanticDetected = detectSemanticRuleObjectStart(normalized, options, source);
  if (semanticDetected) return semanticDetected;

  const parserDetected = detectParserRuleObjectStart(normalized, { ...options, source });
  if (parserDetected) return parserDetected;

  const profileDetected = detectProfileObjectStart(normalized, options, source);
  if (profileDetected) return profileDetected;

  const rules = vendorRules[options.vendor] || vendorRules.nokia;
  for (const rule of rules) {
    const match = normalized.match(rule.pattern);
    if (match) return { type: rule.type, name: match[1] || normalized };
  }
  return null;
}

function detectSemanticProfileObjectStart(normalizedLine, options, source) {
  const objects = options.profile?.objects || {};
  for (const type of objectTypes) {
    const objectProfile = objects[type];
    const objectKeyFields = Array.isArray(objectProfile?.objectKey) ? objectProfile.objectKey : [];
    for (const field of objectKeyFields) {
      const value = extractSemanticFieldFromLine(normalizedLine, objectProfile.fields?.[field], field, options.profile?.normalize);
      if (value) return { type, name: value };
    }
  }
  return null;
}

function detectSemanticRuleObjectStart(normalizedLine, options, source) {
  for (const type of objectTypes) {
    const rules = options.profile?.semanticRules?.[type] || [];
    for (const rule of rules) {
      if (rule.role !== "object-key" || !sourceMatchesRule(rule.source, source)) continue;
      const value = extractSemanticRuleValue(normalizedLine, rule);
      if (value) return { type, name: value };
    }
  }
  return null;
}

function sourceMatchesRule(ruleSource, source) {
  return !ruleSource || ruleSource === "both" || ruleSource === source;
}

function extractSemanticRuleValue(line, rule) {
  const normalizedLine = canonicalizeComparableLine(line);
  const before = canonicalizeComparableLine(rule.selector?.anchorBefore || "");
  if (before && !normalizedLine.includes(before)) return "";
  const start = before ? normalizedLine.indexOf(before) + before.length : 0;
  const after = canonicalizeComparableLine(rule.selector?.anchorAfter || "");
  const rest = normalizedLine.slice(start).trim();
  const pattern = semanticValuePattern(rule.valueType);
  const regex = after
    ? new RegExp(`^${pattern.source}(?:\\s+${escapeRegExp(after)}|\\s|$)`)
    : new RegExp(`^${pattern.source}`);
  const match = rest.match(regex) || rest.match(pattern);
  const value = match ? stripTrailingSyntax(match[1] || match[0]) : "";
  const field = canonicalizeComparableLine(rule.field || "");
  if (value && shouldUseNextTokenAsSemanticValue(value, field)) {
    const valueIndex = normalizedLine.indexOf(value, before ? start : 0);
    const nextToken = valueIndex >= 0 ? tokenAfterSelection(normalizedLine, valueIndex, value) : null;
    if (nextToken?.value) return nextToken.value;
  }
  return value;
}

function semanticValuePattern(valueType) {
  if (valueType === "ip-prefix") return /(\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2})/;
  if (valueType === "ip") return /(\d{1,3}(?:\.\d{1,3}){3})/;
  if (valueType === "number") return /(\d+)/;
  return /"?([^"\s{}]+)"?/;
}

function detectParserRuleObjectStart(normalizedLine, options) {
  for (const type of objectTypes) {
    const rules = options.profile?.parserRules?.[type] || [];
    for (const rule of rules) {
      if (rule.source && rule.source !== "both" && rule.source !== options.source) continue;
      const fields = extractParserRuleFields(normalizedLine, rule);
      if (!fields) continue;
      const objectField = canonicalizeComparableLine(rule.objectField || defaultObjectFieldForType(type));
      const name = fields[objectField] || fields[defaultObjectFieldForType(type)] || extractObjectNameFromLine(normalizedLine);
      if (name) return { type, name };
    }
  }
  return null;
}

function extractParserRuleFields(line, rule) {
  const compiled = compileParserRulePattern(rule.pattern || "");
  if (!compiled) return null;
  const match = canonicalizeComparableLine(line).match(compiled.regex);
  if (!match) return null;
  return compiled.fields.reduce((fields, field, index) => {
    const value = stripTrailingSyntax(match[index + 1] || "").replace(/^"|"$/g, "");
    if (value) fields[field] = normalizeParserFieldValue(field, value);
    return fields;
  }, {});
}

function compileParserRulePattern(pattern) {
  const normalized = canonicalizeComparableLine(pattern);
  if (!normalized || !normalized.includes("{")) return null;
  const fields = [];
  let regex = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (/\s/.test(char)) {
      while (/\s/.test(normalized[index + 1])) index += 1;
      regex += "\\s+";
      continue;
    }
    if (char === "*") {
      regex += ".*?";
      continue;
    }
    if (char === "{") {
      const end = normalized.indexOf("}", index);
      if (end < 0) return null;
      const field = canonicalizeComparableLine(normalized.slice(index + 1, end));
      if (!field) return null;
      fields.push(field);
      regex += '"?([^"\\s{}]+)"?';
      index = end;
      continue;
    }
    regex += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  regex += ".*$";
  try {
    return { regex: new RegExp(regex), fields };
  } catch {
    return null;
  }
}

function normalizeParserFieldValue(field, value) {
  const normalized = canonicalizeComparableLine(value);
  if (field === "state" || field === "admin-state") {
    if (["enable", "enabled", "no shutdown"].includes(normalized)) return "enabled";
    if (["disable", "disabled", "shutdown"].includes(normalized)) return "disabled";
  }
  return normalized;
}

function detectProfileObjectStart(normalizedLine, options, source) {
  const mappingsByType = options.profile?.lineMappings || {};
  for (const type of objectTypes) {
    const mappings = mappingsByType[type] || [];
    for (let index = 0; index < mappings.length; index += 1) {
      const mapping = mappings[index];
      const pattern = source === "old" ? mapping.oldText : mapping.newText;
      if (pattern && canonicalizeComparableLine(pattern) === normalizedLine) {
        if (!isProfileObjectStartCandidate(type, normalizedLine)) continue;
        const canonicalName = extractObjectNameFromLine(canonicalizeComparableLine(mapping.oldText || mapping.newText || `mapping-${index + 1}`));
        return { type, name: canonicalName };
      }
    }
  }
  return null;
}

function isProfileObjectStartCandidate(type, line) {
  const normalized = canonicalizeComparableLine(line);
  const checks = {
    port: /^(?:configure\s+)?port\s+/,
    lag: /^(?:configure\s+)?lag\s+/,
    interface: /^(?:configure\s+)?(?:router\s+)?interface\s+/,
    "static-route": /^(?:static-route-entry|route)\s+/,
    pim: /^(?:configure\s+)?pim\s+/,
    bgp: /^neighbor\s+/,
  };
  return checks[type]?.test(normalized) || false;
}

function extractObjectNameFromLine(line) {
  const address = line.match(/\b\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?\b/);
  if (address) return address[0];
  const quoted = line.match(/"([^"]+)"/);
  if (quoted) return quoted[1];
  return line;
}

function mapNewObjectTypeToOld(type, mappings) {
  const mapping = mappings.find((item) => item.newType === type);
  return mapping ? mapping.oldType : type;
}

function buildObjectKey(type, name, source, mappings) {
  if (source === "new") {
    const mapping = mappings.find((item) => item.newType === type);
    return `${mapping ? mapping.oldType : type}:${name}`;
  }
  return `${type}:${name}`;
}

function finalizeObject(object, options, source) {
  const canonicalType = source === "new" ? mapNewObjectTypeToOld(object.sourceType, options.profile.mappings) : object.type;
  const objectWithCanonicalType = { ...object, type: canonicalType };
  const canonicalIdentity = computeCanonicalObjectIdentity(objectWithCanonicalType, options.profile, source);
  const finalizedObject = {
    ...objectWithCanonicalType,
    name: canonicalIdentity.name,
    key: canonicalIdentity.key,
    canonicalFields: canonicalIdentity.fields,
    fieldOccurrences: object.rawLines.flatMap((line, index) => extractFieldOccurrencesFromLine(line, canonicalType, index)),
  };
  const lines = buildComparableLines(finalizedObject, options, source);
  const comparableLines = options.sortObjects ? sortComparableLines(lines) : lines;
  const identityName = buildProfileObjectIdentity(finalizedObject, options);
  const finalName = identityName || canonicalIdentity.name;
  return {
    ...finalizedObject,
    name: finalName,
    key: identityName ? `${canonicalType}:${identityName}` : canonicalIdentity.key,
    source,
    endLine: object.startLine + Math.max(0, object.rawLines.length - 1),
    fields: canonicalIdentity.fields,
    comparableText: comparableLines.map(canonicalizeComparableLine).join("\n"),
  };
}

function computeCanonicalObjectIdentity(object, profile, source) {
  const fields = extractCanonicalFields(object, profile, source);
  const keyFields = profile?.objects?.[object.type]?.objectKey || getDefaultObjectKeyFields(object.type);
  for (const field of keyFields) {
    const normalizedField = canonicalizeComparableLine(field);
    if (fields[normalizedField]) {
      return {
        name: fields[normalizedField],
        key: `${object.type}:${fields[normalizedField]}`,
        fields,
      };
    }
  }

  return {
    name: object.name,
    key: `${object.type}:${object.name}`,
    fields,
  };
}

function getDefaultObjectKeyFields(type) {
  return {
    port: ["port"],
    lag: ["lag"],
    interface: ["interface"],
    "static-route": ["route"],
    pim: ["interface"],
    bgp: ["neighbor"],
  }[type] || ["name"];
}

function extractCanonicalFields(object, profile = state.profileDraft, source = object.source) {
  const semanticObject = buildCanonicalSemanticObject(object, profile, source);
  return {
    ...collectParserRuleFields(object, profile),
    ...collectSemanticFields(object, profile),
    ...collectSemanticMappingFields(object, profile, source),
    ...(semanticObject?.fields || {}),
    ...extractFallbackCanonicalFields(object, profile),
  };
}

function collectSemanticMappingFields(object, profile = state.profileDraft, source = object.source) {
  const mappings = profile?.semanticMappings?.[object.type] || [];
  const fields = {};
  mappings.forEach((mapping) => {
    const selectorsForSource = getSemanticMappingNodes(mapping, source);
    for (const selector of selectorsForSource || []) {
      const value = extractValueByTokenSelectorFromObject(object, mapping.field, selector);
      if (value) {
        fields[mapping.field] = value;
        break;
      }
    }
  });
  return fields;
}

function extractValueByTokenSelectorFromObject(object, field, selector) {
  for (const line of object.lines) {
    const value = extractValueByTokenSelector(line, field, selector);
    if (value) return value;
  }
  return "";
}

function extractValueByTokenSelector(line, field, selector) {
  const normalized = canonicalizeComparableLine(line);
  const selected = canonicalizeComparableLine(selector?.selectedToken || selector?.token || "");
  if (selected && !normalized.includes(selected)) return "";
  return extractKnownFieldValue(normalized, field) || canonicalizeComparableLine(selector?.value || "");
}

function extractFallbackCanonicalFields(object, profile = state.profileDraft) {
  const lines = object.lines.map((line) => prepareSemanticSourceLine(line, profile?.normalize)).filter(Boolean);
  const fields = {};
  if (object.type === "static-route") {
    fields.route = findStaticRoutePrefix(lines) || normalizeSemanticValue(object.name, profile?.normalize);
    const nextHop = findStaticRouteNextHop(lines);
    const tag = findStaticRouteTag(lines);
    const state = findStaticRouteState(lines);
    if (nextHop) fields["next-hop"] = nextHop;
    if (tag) fields.tag = tag;
    if (state) fields.state = state;
  }
  return fields;
}

function buildProfileObjectIdentity(object, options) {
  const rule = getIdentityRuleForSource(options.profile?.identityRules?.[object.type], object.source || "old", object.type);
  const lines = [...object.lines, ...object.rawLines].map(canonicalizeComparableLine);

  if (!rule) return "";
  if (rule.mode === "header") {
    if (!rule.pattern) return "";
    const headerLines = [lines[0], ...lines].filter(Boolean);
    for (const line of headerLines) {
      const identity = extractHeaderIdentityByPattern(line, rule.pattern);
      if (identity) return identity;
    }
    return "";
  }

  if (rule.mode === "description") {
    const descriptionLine = lines.find((line) => /^description\s+/.test(line));
    if (!descriptionLine) return "";
    return extractIdentityByPattern(descriptionLine, rule.pattern) || extractDescriptionIdentity(descriptionLine);
  }

  if (rule.mode === "regex") {
    for (const line of lines) {
      const identity = extractIdentityByPattern(line, rule.pattern);
      if (identity) return identity;
    }
  }

  return "";
}

function extractHeaderIdentityByPattern(line, pattern) {
  const normalizedLine = canonicalizeComparableLine(line);
  const normalizedPattern = canonicalizeComparableLine(pattern);
  if (!normalizedLine || !normalizedPattern) return "";

  const regexIdentity = extractIdentityByPattern(normalizedLine, pattern);
  if (regexIdentity && regexIdentity !== canonicalizeIdentity(normalizedPattern)) return regexIdentity;

  const prefixIdentity = extractIdentityAfterLiteralPrefix(normalizedLine, normalizedPattern);
  if (prefixIdentity) return prefixIdentity;

  const loosePrefix = normalizedPattern.replace(/[{}"]/g, " ").replace(/\s+/g, " ").trim();
  const looseLine = normalizedLine.replace(/[{}"]/g, " ").replace(/\s+/g, " ").trim();
  return extractIdentityAfterLiteralPrefix(looseLine, loosePrefix);
}

function extractIdentityAfterLiteralPrefix(line, prefix) {
  const normalizedLine = canonicalizeComparableLine(line);
  const normalizedPrefix = canonicalizeComparableLine(prefix);
  const index = normalizedLine.indexOf(normalizedPrefix);
  if (index < 0) return "";
  const rest = normalizedLine.slice(index + normalizedPrefix.length).trim();
  const token = rest.match(/^["']?([^"'\s{}]+)["']?/)?.[1] || "";
  return canonicalizeIdentity(stripTrailingSyntax(token));
}

function getIdentityRuleForSource(rule, source, type = state.selectedProfileObjectType) {
  return normalizeIdentityRuleBySide(rule, type)[source === "new" ? "new" : "old"];
}

function normalizeIdentityRuleBySide(rule, type = state.selectedProfileObjectType) {
  const defaults = createDefaultIdentityRuleForType(type);
  if (!rule || typeof rule !== "object") return defaults;
  if (rule.old || rule.new) {
    return {
      old: normalizeIdentityRuleRecord(rule.old || rule.new, defaults.old),
      new: normalizeIdentityRuleRecord(rule.new || rule.old, defaults.new),
    };
  }
  const legacy = normalizeIdentityRuleRecord(rule, defaults.old);
  return { old: { ...legacy }, new: { ...legacy } };
}

function normalizeIdentityRuleRecord(rule, fallback = { mode: "header", pattern: "" }) {
  return {
    mode: ["header", "description", "regex"].includes(rule?.mode) ? rule.mode : fallback.mode,
    pattern: typeof rule?.pattern === "string" ? rule.pattern : fallback.pattern,
  };
}

function extractIdentityByPattern(line, pattern) {
  if (!pattern) return "";
  try {
    const match = canonicalizeComparableLine(line).match(new RegExp(pattern));
    return canonicalizeIdentity(match?.[1] || match?.[0] || "");
  } catch {
    return "";
  }
}

function extractDescriptionIdentity(line) {
  const normalized = canonicalizeComparableLine(line);
  const hashes = normalized.match(/##\s*(.*?)\s*##/);
  if (hashes) return canonicalizeIdentity(hashes[1]);
  const quoted = normalized.match(/description\s+"([^"]+)"/);
  if (quoted) return canonicalizeIdentity(quoted[1]);
  return canonicalizeIdentity(normalized.replace(/^description\s+/, ""));
}

function canonicalizeIdentity(value) {
  return String(value || "").trim().replace(/^#+|#+$/g, "").trim();
}

function buildComparableLines(object, options, source) {
  const semanticObject = buildCanonicalSemanticObject(object, options.profile, source);
  if (semanticObject) return semanticObjectToComparableLines(semanticObject, options.profile, source);

  const semanticLines = collectSemanticComparableLines(object, options.profile, source);
  const lines = object.type === "static-route"
    ? buildStaticRouteComparableLines(object, options.profile, source)
    : applyContextMappingsToLines(object.lines, object.type, source, options.profile.contextMappings)
    .filter((line, index) => !shouldIgnoreLine(canonicalizeComparableLine(line), object.rawLines?.[index] || line, options, source))
    .filter((line) => shouldKeepComparableLine(line, object.type, source, options.profile.lineRules))
    .map((line) => applyLineMappings(line, object.type, source, options.profile.lineMappings))
    .map((line) => applyFieldMappings(line, object.type, source, options.profile.fieldMappings))
    .map((line) => applyComparableLineRule(line, object.type, source, options.profile.lineRules));
  return [...new Set([...lines, ...semanticLines].map(canonicalizeComparableLine))]
    .map((line) => applyValidationPolicy(line, object.type, source, options.profile.validationPolicies))
    .filter(Boolean);
}

function buildCanonicalSemanticObject(object, profile = state.profileDraft, source = object.source) {
  const objectProfile = profile?.objects?.[object.type];
  if (!objectProfile?.fields) return null;
  const fields = { ...(object.canonicalFields || {}) };
  const normalizedLines = object.lines
    .map((line) => prepareSemanticSourceLine(line, profile?.normalize))
    .filter(Boolean);

  normalizedLines.forEach((line) => {
    Object.entries(objectProfile.fields).forEach(([fieldName, fieldRule]) => {
      if (fields[fieldName] !== undefined) return;
      const value = extractSemanticFieldFromLine(line, fieldRule, fieldName, profile?.normalize);
      if (value !== "") fields[fieldName] = value;
    });
  });

  const objectKeyFields = Array.isArray(objectProfile.objectKey) ? objectProfile.objectKey : [];
  objectKeyFields.forEach((fieldName) => {
    if (fields[fieldName] === undefined && fieldName === defaultObjectFieldForType(object.type)) {
      fields[fieldName] = normalizeSemanticValue(object.name, profile?.normalize);
    }
  });

  if (!Object.keys(fields).length) return null;
  return { type: object.type, source, keyFields: objectKeyFields, fields };
}

function semanticObjectToComparableLines(semanticObject, profile = state.profileDraft, source = semanticObject.source) {
  const objectProfile = profile?.objects?.[semanticObject.type] || {};
  const policies = objectProfile.policies || {};
  return Object.entries(semanticObject.fields)
    .map(([field, value]) => {
      const policy = findProfilePolicyForField(semanticObject.type, field, profile)?.policy || policies[field] || "compare";
      if (policy === "ignore") return "";
      const normalizedValue = applySemanticPolicyNormalize(field, value, semanticObject.type, source, profile);
      if (["presence", "required"].includes(policy)) return field;
      return `${field} ${normalizedValue}`;
    })
    .filter(Boolean);
}

function extractSemanticFieldFromLine(line, fieldRule, fieldName, normalizeRules) {
  const knownValue = extractKnownFieldValue(line, fieldName);
  if (knownValue) return normalizeSemanticValue(knownValue, normalizeRules);
  const patterns = Array.isArray(fieldRule?.patterns) ? fieldRule.patterns : [];
  for (const pattern of patterns) {
    const extracted = extractSemanticPatternValue(line, pattern, normalizeRules);
    if (extracted !== "") return extracted;
  }
  return "";
}

function extractKnownFieldValue(line, fieldName) {
  const normalized = canonicalizeComparableLine(line);
  if (fieldName === "route") return stripTrailingSyntax(normalized.match(/(?:^|\s)(?:static-route-entry|route)\s+"?(\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2})"?\b/)?.[1] || "");
  if (fieldName === "next-hop") return stripTrailingSyntax(normalized.match(/\bnext-hop\s+"?([^"\s{}]+)"?/)?.[1] || "");
  if (fieldName === "tag") return stripTrailingSyntax(normalized.match(/\btag\s+([^"\s{}]+)/)?.[1] || "");
  if (fieldName === "description") return stripTrailingSyntax(normalized.match(/\bdescription\s+"([^"]+)"/)?.[1] || normalized.match(/\bdescription\s+([^{}\s]+)/)?.[1] || "");
  if (fieldName === "state" || fieldName === "admin-state") {
    if (/\bno\s+shutdown\b|\badmin-state\s+enable\b/.test(normalized)) return "enabled";
    if (/\bshutdown\b|\badmin-state\s+disable\b/.test(normalized)) return "disabled";
  }
  if (fieldName === "neighbor") return stripTrailingSyntax(normalized.match(/\bneighbor\s+"?([^"\s{}]+)"?/)?.[1] || "");
  return "";
}

function extractSemanticPatternValue(line, pattern, normalizeRules) {
  const syntaxLine = canonicalizeComparableLine(line).replace(/[{}"]/g, " ").replace(/\s+/g, " ").trim();
  const normalizedLine = normalizeSemanticLine(line, normalizeRules);
  const normalizedPattern = canonicalizeComparableLine(pattern);
  if ((!normalizedLine && !syntaxLine) || !normalizedPattern) return "";

  if (normalizedPattern.includes("->")) {
    const [from, to] = normalizedPattern.split("->").map((part) => canonicalizeComparableLine(part));
    return from && syntaxLine.includes(from) ? normalizeSemanticValue(to, normalizeRules) : "";
  }

  if (!normalizedPattern.includes("{value}")) {
    return normalizedLine === normalizedPattern ? normalizeSemanticValue(normalizedLine, normalizeRules) : "";
  }

  const regex = compileSemanticValuePattern(normalizedPattern);
  const match = normalizedLine.match(regex);
  return match ? normalizeSemanticValue(match[1] || "", normalizeRules) : "";
}

function compileSemanticValuePattern(pattern) {
  const marker = "__SEMANTIC_VALUE__";
  const escaped = pattern
    .replace("{value}", marker)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(marker, '"?([^"\\s{}]+(?:\\s+[^"{}]+?)?)"?');
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|\\{|\\}|$)`);
}

function normalizeSemanticLine(line, normalizeRules = {}) {
  let value = canonicalizeComparableLine(line).replace(/[{}"]/g, " ").replace(/\s+/g, " ").trim();
  const remove = Array.isArray(normalizeRules?.remove) ? normalizeRules.remove.map(canonicalizeComparableLine) : [];
  if (remove.includes(value)) return "";
  return normalizeSemanticValue(value, normalizeRules);
}

function prepareSemanticSourceLine(line, normalizeRules = {}) {
  const value = canonicalizeComparableLine(line).replace(/[{}"]/g, " ").replace(/\s+/g, " ").trim();
  const remove = Array.isArray(normalizeRules?.remove) ? normalizeRules.remove.map(canonicalizeComparableLine) : [];
  return remove.includes(value) ? "" : value;
}

function normalizeSemanticValue(value, normalizeRules = {}) {
  const normalized = stripTrailingSyntax(canonicalizeComparableLine(value).replace(/^"|"$/g, ""));
  const map = normalizeRules?.map || {};
  return map[normalized] || normalized;
}

function applySemanticPolicyNormalize(field, value, objectType, source, profile) {
  const policy = findProfilePolicyForField(objectType, field, profile);
  if (policy?.policy !== "exception" && (profile?.objects?.[objectType]?.policies?.[field] !== "normalize")) return value;
  const oldValues = splitPolicyValues(policy?.oldValues);
  const newValue = canonicalizeComparableLine(policy?.newValue || "");
  if (!newValue) return value;
  if (source === "old" && oldValues.includes(value)) return newValue;
  if (source === "new" && value === newValue) return newValue;
  return value;
}

function findProfilePolicyForField(objectType, field, profile) {
  return (profile?.validationPolicies?.[objectType] || [])
    .find((policy) => canonicalizeComparableLine(policy.field || "") === field);
}

function collectSemanticComparableLines(object, profile, source) {
  const rules = (profile?.semanticRules?.[object.type] || []).filter((rule) => rule.role === "compare-field" && sourceMatchesRule(rule.source, source));
  if (!rules.length) return [];
  const seen = new Set();
  const result = [];
  object.lines.forEach((line) => {
    rules.forEach((rule) => {
      const value = extractSemanticRuleValue(line, rule);
      const field = canonicalizeComparableLine(rule.field || "");
      if (!value || !field) return;
      const comparable = `${field} ${normalizeParserFieldValue(field, value)}`;
      if (seen.has(comparable)) return;
      seen.add(comparable);
      result.push(comparable);
    });
  });
  return result;
}

function buildStaticRouteComparableLines(object, profile = state.profileDraft, source = object.source) {
  const lines = object.lines.map(canonicalizeComparableLine);
  const parserFields = collectParserRuleFields(object, profile);
  const semanticFields = collectSemanticFields(object, profile);
  const contextLines = applyContextMappingsToLines(object.lines, object.type, source, profile.contextMappings);
  const contextFields = collectContextComparableFields(contextLines);
  const route = object.canonicalFields?.route || parserFields.route || semanticFields.route || findStaticRoutePrefix(lines) || object.name;
  const result = [`route ${route}`];
  const nextHop = semanticFields["next-hop"] || parserFields["next-hop"] || parserFields.nextHop || findStaticRouteNextHop(lines);
  const tag = semanticFields.tag || parserFields.tag || findStaticRouteTag(lines);
  const state = semanticFields.state || parserFields.state || parserFields["admin-state"] || findStaticRouteState(lines);

  if (nextHop) result.push(`next-hop ${nextHop}`);
  if (tag) result.push(`tag ${tag}`);
  if (state) result.push(`state ${state}`);
  Object.entries(contextFields).forEach(([field, value]) => {
    if (!["route", "next-hop", "tag", "state"].includes(field)) result.push(`${field} ${value}`);
  });
  return result;
}

function applyContextMappingsToLines(lines, objectType, source, contextMappingsByType) {
  const mappings = contextMappingsByType?.[objectType] || [];
  if (!mappings.length) return lines;
  const normalizedLines = lines.map(canonicalizeComparableLine);
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = mappings
      .map((mapping, mappingIndex) => ({ mapping, mappingIndex, sourceBlock: splitComparableBlock(source === "old" ? mapping.oldText : mapping.newText) }))
      .find((candidate) => blockMatchesAt(normalizedLines, index, candidate.sourceBlock));

    if (!match) {
      output.push(lines[index]);
      continue;
    }

    const canonicalBlock = splitComparableBlock(match.mapping.oldText);
    const label = canonicalizeComparableLine(match.mapping.label || `context-${match.mappingIndex + 1}`);
    canonicalBlock.forEach((line, lineIndex) => output.push(`context ${label} ${lineIndex + 1} ${line}`));
    index += match.sourceBlock.length - 1;
  }

  return output;
}

function collectContextComparableFields(lines) {
  return lines.reduce((fields, line) => {
    const normalized = canonicalizeComparableLine(line);
    if (!normalized.startsWith("context ")) return fields;
    const contextLine = normalized.replace(/^context\s+\S+\s+\d+\s+/, "");
    const field = extractFieldName(contextLine);
    const value = field ? extractFieldValue(contextLine, field) : "";
    if (field && value) fields[field] = value;
    return fields;
  }, {});
}

function collectSemanticFields(object, profile) {
  const rules = profile?.semanticRules?.[object.type] || [];
  return object.lines.reduce((fields, line) => {
    rules.forEach((rule) => {
      if (!["object-key", "compare-field"].includes(rule.role)) return;
      const field = canonicalizeComparableLine(rule.field || "");
      const value = extractSemanticRuleValue(line, rule);
      if (field && value) fields[field] = normalizeParserFieldValue(field, value);
    });
    return fields;
  }, {});
}

function collectParserRuleFields(object, profile) {
  const rules = profile?.parserRules?.[object.type] || [];
  return object.lines.reduce((fields, line) => {
    for (const rule of rules) {
      if (rule.source && rule.source !== "both" && rule.source !== object.source) continue;
      const parsed = extractParserRuleFields(line, rule);
      if (parsed) Object.assign(fields, parsed);
    }
    return fields;
  }, {});
}

function findStaticRouteNextHop(lines) {
  for (const line of lines) {
    const match = line.match(/\bnext-hop\s+"?([^"\s{}]+)"?/);
    if (match) return stripTrailingSyntax(match[1]);
  }
  return "";
}

function findStaticRoutePrefix(lines) {
  for (const line of lines) {
    const normalized = canonicalizeComparableLine(line);
    const match = normalized.match(/(?:^|\s)(?:static-route-entry|route)\s+"?(\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2})"?\b/);
    if (match) return stripTrailingSyntax(match[1]);
  }
  return "";
}

function findStaticRouteTag(lines) {
  for (const line of lines) {
    const match = line.match(/\btag\s+([^"\s{}]+)/);
    if (match) return stripTrailingSyntax(match[1]);
  }
  return "";
}

function findStaticRouteState(lines) {
  if (lines.some((line) => /\bno\s+shutdown\b|\badmin-state\s+enable\b/.test(line))) return "enabled";
  if (lines.some((line) => /\bshutdown\b|\badmin-state\s+disable\b/.test(line))) return "disabled";
  return "";
}

function isStructuralLine(line) {
  return /^exit$|^\{$|^}$/.test(canonicalizeComparableLine(line));
}

function stripTrailingSyntax(value) {
  return String(value || "").replace(/[{}"]+$/g, "").trim();
}

function applyLineMappings(line, objectType, source, lineMappingsByType) {
  const mappings = lineMappingsByType?.[objectType] || [];
  const normalized = canonicalizeComparableLine(line);
  const found = mappings.find((item) => lineMappingSideMatches(source === "old" ? item.oldText : item.newText, normalized));
  if (!found) return line;
  return found.oldText;
}

function lineMappingSideMatches(text, normalizedLine) {
  const normalizedText = canonicalizeComparableLine(text);
  if (normalizedText === normalizedLine) return true;
  return splitComparableBlock(text).includes(normalizedLine);
}

function applyFieldMappings(line, objectType, source, fieldMappingsByType) {
  const mappings = fieldMappingsByType?.[objectType] || [];
  const normalized = canonicalizeComparableLine(line);
  const found = mappings.find((item) => {
    const field = canonicalizeComparableLine(source === "old" ? item.oldField : item.newField);
    return field && (normalized === field || normalized.startsWith(`${field} `));
  });
  if (!found) return line;

  const sourceField = canonicalizeComparableLine(source === "old" ? found.oldField : found.newField);
  const canonicalField = canonicalizeComparableLine(found.oldField);
  const value = extractFieldMappingValue(normalized, sourceField);
  return value ? `${canonicalField} ${value}` : canonicalField;
}

function extractFieldMappingValue(line, field) {
  const afterField = canonicalizeComparableLine(line).slice(field.length).trim();
  const address = afterField.match(/\b\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?\b/);
  if (address) return stripTrailingSyntax(address[0]);
  const quoted = afterField.match(/"([^"]+)"/);
  if (quoted) return stripTrailingSyntax(quoted[1]);
  const token = afterField.match(/^(\S+)/);
  return token ? stripTrailingSyntax(token[1]) : "";
}

function shouldKeepComparableLine(line, objectType, source, lineRulesByType) {
  const rule = findLineRule(line, objectType, source, lineRulesByType);
  if (!rule) return true;
  if (rule.action === "ignore") return false;
  if (rule.action === "added" && source === "new") return false;
  if (rule.action === "missing" && source === "old") return false;
  return true;
}

function findLineRule(line, objectType, source, lineRulesByType) {
  const rules = lineRulesByType?.[objectType] || [];
  const normalized = canonicalizeComparableLine(line);
  const exactRule = rules.find((rule) => rule.source === source && canonicalizeComparableLine(rule.text) === normalized);
  if (exactRule) return exactRule;

  const field = extractFieldName(normalized);
  if (!field) return null;
  return rules.find((rule) => {
    if (rule.action !== "required-field") return false;
    return extractFieldName(rule.text) === field;
  }) || null;
}

function applyComparableLineRule(line, objectType, source, lineRulesByType) {
  const rule = findLineRule(line, objectType, source, lineRulesByType);
  if (rule?.action !== "required-field") return line;
  return extractFieldName(line) || line;
}

function applyValidationPolicy(line, objectType, source, policiesByType) {
  const policy = findValidationPolicy(line, objectType, policiesByType);
  if (!policy) return line;
  const field = canonicalizeComparableLine(policy.field || "") || extractFieldName(line);
  if (!field) return line;
  if (policy.policy === "ignore" || policy.policy === "required" || policy.policy === "presence" || policy.policy === "conditional") return null;
  if (policy.policy !== "exception") return line;

  const value = extractFieldValue(line, field);
  const oldValues = splitPolicyValues(policy.oldValues);
  const newValue = canonicalizeComparableLine(policy.newValue || "");
  if (!newValue) return line;
  if (source === "old" && oldValues.includes(value)) return `${field} ${newValue}`;
  if (source === "new" && value === newValue) return `${field} ${newValue}`;
  return line;
}

function findValidationPolicy(line, objectType, policiesByType) {
  const field = extractFieldName(line);
  if (!field) return null;
  const policies = policiesByType?.[objectType] || [];
  const normalizedLine = canonicalizeComparableLine(line);
  return policies.find((policy) => {
    const policyField = canonicalizeComparableLine(policy.field || "");
    return policyField && (policyField === field || normalizedLine === policyField || normalizedLine.startsWith(`${policyField} `));
  }) || null;
}

function splitPolicyValues(value) {
  return String(value || "")
    .split(",")
    .map(canonicalizeComparableLine)
    .filter(Boolean);
}

function extractFieldValue(line, field) {
  return stripTrailingSyntax(canonicalizeComparableLine(line).slice(field.length).trim());
}

function sortObjects(objects) {
  return [...objects].sort(compareObjectIdentity);
}

function compareObjectIdentity(left, right) {
  if (left.type !== right.type) return objectTypeRank(left.type) - objectTypeRank(right.type);
  return left.name.localeCompare(right.name, undefined, { numeric: true });
}

function objectTypeRank(type) {
  const index = objectTypes.indexOf(type);
  return index >= 0 ? index : objectTypes.length;
}

function sortComparableLines(lines) {
  const [head, ...body] = lines;
  const exits = body.filter((line) => /^exit$|^}$/.test(line.trim().toLowerCase()));
  const regular = body.filter((line) => !/^exit$|^}$/.test(line.trim().toLowerCase()));
  return [head, ...regular.sort((left, right) => left.localeCompare(right, undefined, { numeric: true })), ...exits];
}

function compareObjects(oldObjects, newObjects, options) {
  const oldMap = buildObjectMap(oldObjects);
  const newMap = buildObjectMap(newObjects);
  const keys = [...new Set([...oldMap.keys(), ...newMap.keys()])].sort(compareObjectKeys);
  const items = [];

  keys.forEach((key) => {
    if (key.startsWith("global:")) return;
    const oldObject = oldMap.get(key);
    const newObject = newMap.get(key);
    if (!oldObject) return items.push(buildReportItem("added", key, null, newObject, "신규 config에만 존재하는 객체입니다."));
    if (!newObject) return items.push(buildReportItem("missing", key, oldObject, null, "신규 config에서 누락된 객체입니다."));
    const objectRequiredItems = buildObjectRequiredItems(oldObject, newObject, options.profile);
    items.push(...objectRequiredItems);
    const canonicalDetails = compareCanonicalObjects(oldObject, newObject, options.profile, objectRequiredItems);
    if (canonicalDetails.length) {
      items.push(buildReportItem("changed", key, oldObject, newObject, summarizeObjectChange(canonicalDetails), canonicalDetails));
      return;
    }
    if (!hasCanonicalCompareSurface(oldObject, newObject) && hasUnexplainedObjectDifference(oldObject, newObject, objectRequiredItems)) {
      const details = buildObjectChangeDetails(oldObject, newObject, objectRequiredItems);
      items.push(buildReportItem("changed", key, oldObject, newObject, summarizeObjectChange(details), details));
    }
  });

  const essentialItems = buildEssentialItems(oldMap, newMap);
  const requiredItems = buildRequiredItems(options.profile, selectors.oldInput.value, selectors.newInput.value, options.selectedObjects);
  const mergedItems = [...items, ...essentialItems, ...requiredItems];
  const comparedObjectKeys = keys.filter((key) => !key.startsWith("global:"));

  return {
    items: mergedItems,
    visibleItems: filterItems(mergedItems, options),
    diffRows: buildDiffRows(selectors.oldInput.value, selectors.newInput.value, options),
    oldObjects,
    newObjects,
    summary: {
      total: mergedItems.length,
      compared: comparedObjectKeys.length,
      changed: mergedItems.filter((item) => item.type === "changed").length,
      missing: mergedItems.filter((item) => item.type === "missing").length,
      added: mergedItems.filter((item) => item.type === "added").length,
      syntax: 0,
      required: mergedItems.filter((item) => item.type === "required").length,
    },
  };
}

function hasCanonicalCompareSurface(oldObject, newObject) {
  return Boolean(Object.keys(oldObject?.canonicalFields || {}).length || Object.keys(newObject?.canonicalFields || {}).length);
}

function compareCanonicalObjects(oldObject, newObject, profile = state.profileDraft, requiredItems = []) {
  if (!hasCanonicalCompareSurface(oldObject, newObject)) return [];
  const ignoredFields = new Set(requiredItems.map((item) => item.field).filter(Boolean));
  const oldFields = canonicalComparableFields(oldObject, profile);
  const newFields = canonicalComparableFields(newObject, profile);
  const fields = [...new Set([...Object.keys(oldFields), ...Object.keys(newFields)])].sort(compareSemanticFieldName);
  const details = [];

  fields.forEach((field) => {
    if (ignoredFields.has(field)) return;
    const policy = findProfilePolicyForField(oldObject.type, field, profile)?.policy
      || profile?.objects?.[oldObject.type]?.policies?.[field]
      || "compare";
    if (policy === "ignore") return;
    const oldHas = oldFields[field] !== undefined;
    const newHas = newFields[field] !== undefined;
    if (["presence", "required", "conditional"].includes(policy)) {
      if (policy === "presence" && oldHas !== newHas) {
        details.push({
          kind: oldHas ? "missing-line" : "added-line",
          field,
          rule: "존재 여부 불일치",
          oldText: oldHas ? `${field} ${oldFields[field]}` : "-",
          newText: newHas ? `${field} ${newFields[field]}` : "-",
        });
      }
      return;
    }
    if (!oldHas || !newHas) {
      details.push({
        kind: oldHas ? "missing-line" : "added-line",
        field,
        rule: oldHas ? "기존 필드가 신규 객체에 없음" : "신규 필드가 기존 객체에 없음",
        oldText: oldHas ? `${field} ${oldFields[field]}` : "-",
        newText: newHas ? `${field} ${newFields[field]}` : "-",
      });
      return;
    }
    if (canonicalizeComparableLine(oldFields[field]) !== canonicalizeComparableLine(newFields[field])) {
      details.push({
        kind: "field-changed",
        field,
        rule: "canonical field 불일치",
        oldText: `${field} ${oldFields[field]}`,
        newText: `${field} ${newFields[field]}`,
      });
    }
  });

  return details.slice(0, 12);
}

function canonicalComparableFields(object, profile = state.profileDraft) {
  const fields = {
    ...extractCanonicalFields(object, profile, object.source),
    ...(object.canonicalFields || {}),
  };
  return Object.entries(fields).reduce((result, [field, value]) => {
    const normalizedField = canonicalizeComparableLine(field);
    const policy = findProfilePolicyForField(object.type, normalizedField, profile)?.policy
      || profile?.objects?.[object.type]?.policies?.[normalizedField]
      || "compare";
    if (!normalizedField || value === undefined || value === "" || policy === "ignore") return result;
    result[normalizedField] = applySemanticPolicyNormalize(normalizedField, value, object.type, object.source, profile);
    return result;
  }, {});
}

function compareSemanticFieldName(left, right) {
  const leftRank = semanticFieldOrder.indexOf(left);
  const rightRank = semanticFieldOrder.indexOf(right);
  const normalizedLeft = leftRank >= 0 ? leftRank : semanticFieldOrder.length;
  const normalizedRight = rightRank >= 0 ? rightRank : semanticFieldOrder.length;
  return normalizedLeft === normalizedRight ? left.localeCompare(right) : normalizedLeft - normalizedRight;
}

function buildEssentialItems(oldMap, newMap) {
  const items = [];
  const keys = [...new Set([...oldMap.keys(), ...newMap.keys()])].filter((key) => key.startsWith("static-route:"));
  keys.forEach((key) => {
    const oldObject = oldMap.get(key);
    const newObject = newMap.get(key);
    if (!oldObject || !newObject) return;

    [
      ["next-hop", "next-hop"],
      ["tag", "tag"],
      ["state", "상태(no shutdown/admin-state)"],
    ].forEach(([field, label]) => {
      const oldHasField = hasComparableField(oldObject, field);
      const newHasField = hasComparableField(newObject, field);
      if (oldHasField !== newHasField) {
        items.push(simpleRequired("static-route", `${oldObject.name} ${label}`, `static-route 필수 요소 '${label}'가 양쪽 config에 모두 있어야 합니다.`));
      }
    });
  });
  return items;
}

function buildObjectRequiredItems(oldObject, newObject, profile) {
  const rules = getRequiredFieldRules(oldObject.type, profile);
  const ruleItems = rules.flatMap((rule) => {
    const field = extractFieldName(rule.text);
    if (!field) return [];
    const oldHasField = hasComparableField(oldObject, field);
    const newHasField = hasComparableField(newObject, field);
    if (oldHasField === newHasField) return [];

    return [{
      type: "required",
      key: `required:${oldObject.key}:${field}`,
      objectType: oldObject.type,
      objectName: oldObject.name,
      oldLine: `${oldObject.startLine}-${oldObject.endLine}`,
      newLine: `${newObject.startLine}-${newObject.endLine}`,
      message: rule.message || (oldHasField ? `필수 변수 '${field}'가 신규 config에 없습니다.` : `필수 변수 '${field}'가 기존 config에 없습니다.`),
      field,
    }];
  });
  return [...ruleItems, ...buildPolicyRequiredItems(oldObject, newObject, profile)];
}

function buildPolicyRequiredItems(oldObject, newObject, profile) {
  const policies = profile.validationPolicies?.[oldObject.type] || [];
  return policies.flatMap((policy) => {
    const field = canonicalizeComparableLine(policy.field || "");
    if (!field || !["required", "presence", "conditional"].includes(policy.policy)) return [];
    const oldHasField = hasObjectField(oldObject, field, profile);
    const newHasField = hasObjectField(newObject, field, profile);
    if (!oldHasField && !newHasField) return [];
    const violated = policy.policy === "required"
      ? !newHasField
      : policy.policy === "presence"
        ? oldHasField !== newHasField
        : oldHasField && !newHasField;
    if (!violated) return [];

    const defaultMessage = {
      required: `필드 '${field}'는 신규 객체에 반드시 있어야 합니다.`,
      presence: `필드 '${field}'는 양쪽 객체에서 존재 여부가 같아야 합니다.`,
      conditional: `기존 객체에 있는 필드 '${field}'가 신규 객체에 없습니다.`,
    }[policy.policy] || `필드 '${field}' 정책을 위반했습니다.`;
    return [{
      type: "required",
      key: `policy-required:${oldObject.key}:${field}`,
      objectType: oldObject.type,
      objectName: oldObject.name,
      oldLine: `${oldObject.startLine}-${oldObject.endLine}`,
      newLine: `${newObject.startLine}-${newObject.endLine}`,
      message: policy.message || defaultMessage,
      field,
    }];
  });
}

function hasObjectField(object, field, profile = state.profileDraft) {
  const semanticObject = buildCanonicalSemanticObject(object, profile, object.source);
  if (semanticObject) return semanticObject.fields[field] !== undefined;

  if (object.type === "static-route") {
    return buildStaticRouteComparableLines(object, profile)
      .some((line) => extractFieldName(line) === field || line === field || line.startsWith(`${field} `));
  }
  return object.lines
    .map(canonicalizeComparableLine)
    .some((line) => {
      const lineField = extractFieldName(line);
      return lineField === field || line === field || line.startsWith(`${field} `);
    });
}

function getRequiredFieldRules(objectType, profile) {
  const seen = new Set();
  return (profile.lineRules?.[objectType] || []).filter((rule) => {
    if (rule.action !== "required-field") return false;
    const field = extractFieldName(rule.text);
    if (!field || seen.has(field)) return false;
    seen.add(field);
    return true;
  });
}

function hasUnexplainedObjectDifference(oldObject, newObject, requiredItems) {
  if (oldObject.comparableText === newObject.comparableText) return false;
  const ignoredFields = new Set(requiredItems.map((item) => item.field).filter(Boolean));
  if (!ignoredFields.size) return true;
  return stripComparableFields(oldObject.comparableText, ignoredFields) !== stripComparableFields(newObject.comparableText, ignoredFields);
}

function stripComparableFields(text, fields) {
  return text
    .split("\n")
    .filter((line) => !fields.has(extractFieldName(line)))
    .join("\n");
}

function buildObjectChangeDetails(oldObject, newObject, requiredItems = []) {
  const ignoredFields = new Set(requiredItems.map((item) => item.field).filter(Boolean));
  const oldLines = comparableDetailLines(oldObject, ignoredFields);
  const newLines = comparableDetailLines(newObject, ignoredFields);
  const newByField = groupDetailLinesByField(newLines);
  const usedNew = new Set();
  const details = [];

  oldLines.forEach((oldLine) => {
    const candidates = newByField.get(oldLine.field) || [];
    const exact = candidates.find((candidate) => candidate.normalized === oldLine.normalized && !usedNew.has(candidate.index));
    if (exact) {
      usedNew.add(exact.index);
      return;
    }

    const unusedSameField = candidates.find((candidate) => !usedNew.has(candidate.index));
    if (unusedSameField) {
      usedNew.add(unusedSameField.index);
      details.push({
        kind: "field-changed",
        field: oldLine.field,
        rule: "비교값 불일치",
        oldText: oldLine.text,
        newText: unusedSameField.text,
      });
      return;
    }

    details.push({
      kind: "missing-line",
      field: oldLine.field,
      rule: "기존 라인이 신규 객체에 없음",
      oldText: oldLine.text,
      newText: "-",
    });
  });

  newLines.forEach((newLine) => {
    if (usedNew.has(newLine.index)) return;
    details.push({
      kind: "added-line",
      field: newLine.field,
      rule: "신규 라인이 기존 객체에 없음",
      oldText: "-",
      newText: newLine.text,
    });
  });

  return details.slice(0, 8);
}

function comparableDetailLines(object, ignoredFields) {
  return object.comparableText
    .split("\n")
    .map(canonicalizeComparableLine)
    .filter(Boolean)
    .filter((line) => !ignoredFields.has(extractFieldName(line)))
    .map((line, index) => ({
      index,
      text: line,
      normalized: line,
      field: extractFieldName(line) || "(필드 없음)",
    }));
}

function groupDetailLinesByField(lines) {
  return lines.reduce((groups, line) => {
    if (!groups.has(line.field)) groups.set(line.field, []);
    groups.get(line.field).push(line);
    return groups;
  }, new Map());
}

function summarizeObjectChange(details) {
  if (!details.length) return "객체 내용이 다릅니다.";
  const first = details[0];
  if (first.kind === "field-changed") return `필드 '${first.field}' 값이 다릅니다.`;
  if (first.kind === "missing-line") return `필드 '${first.field}'가 신규 객체에 없습니다.`;
  if (first.kind === "added-line") return `필드 '${first.field}'가 신규 객체에 추가되었습니다.`;
  return "객체 내용이 다릅니다.";
}

function hasComparableField(object, field) {
  return object.comparableText
    .split("\n")
    .map(canonicalizeComparableLine)
    .some((line) => line === field || line.startsWith(`${field} `));
}

function buildObjectMap(objects) {
  return objects.reduce((map, object, index) => {
    const safeObject = ensureObjectShape(object, object?.source || "object", index);
    const existing = map.get(safeObject.key);
    if (!existing) {
      map.set(safeObject.key, safeObject);
      return map;
    }

    const lineOffset = existing.lines.length;
    map.set(safeObject.key, {
      ...existing,
      endLine: Math.max(existing.endLine, safeObject.endLine),
      lines: [...existing.lines, ...safeObject.lines],
      rawLines: [...existing.rawLines, ...safeObject.rawLines],
      canonicalFields: mergeCanonicalFields(existing.canonicalFields, safeObject.canonicalFields),
      fields: mergeCanonicalFields(existing.fields || existing.canonicalFields, safeObject.fields || safeObject.canonicalFields),
      fieldOccurrences: [
        ...(existing.fieldOccurrences || []),
        ...(safeObject.fieldOccurrences || []).map((item) => ({ ...item, rawLineIndex: item.rawLineIndex + lineOffset })),
      ],
      comparableText: [existing.comparableText, safeObject.comparableText].filter(Boolean).join("\n"),
    });
    return map;
  }, new Map());
}

function compareObjectKeys(leftKey, rightKey) {
  const left = splitObjectKey(leftKey);
  const right = splitObjectKey(rightKey);
  if (left.type !== right.type) return objectTypeRank(left.type) - objectTypeRank(right.type);
  return left.name.localeCompare(right.name, undefined, { numeric: true });
}

function splitObjectKey(key) {
  if (!key) return { type: "unknown", name: "" };
  const separator = key.indexOf(":");
  if (separator < 0) return { type: key, name: "" };
  return { type: key.slice(0, separator), name: key.slice(separator + 1) };
}

function buildRequiredItems(profile, oldText, newText, selectedObjects = objectTypes) {
  const items = [];
  profile.rules.required.forEach((rule) => {
    if (rule.source === "old" && containsPattern(oldText, rule.pattern) && !containsPattern(newText, rule.pattern)) {
      items.push(simpleRequired("rule", rule.pattern, "기존 config의 필수 라인이 신규 config에 없습니다."));
    }
    if (rule.source === "new" && containsPattern(newText, rule.pattern) && !containsPattern(oldText, rule.pattern)) {
      items.push(simpleRequired("rule", rule.pattern, "신규 config의 필수 라인이 기존 config에 없습니다."));
    }
  });

  objectTypes.filter((type) => selectedObjects.includes(type)).forEach((type) => {
    (profile.lineRules?.[type] || []).forEach((rule) => {
      if (rule.action === "required") {
        if (rule.source === "old" && containsPattern(oldText, rule.text) && !containsPattern(newText, rule.text)) {
          items.push(simpleRequired(type, rule.text, rule.message || "필수 존재 라인이 신규 config에 없습니다."));
        }
        if (rule.source === "new" && containsPattern(newText, rule.text) && !containsPattern(oldText, rule.text)) {
          items.push(simpleRequired(type, rule.text, rule.message || "필수 존재 라인이 기존 config에 없습니다."));
        }
      }
    });
  });

  return items;
}

function simpleRequired(type, name, message) {
  return { type: "required", key: `required:${type}:${name}`, objectType: type, objectName: name, oldLine: "-", newLine: "-", message };
}

function buildReportItem(type, key, oldObject, newObject, message, details = []) {
  return {
    type,
    key,
    objectType: (oldObject || newObject).type,
    objectName: (oldObject || newObject).name,
    oldLine: oldObject ? `${oldObject.startLine}-${oldObject.endLine}` : "-",
    newLine: newObject ? `${newObject.startLine}-${newObject.endLine}` : "-",
    message,
    details,
  };
}

function filterItems(items, options) {
  return items.filter((item) => {
    const typeMatch = options.resultFilter === "all" || item.type === options.resultFilter;
    const searchMatch = !options.filter || `${item.objectType} ${item.objectName} ${item.message}`.toLowerCase().includes(options.filter);
    return typeMatch && searchMatch;
  });
}

function buildDiffRows(oldText, newText, options) {
  const semanticRows = buildSemanticObjectDiffRows(oldText, newText, options);
  if (semanticRows.length) return semanticRows;

  const oldRows = buildSemanticDiffRows(oldText, options, "old");
  const newRows = buildSemanticDiffRows(newText, options, "new");
  const pairs = alignLineArrays(oldRows, newRows);

  return pairs.map(([oldIndex, newIndex]) => {
    const oldRow = oldIndex === null ? null : oldRows[oldIndex];
    const newRow = newIndex === null ? null : newRows[newIndex];
    const same = oldRow && newRow && oldRow.key === newRow.key;
    return {
      oldRow,
      newRow,
      oldState: !oldRow ? "placeholder" : !newRow ? "missing" : same ? "equal" : "changed",
      newState: !newRow ? "placeholder" : !oldRow ? "added" : same ? "equal" : "changed",
    };
  });
}

const semanticFieldOrder = [
  "route",
  "neighbor",
  "interface",
  "description",
  "next-hop",
  "tag",
  "state",
  "admin-state",
  "authentication-key",
  "group",
];

function buildSemanticObjectDiffRows(oldText, newText, options) {
  const oldObjects = parseConfig(oldText, { ...options, sortObjects: false }, "old").filter((object) => object.type !== "global");
  const newObjects = parseConfig(newText, { ...options, sortObjects: false }, "new").filter((object) => object.type !== "global");
  if (!oldObjects.length && !newObjects.length) return [];

  const oldMap = buildObjectMap(oldObjects);
  const newMap = buildObjectMap(newObjects);
  const keys = [...new Set([...oldMap.keys(), ...newMap.keys()])].sort(compareObjectKeys);
  const rows = [];

  keys.forEach((key) => {
    const oldObject = oldMap.get(key);
    const newObject = newMap.get(key);
    if (oldObject && newObject) {
      rows.push(...buildMatchedObjectDiffRows(oldObject, newObject));
      return;
    }
    rows.push(...buildUnmatchedObjectDiffRows(oldObject, newObject));
  });

  return rows;
}

function buildMatchedObjectDiffRows(oldObject, newObject) {
  const oldRows = buildObjectVisualRows(oldObject);
  const newRows = buildObjectVisualRows(newObject);
  const pairs = alignLineArrays(oldRows, newRows);
  const changedFields = changedCanonicalFieldSet(oldObject, newObject);

  return pairs.map(([oldIndex, newIndex]) => {
    const oldRow = oldIndex === null ? null : oldRows[oldIndex];
    const newRow = newIndex === null ? null : newRows[newIndex];
    const oldChanged = rowTouchesChangedField(oldRow, changedFields);
    const newChanged = rowTouchesChangedField(newRow, changedFields);
    return {
      oldRow,
      newRow,
      oldState: !oldRow ? "placeholder" : !newRow ? "missing" : oldChanged || newChanged ? "changed" : "equal",
      newState: !newRow ? "placeholder" : !oldRow ? "added" : oldChanged || newChanged ? "changed" : "equal",
    };
  });
}

function buildObjectVisualRows(object) {
  return object.lines.map((line, index) => {
    const text = object.rawLines[index] || line;
    const occurrences = (object.fieldOccurrences || []).filter((item) => item.rawLineIndex === index);
    const highlights = buildLineSemanticHighlights(text, object.type, object.canonicalFields || {}, occurrences);
    return {
      number: object.startLine + index,
      text,
      key: `${object.key}|raw:${index}:${canonicalizeComparableLine(text)}`,
      objectKey: object.key,
      normalized: canonicalizeComparableLine(text),
      semanticField: highlights[0]?.field || inferSemanticFieldName(text),
      highlights,
      objectMatched: true,
      ignoredVisual: isVisualIgnoredLine(line, object.type, object.source),
    };
  });
}

function changedCanonicalFieldSet(oldObject, newObject) {
  const oldFields = canonicalComparableFields(oldObject);
  const newFields = canonicalComparableFields(newObject);
  return new Set([...new Set([...Object.keys(oldFields), ...Object.keys(newFields)])].filter((field) => {
    if (isIgnoredSemanticField(oldObject.type, field)) return false;
    return canonicalizeComparableLine(oldFields[field]) !== canonicalizeComparableLine(newFields[field]);
  }));
}

function rowTouchesChangedField(row, changedFields) {
  if (!row || !changedFields.size) return false;
  return (row.highlights || []).some((highlight) => changedFields.has(highlight.field));
}

function orderedSemanticFields(oldObject, newObject) {
  const fields = new Set([
    ...Object.keys(oldObject.canonicalFields || {}),
    ...Object.keys(newObject.canonicalFields || {}),
  ]);
  return [...fields].sort((left, right) => {
    const leftRank = semanticFieldOrder.indexOf(left);
    const rightRank = semanticFieldOrder.indexOf(right);
    const normalizedLeft = leftRank >= 0 ? leftRank : semanticFieldOrder.length;
    const normalizedRight = rightRank >= 0 ? rightRank : semanticFieldOrder.length;
    return normalizedLeft === normalizedRight ? left.localeCompare(right) : normalizedLeft - normalizedRight;
  });
}

function mapObjectFieldLines(object) {
  const result = new Map();
  object.lines.forEach((line, index) => {
    const fields = Object.keys(extractFieldsFromLine(line, state.profileDraft, object.type));
    const lineFields = fields.length ? fields : [inferSemanticFieldName(line)].filter(Boolean);
    lineFields.forEach((field) => {
      if (!field || result.has(field)) return;
      result.set(field, {
        index,
        number: object.startLine + index,
        text: object.rawLines[index] || line,
        normalized: canonicalizeComparableLine(line),
      });
    });
  });
  return result;
}

function buildObjectDiffRow(object, line, field, value, same) {
  return {
    number: line.number,
    text: line.text,
    key: `${object.key}|${field}:${same ? canonicalizeComparableLine(value) : `${canonicalizeComparableLine(value)}:${line.index}`}`,
    objectKey: object.key,
    normalized: `${field} ${canonicalizeComparableLine(value)}`.trim(),
    semanticField: field,
    objectMatched: true,
  };
}

function appendUnusedObjectLines(rows, object, usedIndexes, side) {
  object.lines.forEach((line, index) => {
    if (usedIndexes.has(index)) return;
    const diffRow = {
      number: object.startLine + index,
      text: object.rawLines[index] || line,
      key: `${object.key}|__unmatched__:${side}:${index}`,
      objectKey: object.key,
      normalized: canonicalizeComparableLine(line),
      highlights: buildLineSemanticHighlights(object.rawLines[index] || line, object.type, object.canonicalFields || {}, (object.fieldOccurrences || []).filter((item) => item.rawLineIndex === index)),
      ignoredVisual: isVisualIgnoredLine(line, object.type, side),
      objectMatched: true,
    };
    rows.push({
      oldRow: side === "old" ? diffRow : null,
      newRow: side === "new" ? diffRow : null,
      oldState: side === "old" ? "missing" : "placeholder",
      newState: side === "new" ? "added" : "placeholder",
    });
  });
}

function isVisualIgnoredLine(line, objectType, source) {
  const normalized = canonicalizeComparableLine(line);
  if (!normalized) return true;
  const rule = findLineRule(normalized, objectType, source, state.profileDraft.lineRules);
  if (rule?.action === "ignore") return true;
  if (state.profileDraft.rules.ignore.some((item) => item.source === source && normalized.includes(canonicalizeComparableLine(item.pattern)))) return true;
  const remove = Array.isArray(state.profileDraft.normalize?.remove)
    ? state.profileDraft.normalize.remove.map(canonicalizeComparableLine)
    : [];
  return remove.includes(normalized);
}

function shouldHideVisualLine(line, objectType, source) {
  return isVisualIgnoredLine(line, objectType, source);
}

function shouldHideVisualLineSafe(line, objectType, source) {
  try {
    if (typeof shouldHideVisualLine === "function") return shouldHideVisualLine(line, objectType, source);
    if (typeof isVisualIgnoredLine === "function") return isVisualIgnoredLine(line, objectType, source);
  } catch (error) {
    console.warn("visual line filter failed; falling back to blank-line filter", error);
  }
  return !canonicalizeComparableLine(line);
}

function buildUnmatchedObjectDiffRows(oldObject, newObject) {
  const object = oldObject || newObject;
  const side = oldObject ? "old" : "new";
  return object.lines
    .map((line, index) => ({
      line,
      index,
    }))
    .filter((item) => !shouldHideVisualLineSafe(item.line, object.type, side))
    .map(({ line, index }) => ({
      number: object.startLine + index,
      text: object.rawLines[index] || line,
      key: `${object.key}|__object_unmatched__:${side}:${index}`,
      objectKey: object.key,
      normalized: canonicalizeComparableLine(line),
      semanticField: Object.keys(extractFieldsFromLine(line, state.profileDraft, object.type))[0] || inferSemanticFieldName(line),
      highlights: buildLineSemanticHighlights(object.rawLines[index] || line, object.type, object.canonicalFields || {}, (object.fieldOccurrences || []).filter((occurrence) => occurrence.rawLineIndex === index)),
      ignoredVisual: isVisualIgnoredLine(line, object.type, side),
    }))
    .map((row) => ({
      oldRow: side === "old" ? row : null,
      newRow: side === "new" ? row : null,
      oldState: side === "old" ? "missing" : "placeholder",
      newState: side === "new" ? "added" : "placeholder",
    }));
}

function isIgnoredSemanticField(objectType, field) {
  const profilePolicy = findProfilePolicyForField(objectType, field, state.profileDraft)?.policy;
  const objectPolicy = state.profileDraft.objects?.[objectType]?.policies?.[field];
  return (profilePolicy || objectPolicy) === "ignore";
}

function buildSemanticDiffRows(text, options, source) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let currentType = "global";
  let currentObjectKey = "global:global";
  return lines.map((rawLine, index) => {
    const normalized = normalizeLine(rawLine, options);
    const detected = detectObjectStart(normalized, options, source);
    if (detected) {
      currentType = source === "new" ? mapNewObjectTypeToOld(detected.type, options.profile.mappings) : detected.type;
      currentObjectKey = buildObjectKey(detected.type, detected.name, source, options.profile.mappings);
    }
    if (currentType === "static-route" && isStructuralLine(normalized)) {
      return {
        number: index + 1,
        text: rawLine,
        key: `__structure__:${source}:${index}:${currentObjectKey}:${canonicalizeComparableLine(normalized)}`,
        objectKey: currentObjectKey,
        normalized: canonicalizeComparableLine(normalized),
      };
    }
    const mapped = currentType === "global"
      ? normalized
      : applyFieldMappings(applyLineMappings(normalized, currentType, source, options.profile.lineMappings), currentType, source, options.profile.fieldMappings);
    const policyMapped = currentType === "global"
      ? mapped
      : applyValidationPolicy(mapped, currentType, source, options.profile.validationPolicies);
    const rule = currentType === "global" ? null : findLineRule(normalized, currentType, source, options.profile.lineRules);
    let key = `${currentObjectKey}|${buildSemanticLineKey(policyMapped || mapped, currentType)}`;
    if (shouldIgnoreLine(normalized, rawLine, options, source) || rule?.action === "ignore") key = `__ignored__:${index}`;
    if (!policyMapped) key = `${currentObjectKey}|__policy_ignored__:${extractFieldName(mapped) || index}`;
    if (rule?.action === "added" && source === "new") key = `__added__:${index}`;
    if (rule?.action === "missing" && source === "old") key = `__missing__:${index}`;
    if (rule?.action === "required-field") key = `${currentObjectKey}|${extractFieldName(policyMapped || mapped) || buildSemanticLineKey(policyMapped || mapped, currentType)}`;
    return { number: index + 1, text: rawLine, key, objectKey: currentObjectKey, normalized: canonicalizeComparableLine(policyMapped || mapped) };
  }).filter(Boolean);
}

function buildSemanticLineKey(line, objectType) {
  const normalized = canonicalizeComparableLine(line);
  if (objectType !== "static-route") return normalized;

  const routeMatch = normalized.match(/(?:^|\s)(?:static-route-entry|route)\s+([\w./:-]+)/);
  if (routeMatch) return `route-address:${stripTrailingSyntax(routeMatch[1])}`;

  const nextHopMatch = normalized.match(/\bnext-hop\s+"?([^"\s{}]+)"?/);
  if (nextHopMatch) return `next-hop:${stripTrailingSyntax(nextHopMatch[1])}`;

  const tagMatch = normalized.match(/\btag\s+([^"\s{}]+)/);
  if (tagMatch) return `tag:${stripTrailingSyntax(tagMatch[1])}`;

  if (/\bno\s+shutdown\b|\badmin-state\s+enable\b/.test(normalized)) return "state:enabled";
  if (/\bshutdown\b|\badmin-state\s+disable\b/.test(normalized)) return "state:disabled";
  return normalized;
}

function alignLineArrays(leftRows, rightRows) {
  const dp = Array.from({ length: leftRows.length + 1 }, () => Array(rightRows.length + 1).fill(0));
  for (let i = leftRows.length - 1; i >= 0; i -= 1) {
    for (let j = rightRows.length - 1; j >= 0; j -= 1) {
      const pairScore = scoreLinePair(leftRows[i], rightRows[j]);
      dp[i][j] = Math.max(
        pairScore > 0 ? dp[i + 1][j + 1] + pairScore : 0,
        dp[i + 1][j],
        dp[i][j + 1],
      );
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < leftRows.length && j < rightRows.length) {
    const pairScore = scoreLinePair(leftRows[i], rightRows[j]);
    if (pairScore > 0 && dp[i][j] === dp[i + 1][j + 1] + pairScore) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pairs.push([i, null]);
      i += 1;
    } else {
      pairs.push([null, j]);
      j += 1;
    }
  }
  while (i < leftRows.length) pairs.push([i++, null]);
  while (j < rightRows.length) pairs.push([null, j++]);
  return pairs;
}

function scoreLinePair(leftRow, rightRow) {
  if (!leftRow || !rightRow) return 0;
  if (String(leftRow.key || "").startsWith("__") || String(rightRow.key || "").startsWith("__")) return 0;
  if (leftRow.objectKey && rightRow.objectKey && leftRow.objectKey !== rightRow.objectKey) return 0;
  if (leftRow.key === rightRow.key) return 10;
  const leftHighlightFields = new Set((leftRow.highlights || []).map((item) => item.field).filter(Boolean));
  const rightHighlightFields = new Set((rightRow.highlights || []).map((item) => item.field).filter(Boolean));
  const sharedHighlightFields = [...leftHighlightFields].filter((field) => rightHighlightFields.has(field));
  if (sharedHighlightFields.length) {
    const sharedValues = (leftRow.highlights || []).some((left) =>
      (rightRow.highlights || []).some((right) =>
        left.field === right.field && canonicalizeComparableLine(left.value || left.token) === canonicalizeComparableLine(right.value || right.token),
      ),
    );
    return sharedValues ? 12 : 8;
  }

  const leftField = extractFieldName(leftRow.normalized || leftRow.key);
  const rightField = extractFieldName(rightRow.normalized || rightRow.key);
  const leftAnchors = extractAnchorTokens(leftRow.normalized || leftRow.key);
  const rightAnchors = extractAnchorTokens(rightRow.normalized || rightRow.key);
  const sharedAnchors = leftAnchors.filter((token) => rightAnchors.includes(token));
  const tokenScore = tokenOverlapScore(leftRow.normalized || leftRow.key, rightRow.normalized || rightRow.key);

  let score = 0;
  if (leftField && rightField && leftField === rightField) score += 5;
  if (sharedAnchors.length) score += 4 + Math.min(sharedAnchors.length, 2);
  score += tokenScore;

  return score >= 4 ? score : 0;
}

function extractAnchorTokens(text) {
  const normalized = canonicalizeComparableLine(text);
  const matches = normalized.match(/\b\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?\b/g);
  return matches ? [...new Set(matches)] : [];
}

function tokenOverlapScore(leftText, rightText) {
  const leftTokens = tokenizeForSimilarity(leftText);
  const rightTokens = tokenizeForSimilarity(rightText);
  if (!leftTokens.length || !rightTokens.length) return 0;

  const shared = leftTokens.filter((token) => rightTokens.includes(token));
  const ratio = shared.length / Math.max(leftTokens.length, rightTokens.length);
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 2;
  if (ratio >= 0.34) return 1;
  return 0;
}

function tokenizeForSimilarity(text) {
  return canonicalizeComparableLine(text)
    .replace(/[{}"]/g, " ")
    .split(/[^a-z0-9./:-]+/)
    .filter((token) => token && token !== "exit" && token !== "configure" && token !== "route-type" && token !== "unicast");
}

function renderReport(report) {
  selectors.summaryCards.innerHTML = [
    ["비교 객체", report.summary.compared],
    ["변경", report.summary.changed],
    ["누락", report.summary.missing],
    ["추가", report.summary.added],
    ["필수", report.summary.required],
  ]
    .map(([label, value]) => `<div class="summary-card"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");

  selectors.reportList.innerHTML = report.visibleItems.length
    ? report.visibleItems
        .map(
          (item) => `
            <li data-type="${item.type}">
              <strong>${escapeHtml(item.objectType)} ${escapeHtml(item.objectName)}</strong>
              <div>${escapeHtml(item.message)}</div>
              ${renderReportDetails(item)}
              <small>기존: ${escapeHtml(item.oldLine)} | 신규: ${escapeHtml(item.newLine)}</small>
            </li>
          `,
        )
        .join("")
    : "<li>현재 필터 기준으로 표시할 차이가 없습니다.</li>";

  selectors.objectList.innerHTML = [...report.oldObjects, ...report.newObjects]
    .filter((object, index, list) => list.findIndex((candidate) => candidate.key === object.key) === index)
    .map((object) => `<div class="object-item"><strong>${escapeHtml(object.type)} ${escapeHtml(object.name)}</strong><span class="small-note">${object.source === "old" ? "기존" : "신규"} | 라인 ${object.startLine}-${object.endLine}</span></div>`)
    .join("");
}

function renderDiff(rows) {
  try {
    const safeRows = Array.isArray(rows) ? rows : [];
    clearSelectedDiffTokens();
    selectors.oldDiffPane.innerHTML = safeRows.map((row, index) => renderDiffLine(row?.oldRow || null, row?.oldState || "placeholder", row?.newRow || null, index, "old")).join("");
    selectors.newDiffPane.innerHTML = safeRows.map((row, index) => renderDiffLine(row?.newRow || null, row?.newState || "placeholder", row?.oldRow || null, index, "new")).join("");
    renderDiffObjectToolbars();
    if (state.activeDiffObjectKey) highlightObjectLines(state.activeDiffObjectKey);
    scheduleDiffConnectorRender();
  } catch (error) {
    console.error("renderDiff failed", error);
    throw error;
  }
}

function scheduleDiffConnectorRender() {
  if (!selectors.diffConnectorSvg || state.connectorFrame) return;
  state.connectorFrame = requestAnimationFrame(() => {
    state.connectorFrame = null;
    renderDiffConnectors();
  });
}

function renderDiffConnectors() {
  try {
  const svg = selectors.diffConnectorSvg;
  const grid = svg?.closest(".editor-grid");
  if (!svg || !grid?.classList.contains("diff-connectors-active")) return;

  const gridRect = grid.getBoundingClientRect();
  const oldPaneRect = selectors.oldDiffPane.getBoundingClientRect();
  const newPaneRect = selectors.newDiffPane.getBoundingClientRect();
  const width = Math.max(0, gridRect.width);
  const height = Math.max(0, gridRect.height);

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);

  const oldLines = [...selectors.oldDiffPane.querySelectorAll(".diff-line[data-pair-index]")];
  const paths = oldLines
    .map((oldLine) => {
      const pairIndex = oldLine.dataset.pairIndex;
      const newLine = selectors.newDiffPane.querySelector(`.diff-line[data-pair-index="${pairIndex}"]`);
      if (!newLine || !shouldDrawConnector(oldLine, newLine, oldPaneRect, newPaneRect)) return "";
      return buildConnectorPath(oldLine, newLine, gridRect, oldPaneRect, newPaneRect);
    })
    .filter(Boolean);

  svg.innerHTML = paths.join("");
  } catch (error) {
    console.error("renderDiffConnectors failed", error);
  }
}

function shouldDrawConnector(oldLine, newLine, oldPaneRect, newPaneRect) {
  if (oldLine.classList.contains("placeholder") || newLine.classList.contains("placeholder")) return false;
  if (oldLine.dataset.diffKey?.startsWith("__") || newLine.dataset.diffKey?.startsWith("__")) return false;
  const oldRect = oldLine.getBoundingClientRect();
  const newRect = newLine.getBoundingClientRect();
  return oldRect.bottom >= oldPaneRect.top
    && oldRect.top <= oldPaneRect.bottom
    && newRect.bottom >= newPaneRect.top
    && newRect.top <= newPaneRect.bottom;
}

function buildConnectorPath(oldLine, newLine, gridRect, oldPaneRect, newPaneRect) {
  const oldAnchor = diffLineTextAnchor(oldLine, oldPaneRect, "right");
  const newAnchor = diffLineTextAnchor(newLine, newPaneRect, "left");
  const x1 = oldAnchor.x - gridRect.left;
  const x2 = newAnchor.x - gridRect.left;
  const y1 = oldAnchor.y - gridRect.top;
  const y2 = newAnchor.y - gridRect.top;
  const mid = x1 + (x2 - x1) / 2;
  const state = oldLine.classList.contains("equal") && newLine.classList.contains("equal") ? "equal" : "changed";
  const objectClass = oldLine.className.split(/\s+/).find((className) => className.startsWith("object-color-")) || "";
  const path = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
  return `<path class="diff-connector ${state} ${objectClass}" d="${path}" />`;
}

function diffLineTextAnchor(line, paneRect, preferredEdge) {
  const textElement = line.querySelector(".diff-line-text") || line;
  const textRect = textElement.getBoundingClientRect();
  const lineRect = line.getBoundingClientRect();
  const visibleLeft = Math.max(textRect.left, paneRect.left);
  const visibleRight = Math.min(textRect.right, paneRect.right);
  const hasVisibleWidth = visibleRight > visibleLeft;
  const x = preferredEdge === "left"
    ? (hasVisibleWidth ? visibleLeft : Math.max(paneRect.left, Math.min(textRect.left, paneRect.right)))
    : (hasVisibleWidth ? visibleRight : Math.max(paneRect.left, Math.min(textRect.right, paneRect.right)));
  return {
    x,
    y: lineRect.top + (lineRect.height / 2),
  };
}

function renderReportV2(report) {
  selectors.summaryCards.innerHTML = [
    ["차이", report.summary.total],
    ["비교 객체", report.summary.compared],
    ["변경", report.summary.changed],
    ["누락", report.summary.missing],
    ["추가", report.summary.added],
    ["필수", report.summary.required],
  ]
    .map(([label, value]) => `<div class="summary-card"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");

  selectors.reportList.innerHTML = renderGroupedReportItems(report.visibleItems);

  renderObjectNavigator(false);
  renderOverviewReport(report);
  bindDiffObjectNavigation();
}

function renderGroupedReportItems(items = []) {
  if (!items.length) return `<div class="small-note">현재 필터 기준으로 표시할 차이가 없습니다.</div>`;
  const groups = items.reduce((result, item) => {
    const key = item.objectKey || `${item.objectType}:${item.objectName}`;
    if (!result.has(key)) result.set(key, { key, objectType: item.objectType, objectName: item.objectName, items: [] });
    result.get(key).items.push(item);
    return result;
  }, new Map());
  return [...groups.values()].map((group) => `
    <section class="report-object-group" data-object-key="${escapeHtml(group.key)}">
      <button type="button" class="report-object-header" data-object-navigate="${escapeHtml(group.key)}">
        <strong>${escapeHtml(group.objectType)} ${escapeHtml(group.objectName)}</strong>
        <span>${group.items.length}건</span>
      </button>
      <div class="report-object-details">
        ${group.items.map(renderReportItemRow).join("")}
      </div>
    </section>
  `).join("");
}

function renderReportItemRow(item) {
  const details = (item.details || []).length ? item.details : [{
    field: item.field || "",
    rule: item.message || item.type,
    oldText: item.oldLine || "-",
    newText: item.newLine || "-",
  }];
  return `
    <div class="report-item-row" data-type="${escapeHtml(item.type)}" data-object-key="${escapeHtml(item.objectKey || `${item.objectType}:${item.objectName}`)}">
      <div class="report-item-title">${escapeHtml(reportTypeLabel(item.type))}: ${escapeHtml(item.message || "")}</div>
      ${details.map((detail) => `
        <div class="report-field-diff">
          <span class="field-name">${escapeHtml(detail.field || "-")}</span>
          <code class="old-value">기존 ${escapeHtml(compactReportValue(detail.oldText))}</code>
          <span class="diff-arrow">↔</span>
          <code class="new-value">신규 ${escapeHtml(compactReportValue(detail.newText))}</code>
        </div>
      `).join("")}
      <small>라인: 기존 ${escapeHtml(item.oldLine || "-")} / 신규 ${escapeHtml(item.newLine || "-")}</small>
    </div>
  `;
}

function reportTypeLabel(type) {
  return ({
    changed: "변경",
    missing: "누락",
    added: "추가",
    required: "필수 규칙",
    syntax: "문법 의심",
  })[type] || type;
}

function compactReportValue(value) {
  return String(value || "-").replace(/\s+/g, " ").trim();
}

function renderObjectNavigator(rebind = true) {
  if (!selectors.objectList || !state.lastReport) return;
  const query = canonicalizeComparableLine(selectors.objectSearchInput?.value || "");
  const sortMode = selectors.objectSortSelect?.value || "identity";
  const objects = [...state.lastReport.oldObjects, ...state.lastReport.newObjects]
    .filter((object) => object.type !== "global")
    .filter((object) => !query || objectMatchesSearch(object, query))
    .sort((left, right) => compareNavigatorObjects(left, right, sortMode));

  selectors.objectList.innerHTML = objects.length
    ? objects.map(renderNavigatorObjectItem).join("")
    : `<div class="small-note">검색 조건에 맞는 객체가 없습니다.</div>`;
  if (rebind) bindDiffObjectNavigation();
}

function objectMatchesSearch(object, query) {
  const text = objectSearchText(object);
  const compact = compactSearchText(text);
  return query.split(/\s+/).filter(Boolean).every((part) => {
    const normalizedPart = canonicalizeComparableLine(part);
    const compactPart = compactSearchText(normalizedPart);
    return text.includes(normalizedPart)
      || compact.includes(compactPart)
      || objectSearchTokens(object).some((token) => token.includes(normalizedPart) || compactSearchText(token).includes(compactPart));
  });
}

function renderNavigatorObjectItem(object) {
  const fields = objectFieldEntries(object).slice(0, 8);
  return `
    <div class="object-item" data-object-key="${escapeHtml(object.key)}" data-object-source="${escapeHtml(object.source)}">
      <button type="button" class="object-nav-main" data-object-navigate="${escapeHtml(object.key)}">
        <strong>${escapeHtml(object.type)} ${escapeHtml(object.name)}</strong>
        <span class="small-note">${object.source === "old" ? "기존" : "신규"} | 라인 ${object.startLine}-${object.endLine}</span>
        ${fields.length ? `<span class="object-field-chips">${fields.map(([field, value]) => `<span>${escapeHtml(field)}=${escapeHtml(formatObjectFieldValue(value))}</span>`).join("")}</span>` : ""}
      </button>
      <button type="button" class="object-delete-btn" data-object-delete="${escapeHtml(object.key)}" data-object-source="${escapeHtml(object.source)}">삭제</button>
    </div>
  `;
}

function objectFieldEntries(object) {
  const fields = object?.canonicalFields || object?.fields || {};
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .sort(([left], [right]) => compareSemanticFieldName(left, right));
}

function formatObjectFieldValue(value) {
  const text = Array.isArray(value) ? value.join(",") : String(value || "");
  return text.length > 42 ? `${text.slice(0, 39)}...` : text;
}

function objectSearchText(object) {
  const fieldText = objectFieldEntries(object).map(([field, value]) => `${field} ${formatObjectFieldValue(value)}`).join(" ");
  return canonicalizeComparableLine([
    object.source,
    object.type,
    object.name,
    object.key,
    fieldText,
    ...(object.rawLines || []),
  ].join(" "));
}

function objectSearchTokens(object) {
  return objectSearchText(object)
    .split(/[^a-z0-9./:-]+/i)
    .map(canonicalizeComparableLine)
    .filter(Boolean);
}

function compactSearchText(value) {
  return canonicalizeComparableLine(value).replace(/[^a-z0-9./:-]+/g, "");
}

function compareNavigatorObjects(left, right, sortMode) {
  if (sortMode === "source") {
    const sourceRank = (left.source || "").localeCompare(right.source || "");
    if (sourceRank) return sourceRank;
    return compareObjectIdentity(left, right);
  }
  if (sortMode === "line") {
    const sourceRank = (left.source || "").localeCompare(right.source || "");
    if (sourceRank) return sourceRank;
    return Number(left.startLine || 0) - Number(right.startLine || 0);
  }
  if (sortMode === "field") {
    const leftField = objectFieldEntries(left).map(([field, value]) => `${field}:${formatObjectFieldValue(value)}`).join("|");
    const rightField = objectFieldEntries(right).map(([field, value]) => `${field}:${formatObjectFieldValue(value)}`).join("|");
    const fieldRank = leftField.localeCompare(rightField, undefined, { numeric: true });
    if (fieldRank) return fieldRank;
    return compareObjectIdentity(left, right);
  }
  return compareObjectIdentity(left, right);
}

function renderReportDetails(item) {
  if (item.type === "required") {
    return `<div class="report-rule">위반 규칙: 필수 규칙</div>`;
  }
  if (!item.details?.length) return "";
  return `
    <ul class="report-detail-list">
      ${item.details
        .map(
          (detail) => `
            <li>
              <span>위반/차이: ${escapeHtml(detail.rule)}</span>
              <code>필드: ${escapeHtml(detail.field)}</code>
              <code>기존: ${escapeHtml(detail.oldText)}</code>
              <code>신규: ${escapeHtml(detail.newText)}</code>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

function bindDiffObjectNavigation() {
  selectors.reportList.querySelectorAll("[data-object-navigate], [data-object-key]").forEach((item) => {
    item.addEventListener("click", () => scrollToDiffObject(item.dataset.objectNavigate || item.dataset.objectKey));
  });
  selectors.objectList.querySelectorAll("[data-object-navigate]").forEach((button) => {
    button.addEventListener("click", () => scrollToDiffObject(button.dataset.objectNavigate));
  });
  selectors.objectList.querySelectorAll("[data-object-delete]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteComparedObject(button.dataset.objectSource, button.dataset.objectDelete);
    });
  });
}

function renderOverviewReport(report) {
  if (!selectors.overviewReport) return;
  const objects = [...(report.oldObjects || []), ...(report.newObjects || [])].filter((object) => object.type !== "global");
  const byType = groupBy(objects, (object) => object.type);
  selectors.overviewReport.innerHTML = `
    <section class="overview-section">
      <h3>요약</h3>
      <div class="overview-grid overview-summary-grid">
        <div class="overview-card"><strong>${report.summary.total}</strong><span>전체 차이</span></div>
        <div class="overview-card"><strong>${report.summary.changed}</strong><span>변경 객체</span></div>
        <div class="overview-card"><strong>${report.summary.missing}</strong><span>누락</span></div>
        <div class="overview-card"><strong>${report.summary.added}</strong><span>추가</span></div>
      </div>
    </section>
    <section class="overview-section">
      <h3>객체 수</h3>
      <div class="overview-grid">
        ${[...byType.entries()].sort(([left], [right]) => objectTypeRank(left) - objectTypeRank(right)).map(([type, list]) => {
          const oldCount = list.filter((object) => object.source === "old").length;
          const newCount = list.filter((object) => object.source === "new").length;
          return `<div class="overview-card"><strong>${escapeHtml(type)}</strong><span>기존 ${oldCount}개 / 신규 ${newCount}개</span></div>`;
        }).join("") || `<div class="small-note">비교 결과가 없습니다.</div>`}
      </div>
    </section>
    <section class="overview-section">
      <h3>주요 필드 분포</h3>
      ${renderFieldDistributionSummary(objects)}
    </section>
  `;
}

function renderFieldDistributionSummary(objects) {
  const rows = [];
  objects.forEach((object) => {
    objectFieldEntries(object).forEach(([field, value]) => {
      if (!["route", "next-hop", "tag", "description", "admin-state", "state", "port", "lag", "interface", "address"].includes(field)) return;
      rows.push({ source: object.source, type: object.type, field, value: formatObjectFieldValue(value) });
    });
  });
  const grouped = [...groupBy(rows, (row) => `${row.type}|${row.field}|${row.value}`).entries()]
    .map(([key, list]) => {
      const [type, field, value] = key.split("|");
      return {
        type,
        field,
        value,
        oldCount: list.filter((row) => row.source === "old").length,
        newCount: list.filter((row) => row.source === "new").length,
      };
    })
    .sort((left, right) => (right.oldCount + right.newCount) - (left.oldCount + left.newCount))
    .slice(0, 18);
  return grouped.length
    ? `<div class="overview-chip-list">${grouped.map((row) => `<span><strong>${escapeHtml(row.type)}</strong> ${escapeHtml(row.field)}=${escapeHtml(row.value)} · 기존 ${row.oldCount} / 신규 ${row.newCount}</span>`).join("")}</div>`
    : `<div class="small-note">요약할 필드가 없습니다.</div>`;
}

function renderFieldDistribution(objects) {
  const rows = [];
  objects.forEach((object) => {
    objectFieldEntries(object).forEach(([field, value]) => {
      rows.push({
        source: object.source,
        type: object.type,
        field,
        value: formatObjectFieldValue(value),
      });
    });
  });
  const grouped = groupBy(rows, (row) => `${row.type}|${row.field}|${row.value}`);
  return `
    <div class="overview-table">
      <div class="overview-table-head">타입</div>
      <div class="overview-table-head">필드</div>
      <div class="overview-table-head">값</div>
      <div class="overview-table-head">기존</div>
      <div class="overview-table-head">신규</div>
      ${[...grouped.entries()].sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true })).map(([key, list]) => {
        const [type, field, value] = key.split("|");
        const oldCount = list.filter((row) => row.source === "old").length;
        const newCount = list.filter((row) => row.source === "new").length;
        return `
          <div>${escapeHtml(type)}</div>
          <div>${escapeHtml(field)}</div>
          <div><code>${escapeHtml(value)}</code></div>
          <div>${oldCount}</div>
          <div>${newCount}</div>
        `;
      }).join("") || `<div class="small-note">인식된 필드가 없습니다.</div>`}
    </div>
  `;
}

function groupBy(items, keyFn) {
  return items.reduce((result, item) => {
    const key = keyFn(item);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(item);
    return result;
  }, new Map());
}

function deleteComparedObject(source, objectKey) {
  if (!state.lastReport || !["old", "new"].includes(source) || !objectKey) return;
  const objects = source === "old" ? state.lastReport.oldObjects : state.lastReport.newObjects;
  const object = (objects || []).find((candidate) => candidate.key === objectKey);
  if (!object) return;
  const label = `${source === "old" ? "기존" : "신규"} ${object.type} ${object.name}`;
  if (!window.confirm(`${label} 객체를 입력 config에서 삭제할까요?`)) return;
  const input = source === "old" ? selectors.oldInput : selectors.newInput;
  const lines = input.value.replace(/\r\n/g, "\n").split("\n");
  const start = Math.max(0, Number(object.startLine) - 1);
  const end = Math.max(start, Number(object.endLine) - 1);
  lines.splice(start, end - start + 1);
  input.value = lines.join("\n");
  updateLineNumbers();
  runCompare();
}

function moveComparedObject(source, objectKey, direction) {
  if (!state.lastReport || !["old", "new"].includes(source) || !objectKey) return;
  const objects = (source === "old" ? state.lastReport.oldObjects : state.lastReport.newObjects)
    .filter((object) => object.type !== "global")
    .sort((left, right) => Number(left.startLine || 0) - Number(right.startLine || 0));
  const index = objects.findIndex((object) => object.key === objectKey);
  const swapIndex = index + direction;
  if (index < 0 || swapIndex < 0 || swapIndex >= objects.length) return;
  const input = source === "old" ? selectors.oldInput : selectors.newInput;
  const lines = input.value.replace(/\r\n/g, "\n").split("\n");
  const current = objects[index];
  const target = objects[swapIndex];
  const blocks = [current, target]
    .sort((left, right) => Number(right.startLine) - Number(left.startLine))
    .map((object) => ({
      object,
      start: Math.max(0, Number(object.startLine) - 1),
      end: Math.max(0, Number(object.endLine) - 1),
    }));
  const extracted = new Map();
  blocks.forEach(({ object, start, end }) => {
    extracted.set(object.key, lines.splice(start, end - start + 1));
  });
  const insertAt = Math.max(0, Math.min(current.startLine, target.startLine) - 1);
  const ordered = direction < 0 ? [current, target] : [target, current];
  lines.splice(insertAt, 0, ...ordered.flatMap((object) => extracted.get(object.key) || []));
  input.value = lines.join("\n");
  updateLineNumbers();
  state.activeDiffObjectKey = objectKey;
  runCompare();
  scrollToDiffObject(objectKey);
}

function scrollToDiffObject(objectKey) {
  if (!objectKey) return;
  setActiveTab("compare", { skipConfirm: true });
  showDiffMode();
  state.activeDiffObjectKey = objectKey;
  const selector = `[data-object-key="${cssEscape(objectKey)}"]`;
  const oldTarget = findBestDiffObjectTarget(selectors.oldDiffPane, selector);
  const newTarget = findBestDiffObjectTarget(selectors.newDiffPane, selector);
  const primary = oldTarget || newTarget;
  if (!primary) return;
  const pairIndex = primary.dataset.pairIndex;
  const pairedOld = pairIndex ? selectors.oldDiffPane.querySelector(`[data-pair-index="${cssEscape(pairIndex)}"]`) : oldTarget;
  const pairedNew = pairIndex ? selectors.newDiffPane.querySelector(`[data-pair-index="${cssEscape(pairIndex)}"]`) : newTarget;
  state.syncingDiffScroll = true;
  scrollPaneToLine(selectors.oldDiffPane, pairedOld || oldTarget || primary);
  scrollPaneToLine(selectors.newDiffPane, pairedNew || newTarget || primary);
  state.syncingDiffScroll = false;
  highlightObjectLines(objectKey);
  scheduleDiffConnectorRender();
}

function findBestDiffObjectTarget(pane, selector) {
  const targets = [...pane.querySelectorAll(selector)];
  return targets.find((line) => line.classList.contains("changed") || line.classList.contains("missing") || line.classList.contains("added"))
    || targets[0]
    || null;
}

function scrollPaneToLine(pane, line) {
  if (!pane || !line) return;
  const targetTop = line.offsetTop - Math.max(0, (pane.clientHeight - line.clientHeight) / 2);
  pane.scrollTop = Math.max(0, targetTop);
}

function highlightObjectLines(objectKey) {
  document.querySelectorAll(".object-active").forEach((line) => line.classList.remove("object-active"));
  const selector = `[data-object-key="${cssEscape(objectKey)}"]`;
  const lines = [...selectors.oldDiffPane.querySelectorAll(selector), ...selectors.newDiffPane.querySelectorAll(selector)];
  lines.forEach((line) => {
    line.classList.remove("object-flash");
    line.classList.add("object-active");
    void line.offsetWidth;
    line.classList.add("object-flash");
  });
  window.setTimeout(() => lines.forEach((line) => line.classList.remove("object-flash")), 1400);
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function renderDiffLine(row, state, counterpart, pairIndex, side) {
  const key = row?.key || "";
  const objectType = row?.objectKey ? splitObjectKey(row.objectKey).type : "";
  const counterpartType = counterpart?.objectKey ? splitObjectKey(counterpart.objectKey).type : objectType;
  const classes = ["diff-line", state];
  if (row?.objectMatched) classes.push("object-matched", `object-color-${objectColorIndex(row.objectKey)}`);
  if (row?.ignoredVisual) classes.push("ignored-visual");
  return `<div class="${classes.join(" ")}" data-pair-index="${pairIndex}" data-side="${side}" data-object-type="${escapeHtml(objectType)}" data-object-key="${escapeHtml(row?.objectKey || "")}" data-diff-key="${escapeHtml(key)}" data-semantic-field="${escapeHtml(row?.semanticField || "")}"><div class="diff-line-number">${row ? row.number : ""}</div><div class="diff-line-text">${row ? highlightSharedTokens(row.text || "", counterpart?.text || "", objectType, counterpartType, row.semanticField || "", counterpart?.semanticField || "", row.highlights || []) : "&nbsp;"}</div></div>`;
}

function renderDiffObjectToolbars() {
  renderDiffObjectToolbar("old");
  renderDiffObjectToolbar("new");
}

function renderDiffObjectToolbar(source) {
  const toolbar = source === "old" ? selectors.oldDiffObjectToolbar : selectors.newDiffObjectToolbar;
  const objects = state.lastReport ? (source === "old" ? state.lastReport.oldObjects : state.lastReport.newObjects) : [];
  if (!toolbar) return;
  if (!objects.length) {
    toolbar.hidden = true;
    toolbar.innerHTML = "";
    return;
  }
  toolbar.hidden = false;
  toolbar.innerHTML = `
    <div class="diff-object-toolbar-title">${source === "old" ? "기존" : "신규"} 객체</div>
    <div class="diff-object-actions">
      ${objects.filter((object) => object.type !== "global").map((object) => `
        <div class="diff-object-action-row">
          <button type="button" data-diff-object-jump="${escapeHtml(object.key)}">${escapeHtml(object.type)} ${escapeHtml(object.name)}</button>
          <button type="button" data-diff-object-up="${escapeHtml(object.key)}">위</button>
          <button type="button" data-diff-object-down="${escapeHtml(object.key)}">아래</button>
          <button type="button" data-diff-object-delete="${escapeHtml(object.key)}" data-object-source="${source}">삭제</button>
        </div>
      `).join("")}
    </div>
  `;
  toolbar.querySelectorAll("[data-diff-object-jump]").forEach((button) => {
    button.addEventListener("click", () => scrollToDiffObject(button.dataset.diffObjectJump));
  });
  toolbar.querySelectorAll("[data-diff-object-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteComparedObject(button.dataset.objectSource, button.dataset.diffObjectDelete));
  });
  toolbar.querySelectorAll("[data-diff-object-up]").forEach((button) => {
    button.addEventListener("click", () => moveComparedObject(source, button.dataset.diffObjectUp, -1));
  });
  toolbar.querySelectorAll("[data-diff-object-down]").forEach((button) => {
    button.addEventListener("click", () => moveComparedObject(source, button.dataset.diffObjectDown, 1));
  });
}

function highlightSharedTokens(text, counterpartText, objectType = "", counterpartObjectType = "", semanticField = "", counterpartSemanticField = "", highlights = []) {
  const source = String(text || "");
  const counterpart = String(counterpartText || "");
  const semanticTokens = highlights.length ? highlights.map((item) => ({
    token: item.token,
    field: item.field,
    colorSeed: item.colorGroup || item.field,
    kind: item.kind || tokenHighlightKind(item.token),
  })) : extractSemanticVisualTokens(source, objectType);
  const counterpartFields = new Set(extractSemanticVisualTokens(counterpart, counterpartObjectType).map((item) => item.field));
  const tokens = extractHighlightTokens(source).map((token) => ({
    token,
    colorSeed: token,
    kind: tokenHighlightKind(token),
    match: counterpart.toLowerCase().includes(token.toLowerCase()) ? "shared" : "local",
    field: "",
  }));
  const sourceField = extractFieldName(source);
  const counterpartField = extractFieldName(counterpartText);
  if (sourceField && counterpartField && sourceField === counterpartField) {
    tokens.push({
      token: sourceField,
      colorSeed: sourceField,
      kind: tokenHighlightKind(sourceField),
      match: "shared",
      field: sourceField,
    });
  }
  if (semanticField && semanticField === counterpartSemanticField) {
    semanticTokens.push(...buildForcedSemanticTokens(source, semanticField));
  }

  const visualTokens = [...semanticTokens.map((item) => ({
    ...item,
    match: counterpartFields.has(item.field) ? "shared" : "local",
  })), ...tokens];
  if (!visualTokens.length) return escapeHtml(source);
  const uniqueTokens = dedupeVisualTokens(visualTokens).sort((left, right) => right.token.length - left.token.length);
  const placeholders = [];
  let temp = source;

  uniqueTokens.forEach((item, index) => {
    const marker = `__TOKEN_${index}__`;
    temp = temp.replace(buildTokenHighlightRegex(item.token), marker);
    placeholders.push({ marker, item });
  });

  let html = escapeHtml(temp);
  placeholders.forEach(({ marker, item }) => {
    const colorIndex = tokenColorIndex(item.colorSeed || item.token);
    html = html.replaceAll(marker, `<span class="diff-token-match token-color-${colorIndex}" data-token-kind="${item.kind}" data-token-match="${item.match}" data-semantic-field="${escapeHtml(item.field || "")}" data-token="${escapeHtml(item.token)}">${escapeHtml(item.token)}</span>`);
  });
  return html;
}

function buildTokenHighlightRegex(token) {
  const escapedToken = String(token || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (/^[\w.-]+$/.test(token)) return new RegExp(`(?<![\\w.-])${escapedToken}(?![\\w.-])`, "g");
  return new RegExp(escapedToken, "g");
}

function buildLineSemanticHighlights(text, objectType, canonicalFields = {}, fieldOccurrences = []) {
  const tokens = fieldOccurrences.length
    ? fieldOccurrences.map((item) => ({
      token: item.token,
      field: item.field,
      value: item.value,
      role: item.role,
      kind: tokenHighlightKind(item.token),
    }))
    : extractSemanticVisualTokens(text, objectType);
  const knownFields = new Set(Object.keys(canonicalFields || {}));
  return tokens
    .filter((item) => !knownFields.size || knownFields.has(item.field) || item.field)
    .map((item) => ({
      field: item.field,
      value: canonicalFields?.[item.field] || item.token,
      token: item.token,
      role: item.role || "terminal",
      colorGroup: item.field,
      kind: item.kind || tokenHighlightKind(item.token),
    }));
}

function buildForcedSemanticTokens(text, field) {
  const normalized = canonicalizeComparableLine(text);
  if (field === "next-hop") {
    const match = normalized.match(/\bnext-hop\s+"?([^"\s{}]+)"?/);
    if (match) {
      const value = stripTrailingSyntax(match[1]);
      return [
        { token: "next-hop", field, colorSeed: field, kind: "keyword" },
        { token: value, field, colorSeed: field, kind: "address" },
        { token: `"${value}"`, field, colorSeed: field, kind: "address" },
      ];
    }
  }
  if (field === "state" && /\bno\s+shutdown\b/.test(normalized)) return [{ token: "no shutdown", field, colorSeed: field, kind: "keyword" }];
  if (field === "state" && /\badmin-state\s+enable\b/.test(normalized)) return [{ token: "admin-state enable", field, colorSeed: field, kind: "keyword" }];
  if (field === "state" && /\bshutdown\b/.test(normalized)) return [{ token: "shutdown", field, colorSeed: field, kind: "keyword" }];
  if (field === "admin-state" && /\badmin-state\s+\S+/.test(normalized)) {
    const match = normalized.match(/\badmin-state\s+\S+/);
    return [{ token: match[0], field, colorSeed: field, kind: "keyword" }];
  }
  return [];
}

function dedupeVisualTokens(tokens) {
  const seen = new Set();
  return tokens.filter((item) => {
    const key = item.token;
    if (!item.token || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractSemanticVisualTokens(text, objectType) {
  const normalized = canonicalizeComparableLine(text);
  const tokens = [];
  const add = (field, value, kind = tokenHighlightKind(value)) => {
    if (!field || !value) return;
    tokens.push({ token: field, field, colorSeed: field, kind: "keyword" });
    tokens.push({ token: value, field, colorSeed: field, kind });
    if (normalized.includes(`"${value}"`)) tokens.push({ token: `"${value}"`, field, colorSeed: field, kind });
  };

  if (objectType === "static-route") {
    const route = normalized.match(/(?:^|\s)(?:static-route-entry|route)\s+"?([^"\s{}]+)"?/);
    if (route) add("route", stripTrailingSyntax(route[1]), "address");
    const nextHop = normalized.match(/\bnext-hop\s+"?([^"\s{}]+)"?/);
    if (nextHop) add("next-hop", stripTrailingSyntax(nextHop[1]), "address");
    const tag = normalized.match(/\btag\s+([^"\s{}]+)/);
    if (tag) add("tag", stripTrailingSyntax(tag[1]), "number");
    if (/\bno\s+shutdown\b/.test(normalized)) {
      add("state", "no shutdown", "keyword");
      add("state", "shutdown", "keyword");
    }
    if (/\badmin-state\s+enable\b/.test(normalized)) {
      add("state", "admin-state", "keyword");
      add("state", "enable", "keyword");
    }
    if (/\badmin-state\s+disable\b/.test(normalized)) {
      add("state", "admin-state", "keyword");
      add("state", "disable", "keyword");
    }
    return tokens;
  }

  const field = extractFieldName(normalized);
  const value = field ? extractFieldValue(normalized, field) : "";
  add(field, value);
  return tokens;
}

function extractHighlightTokens(text) {
  const tokens = [];
  const ipMatches = text.match(/\b\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?\b/g) || [];
  const quoted = text.match(/"[^"]+"/g) || [];
  const numbers = text.match(/\b\d+\b/g) || [];
  const words = text.match(/\b[a-zA-Z][a-zA-Z0-9-_.]{2,}\b/g) || [];
  tokens.push(...ipMatches, ...quoted, ...numbers, ...words);
  return [...new Set(tokens.filter((token) => token.length > 1 && !isLowValueHighlightToken(token)))];
}

function isLowValueHighlightToken(token) {
  return [
    "configure",
    "router",
    "route-type",
    "unicast",
    "exit",
  ].includes(canonicalizeComparableLine(token));
}

function tokenColorIndex(token) {
  const normalized = canonicalizeComparableLine(token).replace(/^"|"$/g, "");
  const fieldIndex = semanticFieldOrder.indexOf(normalized);
  if (fieldIndex >= 0) return (fieldIndex % 8) + 1;
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) % 9973;
  }
  return (hash % 8) + 1;
}

function objectColorIndex(key) {
  return tokenColorIndex(key || "object");
}

function tokenHighlightKind(token) {
  const normalized = canonicalizeComparableLine(token);
  if (/^\d{1,3}(?:\.\d{1,3}){3}(?:\/\d{1,2})?$/.test(normalized)) return "address";
  if (/^\d+$/.test(normalized)) return "number";
  if (/^".*"$/.test(String(token))) return "quoted";
  return "keyword";
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function autoAlignNewConfig(options) {
  const oldObjects = parseConfig(selectors.oldInput.value, { ...options, autoAlignObjects: false, sortObjects: false }, "old");
  const newObjects = parseConfig(selectors.newInput.value, { ...options, autoAlignObjects: false, sortObjects: false }, "new");
  const newQueues = groupObjectsByKey(newObjects);
  const aligned = [];
  const used = new Set();
  oldObjects.forEach((oldObject) => {
    const match = takeNextObject(newQueues, oldObject.key);
    if (match) {
      aligned.push(match.rawLines.join("\n"));
      used.add(match);
    }
  });
  newObjects.forEach((object) => {
    if (!used.has(object)) aligned.push(object.rawLines.join("\n"));
  });
  const text = aligned.join("\n");
  if (text && text !== selectors.newInput.value) {
    selectors.newInput.value = text;
    updateLineNumbers();
  }
}

function groupObjectsByKey(objects) {
  return objects.reduce((groups, object) => {
    if (!groups.has(object.key)) groups.set(object.key, []);
    groups.get(object.key).push(object);
    return groups;
  }, new Map());
}

function takeNextObject(groups, key) {
  const queue = groups.get(key);
  return queue?.length ? queue.shift() : null;
}

function alignNewConfigToOldOrder() {
  autoAlignNewConfig({ ...getOptions(), autoAlignObjects: false, sortObjects: false });
  markCompareStale();
}

function createNewEmptyProfile() {
  if (!confirmUnsavedProfileAction("신규 프로파일 생성")) return;
  const vendor = selectors.vendorSelect.value || state.profileDraft?.vendor || "nokia";
  state.activeProfileId = null;
  state.selectedProfileLibraryId = null;
  state.profileDraft = createEmptyProfile(vendor);
  state.selectedProfileObjectType = "static-route";
  ensureProfileExamples(state.profileDraft);
  renderProfileEditor();
  setProfileStatus("신규 프로파일 생성됨 - 저장 필요", "dirty");
  markCompareStale();
}

function moveSelectedBlock(input, direction) {
  const value = input.value;
  if (input.selectionStart === input.selectionEnd) return;
  const lines = value.split("\n");
  const start = value.slice(0, input.selectionStart).split("\n").length - 1;
  const end = value.slice(0, input.selectionEnd).split("\n").length - 1;
  const block = lines.splice(start, end - start + 1);
  const target = Math.max(0, Math.min(lines.length, start + direction));
  lines.splice(target, 0, ...block);
  input.value = lines.join("\n");
  updateLineNumbers();
  markCompareStale();
}

function addRuleFromSelection(source, kind) {
  const input = source === "old" ? selectors.oldInput : selectors.newInput;
  const text = input.value.slice(input.selectionStart, input.selectionEnd).trim();
  if (!text) return;
  text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line) => state.profileDraft.rules[kind].push({ source, pattern: line }));
  renderRulesList(kind);
  markCompareStale();
}

async function saveSession() {
  const defaultName = `${state.profileDraft.name} / ${formatDate(Date.now())}`;
  const inputName = window.prompt?.("비교 이력 이름을 입력하세요", defaultName);
  const name = inputName && inputName.trim() ? inputName.trim() : defaultName;
  const sessions = await readRecords("sessions", "configWorkbenchSessions");
  const existing = sessions.find((item) => item.name === name);
  if (existing && !window.confirm?.(`'${name}' 이력이 이미 있습니다. 덮어쓸까요?`)) return;
  const session = {
    id: existing?.id || createId(),
    name,
    oldConfig: selectors.oldInput.value,
    newConfig: selectors.newInput.value,
    profileId: state.activeProfileId,
    updatedAt: Date.now(),
  };
  await saveRecord("sessions", session, "configWorkbenchSessions");
  await refreshHistorySelect();
}

async function loadSelectedSession() {
  const sessions = await readRecords("sessions", "configWorkbenchSessions");
  const session = sessions.find((item) => item.id === selectors.historySelect.value);
  if (!session) return;
  selectors.oldInput.value = session.oldConfig;
  selectors.newInput.value = session.newConfig;
  captureInitialConfigSnapshot(true);
  updateLineNumbers();
  if (session.profileId) {
    const profiles = await readRecords("profiles", "configWorkbenchProfiles");
    const profile = profiles.find((item) => item.id === session.profileId);
    if (profile) {
      state.activeProfileId = profile.id;
      state.profileDraft = normalizeProfile(profile);
      renderProfileEditor();
      await refreshProfileSelect();
    }
  }
  markCompareStale();
}

async function refreshHistorySelect() {
  const sessions = await readRecords("sessions", "configWorkbenchSessions");
  selectors.historySelect.innerHTML = sessions.length
    ? sessions.map((session) => `<option value="${session.id}">${escapeHtml(session.name)}</option>`).join("")
    : "<option value=''>저장된 비교 이력 없음</option>";
}

async function refreshProfileSelect() {
  const profiles = await readRecords("profiles", "configWorkbenchProfiles");
  const selectedId = state.activeProfileId || state.profileDraft?.id || state.selectedProfileLibraryId || "";
  selectors.profileSelect.innerHTML = profiles.length
    ? [`<option value="">현재 편집 중 프로파일</option>`, ...profiles.map((profile) => `<option value="${profile.id}" ${profile.id === selectedId ? "selected" : ""}>${escapeHtml(profile.name)}</option>`)].join("")
    : "<option value=''>저장된 프로파일 없음</option>";
}

async function saveProfile() {
  saveCurrentProfileExamples();
  const targetId = state.profileDraft.id || state.activeProfileId || null;
  const record = {
    ...state.profileDraft,
    id: targetId || createId(),
    name: selectors.profileNameInput.value.trim() || "이름 없는 프로파일",
    vendor: selectors.vendorSelect.value,
    updatedAt: Date.now(),
  };
  state.activeProfileId = record.id;
  state.selectedProfileLibraryId = record.id;
  state.profileDraft = normalizeProfile(record);
  await saveRecord("profiles", record, "configWorkbenchProfiles");
  await refreshProfileSelect();
  await renderSavedProfiles();
  selectors.profileSelect.value = record.id;
  commitProfileSnapshot();
  setProfileStatus(`프로파일 저장 완료: ${record.name} / ${formatDate(record.updatedAt)}`, "saved");
}

async function saveProfileAs() {
  saveCurrentProfileExamples();
  const record = {
    ...state.profileDraft,
    id: createId(),
    name: selectors.profileNameInput.value.trim() || `${state.profileDraft.name || "이름 없는 프로파일"} 복사본`,
    vendor: selectors.vendorSelect.value,
    updatedAt: Date.now(),
  };
  state.activeProfileId = record.id;
  state.selectedProfileLibraryId = record.id;
  state.profileDraft = normalizeProfile(record);
  await saveRecord("profiles", record, "configWorkbenchProfiles");
  await refreshProfileSelect();
  await renderSavedProfiles();
  selectors.profileSelect.value = record.id;
  commitProfileSnapshot();
  setProfileStatus(`다른 이름으로 저장 완료: ${record.name} / ${formatDate(record.updatedAt)}`, "saved");
}

async function loadSelectedProfile() {
  if (!confirmUnsavedProfileAction("다른 프로파일 적용")) return;
  const id = selectors.profileSelect.value;
  if (!id) return;
  const profiles = await readRecords("profiles", "configWorkbenchProfiles");
  const profile = profiles.find((item) => item.id === id);
  if (!profile) return;
  state.activeProfileId = profile.id;
  state.selectedProfileLibraryId = profile.id;
  state.profileDraft = normalizeProfile(profile);
  commitProfileSnapshot();
  renderProfileEditor();
  await refreshProfileSelect();
  setProfileStatus(`프로파일 적용 완료: ${profile.name}`, "applied");
  markCompareStale();
}

async function deleteSelectedProfile() {
  const id = selectors.profileSelect.value || state.selectedProfileLibraryId || state.activeProfileId;
  if (!id) return;
  await deleteRecord("profiles", id, "configWorkbenchProfiles");
  if (state.activeProfileId === id) {
    state.activeProfileId = null;
    state.profileDraft = createDefaultProfile();
    renderProfileEditor();
  }
  if (state.selectedProfileLibraryId === id) state.selectedProfileLibraryId = null;
  await refreshProfileSelect();
  await renderSavedProfiles();
  setProfileStatus("프로파일 삭제 완료", "deleted");
  markCompareStale();
}

async function renderSavedProfiles() {
  const profiles = await readRecords("profiles", "configWorkbenchProfiles");
  selectors.savedProfilesList.innerHTML = profiles.length
    ? profiles
        .map(
          (profile) => `
            <div class="saved-profile-item ${profile.id === (state.selectedProfileLibraryId || state.activeProfileId) ? "selected" : ""}" data-profile-item-id="${profile.id}">
              <div>
                <strong>${escapeHtml(profile.name)}</strong>
                <div class="small-note">${profile.vendor} | 수정 ${formatDate(profile.updatedAt)}</div>
              </div>
              <div class="saved-profile-actions">
                <button type="button" data-profile-select-id="${profile.id}">선택</button>
                <button type="button" data-profile-load-id="${profile.id}">불러오기</button>
              </div>
            </div>
          `,
        )
        .join("")
    : `<div class="small-note">저장된 프로파일이 없습니다.</div>`;

  selectors.savedProfilesList.querySelectorAll("[data-profile-select-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectSavedProfile(button.dataset.profileSelectId);
    });
  });

  selectors.savedProfilesList.querySelectorAll("[data-profile-item-id]").forEach((item) => {
    item.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      selectSavedProfile(item.dataset.profileItemId);
    });
  });

  selectors.savedProfilesList.querySelectorAll("[data-profile-load-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirmUnsavedProfileAction("저장된 프로파일 불러오기")) return;
      const profiles = await readRecords("profiles", "configWorkbenchProfiles");
      const profile = profiles.find((item) => item.id === button.dataset.profileLoadId);
      if (!profile) return;
      state.activeProfileId = profile.id;
      state.selectedProfileLibraryId = profile.id;
      state.profileDraft = normalizeProfile(profile);
      commitProfileSnapshot();
      renderProfileEditor();
      await refreshProfileSelect();
      setActiveTab("profiles");
      setProfileStatus(`프로파일 적용 완료: ${profile.name}`, "applied");
      markCompareStale();
    });
  });
}

function selectSavedProfile(id) {
  if (!id) return;
  state.selectedProfileLibraryId = id;
  selectors.profileSelect.value = id;
  selectors.savedProfilesList.querySelectorAll(".saved-profile-item").forEach((item) => item.classList.toggle("selected", item.dataset.profileItemId === id));
  setProfileStatus("삭제할 프로파일이 선택되었습니다.", "info");
}

function normalizeProfile(profile) {
  return {
    id: profile.id || null,
    name: profile.name || "이름 없는 프로파일",
    vendor: profile.vendor || "nokia",
    mappings: Array.isArray(profile.mappings) ? profile.mappings : objectTypes.map((type) => ({ oldType: type, newType: type })),
    objects: normalizeSemanticObjects(profile.objects),
    normalize: normalizeNormalizeRules(profile.normalize),
    rules: {
      ignore: Array.isArray(profile.rules?.ignore) ? profile.rules.ignore : [],
      required: Array.isArray(profile.rules?.required) ? profile.rules.required : [],
    },
    examples: normalizeExamples(profile.examples),
    identityRules: normalizeIdentityRules(profile.identityRules),
    lineMappings: normalizeLineMappings(profile.lineMappings),
    contextMappings: normalizeContextMappings(profile.contextMappings),
    fieldMappings: normalizeFieldMappings(profile.fieldMappings),
    lineRules: normalizeLineRules(profile.lineRules),
    validationPolicies: normalizeValidationPolicies(profile.validationPolicies),
    semanticRules: normalizeSemanticRules(profile.semanticRules),
    semanticMappings: normalizeSemanticMappings(profile.semanticMappings),
    semanticNodeGroups: normalizeSemanticNodeGroups(profile.semanticNodeGroups),
    semanticLineGroups: normalizeSemanticLineGroups(profile.semanticLineGroups),
    parserRules: normalizeParserRules(profile.parserRules),
  };
}

function normalizeSemanticObjects(value) {
  const base = createDefaultSemanticObjects();
  if (!value || typeof value !== "object") return base;
  if (!Object.keys(value).length) return {};
  objectTypes.forEach((type) => {
    const item = value[type];
    if (!item || typeof item !== "object") return;
    const fields = { ...(base[type]?.fields || {}) };
    Object.entries(item.fields || {}).forEach(([field, rule]) => {
      const fieldName = canonicalizeComparableLine(field);
      const patterns = Array.isArray(rule?.patterns) ? rule.patterns.filter((pattern) => typeof pattern === "string" && pattern.trim()) : [];
      if (fieldName && patterns.length) fields[fieldName] = { patterns };
    });
    const policies = Object.entries(item.policies || {}).reduce((result, [field, policy]) => {
      const normalizedField = canonicalizeComparableLine(field);
      if (normalizedField && ["compare", "presence", "required", "ignore", "normalize"].includes(policy)) result[normalizedField] = policy;
      return result;
    }, {});
    if (Object.keys(fields).length) {
      base[type] = {
        objectKey: Array.isArray(item.objectKey) ? item.objectKey.map(canonicalizeComparableLine).filter(Boolean) : base[type].objectKey,
        fields,
        policies: { ...base[type].policies, ...policies },
      };
    }
  });
  return base;
}

function normalizeNormalizeRules(value) {
  const base = createDefaultNormalizeRules();
  if (!value || typeof value !== "object") return base;
  return {
    remove: Array.isArray(value.remove) ? value.remove.map(canonicalizeComparableLine).filter(Boolean) : base.remove,
    map: typeof value.map === "object" && value.map
      ? Object.fromEntries(Object.entries(value.map).map(([from, to]) => [canonicalizeComparableLine(from), canonicalizeComparableLine(to)]))
      : base.map,
  };
}

function normalizeSemanticRules(value) {
  const base = createDefaultSemanticRules();
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (!Array.isArray(value[type])) return;
    base[type] = value[type]
      .map((item, index) => ({
        source: ["old", "new", "both"].includes(item.source) ? item.source : "both",
        field: canonicalizeComparableLine(item.field || ""),
        role: ["object-key", "compare-field"].includes(item.role) ? item.role : "compare-field",
        valueType: ["ip-prefix", "ip", "number", "token"].includes(item.valueType) ? item.valueType : "token",
        selector: {
          anchorBefore: canonicalizeComparableLine(item.selector?.anchorBefore || ""),
          anchorAfter: canonicalizeComparableLine(item.selector?.anchorAfter || ""),
        },
        sample: canonicalizeComparableLine(item.sample || ""),
        groupId: typeof item.groupId === "string" ? item.groupId : "",
      }))
      .filter((item) => item.field && (item.selector.anchorBefore || item.selector.anchorAfter));
  });
  return base;
}

function normalizeParserRules(value) {
  const base = createDefaultParserRules();
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (!Array.isArray(value[type])) return;
    base[type] = value[type]
      .map((item, index) => ({
        source: ["old", "new", "both"].includes(item.source) ? item.source : "both",
        pattern: typeof item.pattern === "string" ? item.pattern : "",
        objectField: canonicalizeComparableLine(item.objectField || defaultObjectFieldForType(type)),
        message: typeof item.message === "string" ? item.message : "",
      }))
      .filter((item) => item.pattern && item.objectField);
  });
  return base;
}

function normalizeValidationPolicies(value) {
  const base = createDefaultValidationPolicies();
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (!Array.isArray(value[type])) return;
    base[type] = value[type]
      .map((item) => ({
        field: canonicalizeComparableLine(item.field || ""),
        policy: ["compare", "required", "presence", "conditional", "ignore", "exception"].includes(item.policy) ? item.policy : "compare",
        oldValues: typeof item.oldValues === "string" ? item.oldValues : "",
        newValue: typeof item.newValue === "string" ? item.newValue : "",
        message: typeof item.message === "string" ? item.message : "",
      }))
      .filter((item) => item.field);
  });
  return base;
}

function normalizeIdentityRules(value) {
  const base = createDefaultIdentityRules();
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (value[type] && typeof value[type] === "object") {
      base[type] = normalizeIdentityRuleBySide(value[type], type);
    }
  });
  return base;
}

function normalizeExamples(value) {
  const base = createDefaultExamples();
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (value[type] && typeof value[type] === "object") {
      base[type] = {
        old: typeof value[type].old === "string" && value[type].old.trim() ? value[type].old : base[type]?.old || "",
        new: typeof value[type].new === "string" && value[type].new.trim() ? value[type].new : base[type]?.new || "",
      };
    }
  });
  return base;
}

function normalizeByType(value) {
  const base = Object.fromEntries(objectTypes.map((type) => [type, []]));
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (Array.isArray(value[type])) base[type] = value[type];
  });
  return base;
}

function normalizeSemanticMappings(value) {
  const base = createEmptyRulesByType();
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (!Array.isArray(value[type])) return;
    base[type] = value[type]
      .map((item) => {
        const oldNodes = normalizeSemanticNodes(item.oldNodes || item.oldSelectors);
        const newNodes = normalizeSemanticNodes(item.newNodes || item.newSelectors);
        const field = canonicalizeComparableLine(item.field || "");
        const role = ["object-key", "compare-field"].includes(item.role) ? item.role : "compare-field";
        if (!field || !oldNodes.length || !newNodes.length) return null;
        return {
          id: item.id || item.groupId || createId(),
          field,
          role,
          oldNodes,
          newNodes,
          cardinality: semanticMappingCardinality(oldNodes, newNodes),
          groupId: item.groupId || item.id || createId(),
        };
      })
      .filter(Boolean);
  });
  return base;
}

function normalizeSemanticNodes(nodes) {
  return (Array.isArray(nodes) ? nodes : [])
    .map((node) => ({
      lineIndex: Number.isFinite(Number(node.lineIndex)) ? Number(node.lineIndex) : 0,
      tokenIndex: Number.isFinite(Number(node.tokenIndex)) ? Number(node.tokenIndex) : 0,
      selectedToken: canonicalizeComparableLine(node.selectedToken || node.token || ""),
      valueTokenIndex: Number.isFinite(Number(node.valueTokenIndex)) ? Number(node.valueTokenIndex) : Number.isFinite(Number(node.tokenIndex)) ? Number(node.tokenIndex) : 0,
      value: canonicalizeComparableLine(node.value || node.sample || node.selectedToken || node.token || ""),
      anchorBefore: canonicalizeComparableLine(node.anchorBefore || ""),
      anchorAfter: canonicalizeComparableLine(node.anchorAfter || ""),
    }))
    .filter((node) => node.selectedToken || node.value);
}

function normalizeSemanticNodeGroups(value) {
  const base = createEmptyRulesByType();
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (!Array.isArray(value[type])) return;
    base[type] = value[type]
      .map((item, index) => ({
        id: item.id || createId(),
        source: ["old", "new"].includes(item.source) ? item.source : "old",
        type: "token-group",
        lineIndex: Number(item.lineIndex) || 0,
        tokenIndex: Number(item.tokenIndex) || 0,
        tokenIndexes: Array.isArray(item.tokenIndexes) ? item.tokenIndexes.map(Number).filter(Number.isFinite) : [],
        selectedToken: canonicalizeComparableLine(item.selectedToken || item.text || ""),
        text: canonicalizeComparableLine(item.text || item.selectedToken || ""),
        field: canonicalizeComparableLine(item.field || ""),
        value: canonicalizeComparableLine(item.value || ""),
      }))
      .filter((item) => item.field && item.value);
  });
  return base;
}

function normalizeSemanticLineGroups(value) {
  const base = createEmptyRulesByType();
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (!Array.isArray(value[type])) return;
    base[type] = value[type]
      .map((item, index) => ({
        id: item.id || createId(),
        source: ["old", "new"].includes(item.source) ? item.source : "old",
        type: "line-group",
        lineNumber: canonicalizeGroupLineNumber(item.lineNumber || item.label || `G${index + 1}`),
        label: canonicalizeGroupLineNumber(item.label || item.lineNumber || `G${index + 1}`),
        lineIndexes: Array.isArray(item.lineIndexes) ? item.lineIndexes.map(Number).filter(Number.isFinite) : [],
        text: normalizeSelectedBlock(item.text || ""),
        field: canonicalizeComparableLine(item.field || ""),
        value: canonicalizeComparableLine(item.value || ""),
        fields: Object.fromEntries(Object.entries(item.fields || {}).map(([field, value]) => [canonicalizeComparableLine(field), canonicalizeComparableLine(value)])),
      }))
      .filter((item) => item.lineIndexes.length && item.text);
  });
  return base;
}

function normalizeLineMappings(value) {
  const base = createEmptyRulesByType();
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (!Array.isArray(value[type])) return;
    base[type] = value[type]
      .map((item) => ({
        id: item.id || createId(),
        type: "line-mapping",
        oldRef: normalizeProfileLineRef(item.oldRef, "old"),
        newRef: normalizeProfileLineRef(item.newRef, "new"),
        oldText: normalizeSelectedBlock(item.oldText || ""),
        newText: normalizeSelectedBlock(item.newText || ""),
      }))
      .filter((item) => item.oldText && item.newText);
  });
  return base;
}

function normalizeProfileLineRef(ref, source) {
  if (!ref || typeof ref !== "object") return null;
  if (ref.kind === "group") {
    return {
      kind: "group",
      source,
      groupId: ref.groupId || "",
      lineNumber: canonicalizeGroupLineNumber(ref.lineNumber || ref.label || ""),
      label: canonicalizeGroupLineNumber(ref.label || ref.lineNumber || ""),
      lineIndexes: Array.isArray(ref.lineIndexes) ? ref.lineIndexes.map(Number).filter(Number.isFinite) : [],
    };
  }
  if (ref.kind === "line") {
    const lineIndex = Number(ref.lineIndex);
    if (!Number.isFinite(lineIndex)) return null;
    return {
      kind: "line",
      source,
      lineIndex,
      lineNumber: lineIndex + 1,
      label: `L${lineIndex + 1}`,
    };
  }
  return null;
}

function normalizeContextMappings(value) {
  const base = Object.fromEntries(objectTypes.map((type) => [type, []]));
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (!Array.isArray(value[type])) return;
    base[type] = value[type]
      .map((item, index) => ({
        oldText: normalizeSelectedBlock(item.oldText || ""),
        newText: normalizeSelectedBlock(item.newText || ""),
        label: canonicalizeComparableLine(item.label || `context-${index + 1}`),
      }))
      .filter((item) => item.oldText && item.newText);
  });
  return base;
}

function normalizeFieldMappings(value) {
  const base = Object.fromEntries(objectTypes.map((type) => [type, []]));
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (!Array.isArray(value[type])) return;
    base[type] = value[type]
      .map((item) => ({
        oldField: canonicalizeComparableLine(item.oldField || ""),
        newField: canonicalizeComparableLine(item.newField || ""),
      }))
      .filter((item) => item.oldField && item.newField);
  });
  return base;
}

function normalizeLineRules(value) {
  const base = createEmptyRulesByType();
  if (!value || typeof value !== "object") return base;
  objectTypes.forEach((type) => {
    if (!Array.isArray(value[type])) return;
    base[type] = value[type]
      .map((item) => ({
        source: ["old", "new"].includes(item.source) ? item.source : "old",
        text: normalizeSelectedBlock(item.text || ""),
        action: lineActions.includes(item.action) ? item.action : "same",
        message: typeof item.message === "string" ? item.message : "",
      }))
      .filter((item) => item.text);
  });
  return base;
}

function exportReport() {
  if (!state.lastReport) return;
  const lines = [
    "Network Config Workbench Report",
    `생성: ${formatDate(Date.now())}`,
    `프로파일: ${state.profileDraft.name}`,
    "",
    `비교 객체: ${state.lastReport.summary.compared}`,
    `변경: ${state.lastReport.summary.changed}`,
    `누락: ${state.lastReport.summary.missing}`,
    `추가: ${state.lastReport.summary.added}`,
    `필수 규칙: ${state.lastReport.summary.required}`,
    "",
    ...state.lastReport.items.map((item) => `[${item.type}] ${item.objectType} ${item.objectName} | 기존 ${item.oldLine} | 신규 ${item.newLine} | ${item.message}`),
  ];
  saveTextFile("config-compare-report.txt", lines.join("\n"));
}

function saveTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function saveUiPreferences() {
  document.body.dataset.theme = selectors.themeSelect.value;
  document.documentElement.style.setProperty("--editor-font", `${selectors.fontSelect.value}, monospace`);
  localStorage.setItem("configWorkbenchUi", JSON.stringify({ theme: selectors.themeSelect.value, font: selectors.fontSelect.value }));
}

function loadUiPreferences() {
  try {
    const prefs = JSON.parse(localStorage.getItem("configWorkbenchUi")) || { theme: "light", font: "Consolas" };
    selectors.themeSelect.value = prefs.theme;
    selectors.fontSelect.value = prefs.font;
  } catch {}
  saveUiPreferences();
}

function extractFieldName(text) {
  const normalized = canonicalizeComparableLine(text);
  const routeMatch = normalized.match(/(?:^|\s)(?:static-route-entry|route)\s+([\w./:-]+)/);
  if (routeMatch) return "route";

  const nextHopMatch = normalized.match(/\bnext-hop\s+"?([^"\s{}]+)"?/);
  if (nextHopMatch) return "next-hop";

  const tagMatch = normalized.match(/\btag\s+([^"\s{}]+)/);
  if (tagMatch) return "tag";

  if (/\bno\s+shutdown\b|\badmin-state\s+enable\b/.test(normalized)) return "state";
  if (/\bshutdown\b|\badmin-state\s+disable\b/.test(normalized)) return "state";

  const match = normalized.match(/^([a-z0-9-_.]+)/);
  return match ? match[1] : "";
}

function containsField(text, fieldName) {
  return text.replace(/\r\n/g, "\n").split("\n").some((line) => extractFieldName(line) === fieldName);
}

function containsPattern(text, pattern) {
  const semanticField = extractFieldName(pattern);
  if (semanticField.includes(":") && containsField(text, semanticField)) return true;
  return canonicalizeComparableLine(text).includes(canonicalizeComparableLine(pattern));
}

function canonicalizeComparableLine(line) {
  return String(line || "").toLowerCase().replace(/"/g, "").replace(/\s+/g, " ").trim();
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function openDatabase() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("networkConfigWorkbench", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
      if (!db.objectStoreNames.contains("profiles")) db.createObjectStore("profiles", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveRecord(storeName, record, fallbackKey) {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const current = JSON.parse(localStorage.getItem(fallbackKey) || "[]").filter((item) => item.id !== record.id);
    current.unshift(record);
    localStorage.setItem(fallbackKey, JSON.stringify(current.slice(0, 50)));
  }
}

async function readRecords(storeName, fallbackKey) {
  try {
    const db = await openDatabase();
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return records.sort((left, right) => right.updatedAt - left.updatedAt);
  } catch {
    return JSON.parse(localStorage.getItem(fallbackKey) || "[]").sort((left, right) => right.updatedAt - left.updatedAt);
  }
}

async function deleteRecord(storeName, id, fallbackKey) {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    const current = JSON.parse(localStorage.getItem(fallbackKey) || "[]").filter((item) => item.id !== id);
    localStorage.setItem(fallbackKey, JSON.stringify(current));
  }
}

function autoLearnRulesFromExamples() {
  saveCurrentProfileExamples();

  const type = state.selectedProfileObjectType;

  const oldCandidates = collectAutoSemanticCandidates(selectors.profileOldExampleInput.value, type, "old");
  const newCandidates = collectAutoSemanticCandidates(selectors.profileNewExampleInput.value, type, "new");

  const matches = [];

  for (const oldItem of oldCandidates) {
    const newItems = newCandidates.filter((candidate) => candidate.field === oldItem.field && candidate.sample === oldItem.sample);

    if (newItems.length) {
      matches.push({
        field: oldItem.field,
        old: oldItem,
        newItems,
      });
    }
  }

  for (const match of matches) {
    if (!state.profileDraft.semanticMappings[type]) state.profileDraft.semanticMappings[type] = [];
    upsertSemanticMappingGroup(
      type,
      match.field,
      match.old.role,
      [candidateToMappingSelector(match.old)],
      match.newItems.map(candidateToMappingSelector),
    );
  }

  renderProfileEditor();

  setProfileGuide(
    `${matches.length}개의 자동 후보가 생성되었습니다.`,
    "ok"
  );

  markProfileDirty("Field Extraction", "추가", "자동 후보");
  markCompareStale();
}

function collectAutoSemanticCandidates(text, type, source) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .flatMap((line, lineIndex) => inferSemanticFieldsFromLine(canonicalizeComparableLine(line), type, source, lineIndex))
    .filter(Boolean);
}

function inferSemanticFieldsFromLine(line, type, source, lineIndex) {
  if (!line) return [];
  const extracted = extractFieldsFromLine(line, state.profileDraft, type);
  const fields = Object.keys(extracted).length
    ? Object.keys(extracted)
    : ["route", "next-hop", "tag", "description", "state", "neighbor", "peer-as", "authentication-key", "group"];
  return fields.map((field) => {
    const value = extracted[field] || extractKnownFieldValue(line, field);
    if (!value) return null;
    const tokens = getSemanticLineTokens(line);
    const selectedToken = field === "route" && line.includes("static-route-entry") ? "static-route-entry" : field === "state" && line.includes("admin-state") ? "admin-state" : field;
    const tokenIndex = Math.max(0, tokens.findIndex((token) => canonicalizeComparableLine(token) === selectedToken));
    return {
      field,
      role: field === defaultObjectFieldForType(type) ? "object-key" : "compare-field",
      valueType: inferSemanticValueType(value),
      selector: { anchorBefore: selectedToken, anchorAfter: "" },
      sample: canonicalizeComparableLine(value),
      source,
      lineIndex,
      tokenIndex,
      selectedToken,
      value,
    };
  }).filter(Boolean);
}

function candidateToMappingSelector(candidate) {
  const line = getExampleLine(candidate.source, candidate.lineIndex);
  const tokens = getSemanticLineTokens(line);
  const valueTokenIndex = inferValueTokenIndex(tokens, candidate.tokenIndex, candidate.field);
  return {
    lineIndex: candidate.lineIndex,
    tokenIndex: candidate.tokenIndex,
    selectedToken: candidate.selectedToken,
    valueTokenIndex,
    value: candidate.sample,
    anchorBefore: candidate.selector?.anchorBefore || "",
    anchorAfter: candidate.selector?.anchorAfter || "",
  };
}

function inferSemanticField(line, type, source) {
  const rules = getVendorFieldRules(type);

  for (const rule of rules) {
    const match = line.match(rule.regex);

    if (!match) continue;

    const value = match[1] || "";

    return {
      field: rule.field,
      role: rule.role,
      valueType: inferSemanticValueType(value),
      selector: {
        anchorBefore: rule.anchorBefore || rule.field,
        anchorAfter: "",
      },
      sample: value,
      source,
    };
  }

  return null;
}

function getVendorFieldRules(type) { // 수동 추가
  const vendorProfiles = {
    bgp: [
      {
        field: "neighbor",
        role: "object-key",
        regex: /neighbor\s+"?([\d.]+)"?/,
      },
      {
        field: "description",
        role: "compare-field",
        regex: /description\s+"([^"]+)"/,
      },
      {
        field: "authentication-key",
        role: "compare-field",
        regex: /authentication-key\s+"([^"]+)"/,
      },
      {
        field: "group",
        role: "compare-field",
        regex: /group\s+"([^"]+)"/,
      },
    ],

    "static-route": [
      {
        field: "route",
        role: "object-key",
        regex: /(?:route|static-route-entry)\s+([\d./]+)/,
      },
      {
        field: "next-hop",
        role: "compare-field",
        regex: /next-hop\s+"?([\d.]+)"?/,
      },
      {
        field: "tag",
        role: "compare-field",
        regex: /tag\s+(\d+)/,
      },
    ],
  };

  return vendorProfiles[type] || [];
}

init();
