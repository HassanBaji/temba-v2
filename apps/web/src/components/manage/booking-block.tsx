import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";
import { formatGameClock } from "@repo/domain/format-game-start";

import { holderName, type VenueBooking } from "./booking-types";
import { PaymentBadge } from "./payment-badge";

export function bookingTimeLabel(booking: VenueBooking) {
  return `${formatGameClock(booking.startsAt)}–${formatGameClock(booking.endsAt)}`;
}

export function BookingBlock({
  booking,
  compact = false,
  className,
  style,
  onSelect,
}: {
  booking: VenueBooking;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSelect: (bookingId: string) => void;
}) {
  const pending = booking.status === "pending_payment";
  const noShow = booking.status === "no_show";
  const cancelled = booking.status === "cancelled";

  return (
    <button
      type="button"
      style={style}
      onClick={() => onSelect(booking.id)}
      aria-label={`${holderName(booking.holder)}, ${bookingTimeLabel(booking)}, ${booking.courtName}, ${pending ? "awaiting payment" : booking.statusLabel}`}
      className={cn(
        "border-foreground relative flex min-w-0 flex-col items-start gap-0.5 overflow-hidden rounded-md border p-1.5 text-left",
        pending
          ? "border-dashed bg-transparent"
          : cancelled
            ? "border-border text-muted-foreground bg-transparent line-through"
            : "bg-secondary",
        className,
      )}
    >
      {pending ? <Hatch className="absolute inset-0 opacity-40" /> : null}
      <span className="text-body relative w-full truncate font-semibold">
        {holderName(booking.holder)}
      </span>
      {compact ? null : (
        <span className="text-eyebrow text-muted-foreground relative">
          {bookingTimeLabel(booking)}
          {booking.source === "venue" ? " · Venue" : ""}
        </span>
      )}
      <span className="relative flex flex-wrap gap-1">
        {pending ? (
          <span className="text-eyebrow font-semibold">Awaiting payment</span>
        ) : noShow ? (
          <span className="text-eyebrow font-semibold">No-show</span>
        ) : null}
        {pending || cancelled ? null : (
          <PaymentBadge status={booking.paymentStatus} />
        )}
      </span>
    </button>
  );
}
