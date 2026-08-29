import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-h2 lg:text-h1 min-w-0 break-words font-bold tracking-[-0.02em]">
          {title}
        </h1>
        {description ? (
          <p className="text-body text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? (
        <div className="w-full shrink-0 sm:w-auto [&_a]:flex [&_a]:min-h-11 [&_a]:w-full [&_a]:items-center [&_a]:justify-center sm:[&_a]:w-auto [&_button]:min-h-11 [&_button]:w-full sm:[&_button]:w-auto">
          {action}
        </div>
      ) : null}
    </header>
  );
}
