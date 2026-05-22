import React from "react";
import { cn } from "../../lib/utils.js";

export const AppIconButton = React.forwardRef(
  ({ className, "aria-label": ariaLabel, title, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn("app-icon-button", className)}
      aria-label={ariaLabel || title}
      title={title}
      {...props}
    >
      {children}
    </button>
  )
);

AppIconButton.displayName = "AppIconButton";
