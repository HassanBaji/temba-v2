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
  | { href: string; newTab?: boolean; onSelect?: () => void }
  | { href?: undefined; newTab?: undefined; onSelect: () => void };

/**
 * One action in a sheet menu list: an icon, a label with an optional hint,
 * and a chevron or trailing icon. "danger" marks a destructive door.
 */
export function SheetMenuRow({
  label,
  hint,
  value,
  icon: Icon,
  iconClassName,
  trailing,
  tone = "default",
  pending = false,
  disabled = false,
  ...target
}: SheetMenuRowTarget & {
  label: string;
  hint?: string | null;
  /** The current setting, muted at the row's end. */
  value?: string | null;
  icon?: LucideIcon;
  iconClassName?: string;
  trailing?: LucideIcon | "chevron";
  tone?: "default" | "danger";
  pending?: boolean;
  disabled?: boolean;
}) {
  const Trailing = trailing === "chevron" ? ChevronRight : trailing;
  const inactive = disabled || pending;
  const className = cn(
    "hover:bg-wash focus-visible:ring-ring/50 flex min-h-[54px] w-full items-center gap-3.5 px-[18px] text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
    hint ? "py-3" : "py-0",
    tone === "danger" ? "text-destructive" : "text-ink",
    inactive && "pointer-events-none opacity-50",
  );
  const body = (
    <>
      {Icon ? (
        <Icon
          aria-hidden="true"
          className={cn("size-5 shrink-0", iconClassName)}
        />
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-body", hint && "font-medium")}>
          {pending ? `${label}…` : label}
        </span>
        {hint ? (
          <span className="text-eyebrow text-muted-foreground">{hint}</span>
        ) : null}
      </span>
      {value ? (
        <span className="text-body text-muted-foreground max-w-[40%] shrink-0 truncate">
          {value}
        </span>
      ) : null}
      {Trailing ? (
        <Trailing
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0",
            trailing === "chevron" && "text-dim rtl:-scale-x-100",
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
        {...(target.newTab
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
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
