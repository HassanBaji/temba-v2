import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

/** A hairline card at the design's 14px radius; the console never uses shadows. */
export function ConsoleCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("border-border bg-paper rounded-card border", className)}
    >
      {children}
    </section>
  );
}

export function ConsoleCardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-border flex items-center justify-between gap-4 border-b px-5 py-4",
        className,
      )}
    >
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {action}
    </header>
  );
}
