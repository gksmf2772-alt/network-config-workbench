import React from "react";
import { Clock, Database, Save, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { AppButton } from "./ui/AppButton.jsx";
import { AppIconButton } from "./ui/AppIconButton.jsx";
import { AppSelect } from "./ui/AppSelect.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";

export default function HeaderBar() {
  return (
    <motion.header
      className="topbar ncw-header"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-medium text-cyan-700">
          <Database className="h-4 w-4" />
          벤더 간 의미 기반 검증
        </div>
        <h1>Network Config Workbench</h1>
        <p>파서, 설정, 정책, 관계 기준으로 네트워크 설정 마이그레이션을 검증합니다.</p>
      </div>
      <AppToolbar className="topbar-actions ncw-header-actions">
        <AppSelect id="historySelect" title="저장된 비교 이력" />
        <AppButton id="loadHistoryBtn" type="button" variant="secondary">
          <Clock className="h-4 w-4" />
          불러오기
        </AppButton>
        <AppButton id="saveSessionBtn" type="button">
          <Save className="h-4 w-4" />
          저장
        </AppButton>
        <AppIconButton id="deleteSessionBtn" type="button" title="선택한 세션 삭제">
          <Trash2 className="h-4 w-4" />
        </AppIconButton>
      </AppToolbar>
    </motion.header>
  );
}
