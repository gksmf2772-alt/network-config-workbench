import { Check } from "lucide-react";
import { cn } from "../../lib/utils.js";

export function ObjectScopeChip({ label, checked = true, className, ...props }) {
  return (
    <label className={cn("object-scope-chip", className)} title={label}>
      <input
        className="object-scope-chip__input"
        type="checkbox"
        defaultChecked={checked}
        aria-label={label}
        {...props}
      />
      <span className="object-scope-chip__indicator" aria-hidden="true">
        <Check />
      </span>
      <span className="object-scope-chip__label">{label}</span>
    </label>
  );
}
