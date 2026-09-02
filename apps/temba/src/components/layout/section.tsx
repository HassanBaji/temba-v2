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
    <section className={cn("space-y-0 md:space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="lg:text-title text-body text-muted-foreground min-w-0 break-words font-semibold tracking-[-0.01em] lg:font-semibold">
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
