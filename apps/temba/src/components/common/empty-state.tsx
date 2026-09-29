import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  headingLevel = 2,
  className,
}: {
  icon?: LucideIcon;
  /** Decorative emoji shown instead of the icon. */
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  headingLevel?: 1 | 2 | 3;
  className?: string;
}) {
  const Heading = ({ 1: "h1", 2: "h2", 3: "h3" } as const)[headingLevel];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center gap-3 py-12 text-center",
        className,
      )}
    >
      {emoji ? (
        <span
          aria-hidden="true"
          className="bg-surface-raised border-border text-h2 flex size-14 items-center justify-center rounded-full border"
        >
          {emoji}
        </span>
      ) : Icon ? (
        <Icon
          aria-hidden="true"
          className="text-muted-foreground size-8"
          strokeWidth={1.75}
        />
      ) : null}
      <Heading className="text-title font-semibold">{title}</Heading>
      {description ? (
        <p className="text-body text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        <div className="[&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:justify-center [&_button]:min-h-11">
          {action}
        </div>
      ) : null}
    </div>
  );
}
