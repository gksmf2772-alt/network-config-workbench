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
      <div className="min-w-0 ncw-terminal-brand">
        <pre className="terminal-ascii" aria-hidden="true">{String.raw`+-- NCW --+
|  CFG  |
+-------+`}</pre>
        <div className="flex items-center gap-2 text-xs font-medium text-cyan-700 ncw-terminal-kicker">
          <Database className="h-4 w-4" />
          [OK] SEMANTIC CONFIG VERIFY
        </div>
        <h1>NETWORK CONFIG WORKBENCH<span className="terminal-cursor" aria-hidden="true">_</span></h1>
        <p>user@ncw:~$ compare --semantic --policy --coverage</p>
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
