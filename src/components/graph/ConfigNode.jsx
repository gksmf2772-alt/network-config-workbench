import React from "react";
import { Handle, Position } from "@xyflow/react";

const NODE_TYPE_STYLE = {
  port: { borderColor: "#888780", label: "PORT" },
  lag: { borderColor: "#888780", label: "LAG" },
  interface: { borderColor: "#EF9F27", label: "IF" },
  peer: { borderColor: "#0E7490", label: "PEER" },
  services: { borderColor: "#0E7490", label: "SERVICES" },
  sap: { borderColor: "#1D9E75", label: "SAP" },
  service: { borderColor: "#1D9E75", label: "SVC" },
  static: { borderColor: "#D4537E", label: "STATIC" },
  bgp: { borderColor: "#7F77DD", label: "BGP" },
  pim: { borderColor: "#64748B", label: "PIM" },
  filter: { borderColor: "#888780", label: "FILTER" },
  qos: { borderColor: "#888780", label: "QOS" },
  policy: { borderColor: "#888780", label: "POLICY" },
  relation: { borderColor: "#D97706", label: "RELATION" },
  more: { borderColor: "#0891B2", label: "MORE" },
};

const STATUS_STYLE = {
  added: { background: "#E1F5EE", borderWidth: 2 },
  removed: { background: "#FCEBEB", borderWidth: 2 },
  modified: { background: "#FAEEDA", borderWidth: 2 },
  cluster: { background: "#F8FAFC", borderWidth: 1, borderStyle: "dashed" },
  unchanged: {},
};

function ColumnHeaderNode({ data }) {
  const sideHeader = data.columnKind === "SIDE";
  return (
    <div
      className="rf-config-column-header"
      style={{
        width: data.nodeWidth || 130,
        height: data.nodeHeight || 28,
        display: "flex",
        alignItems: "center",
        padding: sideHeader ? "0 2px" : "0 4px",
        color: sideHeader ? "#0f172a" : "#475569",
        fontSize: sideHeader ? 13 : 11,
        fontWeight: 900,
        letterSpacing: 0,
        pointerEvents: "none",
        background: sideHeader ? "transparent" : "rgba(248, 250, 252, 0.92)",
        borderBottom: sideHeader ? "0" : "1px solid rgba(148, 163, 184, 0.38)",
      }}
    >
      {data.label}
    </div>
  );
}

function RowBandNode({ data }) {
  return (
    <div
      className="rf-config-row-band"
      data-graph-chain={data.chainId || ""}
      style={{
        width: data.nodeWidth || 600,
        height: data.nodeHeight || 64,
        borderRadius: 8,
        background: data.selectedChain
          ? "rgba(14, 116, 144, 0.12)"
          : (data.problem ? "rgba(255, 247, 237, 0.72)" : "rgba(248, 250, 252, 0.72)"),
        border: data.selectedChain
          ? "1px solid rgba(14, 116, 144, 0.38)"
          : "1px solid rgba(203, 213, 225, 0.58)",
        opacity: data.dimmed ? 0.26 : 1,
        transition: "opacity 0.18s ease, background-color 0.18s ease, border-color 0.18s ease",
        cursor: "pointer",
      }}
      title="경로 선택"
    />
  );
}

export default function ConfigNode({ data, selected }) {
  if (data.isColumnHeader) return <ColumnHeaderNode data={data} />;
  if (data.isRowBand) return <RowBandNode data={data} />;

  const typeStyle = NODE_TYPE_STYLE[data.nodeType] ?? { borderColor: "#888", label: data.rawNodeType || "NODE" };
  const statusStyle = STATUS_STYLE[data.status] ?? STATUS_STYLE.unchanged;
  const showLabel = data.showLabel !== false;
  const inFocusPath = data.focusDistance != null;
  const hoverRelated = data.hoverRelated === true;
  const filteredOut = data.filteredOut === true;
  const opacity = filteredOut ? 0 : (data.dimmed ? 0.12 : 1);
  const nodeWidth = data.nodeWidth || (data.serviceAggregate ? 210 : 118);

  return (
    <div
      className="rf-config-node"
      data-graph-node={data.nodeId}
      data-object-jump={data.objectKey || ""}
      data-node-type={data.nodeType}
      data-node-status={data.status}
      data-graph-chain={data.chainId || ""}
      style={{
        padding: "6px 10px",
        borderRadius: 6,
        border: `${statusStyle.borderWidth ?? 1}px ${statusStyle.borderStyle ?? "solid"} ${typeStyle.borderColor ?? "#888"}`,
        borderLeft: `3px solid ${typeStyle.borderColor ?? "#888"}`,
        background: statusStyle.background ?? "#fff",
        width: nodeWidth,
        minWidth: nodeWidth,
        maxWidth: nodeWidth,
        minHeight: data.nodeHeight || 44,
        fontSize: 11,
        fontWeight: selected ? 700 : 500,
        opacity,
        transform: filteredOut ? "scale(0.82)" : "scale(1)",
        transformOrigin: "center",
        transition: "opacity 0.18s ease, transform 0.18s ease, box-shadow 0.15s ease",
        boxShadow: selected
          ? "0 0 0 2px #378ADD"
          : (inFocusPath || hoverRelated ? "0 0 0 2px rgba(29, 158, 117, 0.28), 0 8px 18px rgba(15, 23, 42, 0.12)" : "0 5px 14px rgba(15, 23, 42, 0.08)"),
        cursor: data.cluster ? "zoom-in" : "pointer",
        pointerEvents: filteredOut ? "none" : "auto",
      }}
      title={`${data.rawNodeType || data.nodeType} ${data.fullLabel || data.label || ""}`}
    >
      <div style={{ fontSize: 9, color: typeStyle.borderColor, fontWeight: 800, marginBottom: 2 }}>
        {typeStyle.label}
      </div>
      {showLabel ? (
        <div
          style={{
            color: "#222",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: Math.max(40, nodeWidth - 24),
            fontWeight: 800,
          }}
        >
          {data.label}
        </div>
      ) : null}
      {data.matchScore != null ? (
        <div style={{ fontSize: 9, color: "#075985", marginTop: 2, fontWeight: 800 }}>{data.matchScore}%</div>
      ) : null}
      {data.staticAggregate && data.aggregate?.count ? (
        <div style={{ fontSize: 9, color: "#075985", marginTop: 2, fontWeight: 800 }}>클릭 펼침</div>
      ) : null}
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}
