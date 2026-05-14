import React from "react";
import { cn } from "../../lib/utils.js";

export function AppSectionHeader({ className, icon: Icon, title, description, actions }) {
  return (
    <div className={cn("app-section-header", className)}>
      <div className="app-section-header__main">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="app-section-header__actions">{actions}</div> : null}
    </div>
  );
}
