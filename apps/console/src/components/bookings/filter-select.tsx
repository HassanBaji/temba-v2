"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "~/lib/utils";

/** The design's 40px hairline select: a native control with its own chevron, so the filter row stays keyboard-plain. */
export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  className,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-border bg-paper rounded-control hover:bg-wash focus-visible:ring-ring/50 h-10 w-full appearance-none border py-0 pl-3 pr-8 text-[13px] outline-none transition-colors focus-visible:ring-[3px]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2"
      />
    </span>
  );
}
