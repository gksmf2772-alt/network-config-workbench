import React from "react";
import { createRoot } from "react-dom/client";
import { Trash2, X } from "lucide-react";
import { AppButton } from "./ui/AppButton.jsx";
import { AppIconButton } from "./ui/AppIconButton.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";

let root = null;
let currentBridge = null;

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function labelForLineKind(kind) {
  return ({
    "line-to-line": "line",
    "group-to-group": "group",
    "group-to-line": "group-line",
    "line-to-group": "line-group",
  })[kind] || "line";
}

function groupBySource(groups, source) {
  return (groups || []).filter((group) => group.source === source);
}

function Header({ snapshot, onClear }) {
  const counts = snapshot.counts || {};
  return (
    <div className="pm-header">
      <div>
        <div className="pm-eyebrow">Profile Mapping Studio</div>
        <h4>{snapshot.objectType || "-"}</h4>
      </div>
      <AppToolbar className="pm-stat-row">
        <span><strong>{counts.lineMappings || 0}</strong> lines</span>
        <span><strong>{counts.tokenMappings || 0}</strong> tokens</span>
        <span><strong>{(counts.oldLineGroups || 0) + (counts.newLineGroups || 0)}</strong> groups</span>
        <AppButton type="button" variant="ghost" onClick={onClear}>Clear selection</AppButton>
      </AppToolbar>
    </div>
  );
}

function SelectionState({ snapshot }) {
  const pending = snapshot.selected?.pendingLineRef;
  const link = snapshot.selected?.selectedLineLink;
  const tokens = snapshot.selected?.semanticTokens || { old: [], new: [] };
  let label = "ready";
  let detail = "Select source/target lines, groups, or tokens from preview.";

  if (pending) {
    label = "line selected";
    detail = `${pending.source} ${pending.label || pending.lineNumber || pending.groupId || ""}`;
  } else if (link) {
    label = "mapping selected";
    detail = `${link.oldRef?.label || "old"} -> ${link.newRef?.label || "new"}`;
  } else if ((tokens.old || []).length || (tokens.new || []).length) {
    label = "token selected";
    detail = `old ${(tokens.old || []).length} / new ${(tokens.new || []).length}`;
  }

  return (
    <div className="pm-selection mapping-default">
      <span className="pm-chip">{label}</span>
      <span>{detail}</span>
    </div>
  );
}

function MappingRail({ snapshot, bridge }) {
  const visible = [
    ...(snapshot.lineMappings || []).slice(0, 5).map((item) => ({ ...item, railType: "line" })),
    ...(snapshot.tokenMappings || []).slice(0, 5).map((item) => ({ ...item, railType: "token" })),
  ];

  return (
    <section className="pm-panel pm-rail-panel">
      <div className="pm-panel-title">Mapping Rail</div>
      <div className="pm-rail">
        {visible.length ? visible.map((item) => (
          <AppButton
            key={`${item.railType}-${item.index}`}
            type="button"
            variant="ghost"
            className={cx("pm-rail-row", item.railType === "token" ? "token-mapped" : "mapping-mapped", item.selected && "mapping-selected")}
            onClick={() => item.railType === "token" ? bridge.focusTokenMapping(item.index) : bridge.focusLineMapping(item.index)}
            title={`${item.oldLabel} -> ${item.newLabel}`}
          >
            <span className={cx("pm-node", item.railType)}>{item.railType === "token" ? item.field || "token" : labelForLineKind(item.kind)}</span>
            <span className="pm-edge" />
            <span className={cx("pm-node", item.railType)}>{item.railType === "token" ? item.cardinality || "1:1" : "mapped"}</span>
          </AppButton>
        )) : <div className="pm-empty">No mappings</div>}
      </div>
    </section>
  );
}

