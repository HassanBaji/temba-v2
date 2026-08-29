import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export type StatStripItem = {
  label: string;
  value: ReactNode;
};

export function StatStrip({
  items,
  className,
}: {
  items: StatStripItem[];
  className?: string;
}) {
  const columns =
    items.length <= 2
      ? "grid-cols-2"
      : items.length === 3
        ? "grid-cols-3"
        : "grid-cols-4";

  return (
    <dl className={cn("divide-border grid divide-x", columns, className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 px-3 py-2 first:pl-0 last:pr-0"
        >
          <dt className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
            {item.label}
          </dt>
          <dd className="text-lead font-semibold tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
