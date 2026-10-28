import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export type StatStripItem = {
  label: string;
  value: ReactNode;
};

export function StatStrip({
  items,
  className,
  tone = "light",
}: {
  items: StatStripItem[];
  className?: string;
  /** "dark" renders a dark ranking-strip treatment, e.g. Group standing. */
  tone?: "light" | "dark";
}) {
  const columns =
    items.length <= 2
      ? "grid-cols-2"
      : items.length === 3
        ? "grid-cols-3"
        : "grid-cols-4";
  const isDark = tone === "dark";

  return (
    <dl
      className={cn(
        "grid min-w-0 overflow-hidden",
        isDark
          ? "bg-primary text-primary-foreground divide-primary-foreground/15 divide-x rounded-xl p-1"
          : "divide-border divide-x",
        columns,
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "min-w-0 px-2 py-2 min-[430px]:px-3",
            isDark ? null : "first:pl-0 last:pr-0",
          )}
        >
          <dt
            className={cn(
              "text-eyebrow truncate font-medium uppercase tracking-[0.06em]",
              isDark ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {item.label}
          </dt>
          <dd className="text-title truncate font-bold tabular-nums">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
