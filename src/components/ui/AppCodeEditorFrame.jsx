import React from "react";
import { cn } from "../../lib/utils.js";

export function AppCodeEditorFrame({ className, children }) {
  return <div className={cn("app-code-editor-frame code-frame", className)}>{children}</div>;
}
