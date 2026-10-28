import { Check, CircleDashed, X } from "lucide-react";

import type { PaymentStatus } from "@repo/domain/booking-payment";
import { cn } from "~/lib/utils";

import { paymentWord } from "./booking-list-model";

/** The design's inline mark and word: a check for settled money, a dashed circle for money still open. */
export function PaymentBadge({
  status,
  refundInProgress = false,
  className,
}: {
  status: PaymentStatus;
  refundInProgress?: boolean;
  className?: string;
}) {
  const { mark, word } = refundInProgress
    ? { mark: "open" as const, word: "Refund in progress" }
    : paymentWord(status);
  const Icon = mark === "paid" ? Check : mark === "failed" ? X : CircleDashed;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]",
        mark !== "paid" && "text-muted-foreground",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-[13px]" strokeWidth={2} />
      {word}
    </span>
  );
}
