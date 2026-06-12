import React from "react";
import { BaseEdge, getBezierPath } from "@xyflow/react";

const EDGE_STYLE = {
  compare: { stroke: "#378ADD", strokeDasharray: "6 3", strokeWidth: 1.5 },
  internal: { stroke: "#1D9E75", strokeDasharray: "none", strokeWidth: 1.2 },
};

export default function ConfigEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) {
  const style = EDGE_STYLE[data?.edgeType] ?? EDGE_STYLE.internal;
  const focused = data?.focused === true;
  const hoverRelated = data?.hoverRelated === true;
  const primaryTopology = data?.primaryTopology === true;
  const filteredOut = data?.filteredOut === true;
  const dimmed = data?.dimmed === true;
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: style.stroke,
        strokeWidth: focused || hoverRelated ? style.strokeWidth + 1.6 : style.strokeWidth,
        strokeDasharray: style.strokeDasharray,
        strokeLinecap: "round",
        opacity: filteredOut ? 0 : (dimmed ? 0.1 : (focused || hoverRelated ? 1 : (primaryTopology ? 0.72 : 0.5))),
        pointerEvents: filteredOut ? "none" : "auto",
        transition: "opacity 0.18s ease, stroke-width 0.18s ease",
      }}
    />
  );
}
