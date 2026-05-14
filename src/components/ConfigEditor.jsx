import React from "react";
import { ArrowDown, ArrowUp, Eraser, RotateCcw, Save } from "lucide-react";
import { motion } from "framer-motion";
import { AppCodeEditorFrame } from "./ui/AppCodeEditorFrame.jsx";
import { AppIconButton } from "./ui/AppIconButton.jsx";
import { AppToolbar } from "./ui/AppToolbar.jsx";

export default function ConfigEditor({ side, title, icon: Icon }) {
  const prefix = side === "old" ? "old" : "new";
  const cap = side === "old" ? "Old" : "New";

  return (
    <motion.article
      className="editor-card ncw-editor-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: "easeOut", delay: side === "old" ? 0.04 : 0.06 }}
    >
      <div className="editor-header">
        <div>
          <h2>{Icon ? <Icon className="h-4 w-4" /> : null}{title}</h2>
          <span id={`${prefix}Meta`}>No file</span>
        </div>
        <AppToolbar className="header-actions">
          <AppIconButton id={`restore${cap}Btn`} type="button" title="Restore"><RotateCcw /></AppIconButton>
          <AppIconButton id={`move${cap}UpBtn`} type="button" title="Move up"><ArrowUp /></AppIconButton>
          <AppIconButton id={`move${cap}DownBtn`} type="button" title="Move down"><ArrowDown /></AppIconButton>
          <AppIconButton id={`clear${cap}Btn`} type="button" title="Clear"><Eraser /></AppIconButton>
          <AppIconButton id={`save${cap}Btn`} type="button" title="Save"><Save /></AppIconButton>
        </AppToolbar>
      </div>
      <div id={`${prefix}DropZone`} className="drop-zone">Drop a file or paste config text</div>
      <AppCodeEditorFrame>
        <pre id={`${prefix}LineNumbers`} className="line-numbers">1</pre>
        <textarea id={`${prefix}ConfigInput`} spellCheck="false" wrap="off" />
        <div id={`${prefix}DiffPane`} className="embedded-diff" />
      </AppCodeEditorFrame>
      <div id={`${prefix}DiffObjectToolbar`} className="diff-object-toolbar" hidden />
    </motion.article>
  );
}
