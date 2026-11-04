"use client";

import { cn } from "~/lib/utils";

/** A quiet, full-width text action with an optional consequence line. */
export function FooterAction({
  label,
  consequence,
  onClick,
  pending = false,
  disabled = false,
}: {
  label: string;
  consequence?: string;
  onClick?: () => void;
  pending?: boolean;
  disabled?: boolean;
}) {
  const inert = disabled && !onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      aria-disabled={inert ? true : undefined}
      className={cn(
        "focus-visible:ring-ring/50 w-full px-[22px] py-4 text-start outline-none",
        "focus-visible:ring-[3px]",
        inert
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-wash disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <span className="text-body block font-medium">{label}</span>
      {consequence ? (
        <span className="text-muted-foreground text-meta mt-0.5 block">
          {consequence}
        </span>
      ) : null}
    </button>
  );
}
