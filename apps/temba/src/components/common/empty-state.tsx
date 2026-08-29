import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mx-auto flex w-full max-w-[var(--container-content)] flex-col items-center gap-3 py-12 text-center",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className="text-muted-foreground size-8"
        strokeWidth={1.75}
      />
      <h2 className="text-title font-semibold">{title}</h2>
      <p className="text-body text-muted-foreground">{description}</p>
      {action ? (
        <div className="w-full sm:w-auto [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:justify-center [&_button]:min-h-11">
          {action}
        </div>
      ) : null}
    </div>
  );
}
