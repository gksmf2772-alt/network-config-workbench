import React from "react";
import { cn } from "../../lib/utils.js";

export const AppSelect = React.forwardRef(({ className, ...props }, ref) => (
  <select ref={ref} className={cn("app-select", className)} {...props} />
));

AppSelect.displayName = "AppSelect";
