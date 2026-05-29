import React from "react";
import { Download, ExternalLink, RotateCcw, Search } from "lucide-react";
import { motion } from "framer-motion";
import { AppButton } from "./ui/AppButton.jsx";
import { AppSelect } from "./ui/AppSelect.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";

export default function ObjectMatchTable() {
  return (
    <motion.section
      className="ncw-object-match-table ncw-object-review-workspace"
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <div className="object-review-head">
        <div>
          <span className="summary-kicker">Object Review</span>
          <h2>객체 검토</h2>
        </div>
        <AppToolbar id="objectQuickActions" className="object-quick-actions" aria-label="객체 검토 빠른 작업">
          <AppButton type="button" variant="secondary" data-object-action="open-compare">
            <ExternalLink className="h-4 w-4" />
            비교 보기
          </AppButton>
          <AppButton type="button" variant="secondary" data-object-action="export">
            <Download className="h-4 w-4" />
            내보내기
          </AppButton>
          <AppButton type="button" variant="secondary" data-object-action="reset-filter">
            <RotateCcw className="h-4 w-4" />
            필터 초기화
          </AppButton>
        </AppToolbar>
      </div>

      <div id="objectSectionTabs" className="section-filter-tabs" role="tablist" aria-label="객체 섹션 필터" />

      <div className="object-tools">
        <label className="ncw-search-label">
          <Search className="h-4 w-4" />
          <input id="objectSearchInput" placeholder="객체명, 타입, next-hop, tag, description" />
        </label>
        <AppSelect id="objectSortSelect" title="객체 정렬">
          <option value="identity">식별자</option>
          <option value="source">기존 / 신규</option>
          <option value="line">라인</option>
          <option value="field">변경 필드</option>
        </AppSelect>
      </div>
      <motion.div
        id="objectList"
        className="object-list"
        whileHover={{ boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)" }}
      />
    </motion.section>
  );
}
