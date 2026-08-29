"use client";

import * as React from "react";

import { cn } from "~/lib/utils";

export const FormErrorSummary = React.forwardRef<
  HTMLDivElement,
  {
    message?: string | null;
    className?: string;
  }
>(function FormErrorSummary({ message, className }, ref) {
  if (!message) {
    return null;
  }

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className={cn(
        "border-destructive/30 bg-destructive/5 text-destructive focus-visible:ring-ring rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2",
        className,
      )}
    >
      {message}
    </div>
  );
});
