import { games, GameFormatEnum, matches, user, venues } from "@repo/db/schema";
import { describe, expect, it } from "vitest";

import { GENERIC_TEMBA_OPEN_GRAPH } from "@repo/domain/game-invite-open-graph";
import { mintLink } from "#src/invites/doors";
import { inviteLinkByShortCode } from "#src/routers/games/inviteLinkByShortCode";
import { createPgliteDb } from "@repo/db/testing";

describe("games.inviteLinkByShortCode", () => {
  it("returns the token and Venue fields for a live code and an empty token for an unknown one", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [owner] = await db
        .insert(user)
        .values({ name: "Owner", email: "short-game-owner@example.com" })
        .returning({ id: user.id });
      const [venue] = await db
        .insert(venues)
        .values({ name: "Ocean Padel", city: "Lisbon", country: "PT" })
        .returning({ id: venues.id });
      const windowStart = new Date(Date.now() + 60 * 60 * 1000);
      const [game] = await db
        .insert(games)
        .values({
          format: GameFormatEnum.FRIENDLY_GAME,
          venueId: venue!.id,
          createdBy: owner!.id,
          playersAllowed: 4,
          windowStart,
          windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
        })
        .returning({ id: games.id });
      await db.insert(matches).values({ gameId: game!.id });
      const minted = await mintLink(
        db,
        { kind: "game", id: game!.id },
        { createdBy: owner!.id },
      );
      if (!minted.ok) {
        throw new Error("Failed to mint link");
      }

      const live = await inviteLinkByShortCode(db, {
        code: minted.link.shortCode!,
      });
      expect(live.token).toBe(minted.link.token);
      expect(live.title).toBe("Ocean Padel");
      expect(live.description).toContain("0/4 sitting");

      expect(await inviteLinkByShortCode(db, { code: "ZZZZZZZZ" })).toEqual({
        token: null,
        ...GENERIC_TEMBA_OPEN_GRAPH,
      });
    } finally {
      await close();
    }
  });
});
