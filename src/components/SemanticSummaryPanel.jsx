import React from "react";
import { motion } from "framer-motion";
import ObjectMatchTable from "./ObjectMatchTable.jsx";
import RelationshipGraphPanel from "./RelationshipGraphPanel.jsx";
import PolicyViolationPanel from "./PolicyViolationPanel.jsx";
import ManualMatchDrawer from "./ManualMatchDrawer.jsx";
import { AppButton } from "./ui/AppButton.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";

export default function SemanticSummaryPanel() {
  return (
    <motion.section
      className="result-layout compact ncw-summary-layout"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <AppToolbar className="result-tabs" role="tablist" aria-label="비교 요약">
        <AppButton id="summaryTabBtn" className="result-tab active" type="button" data-result-tab="summary" role="tab" aria-selected="true" variant="tab">
          의미 비교 요약
        </AppButton>
        <AppButton id="objectsTabBtn" className="result-tab" type="button" data-result-tab="objects" role="tab" aria-selected="false" variant="tab">
          설정 이동/검색
        </AppButton>
        <AppButton id="overviewTabBtn" className="result-tab" type="button" data-result-tab="overview" role="tab" aria-selected="false" variant="tab">
          통합 리포트
        </AppButton>
      </AppToolbar>

      <article id="summaryResultPanel" className="result-panel active" data-result-panel="summary" role="tabpanel">
        <div id="summaryCards" className="summary-grid" />
        <ManualMatchDrawer />
        <PolicyViolationPanel />
      </article>

      <article id="objectsResultPanel" className="result-panel" data-result-panel="objects" role="tabpanel" hidden>
        <ObjectMatchTable />
      </article>

      <article id="overviewResultPanel" className="result-panel" data-result-panel="overview" role="tabpanel" hidden>
        <RelationshipGraphPanel />
      </article>
    </motion.section>
  );
}
