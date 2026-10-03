import { ChevronRight } from "lucide-react";
import * as React from "react";

import { cn } from "~/lib/utils";

export function RowList({
  variant = "default",
  className,
  ...props
}: React.ComponentProps<"ul"> & { variant?: "default" | "card" }) {
  return (
    <ul
      data-slot="row-list"
      data-variant={variant}
      className={cn(
        "divide-border border-border divide-y overflow-hidden rounded-lg border bg-transparent",
        variant === "card" && "rounded-card",
        "[[data-slot=card]_&]:rounded-none [[data-slot=card]_&]:border-0",
        className,
      )}
      {...props}
    />
  );
}

export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  footer,
  size = "default",
  stackTrailing = false,
  asChild = false,
  className,
  children,
  icon,
  ...props
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Full-width line under the row, inside the same row target. */
  footer?: React.ReactNode;
  size?: "default" | "lg";
  /** Below `sm`, put `trailing` on its own line so actions never squeeze the title. */
  stackTrailing?: boolean;
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
} & Omit<React.ComponentProps<"div">, "title" | "children">) {
  const navigates = asChild;
  const rowClass = cn(
    "flex min-h-16 w-full min-w-0 items-center gap-3 px-4 py-3 outline-none",
    "flex-row justify-between",
    size === "lg" && "px-5 py-4",
    (footer != null || stackTrailing) && "flex-wrap",
    "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "[[data-variant=raised]_&]:focus-visible:ring-offset-surface-raised",
    navigates
      ? "text-foreground cursor-pointer no-underline hover:bg-muted/50"
      : "cursor-default",
    className,
  );

  const body = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {icon ? <div className="shrink-0">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          <p className="text-lead truncate font-semibold">{title}</p>

          {subtitle ? (
            <p className="text-muted-foreground text-meta truncate">
              {subtitle}
            </p>
          ) : null}
          {meta ? (
            <p className="text-meta text-muted-foreground truncate">{meta}</p>
          ) : null}
        </div>
      </div>
      {trailing ? (
        <div
          className={cn(
            "shrink-0",
            stackTrailing && "min-w-0 basis-full sm:basis-auto",
          )}
        >
          {trailing}
        </div>
      ) : null}
      {navigates ? (
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground hidden size-[18px] shrink-0 sm:block"
        />
      ) : null}
      {footer != null ? (
        <div className="min-w-0 basis-full">{footer}</div>
      ) : null}
    </>
  );

  if (asChild) {
    if (
      !React.isValidElement<{
        className?: string;
        children?: React.ReactNode;
      }>(children)
    ) {
      throw new Error("ListRow asChild requires a single React element child.");
    }

    return (
      <li data-slot="list-row">
        {React.cloneElement(children, {
          className: cn(rowClass, children.props.className),
          children: body,
        })}
      </li>
    );
  }

  return (
    <li data-slot="list-row">
      <div className={rowClass} {...props}>
        {body}
      </div>
    </li>
  );
}
