"use client";

import { cn } from "~/lib/utils";

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "border-border rounded-control flex h-10 overflow-hidden border",
        className,
      )}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "px-3.5 text-[13px] transition-colors",
              index > 0 && "border-border border-l",
              active
                ? "bg-ink text-paper font-semibold"
                : "bg-paper hover:bg-wash",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
