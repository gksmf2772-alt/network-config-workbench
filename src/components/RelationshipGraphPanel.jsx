import React from "react";
import { GitBranch } from "lucide-react";
import { motion } from "framer-motion";

export default function RelationshipGraphPanel() {
  return (
    <motion.section
      className="ncw-relationship-panel"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <div className="ncw-panel-heading">
        <GitBranch className="h-4 w-4" />
        <div>
          <h2>Relationship Graph</h2>
          <p>Rendered from dependency and semantic relationship summaries.</p>
        </div>
      </div>
      <div id="overviewReport" className="overview-report" />
    </motion.section>
  );
}
