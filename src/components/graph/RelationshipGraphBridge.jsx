import React from "react";
import { createRoot } from "react-dom/client";
import RelationshipGraph from "./RelationshipGraph.jsx";

const roots = new WeakMap();

export function registerLegacyRelationshipGraphRenderer() {
  window.renderRelationshipGraphReactPanel = function renderRelationshipGraphReactPanel(target, snapshot, bridge = {}) {
    if (!target || !snapshot) return;
    let root = roots.get(target);
    if (!root) {
      root = createRoot(target);
      roots.set(target, root);
    }
    root.render(
      <RelationshipGraph
        initialNodes={snapshot.nodes || []}
        initialEdges={snapshot.edges || []}
        controls={snapshot.controls || {}}
        bridge={bridge}
        layoutMode={snapshot.layoutMode || "flow"}
      />
    );
  };

  window.unmountRelationshipGraphReactPanel = function unmountRelationshipGraphReactPanel(target) {
    const root = target ? roots.get(target) : null;
    if (!root) return;
    root.unmount();
    roots.delete(target);
  };
}
