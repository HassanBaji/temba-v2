import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3 md:space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-title font-semibold tracking-[-0.01em]">
            {title}
          </h2>
          {description ? (
            <p className="text-body text-muted-foreground mt-1">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
