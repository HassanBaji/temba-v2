import { ChevronRight } from "lucide-react";
import * as React from "react";

import { cn } from "~/lib/utils";

export function RowList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="row-list"
      className={cn(
        "divide-border border-border divide-y overflow-hidden rounded-lg border bg-transparent",
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
  meta,
  trailing,
  asChild = false,
  className,
  children,
  ...props
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.ComponentProps<"div">, "title" | "children">) {
  const navigates = asChild;
  const rowClass = cn(
    "flex min-h-16 w-full min-w-0 items-center gap-3 px-4 py-3 outline-none",
    "flex-row justify-between",
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
      <div className="min-w-0 flex-1">
        <p className="text-lead truncate font-semibold">{title}</p>
        {meta ? (
          <p className="text-meta text-muted-foreground truncate">{meta}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
      {navigates ? (
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground hidden size-4 shrink-0 sm:block"
          strokeWidth={1.75}
        />
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
