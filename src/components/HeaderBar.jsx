import React from "react";
import { Clock, Database, Save } from "lucide-react";
import { motion } from "framer-motion";
import { AppButton } from "./ui/AppButton.jsx";
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
          Cross-vendor semantic validation
        </div>
        <h1>Network Config Workbench</h1>
        <p>Semantic-aware migration validation for parser, object, policy, and relationship checks.</p>
      </div>
      <AppToolbar className="topbar-actions ncw-header-actions">
        <AppSelect id="historySelect" title="Saved comparison history" />
        <AppButton id="loadHistoryBtn" type="button" variant="secondary">
          <Clock className="h-4 w-4" />
          Load
        </AppButton>
        <AppButton id="saveSessionBtn" type="button">
          <Save className="h-4 w-4" />
          Save
        </AppButton>
      </AppToolbar>
    </motion.header>
  );
}
