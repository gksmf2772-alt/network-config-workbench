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
          <h2>관계 그래프</h2>
          <p>의존 관계와 의미 관계 요약을 기준으로 표시합니다.</p>
        </div>
      </div>
      <div id="overviewReport" className="overview-report" />
    </motion.section>
  );
}
