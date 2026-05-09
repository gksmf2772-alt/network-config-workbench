import React from "react";
import { createRoot } from "react-dom/client";

let root = null;
let currentBridge = null;

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function labelForLineKind(kind) {
  return ({
    "line-to-line": "라인",
    "group-to-group": "그룹",
    "group-to-line": "그룹-라인",
    "line-to-group": "라인-그룹",
  })[kind] || "라인";
}

function groupBySource(groups, source) {
  return (groups || []).filter((group) => group.source === source);
}

function Header({ snapshot, onClear }) {
  const counts = snapshot.counts || {};
  return (
    <div className="pm-header">
      <div>
        <div className="pm-eyebrow">프로파일 매핑 스튜디오</div>
        <h4>{snapshot.objectType || "-"}</h4>
      </div>
      <div className="pm-stat-row">
        <span><strong>{counts.lineMappings || 0}</strong> 라인</span>
        <span><strong>{counts.tokenMappings || 0}</strong> 토큰</span>
        <span><strong>{(counts.oldLineGroups || 0) + (counts.newLineGroups || 0)}</strong> 그룹</span>
        <button type="button" className="pm-ghost-btn" onClick={onClear}>선택 해제</button>
      </div>
    </div>
  );
}

function SelectionState({ snapshot }) {
  const pending = snapshot.selected?.pendingLineRef;
  const link = snapshot.selected?.selectedLineLink;
  const tokens = snapshot.selected?.semanticTokens || { old: [], new: [] };
  let label = "대기";
  let detail = "preview에서 기존/신규 라인, 그룹, 토큰을 선택하세요.";
  if (pending) {
    label = "라인 선택";
    detail = `${pending.source} ${pending.label || pending.lineNumber || pending.groupId || ""}`;
  } else if (link) {
    label = "매핑 선택";
    detail = `${link.oldRef?.label || "old"} -> ${link.newRef?.label || "new"}`;
  } else if ((tokens.old || []).length || (tokens.new || []).length) {
    label = "토큰 선택";
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
      <div className="pm-panel-title">매핑 레일</div>
      <div className="pm-rail">
        {visible.length ? visible.map((item) => (
          <button
            key={`${item.railType}-${item.index}`}
            type="button"
            className={cx("pm-rail-row", item.railType === "token" ? "token-mapped" : "mapping-mapped", item.selected && "mapping-selected")}
            onClick={() => item.railType === "token" ? bridge.focusTokenMapping(item.index) : bridge.focusLineMapping(item.index)}
            title={`${item.oldLabel} -> ${item.newLabel}`}
          >
            <span className={cx("pm-node", item.railType)}>{item.railType === "token" ? item.field || "token" : labelForLineKind(item.kind)}</span>
            <span className="pm-edge" />
            <span className={cx("pm-node", item.railType)}>{item.railType === "token" ? item.cardinality || "1:1" : "매핑됨"}</span>
          </button>
        )) : <div className="pm-empty">매핑 없음</div>}
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
              title="그룹 라인 번호"
              onBlur={(event) => bridge.renameLineGroup(group.id, event.currentTarget.value)}
            />
            <button type="button" className="pm-ghost-btn" onClick={() => bridge.selectLineGroup(group.id)} title="매핑 대상으로 그룹 선택">선택</button>
            <button type="button" className="pm-icon-btn" onClick={() => bridge.deleteLineGroup(group.id)} title="그룹 해제">x</button>
          </div>
          <div className="pm-group-lines">라인 {group.linesLabel || "-"}</div>
          <div className="pm-group-text">{group.text || "-"}</div>
        </div>
      )) : <div className="pm-empty">그룹 없음</div>}
    </div>
  );
}

function GroupManager({ snapshot, bridge }) {
  const groups = snapshot.lineGroups || [];
  return (
    <section className="pm-panel pm-groups-panel">
      <div className="pm-panel-title">라인 그룹</div>
      <div className="pm-group-grid">
        <GroupColumn title="기존" groups={groupBySource(groups, "old")} bridge={bridge} />
        <GroupColumn title="신규" groups={groupBySource(groups, "new")} bridge={bridge} />
      </div>
    </section>
  );
}

function RuleRow({ item, type, bridge }) {
  const isToken = type === "token";
  return (
    <div className={cx("pm-rule-row", isToken ? "token-mapped" : "mapping-mapped", item.selected && "mapping-selected")}>
      <button
        type="button"
        className="pm-rule-main"
        onClick={() => isToken ? bridge.focusTokenMapping(item.index) : bridge.focusLineMapping(item.index)}
      >
        <span className={cx("pm-kind", isToken ? "pm-kind-token" : "pm-kind-line")}>{isToken ? "토큰" : labelForLineKind(item.kind)}</span>
        <span className="pm-rule-label">{item.oldLabel || "-"}</span>
        <span className="pm-arrow">-&gt;</span>
        <span className="pm-rule-label">{item.newLabel || "-"}</span>
        {isToken ? <span className="pm-field">{item.field || "필드"}</span> : null}
      </button>
      <button
        type="button"
        className="pm-danger-btn"
        onClick={() => isToken ? bridge.deleteTokenMapping(item.index) : bridge.deleteLineMapping(item.index)}
      >
        삭제
      </button>
    </div>
  );
}

function RuleList({ snapshot, bridge }) {
  const lineMappings = snapshot.lineMappings || [];
  const tokenMappings = snapshot.tokenMappings || [];
  return (
    <section className="pm-panel pm-rules-panel">
      <div className="pm-panel-title">매핑 규칙</div>
      <div className="pm-rule-list">
        {lineMappings.length ? lineMappings.map((item) => <RuleRow key={item.id} item={item} type="line" bridge={bridge} />) : <div className="pm-empty">라인/그룹 매핑 없음</div>}
        {tokenMappings.length ? tokenMappings.map((item) => <RuleRow key={item.id} item={item} type="token" bridge={bridge} />) : <div className="pm-empty">토큰 매핑 없음</div>}
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
