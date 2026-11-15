import type { PaymentMark } from "@repo/domain/game-payments";
import { CheckIcon } from "lucide-react";

import { useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

const SIZE_CLASS = {
  xs: "size-3 rounded-[4px]",
  sm: "size-[18px] rounded-[5px]",
  md: "size-[22px] rounded-[7px]",
} as const;

/**
 * Solid for paid, a ring for says paid, hatched for not yet and a dashed box
 * for a player who owes nothing.
 */
export function PaymentMarkIcon({
  mark,
  size = "sm",
  className,
}: {
  mark: PaymentMark;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const base = cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden",
    SIZE_CLASS[size],
    className,
  );
  if (mark === "paid") {
    return (
      <span
        aria-hidden="true"
        className={cn(base, "bg-control text-on-control")}
      >
        <CheckIcon
          className={
            size === "xs" ? "size-2" : size === "sm" ? "size-3" : "size-4"
          }
          strokeWidth={3}
        />
      </span>
    );
  }
  if (mark === "claimed") {
    return (
      <span
        aria-hidden="true"
        className={cn(base, "border-ink border-[1.5px]")}
      >
        <span
          className={cn(
            "bg-ink rounded-[2px]",
            size === "xs" ? "size-0.5" : size === "sm" ? "size-2" : "size-3",
          )}
        />
      </span>
    );
  }
  if (mark === "free") {
    return (
      <span
        aria-hidden="true"
        className={cn(base, "border-muted-foreground border border-dashed")}
      />
    );
  }
  return (
    <span aria-hidden="true" className={cn(base, "border-rule border")}>
      <Hatch className="absolute inset-0" />
    </span>
  );
}

const LEGEND: readonly PaymentMark[] = ["paid", "claimed", "due", "free"];

export function PaymentLegend({
  marks = LEGEND,
}: {
  marks?: readonly PaymentMark[];
}) {
  const copy = useMessages().gamePayments.mark;
  return (
    <ul className="text-eyebrow text-muted-foreground flex flex-wrap gap-x-3.5 gap-y-1.5">
      {marks.map((mark) => (
        <li key={mark} className="flex items-center gap-1.5">
          <PaymentMarkIcon mark={mark} size="xs" />
          {copy[mark]}
        </li>
      ))}
    </ul>
  );
}
