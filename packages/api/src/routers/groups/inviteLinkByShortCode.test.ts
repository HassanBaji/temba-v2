import { groups, user } from "@repo/db/schema";
import { describe, expect, it } from "vitest";

import { GENERIC_TEMBA_OPEN_GRAPH } from "@repo/domain/game-invite-open-graph";
import { mintLink } from "#src/invites/doors";
import { inviteLinkByShortCode } from "#src/routers/groups/inviteLinkByShortCode";
import { createPgliteDb } from "@repo/db/testing";

describe("groups.inviteLinkByShortCode", () => {
  it("returns the token and Group fields for a live code and an empty token for an unknown one", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [owner] = await db
        .insert(user)
        .values({ name: "Owner", email: "short-group-owner@example.com" })
        .returning({ id: user.id });
      const [group] = await db
        .insert(groups)
        .values({ name: "Friday Night", createdBy: owner!.id })
        .returning({ id: groups.id });
      const minted = await mintLink(
        db,
        { kind: "group", id: group!.id },
        { createdBy: owner!.id },
      );
      if (!minted.ok) {
        throw new Error("Failed to mint link");
      }

      expect(
        await inviteLinkByShortCode(db, { code: minted.link.shortCode! }),
      ).toEqual({
        token: minted.link.token,
        title: "Friday Night",
        description: 'You are invited to join "Friday Night" for "Padel"',
      });
      expect(await inviteLinkByShortCode(db, { code: "ZZZZZZZZ" })).toEqual({
        token: null,
        ...GENERIC_TEMBA_OPEN_GRAPH,
      });
    } finally {
      await close();
    }
  });
});
