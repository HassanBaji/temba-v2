import type { DbClient, DbTx } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { courts } from "@repo/db";
import {
  proposalSlotMessage,
  proposalSlotProblem,
} from "@repo/domain/challenge-slots";
import type { Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { liveVenuesOfferingSport } from "#src/challenges/venues-for-sport";

type DbOrTx = DbClient | DbTx;

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

/**
 * The terms a Proposal names, checked when it is sent and when it is changed:
 * a start at least an hour ahead and within 30 days, a live Venue with the
 * sport, and a Court, if given, on that Venue with that sport.
 */
export async function checkProposalTerms(
  database: DbOrTx,
  args: {
    sport: Sport;
    venueId: string;
    courtId: string | null;
    startsAt: Date;
    now: Date;
    locale: Locale;
  },
) {
  const m = messagesFor(args.locale).challenge.errors;
  const slotProblem = proposalSlotProblem(args.startsAt, args.now);
  if (slotProblem) {
    refuse(proposalSlotMessage(slotProblem, args.locale));
  }
  const venues = await liveVenuesOfferingSport(database, args.sport, [
    args.venueId,
  ]);
  if (venues.length !== 1) {
    refuse(m.venueSport[args.sport]);
  }
  if (args.courtId) {
    const court = await database.query.courts.findFirst({
      where: and(
        eq(courts.id, args.courtId),
        eq(courts.venueId, args.venueId),
        eq(courts.sport, args.sport),
      ),
      columns: { id: true },
    });
    if (!court) {
      refuse(m.courtVenue);
    }
  }
}
