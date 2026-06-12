import React from "react";
import { GitBranch } from "lucide-react";
import { motion } from "framer-motion";

export default function GraphTabPanel() {
  return (
    <motion.section
      className="ncw-relationship-panel graph-page-panel"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <div className="ncw-panel-heading report-panel-heading">
        <GitBranch className="h-4 w-4" />
        <div>
          <h2>관계 그래프</h2>
          <p>비교 관계와 기존/신규 config 내부 연결을 크게 확인합니다.</p>
        </div>
      </div>
      <div id="graphReport" className="overview-report graph-page-report" />
    </motion.section>
  );
}
