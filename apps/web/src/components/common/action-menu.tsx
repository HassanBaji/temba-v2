"use client";

import { MoreVertical } from "lucide-react";
import * as React from "react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

export function ActionMenu({
  children,
  label = "More actions",
  triggerRef,
}: {
  children: React.ReactNode;
  label?: string;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          aria-label={label}
          className="size-11 min-h-11 min-w-11 p-0"
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
