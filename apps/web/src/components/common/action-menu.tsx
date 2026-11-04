"use client";

import { MoreVertical } from "lucide-react";
import * as React from "react";

import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

/** Trigger overrides for a boxed menu on an ink surface, beside other boxed actions. */
export const ACTION_MENU_INK_BOXED_TRIGGER =
  "bg-raised text-paper hover:bg-raised/80 hover:text-paper rounded-md";

/** Trigger overrides for a boxed menu on paper, beside other boxed actions. */
export const ACTION_MENU_PAPER_BOXED_TRIGGER =
  "border-rule text-ink rounded-md border";

export function ActionMenu({
  children,
  label,
  triggerRef,
  triggerClassName,
}: {
  children: React.ReactNode;
  label?: string;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
  /** Trigger overrides, e.g. paper ink and a raised hover on an ink surface. */
  triggerClassName?: string;
}) {
  const m = useMessages();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          aria-label={label ?? m.webUi.moreActions}
          className={cn("size-11 min-h-11 min-w-11 p-0", triggerClassName)}
        >
          <MoreVertical aria-hidden="true" className="size-5" strokeWidth={2} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60] min-w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ActionMenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      variant={variant}
      className={cn(
        "focus-visible:ring-ring/50 min-h-11 cursor-pointer focus-visible:ring-[3px]",
        variant === "destructive" &&
          "text-destructive focus:bg-destructive/10 focus:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

export function ActionMenuSeparator(
  props: React.ComponentProps<typeof DropdownMenuSeparator>,
) {
  return <DropdownMenuSeparator {...props} />;
}
