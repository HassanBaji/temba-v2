"use client";

import * as React from "react";

import { useMessages } from "~/components/locale-provider";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export function PricePerPlayerAmountInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const m = useMessages();
  return (
    <div className="flex items-center gap-2">
      <Input className={cn("w-auto min-w-0 flex-1", className)} {...props} />
      <span
        aria-hidden="true"
        className="text-muted-foreground text-body shrink-0 font-medium"
      >
        {m.createGame.price.currency}
      </span>
    </div>
  );
}
