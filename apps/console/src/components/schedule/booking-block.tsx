"use client";

import { cn } from "~/lib/utils";
import { formatGameClock } from "@repo/domain/format-game-start";

import {
  blockDetailLine,
  blockTone,
  durationMinutes,
  type BlockTone,
} from "./booking-model";
import { holderName, type VenueBooking } from "./booking-types";

export function bookingTimeLabel(booking: VenueBooking) {
  return `${formatGameClock(booking.startsAt)} to ${formatGameClock(booking.endsAt)}`;
}

const TONE_CLASS: Record<BlockTone, { block: string; detail: string }> = {
  ink: { block: "bg-ink text-paper", detail: "text-dim" },
  outline: {
    block: "bg-paper text-ink border-ink border",
    detail: "text-muted-foreground",
  },
  muted: { block: "bg-muted-foreground text-paper", detail: "text-paper/80" },
};

export function BookingBlock({
  booking,
  now,
  layout = "day",
  selected = false,
  className,
  style,
  onSelect,
}: {
  booking: VenueBooking;
  now: Date;
  /** `day` writes the detail line, `week` the start time, `dense` the name only. */
  layout?: "day" | "week" | "dense";
  selected?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSelect: (bookingId: string) => void;
}) {
  const tone = TONE_CLASS[blockTone(booking, now)];
  const detail =
    layout === "week"
      ? `${formatGameClock(booking.startsAt)}, ${durationMinutes(booking)} min`
      : blockDetailLine(booking);

  return (
    <button
      type="button"
      style={style}
      onClick={() => onSelect(booking.id)}
      aria-pressed={selected}
      aria-label={`${holderName(booking.holder)}, ${bookingTimeLabel(booking)}, ${booking.courtName}, ${blockDetailLine(booking)}`}
      className={cn(
        "rounded-block focus-visible:ring-ink focus-visible:ring-offset-paper flex min-w-0 flex-col items-start overflow-hidden text-left text-xs leading-4 outline-none transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2",
        layout === "day" ? "gap-0.5 px-2.5 py-2" : "w-full px-2 py-1.5",
        tone.block,
        selected && "ring-ink ring-offset-paper ring-2 ring-offset-2",
        className,
      )}
    >
      <span className="w-full truncate font-semibold">
        {holderName(booking.holder)}
      </span>
      {layout === "dense" ? null : (
        <span
          className={cn(
            "w-full truncate",
            layout === "week" && "text-[11px]",
            tone.detail,
          )}
        >
          {detail}
        </span>
      )}
    </button>
  );
}
