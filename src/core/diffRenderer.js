export function renderDiffConnectorLayers({ objectPaths = [], fieldPaths = [], debugPaths = [] } = {}) {
  return `
    ${renderDiffConnectorDefs()}
    <g class="object-mapping-overlay" data-overlay-layer="object">
      ${objectPaths.filter(Boolean).join("")}
    </g>
    <g class="semantic-line-overlay" data-overlay-layer="line">
      ${fieldPaths.filter(Boolean).join("")}
    </g>
    <g class="mapping-debug-overlay" data-overlay-layer="debug">
      ${debugPaths.filter(Boolean).join("")}
    </g>
  `;
}

export function renderDiffConnectorDefs() {
  return `
    <defs>
      <linearGradient id="lineMappingGloss" x1="-120%" y1="0%" x2="-20%" y2="0%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
        <stop offset="38%" stop-color="#ffffff" stop-opacity="0.05" />
        <stop offset="50%" stop-color="#ffffff" stop-opacity="0.58" />
        <stop offset="62%" stop-color="#ffffff" stop-opacity="0.08" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        <animate attributeName="x1" values="-120%;100%" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="x2" values="-20%;200%" dur="3.2s" repeatCount="indefinite" />
      </linearGradient>
      <filter id="objectFlowGlow" x="-20%" y="-40%" width="140%" height="180%">
        <feGaussianBlur stdDeviation="7" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  `;
}

export function objectConnectorTypeClass(oldGroup = {}, newGroup = {}) {
  return `type-${cssSafeClassName(oldGroup.type || newGroup.type || "object")}`;
}

export function objectConnectorState(oldGroup = {}, newGroup = {}) {
  const oldStatus = String(oldGroup.status || "").toLowerCase();
  const newStatus = String(newGroup.status || "").toLowerCase();
  const status = oldStatus || newStatus;
  const reason = String(oldGroup.reason || newGroup.reason || "").toLowerCase();
  const score = Number(oldGroup.score || newGroup.score || 0);

  if (reason === "manual") return "manual";
  if (status === "partial" || status === "changed") return "partial";
  if (status === "ambiguous") return "candidate";
  if (status === "candidate") return "candidate";
  if (status === "old-only" || status === "new-only" || status === "unmatched") return "unmatched";
  if (oldStatus === "matched" && newStatus === "matched") return "matched";
  if (oldGroup.state !== "equal" || newGroup.state !== "equal") return "changed";
  if (Number.isFinite(score) && score > 0 && score < 100) return "changed";
  return "matched";
}

export function connectorLabelText(oldGroup = {}, newGroup = {}) {
  const type = oldGroup.type || newGroup.type || "object";
  const identity = oldGroup.identity || newGroup.identity || "";
  const compactIdentity = String(identity).length > 14 ? `${String(identity).slice(0, 13)}...` : identity;
  const label = compactIdentity ? `${type} ${compactIdentity}` : type;
  return label.length > 24 ? `${label.slice(0, 23)}...` : label;
}

export function buildLineMappingRailPath({ relationKey, relationState, fieldClass, cleanMatchedClass = "", active, path }) {
  return `<path class="line-mapping-rail ${escapeHtml(relationState)} ${escapeHtml(fieldClass)} ${cleanMatchedClass} ${active}"
    data-line-relation-key="${escapeHtml(relationKey)}"
    d="${path}" />`;
}

export function buildSlimeLineShinePath({ relationKey, relationState, fieldClass, cleanMatchedClass = "", active, path, x1, y1, x2, y2 }) {
  const glossId = `lineMappingGloss-${cssSafeClassName(relationKey || `${x1}-${y1}-${x2}-${y2}`)}`;
  const sweep = Math.max(72, Math.min(180, Math.abs(x2 - x1) * 0.22));
  const startX = Math.min(x1, x2) - sweep;
  const endX = Math.max(x1, x2) + sweep;
  const midY = (y1 + y2) / 2;
  return `<defs>
      <linearGradient id="${escapeHtml(glossId)}" gradientUnits="userSpaceOnUse" x1="${startX}" y1="${midY}" x2="${startX + sweep}" y2="${midY}">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
        <stop offset="38%" stop-color="#ffffff" stop-opacity="0.05" />
        <stop offset="50%" stop-color="#ffffff" stop-opacity="0.62" />
        <stop offset="62%" stop-color="#ffffff" stop-opacity="0.08" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        <animate attributeName="x1" values="${startX};${endX}" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="x2" values="${startX + sweep};${endX + sweep}" dur="3.2s" repeatCount="indefinite" />
      </linearGradient>
    </defs>
    <path class="line-mapping-shine ${escapeHtml(relationState)} ${escapeHtml(fieldClass)} ${cleanMatchedClass} ${active} is-animated"
    style="stroke: url(#${escapeHtml(glossId)})"
    data-line-relation-key="${escapeHtml(relationKey)}"
    d="${path}" />`;
}

export function buildLineMappingPathD({ x1, y1, x2, y2, style, fieldClass = "", laneBounds = null, bend = 0.65 }) {
  if (style === "straight" || style === "chain") {
    return buildFieldLaneLinePath({ x1, y1, x2, y2, fieldClass, bend, laneBounds });
  }

  return buildSlimeTubePath({ x1, y1, x2, y2, bend, laneBounds });
}

