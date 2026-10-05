import Link from "next/link";

import { cn } from "~/lib/utils";

/**
 * Chrome shared by every Games-hub card (Game, tournament, Match, History):
 * one radius, one inset, a whole-card link under the content, hover and
 * focus-visible on the card itself, and the raised footer.
 *
 * Content sits above the link with pointer events off, so a click anywhere
 * follows the link; interactive children opt back in with
 * `pointer-events-auto`.
 */

export const SUMMARY_CARD_INSET = "px-5";

export const SUMMARY_CARD_ACTION_CLASS = "relative z-10 shrink-0 font-semibold";

export function SummaryCardShell({
  href,
  linkLabel,
  emphasis = false,
  className,
  children,
}: {
  href?: string;
  linkLabel?: string;
  /** Ink border — a tournament card, or a Match the viewer won. */
  emphasis?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="summary-card"
      className={cn(
        "bg-paper rounded-card relative flex min-w-0 flex-col overflow-hidden border",
        emphasis ? "border-ink" : "border-rule",
        href
          ? [
              "hover:shadow-sm motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150",
              "has-[>[data-slot=summary-card-link]:focus-visible]:ring-ring/50 has-[>[data-slot=summary-card-link]:focus-visible]:ring-[3px]",
              emphasis ? null : "hover:border-foreground/20",
            ]
          : null,
        className,
      )}
    >
      {href ? (
        <Link
          href={href}
          aria-label={linkLabel}
          data-slot="summary-card-link"
          className="absolute inset-0 z-0 outline-none"
        />
      ) : null}
      {children}
    </div>
  );
}

export function SummaryCardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("pointer-events-none relative z-10 min-w-0 p-5", className)}
    >
      {children}
    </div>
  );
}

export function SummaryCardFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-rule bg-surface-raised pointer-events-none relative z-10 flex min-w-0 items-center justify-between gap-3 border-t py-3.5",
        SUMMARY_CARD_INSET,
        className,
      )}
    >
      {children}
    </div>
  );
}
