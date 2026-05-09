(function () {
  const rootId = "profileMappingReactRoot";
  let root = null;
  let currentBridge = null;

  function h(type, props, ...children) {
    return React.createElement(type, props || {}, ...children.flat());
  }

  function cx(...items) {
    return items.filter(Boolean).join(" ");
  }

  function labelForLineKind(kind) {
    return ({
      "line-to-line": "Line",
      "group-to-group": "Group",
      "group-to-line": "Group-Line",
      "line-to-group": "Line-Group",
    })[kind] || "Line";
  }

  function groupBySource(groups, source) {
    return (groups || []).filter((group) => group.source === source);
  }

  function Header({ snapshot, onClear }) {
    const counts = snapshot.counts || {};
    return h("div", { className: "pm-header" },
      h("div", null,
        h("div", { className: "pm-eyebrow" }, "Profile Mapping Studio"),
        h("h4", null, snapshot.objectType || "-"),
      ),
      h("div", { className: "pm-stat-row" },
        h("span", null, h("strong", null, counts.lineMappings || 0), " line"),
        h("span", null, h("strong", null, counts.tokenMappings || 0), " token"),
        h("span", null, h("strong", null, (counts.oldLineGroups || 0) + (counts.newLineGroups || 0)), " groups"),
        h("button", { type: "button", className: "pm-ghost-btn", onClick: onClear }, "Clear focus"),
      ),
    );
  }

  function SelectionState({ snapshot }) {
    const pending = snapshot.selected?.pendingLineRef;
    const link = snapshot.selected?.selectedLineLink;
    const tokens = snapshot.selected?.semanticTokens || { old: [], new: [] };
    let label = "Idle";
    let detail = "Select old/new lines, groups, or tokens in the preview.";
    if (pending) {
      label = "Line selected";
      detail = `${pending.source} ${pending.label || pending.lineNumber || pending.groupId || ""}`;
    } else if (link) {
      label = "Mapping selected";
      detail = `${link.oldRef?.label || "old"} -> ${link.newRef?.label || "new"}`;
    } else if ((tokens.old || []).length || (tokens.new || []).length) {
      label = "Token selected";
      detail = `old ${(tokens.old || []).length} / new ${(tokens.new || []).length}`;
    }
    return h("div", { className: "pm-selection mapping-default" },
      h("span", { className: "pm-chip" }, label),
      h("span", null, detail),
    );
  }

  function MappingRail({ snapshot, bridge }) {
    const lineMappings = snapshot.lineMappings || [];
    const tokenMappings = snapshot.tokenMappings || [];
    const visible = [
      ...lineMappings.slice(0, 5).map((item) => ({ ...item, railType: "line" })),
      ...tokenMappings.slice(0, 5).map((item) => ({ ...item, railType: "token" })),
    ];
    return h("section", { className: "pm-panel pm-rail-panel" },
      h("div", { className: "pm-panel-title" }, "Mapping Rail"),
      h("div", { className: "pm-rail" },
        visible.length ? visible.map((item) =>
          h("button", {
            key: `${item.railType}-${item.index}`,
            type: "button",
            className: cx("pm-rail-row", item.railType === "token" ? "token-mapped" : "mapping-mapped", item.selected && "mapping-selected"),
            onClick: () => item.railType === "token" ? bridge.focusTokenMapping(item.index) : bridge.focusLineMapping(item.index),
            title: `${item.oldLabel} -> ${item.newLabel}`,
          },
            h("span", { className: cx("pm-node", item.railType) }, item.railType === "token" ? item.field || "token" : labelForLineKind(item.kind)),
            h("span", { className: "pm-edge" }),
            h("span", { className: cx("pm-node", item.railType) }, item.railType === "token" ? item.cardinality || "1:1" : "mapped"),
          ),
        ) : h("div", { className: "pm-empty" }, "No mappings"),
      ),
    );
  }

  function GroupColumn({ title, groups, bridge }) {
    return h("div", { className: "pm-group-column" },
      h("div", { className: "pm-column-title" }, title),
      groups.length ? groups.map((group) =>
        h("div", { key: group.id, className: cx("pm-group-card", "group-default", group.mapped && "group-mapped", group.selected && "group-selected") },
          h("div", { className: "pm-group-top" },
            h("input", {
              className: "pm-group-name",
              defaultValue: group.label,
              title: "Group line number",
              onBlur: (event) => bridge.renameLineGroup(group.id, event.currentTarget.value),
            }),
            h("button", { type: "button", className: "pm-ghost-btn", onClick: () => bridge.selectLineGroup(group.id), title: "Select group for mapping" }, "Select"),
            h("button", { type: "button", className: "pm-icon-btn", onClick: () => bridge.deleteLineGroup(group.id), title: "Ungroup" }, "x"),
          ),
          h("div", { className: "pm-group-lines" }, `lines ${group.linesLabel || "-"}`),
          h("div", { className: "pm-group-text" }, group.text || "-"),
        ),
      ) : h("div", { className: "pm-empty" }, "No groups"),
    );
  }

  function GroupManager({ snapshot, bridge }) {
    const groups = snapshot.lineGroups || [];
    return h("section", { className: "pm-panel pm-groups-panel" },
      h("div", { className: "pm-panel-title" }, "Line Groups"),
      h("div", { className: "pm-group-grid" },
        h(GroupColumn, { title: "Old", groups: groupBySource(groups, "old"), bridge }),
        h(GroupColumn, { title: "New", groups: groupBySource(groups, "new"), bridge }),
      ),
    );
  }

  function RuleRow({ item, type, bridge }) {
    const isToken = type === "token";
    return h("div", { className: cx("pm-rule-row", isToken ? "token-mapped" : "mapping-mapped", item.selected && "mapping-selected") },
      h("button", {
        type: "button",
        className: "pm-rule-main",
        onClick: () => isToken ? bridge.focusTokenMapping(item.index) : bridge.focusLineMapping(item.index),
      },
        h("span", { className: cx("pm-kind", isToken ? "pm-kind-token" : "pm-kind-line") }, isToken ? "Token" : labelForLineKind(item.kind)),
        h("span", { className: "pm-rule-label" }, item.oldLabel || "-"),
        h("span", { className: "pm-arrow" }, "->"),
        h("span", { className: "pm-rule-label" }, item.newLabel || "-"),
        isToken ? h("span", { className: "pm-field" }, item.field || "field") : null,
      ),
      h("button", {
        type: "button",
        className: "pm-danger-btn",
        onClick: () => isToken ? bridge.deleteTokenMapping(item.index) : bridge.deleteLineMapping(item.index),
      }, "Delete"),
    );
  }

  function RuleList({ snapshot, bridge }) {
    const lineMappings = snapshot.lineMappings || [];
    const tokenMappings = snapshot.tokenMappings || [];
    return h("section", { className: "pm-panel pm-rules-panel" },
      h("div", { className: "pm-panel-title" }, "Mapping Rules"),
      h("div", { className: "pm-rule-list" },
        lineMappings.length ? lineMappings.map((item) => h(RuleRow, { key: item.id, item, type: "line", bridge })) : h("div", { className: "pm-empty" }, "No line/group mappings"),
        tokenMappings.length ? tokenMappings.map((item) => h(RuleRow, { key: item.id, item, type: "token", bridge })) : h("div", { className: "pm-empty" }, "No token mappings"),
      ),
    );
  }

  function ProfileMappingApp({ snapshot, bridge }) {
    return h("div", { className: "pm-shell" },
      h(Header, { snapshot, onClear: bridge.clearFocus }),
      h(SelectionState, { snapshot }),
      h("div", { className: "pm-layout" },
        h(MappingRail, { snapshot, bridge }),
        h(GroupManager, { snapshot, bridge }),
        h(RuleList, { snapshot, bridge }),
      ),
    );
  }

  window.renderProfileMappingReactPanel = function renderProfileMappingReactPanel(snapshot, bridge) {
    const target = document.getElementById(rootId);
    currentBridge = bridge;
    if (!target) return;
    if (!window.React || !window.ReactDOM) {
      target.innerHTML = '<div class="pm-fallback">React mapping studio unavailable. Use the legacy rule list below.</div>';
      return;
    }
    if (!root) root = ReactDOM.createRoot(target);
    root.render(h(ProfileMappingApp, { snapshot, bridge }));
  };

  window.addEventListener("profile-mapping-refresh", function () {
    if (currentBridge) window.renderProfileMappingReactPanel(currentBridge.getSnapshot(), currentBridge);
  });

  if (window.ProfileMappingBridge) {
    window.renderProfileMappingReactPanel(window.ProfileMappingBridge.getSnapshot(), window.ProfileMappingBridge);
  }
}());