export function buildFieldLaneLinePath({ x1, y1, x2, y2, fieldClass = "", bend = 0.65, laneBounds = null }) {
  if (bend <= 0.02) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const lane = lineRelationFieldLanePoint(x1, y1, x2, y2, fieldClass, bend, laneBounds);
  return `M ${x1} ${y1} L ${lane.leftX} ${y1} L ${lane.x} ${lane.y} L ${lane.rightX} ${y2} L ${x2} ${y2}`;
}

export function buildFieldLaneCurvePath({ x1, y1, x2, y2, fieldClass = "", bend = 0.65, laneBounds = null }) {
  const distance = Math.abs(x2 - x1);
  if (bend <= 0.02) {
    const tension = Math.max(64, Math.min(220, distance * 0.46));
    return `M ${x1} ${y1} C ${x1 + tension} ${y1}, ${x2 - tension} ${y2}, ${x2} ${y2}`;
  }

  const lane = lineRelationFieldLanePoint(x1, y1, x2, y2, fieldClass, bend, laneBounds);
  const middleTension = Math.max(12, Math.min(42, distance * 0.045));
  return [
    `M ${x1} ${y1}`,
    `L ${lane.leftX} ${y1}`,
    `C ${lane.leftX + middleTension} ${y1}, ${lane.x - middleTension} ${lane.y}, ${lane.x} ${lane.y}`,
    `C ${lane.x + middleTension} ${lane.y}, ${lane.rightX - middleTension} ${y2}, ${lane.rightX} ${y2}`,
    `L ${x2} ${y2}`,
  ].join(" ");
}

export function buildSlimeTubePath({ x1, y1, x2, y2, bend = 0.65, laneBounds = null }) {
  const distance = Math.abs(x2 - x1);
  const verticalDistance = Math.abs(y2 - y1);
  if (distance < 24 || verticalDistance < 3) {
    const tension = Math.max(36, Math.min(180, distance * (0.28 + bend * 0.22)));
    return `M ${x1} ${y1} C ${x1 + tension} ${y1}, ${x2 - tension} ${y2}, ${x2} ${y2}`;
  }

  const lane = lineRelationFieldLanePoint(x1, y1, x2, y2, "", bend, laneBounds);
  const laneWidth = Math.max(40, lane.rightX - lane.leftX);
  const tension = Math.max(28, Math.min(82, laneWidth * 0.36));

  return [
    `M ${x1} ${y1}`,
    `L ${lane.leftX} ${y1}`,
    `C ${lane.leftX + tension} ${y1}, ${lane.rightX - tension} ${y2}, ${lane.rightX} ${y2}`,
    `L ${x2} ${y2}`,
  ].join(" ");
}

export function lineRelationFieldLanePoint(x1, y1, x2, y2, fieldClass = "", bend = 0.65, laneBounds = null) {
  const distance = Math.abs(x2 - x1);
  const leftX = Number.isFinite(laneBounds?.leftX) ? laneBounds.leftX : null;
  const rightX = Number.isFinite(laneBounds?.rightX) ? laneBounds.rightX : null;
  const directX = Number.isFinite(laneBounds?.centerX) ? laneBounds.centerX : (x1 + x2) / 2;
  const directY = (y1 + y2) / 2;
  const laneHalfWidth = Math.max(18, Math.min(46, distance * 0.075));
  const verticalDistance = Math.abs(y2 - y1);
  const laneY = verticalDistance < 4
    ? directY
    : directY;
  return {
    x: directX,
    leftX: Number.isFinite(leftX) ? leftX : directX - laneHalfWidth,
    rightX: Number.isFinite(rightX) ? rightX : directX + laneHalfWidth,
    y: laneY,
  };
}

export function clampLineLaneY(value, y1, y2) {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const span = maxY - minY;
  if (span < 4) return (y1 + y2) / 2;

  const inset = Math.min(6, span * 0.18);
  return Math.max(minY + inset, Math.min(maxY - inset, value));
}

export function lineRelationFieldLaneYOffset(fieldClass = "") {
  const offsetByField = {
    "field-route": -22,
    "field-neighbor": -22,
    "field-address": -15,
    "field-ip-address": -15,
    "field-next-hop": -11,
    "field-gateway": -11,
    "field-state": 9,
    "field-admin-state": 9,
    "field-description": 18,
    "field-tag": 28,
    "field-interface": 14,
    "field-sap": 14,
    "field-port": 14,
    "field-lag": 14,
    "field-group": 38,
    "field-peer-group": 38,
    "field-authentication-key": 48,
    "field-peer-as": 48,
  };
  return offsetByField[fieldClass] ?? 0;
}

export function buildSmoothLineMappingPath({ x1, y1, x2, y2 }) {
  const distance = Math.abs(x2 - x1);
  const tension = Math.max(64, Math.min(220, distance * 0.46));
  const dy = y2 - y1;
  const curveY = Math.abs(dy) < 6 ? 0 : dy * 0.18;
  return `M ${x1} ${y1} C ${x1 + tension} ${y1 + curveY}, ${x2 - tension} ${y2 - curveY}, ${x2} ${y2}`;
}

function cssSafeClassName(value = "") {
  return String(value || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
