import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export function YouSection({
  title,
  meta,
  note,
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-expanded text-title text-ink">{title}</h2>
        {meta ? (
          <p className="text-meta text-muted-foreground shrink-0">{meta}</p>
        ) : null}
      </div>
      {children}
      {note ? (
        <p className="text-eyebrow text-muted-foreground leading-[1.5]">
          {note}
        </p>
      ) : null}
    </section>
  );
}

export function YouCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-rule bg-paper rounded-card overflow-hidden border",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A square initials tile: ink when settled, hatched while "not yet". */
export function InitialsTile({
  text,
  hatched = false,
  className,
}: {
  text: string;
  hatched?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-eyebrow relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[9px] font-semibold",
        hatched ? "border-rule text-ink border" : "bg-ink text-paper",
        className,
      )}
    >
      {hatched ? <span className="hatch absolute inset-0" /> : null}
      <span className="relative">{text}</span>
    </span>
  );
}
