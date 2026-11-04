import { bookedCourtLine } from "@repo/domain/booking-copy";
import {
  gameRatingScopeLabel,
  type GameRatingScope,
} from "@repo/domain/game-rating-scope";
import { useLocale, useMessages } from "~/components/locale-provider";

export function GameBookedBlock({
  booking,
  ratingScope,
}: {
  booking: { courtName: string; startsAt: Date; endsAt: Date };
  ratingScope: GameRatingScope;
}) {
  const locale = useLocale();
  const m = useMessages();
  return (
    <section
      data-slot="game-booked-block"
      className="border-rule bg-paper flex items-start justify-between gap-3 rounded-xl border px-[22px] py-[18px]"
    >
      <div className="min-w-0">
        <p className="text-muted-foreground text-meta uppercase">
          {m.webGame.booked}
        </p>
        <p className="text-sm font-semibold">
          {bookedCourtLine(booking, locale)}
        </p>
      </div>
      <p className="text-muted-foreground text-meta">
        {gameRatingScopeLabel(ratingScope, locale)}
      </p>
    </section>
  );
}
