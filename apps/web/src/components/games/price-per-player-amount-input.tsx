"use client";

import * as React from "react";

import { Input } from "~/components/ui/input";
import { PRICE_PER_PLAYER_CURRENCY } from "@repo/domain/price-per-player";
import { cn } from "~/lib/utils";

export function PricePerPlayerAmountInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <div className="flex items-center gap-2">
      <Input className={cn("w-auto min-w-0 flex-1", className)} {...props} />
      <span
        aria-hidden="true"
        className="text-muted-foreground text-body shrink-0 font-medium"
      >
        {PRICE_PER_PLAYER_CURRENCY}
      </span>
    </div>
  );
}
