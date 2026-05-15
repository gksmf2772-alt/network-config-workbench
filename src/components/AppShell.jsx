import React from "react";
import { BarChart3, GitCompareArrows, Settings2 } from "lucide-react";
import { motion } from "framer-motion";
import HeaderBar from "./HeaderBar.jsx";
import ConfigInputPanel from "./ConfigInputPanel.jsx";
import ProfileTab from "./ProfileTab.jsx";
import SemanticSummaryPanel from "./SemanticSummaryPanel.jsx";
import { AppButton } from "./ui/AppButton.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";

export default function AppShell() {
  return (
    <div className="app-shell ncw-shell">
      <HeaderBar />

      <AppToolbar className="tabbar ncw-tabbar">
        <AppButton id="compareTabBtn" className="tab-button active" type="button" variant="tab">
          <GitCompareArrows className="h-4 w-4" />
          &gt; COMPARE
        </AppButton>
        <AppButton id="profilesTabBtn" className="tab-button" type="button" variant="tab">
          <Settings2 className="h-4 w-4" />
          $ PROFILE
        </AppButton>
        <AppButton id="summaryPageTabBtn" className="tab-button" type="button" variant="tab">
          <BarChart3 className="h-4 w-4" />
          ~ SUMMARY
        </AppButton>
      </AppToolbar>

      <motion.main
        className="app-main"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: "easeOut", delay: 0.03 }}
      >
        <ConfigInputPanel />
        <ProfileTab />
        <section id="summaryTab" className="tab-panel summary-page-panel">
          <SemanticSummaryPanel />
        </section>
      </motion.main>
    </div>
  );
}
