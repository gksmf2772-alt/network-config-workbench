import React from "react";
import { cn } from "../../lib/utils.js";

export function AppCheckbox({ className, label, ...props }) {
  return (
    <label className={cn("app-checkbox", className)}>
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
