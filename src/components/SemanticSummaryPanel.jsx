import React from "react";
import { motion } from "framer-motion";
import PolicyViolationPanel from "./PolicyViolationPanel.jsx";
import ManualMatchDrawer from "./ManualMatchDrawer.jsx";

export default function SemanticSummaryPanel() {
  return (
    <motion.section
      className="result-layout compact ncw-summary-layout"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <article id="summaryResultPanel" className="result-panel active" data-result-panel="summary" role="tabpanel">
        <div id="summaryCards" className="summary-grid" />
        <ManualMatchDrawer />
        <PolicyViolationPanel />
      </article>
    </motion.section>
  );
}
