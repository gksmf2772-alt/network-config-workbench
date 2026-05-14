import React from "react";
import { cn } from "../../lib/utils.js";

export function AppToolbar({ className, ...props }) {
  return <div className={cn("app-toolbar", className)} {...props} />;
}
