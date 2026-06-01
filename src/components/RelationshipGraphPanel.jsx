import React from "react";
import { Download, GitBranch, ListChecks, PanelTop } from "lucide-react";
import { motion } from "framer-motion";
import { AppButton } from "./ui/AppButton.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";

export default function RelationshipGraphPanel() {
  return (
    <motion.section
      className="ncw-relationship-panel"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <div className="ncw-panel-heading report-panel-heading">
        <PanelTop className="h-4 w-4" />
        <div>
          <h2>리포트</h2>
          <p>요약, 검토 테이블, 관계 그래프, 내보내기</p>
        </div>
        <AppToolbar id="reportQuickActions" className="report-quick-actions" aria-label="리포트 빠른 작업">
          <div id="reportQuickContext" className="report-quick-context">리포트 없음</div>
          <AppButton type="button" variant="secondary" data-report-action="summary">
            <PanelTop className="h-4 w-4" />
            요약
          </AppButton>
          <AppButton type="button" variant="secondary" data-report-action="review">
            <ListChecks className="h-4 w-4" />
            검토
          </AppButton>
          <AppButton type="button" variant="secondary" data-report-action="graph">
            <GitBranch className="h-4 w-4" />
            그래프
          </AppButton>
          <AppButton type="button" variant="secondary" data-report-action="export">
            <Download className="h-4 w-4" />
            Excel 저장
          </AppButton>
        </AppToolbar>
      </div>
      <div id="overviewReport" className="overview-report" />
    </motion.section>
  );
}
