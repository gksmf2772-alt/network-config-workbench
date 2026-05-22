import React from "react";
import { cn } from "../../lib/utils.js";

export function AppPanel({ className, as: Component = "section", ...props }) {
  return <Component className={cn("app-panel", className)} {...props} />;
}
