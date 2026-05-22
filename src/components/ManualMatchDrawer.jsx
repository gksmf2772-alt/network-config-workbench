import React from "react";
import { Link2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ManualMatchDrawer() {
  return (
    <motion.section
      id="semanticPreviewPanel"
      className="semantic-preview-panel ncw-manual-drawer"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <div className="semantic-preview-header">
        <strong><Link2 className="h-4 w-4" />수동 매핑 패널</strong>
        <span>비교 실행 후 의미 후보가 표시됨</span>
      </div>
    </motion.section>
  );
}
