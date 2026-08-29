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
    <dl
      className={cn(
        "divide-border grid min-w-0 divide-x overflow-hidden",
        columns,
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 px-2 py-2 first:pl-0 last:pr-0 min-[430px]:px-3"
        >
          <dt className="text-eyebrow text-muted-foreground truncate font-medium uppercase tracking-[0.06em]">
            {item.label}
          </dt>
          <dd className="text-lead truncate font-semibold tabular-nums">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
