import React from "react";
import { cn } from "../../lib/utils.js";

export const AppButton = React.forwardRef(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn("app-button", `app-button--${variant}`, className)}
      {...props}
    />
  )
);

AppButton.displayName = "AppButton";
