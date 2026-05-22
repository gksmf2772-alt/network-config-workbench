import React from "react";
import { cn } from "../../lib/utils.js";

export function AppBadge({ className, tone = "neutral", ...props }) {
  return <span className={cn("app-badge", `app-badge--${tone}`, className)} {...props} />;
}
