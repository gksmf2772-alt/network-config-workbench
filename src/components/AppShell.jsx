import React from "react";
import { BarChart3, ClipboardList, FileText, GitCompareArrows, Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import HeaderBar from "./HeaderBar.jsx";
import ConfigInputPanel from "./ConfigInputPanel.jsx";
import ProfileTab from "./ProfileTab.jsx";
import SemanticSummaryPanel from "./SemanticSummaryPanel.jsx";
import ObjectMatchTable from "./ObjectMatchTable.jsx";
import RelationshipGraphPanel from "./RelationshipGraphPanel.jsx";
import { AppButton } from "./ui/AppButton.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";

export default function AppShell() {
  return (
    <div className="app-shell ncw-shell">
      <HeaderBar />

      <AppToolbar className="tabbar ncw-tabbar">
        <AppButton id="summaryPageTabBtn" className="tab-button" type="button" variant="tab">
          <BarChart3 className="h-4 w-4" />
          요약
        </AppButton>
        <AppButton id="objectsPageTabBtn" className="tab-button" type="button" variant="tab">
          <ClipboardList className="h-4 w-4" />
          객체 검토
        </AppButton>
        <AppButton id="compareTabBtn" className="tab-button active" type="button" variant="tab">
          <GitCompareArrows className="h-4 w-4" />
          비교창
        </AppButton>
        <AppButton id="profilesTabBtn" className="tab-button" type="button" variant="tab">
          <Settings2 className="h-4 w-4" />
          프로파일
        </AppButton>
        <AppButton id="reportPageTabBtn" className="tab-button" type="button" variant="tab">
          <FileText className="h-4 w-4" />
          리포트
        </AppButton>
      </AppToolbar>

      <motion.main
        className="app-main"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: "easeOut", delay: 0.03 }}
      >
        <section id="summaryTab" className="tab-panel summary-page-panel">
          <SemanticSummaryPanel />
        </section>
        <section id="objectsTab" className="tab-panel summary-page-panel">
          <ObjectMatchTable />
        </section>
        <ConfigInputPanel />
        <ProfileTab />
        <section id="reportTab" className="tab-panel summary-page-panel">
          <RelationshipGraphPanel />
        </section>
      </motion.main>
    </div>
  );
}
