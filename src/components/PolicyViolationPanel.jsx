import React from "react";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function PolicyViolationPanel() {
  return (
    <motion.section
      className="ncw-policy-panel"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: "easeOut", delay: 0.03 }}
    >
      <div className="ncw-panel-heading">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <div>
          <h2>Policy Violations</h2>
          <p>Required rules, field policies, syntax risks, and migration findings.</p>
        </div>
      </div>
      <div id="reportList" className="report-list grouped-report-list" />
    </motion.section>
  );
}
