import { bookedCourtLine } from "@repo/domain/booking-copy";
import { UNRATED_LABEL } from "@repo/domain/game-rating-impact";

export function GameBookedBlock({
  booking,
}: {
  booking: { courtName: string; startsAt: Date; endsAt: Date };
}) {
  return (
    <section
      data-slot="game-booked-block"
      className="border-rule bg-paper flex items-start justify-between gap-3 rounded-xl border px-[22px] py-[18px]"
    >
      <div className="min-w-0">
        <p className="text-muted-foreground text-meta uppercase">Booked</p>
        <p className="text-sm font-semibold">{bookedCourtLine(booking)}</p>
      </div>
      <p className="text-muted-foreground text-meta">{UNRATED_LABEL}</p>
    </section>
  );
}
