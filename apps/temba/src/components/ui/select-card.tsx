import { Check, ChevronRight } from "lucide-react";
import type * as React from "react";

import { cn } from "~/lib/utils";

const ON_INK_MUTED =
  "text-muted-foreground group-data-[selected=true]/select-card:text-dim";

export function SelectCard({
  selected = false,
  layout = "card",
  icon,
  title,
  description,
  trailing,
  className,
  children,
  role,
  ...props
}: Omit<React.ComponentProps<"button">, "title"> & {
  selected?: boolean;
  layout?: "card" | "row";
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  trailing?: "chevron" | "check";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === "radio" ? selected : undefined}
      data-selected={selected}
      className={cn(
        "group/select-card focus-visible:ring-ring/50 flex min-h-11 w-full flex-col text-left outline-none transition-colors focus-visible:ring-[3px]",
        layout === "card"
          ? "rounded-card gap-3 border px-5 py-[18px]"
          : "border-b px-[18px] py-4 last:border-b-0",
        selected
          ? "border-ink bg-ink text-paper"
          : "border-rule bg-paper text-ink hover:bg-wash",
        className,
      )}
      {...props}
    >
      <span className="flex w-full items-center gap-3">
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-lg border",
              selected ? "border-dimrule bg-raised" : "border-rule bg-paper",
            )}
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="text-lead block font-semibold">{title}</span>
          {description ? (
            <span
              className={cn(
                "mt-0.5 block",
                layout === "card" ? "text-eyebrow" : "text-meta",
                ON_INK_MUTED,
              )}
            >
              {description}
            </span>
          ) : null}
        </span>
        {trailing === "chevron" ? (
          <ChevronRight
            aria-hidden="true"
            className={cn("size-[18px] shrink-0", ON_INK_MUTED)}
          />
        ) : null}
        {trailing === "check" && selected ? (
          <Check aria-hidden="true" className="size-[18px] shrink-0" />
        ) : null}
      </span>
      {children}
    </button>
  );
}

export function SelectCardNote({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] uppercase tracking-wide",
        ON_INK_MUTED,
      )}
    >
      {children}
    </span>
  );
}
