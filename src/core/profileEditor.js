export function formatNormalizeSummary(normalizeRules = {}) {
  const remove = (normalizeRules.remove || []).join(", ");
  const mapped = Object.entries(normalizeRules.map || {}).map(([from, to]) => `${from} -> ${to}`).join(" | ");
  return [`remove: ${remove || "-"}`, `map: ${mapped || "-"}`].join("; ");
}

export function renderSemanticMappingRow(row, index) {
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

export function getSemanticMappingNodes(mapping, source) {
  if (!mapping) return [];
  if (source === "old") return mapping.oldNodes || mapping.oldSelectors || [];
  return mapping.newNodes || mapping.newSelectors || [];
}

export function formatSemanticNodeLabel(node) {
  return node.value || node.selectedToken || node.token || "";
}

export function mergeSemanticNodes(current, incoming) {
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

export function semanticNodeKey(node) {
  return [
    node.lineIndex,
    node.tokenIndex,
    node.valueTokenIndex,
    canonicalizeComparableLine(node.selectedToken || node.token || ""),
    canonicalizeComparableLine(node.value || ""),
  ].join(":");
}

export function semanticMappingCardinality(oldNodes, newNodes) {
  if (oldNodes.length === 1 && newNodes.length > 1) return "1:N";
  if (oldNodes.length > 1 && newNodes.length === 1) return "N:1";
  if (oldNodes.length === 1 && newNodes.length === 1) return "1:1";
  return "N:N";
}

export function defaultSemanticFieldForType(type) {
  return {
    "static-route": "route",
    bgp: "neighbor",
    interface: "interface",
    "subscriber-interface": "subscriber-interface",
    port: "port",
    lag: "lag",
    pim: "interface",
  }[type] || "field";
}

export function defaultObjectFieldForType(type) {
  return {
    "static-route": "route",
    bgp: "neighbor",
    interface: "interface",
    "subscriber-interface": "subscriber-interface",
    "group-interface": "group-interface",
    port: "port",
    lag: "lag",
    pim: "interface",
  }[type] || "name";
}

export function parseNormalizeMap(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.split(/\s*=>\s*/))
    .filter((parts) => parts.length === 2 && parts[0].trim() && parts[1].trim())
    .reduce((map, [from, to]) => {
      map[canonicalizeComparableLine(from)] = canonicalizeComparableLine(to);
      return map;
    }, {});
}

export function inferValueTokenIndex(tokens, tokenIndex, field) {
  if (field === "state" || field === "admin-state") return tokenIndex;
  const selected = canonicalizeComparableLine(tokens[tokenIndex] || "");
  if (selected === field || ["route", "static-route-entry", "next-hop", "tag", "description", "neighbor"].includes(selected)) {
    return Math.min(tokens.length - 1, tokenIndex + 1);
  }
  return tokenIndex;
}

export function renderProfileExceptionEditorTable({
  exceptions = [],
  objectType = "",
} = {}) {
  const visibleExceptions = exceptions
    .filter((item) => item.enabled !== false)
    .filter((item) => !objectType || item.target?.objectType === objectType || item.match?.objectType === objectType);
  return `
    <div class="profile-exception-editor">
      <div class="policy-toolbar">
        <strong>프로파일 예외</strong>
        <span class="small-note">${escapeHtml(objectType)} 기준 ${escapeHtml(visibleExceptions.length)}개</span>
      </div>
      ${visibleExceptions.length ? `
        <div class="profile-exception-table compact">
          <div>범위</div><div>필드</div><div>규칙</div><div>상태</div><div>사유</div><div>동작</div>
          ${visibleExceptions.map((exception) => {
            const target = exception.target || {};
            const match = exception.match || {};
            return `
              <div>${escapeHtml(exception.scope === "profile" ? "프로파일" : "객체")}</div>
              <div>${escapeHtml(target.fieldPath || match.fieldPath || "-")}</div>
              <div>${escapeHtml(target.ruleId || match.ruleId || "-")}</div>
              <div>${escapeHtml(target.changeType || match.changeType || target.status || "-")}</div>
              <div>${escapeHtml(exception.reasonKo || "-")}</div>
              <div><button type="button" data-profile-exception-remove="${escapeHtml(exception.id || "")}">삭제</button></div>
            `;
          }).join("")}
        </div>
      ` : `<div class="small-note">이 객체 타입의 프로파일 예외 없음.</div>`}
    </div>
  `;
}

export function renderProfileExceptionOverview(exceptions = []) {
  const active = (Array.isArray(exceptions) ? exceptions : []).filter((item) => item && item.enabled !== false);
  const exclusionCount = active.filter((item) => item.type === "comparison-exclusion").length;
  const exceptionCount = active.length - exclusionCount;
  const header = renderProfileExceptionOverviewHeader(exceptionCount, exclusionCount);

  if (!active.length) {
    return `
      ${header}
      <div id="profile-exception-overview-content" class="collapsible-content">
        <div class="profile-exception-overview-empty">저장된 예외/비교 제외 규칙 없음.</div>
      </div>
    `;
  }

  return `
    ${header}
    <div id="profile-exception-overview-content" class="collapsible-content">
      ${renderProfileExceptionRuleGroups(active)}
    </div>
  `;
}

function renderProfileExceptionOverviewHeader(exceptionCount = 0, exclusionCount = 0) {
  return `
    <button type="button" class="app-button app-button--ghost collapsible-header" aria-expanded="true" aria-controls="profile-exception-overview-content" data-profile-exception-overview-toggle>
      <span class="collapsible-icon" aria-hidden="true">${renderProfileExceptionOverviewChevron(true)}</span>
      <span class="collapsible-title">저장된 예외/비교 제외 규칙</span>
      <span class="collapsible-summary">비교 실행 전 현재 프로파일에 적용될 규칙을 확인합니다.</span>
      <span class="profile-exception-overview-counts" aria-label="저장된 규칙 수">
        <span>예외 ${escapeHtml(exceptionCount)}</span>
        <span>비교 제외 ${escapeHtml(exclusionCount)}</span>
      </span>
    </button>
  `;
}

export function renderProfileExceptionOverviewChevron(open = true) {
  return open
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>`;
}

export function renderProfileExceptionRuleGroups(exceptions = [], {
  actionAttribute = "data-profile-exception-overview-remove",
  actionLabel = "삭제",
  emptyMessage = "저장된 예외/비교 제외 규칙 없음.",
} = {}) {
  const active = (Array.isArray(exceptions) ? exceptions : []).filter((item) => item && item.enabled !== false);
  if (!active.length) return `<div class="profile-exception-overview-empty">${escapeHtml(emptyMessage)}</div>`;

  return `
    <div class="profile-exception-rule-groups">
      ${groupProfileExceptionsBySettingType(active).map(([settingType, rows]) => {
        const exclusionCount = rows.filter((item) => item.type === "comparison-exclusion").length;
        const exceptionCount = rows.length - exclusionCount;
        return `
          <details class="profile-exception-rule-group" open>
            <summary class="profile-exception-rule-group-head">
              <strong>${escapeHtml(settingType)}</strong>
              <span>전체 ${escapeHtml(rows.length)} · 라인/항목 예외 ${escapeHtml(exceptionCount)} · 객체 비교 제외 ${escapeHtml(exclusionCount)}</span>
            </summary>
            <div class="profile-exception-rule-group-body">
              <div class="profile-exception-overview-scroll">
                <div class="profile-exception-overview-table">
                  <div>설정</div>
                  <div>규칙 구분</div>
                  <div>항목</div>
                  <div>규칙/상태</div>
                  <div>사유</div>
                  <div>동작</div>
                  ${groupProfileExceptionsBySetting(rows)
                    .flatMap(([, settingRows]) => settingRows)
                    .map((exception) => renderProfileExceptionOverviewRow(exception, { actionAttribute, actionLabel }))
                    .join("")}
                </div>
              </div>
            </div>
          </details>
        `;
      }).join("")}
    </div>
  `;
}

function groupProfileExceptionsBySettingType(exceptions = []) {
  const groups = new Map();
  exceptions.forEach((exception) => {
    const settingType = profileExceptionSettingType(exception);
    if (!groups.has(settingType)) groups.set(settingType, []);
    groups.get(settingType).push(exception);
  });
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function groupProfileExceptionsBySetting(exceptions = []) {
  const groups = new Map();
  exceptions.forEach((exception) => {
    const setting = profileExceptionSettingLabel(exception);
    if (!groups.has(setting)) groups.set(setting, []);
    groups.get(setting).push(exception);
  });
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function renderProfileExceptionOverviewRow(exception = {}, { actionAttribute = "data-profile-exception-overview-remove", actionLabel = "삭제" } = {}) {
  const target = exception.target || {};
  const match = exception.match || {};
  const setting = profileExceptionSettingLabel(exception);
  const field = target.fieldPath || match.fieldPath || "전체 설정";
  const rule = target.ruleId || match.ruleId || match.findingType || target.findingType || "-";
  const status = target.changeType || match.changeType || target.matchStatus || match.matchStatus || target.status || "-";
  const buttonLabel = actionLabel === "auto"
    ? exception.type === "comparison-exclusion" ? "비교 제외 해제" : "예외 해제"
    : actionLabel;
  return `
    <div><strong>${escapeHtml(setting)}</strong></div>
    <div><strong>${escapeHtml(profileExceptionKindLabel(exception))}</strong></div>
    <div>${escapeHtml(field)}</div>
    <div>${escapeHtml(rule)}<br /><small>${escapeHtml(status)}</small></div>
    <div>${escapeHtml(exception.reasonKo || exception.reason || "-")}</div>
    <div><button type="button" ${actionAttribute}="${escapeHtml(exception.id || "")}">${escapeHtml(buttonLabel)}</button></div>
  `;
}

function profileExceptionKindLabel(exception = {}) {
  if (exception.type === "comparison-exclusion") return "객체 비교 제외";
  const target = exception.target || {};
  const match = exception.match || {};
  if (target.fieldPath || match.fieldPath || target.lineNumber || match.lineNumber) return "라인/항목 예외";
  return "객체 예외";
}

function profileExceptionSettingType(exception = {}) {
  const target = exception.target || {};
  const match = exception.match || {};
  return target.settingType ||
    target.objectType ||
    match.settingType ||
    match.objectType ||
    exception.settingType ||
    exception.objectType ||
    "-";
}

function profileExceptionSettingLabel(exception = {}) {
  const target = exception.target || {};
  const match = exception.match || {};
  return target.displayName ||
    target.settingKey ||
    target.objectKey ||
    target.createdFromObjectKey ||
    match.settingKey ||
    match.objectKey ||
    "-";
}

function canonicalizeComparableLine(line) {
  return String(line ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
