import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { cn } from "~/lib/utils";

/** A bordered list of `SheetMenuRow`s separated by hairlines. */
export function SheetMenu({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-menu"
      className={cn(
        "border-rule divide-rule flex flex-col divide-y overflow-hidden rounded-[16px] border",
        className,
      )}
      {...props}
    />
  );
}

type SheetMenuRowTarget =
  | { href: string; onSelect?: () => void }
  | { href?: undefined; onSelect: () => void };

/**
 * One action in a sheet menu list: an icon, a label with an optional hint,
 * and a chevron or trailing icon. "danger" marks a destructive door.
 */
export function SheetMenuRow({
  label,
  hint,
  icon: Icon,
  trailing,
  tone = "default",
  pending = false,
  disabled = false,
  ...target
}: SheetMenuRowTarget & {
  label: string;
  hint?: string | null;
  icon?: LucideIcon;
  trailing?: LucideIcon | "chevron";
  tone?: "default" | "danger";
  pending?: boolean;
  disabled?: boolean;
}) {
  const Trailing = trailing === "chevron" ? ChevronRight : trailing;
  const inactive = disabled || pending;
  const className = cn(
    "hover:bg-wash focus-visible:ring-ring/50 flex min-h-[54px] w-full items-center gap-3.5 px-[18px] text-left outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
    hint ? "py-3" : "py-0",
    tone === "danger" ? "text-destructive" : "text-ink",
    inactive && "pointer-events-none opacity-50",
  );
  const body = (
    <>
      {Icon ? <Icon aria-hidden="true" className="size-5 shrink-0" /> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-body", hint && "font-medium")}>
          {pending ? `${label}…` : label}
        </span>
        {hint ? (
          <span className="text-eyebrow text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      {Trailing ? (
        <Trailing
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0",
            trailing === "chevron" && "text-dim",
          )}
        />
      ) : null}
    </>
  );

  if (target.href !== undefined) {
    return (
      <Link
        href={target.href}
        onClick={target.onSelect}
        aria-disabled={inactive || undefined}
        className={className}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={target.onSelect}
      disabled={inactive}
      aria-busy={pending || undefined}
      className={className}
    >
      {body}
    </button>
  );
}