function GroupColumn({ title, groups, bridge }) {
  return (
    <div className="pm-group-column">
      <div className="pm-column-title">{title}</div>
      {groups.length ? groups.map((group) => (
        <div key={group.id} className={cx("pm-group-card", "group-default", group.mapped && "group-mapped", group.selected && "group-selected")}>
          <div className="pm-group-top">
            <input
              className="pm-group-name"
              defaultValue={group.label}
              title="Group label"
              onBlur={(event) => bridge.renameLineGroup(group.id, event.currentTarget.value)}
            />
            <AppButton type="button" variant="ghost" onClick={() => bridge.selectLineGroup(group.id)} title="Select group as mapping target">Select</AppButton>
            <AppIconButton type="button" onClick={() => bridge.deleteLineGroup(group.id)} title="Delete group"><X /></AppIconButton>
          </div>
          <div className="pm-group-lines">lines {group.linesLabel || "-"}</div>
          <div className="pm-group-text">{group.text || "-"}</div>
        </div>
      )) : <div className="pm-empty">No groups</div>}
    </div>
  );
}

function GroupManager({ snapshot, bridge }) {
  const groups = snapshot.lineGroups || [];
  return (
    <section className="pm-panel pm-groups-panel">
      <div className="pm-panel-title">Line Groups</div>
      <div className="pm-group-grid">
        <GroupColumn title="Source" groups={groupBySource(groups, "old")} bridge={bridge} />
        <GroupColumn title="Target" groups={groupBySource(groups, "new")} bridge={bridge} />
      </div>
    </section>
  );
}

function RuleRow({ item, type, bridge }) {
  const isToken = type === "token";

  return (
    <div className={cx("pm-rule-row", isToken ? "token-mapped" : "mapping-mapped", item.selected && "mapping-selected")}>
      <AppButton
        type="button"
        variant="ghost"
        className="pm-rule-main"
        onClick={() => isToken ? bridge.focusTokenMapping(item.index) : bridge.focusLineMapping(item.index)}
      >
        <span className={cx("pm-kind", isToken ? "pm-kind-token" : "pm-kind-line")}>{isToken ? "token" : labelForLineKind(item.kind)}</span>
        <span className="pm-rule-label">{item.oldLabel || "-"}</span>
        <span className="pm-arrow">-&gt;</span>
        <span className="pm-rule-label">{item.newLabel || "-"}</span>
        {isToken ? <span className="pm-field">{item.field || "field"}</span> : null}
      </AppButton>
      <AppIconButton
        type="button"
        onClick={() => isToken ? bridge.deleteTokenMapping(item.index) : bridge.deleteLineMapping(item.index)}
        title="Delete mapping"
      >
        <Trash2 />
      </AppIconButton>
    </div>
  );
}

function RuleList({ snapshot, bridge }) {
  const lineMappings = snapshot.lineMappings || [];
  const tokenMappings = snapshot.tokenMappings || [];

  return (
    <section className="pm-panel pm-rules-panel">
      <div className="pm-panel-title">Mapping Rules</div>
      <div className="pm-rule-list">
        {lineMappings.length ? lineMappings.map((item) => <RuleRow key={item.id} item={item} type="line" bridge={bridge} />) : <div className="pm-empty">No line or group mappings</div>}
        {tokenMappings.length ? tokenMappings.map((item) => <RuleRow key={item.id} item={item} type="token" bridge={bridge} />) : <div className="pm-empty">No token mappings</div>}
      </div>
    </section>
  );
}

export function ProfileMappingWorkbench({ snapshot, bridge }) {
  return (
    <div className="pm-shell">
      <Header snapshot={snapshot} onClear={bridge.clearFocus} />
      <SelectionState snapshot={snapshot} />
      <div className="pm-layout">
        <MappingRail snapshot={snapshot} bridge={bridge} />
        <GroupManager snapshot={snapshot} bridge={bridge} />
        <RuleList snapshot={snapshot} bridge={bridge} />
      </div>
    </div>
  );
}

export function registerLegacyProfileMappingRenderer() {
  window.renderProfileMappingReactPanel = function renderProfileMappingReactPanel(snapshot, bridge) {
    const target = document.getElementById("profileMappingReactRoot");
    currentBridge = bridge;
    if (!target) return;
    if (!root) root = createRoot(target);
    root.render(<ProfileMappingWorkbench snapshot={snapshot} bridge={bridge} />);
  };

  window.addEventListener("profile-mapping-refresh", () => {
    if (currentBridge) window.renderProfileMappingReactPanel(currentBridge.getSnapshot(), currentBridge);
  });
}
