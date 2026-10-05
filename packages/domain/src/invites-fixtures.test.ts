import { describe, expect, it } from "vitest";

import { gameInviteLinkStage, mergeInviteInbox } from "./invites";
import { createInvitesFixtures } from "./invites-fixtures";

describe("createInvitesFixtures", () => {
  const fixtures = createInvitesFixtures(new Date("2026-03-10T12:00:00Z"));

  it("covers all four hosts in one inbox, newest first", () => {
    const items = mergeInviteInbox(fixtures.inbox.mixed);
    expect(new Set(items.map((item) => item.kind))).toEqual(
      new Set(["community", "group", "team", "game"]),
    );
    expect(items[0]?.kind).toBe("game");
  });

  it("draws the three seat states from one Game", () => {
    const [open] = mergeInviteInbox(fixtures.inbox.seatPick);
    const [waitlist] = mergeInviteInbox(fixtures.inbox.waitlistOnly);
    const [frozen] = mergeInviteInbox(fixtures.inbox.frozen);
    expect(open?.seatPick).toMatchObject({
      joinFrozen: false,
      waitlistOnly: false,
    });
    expect(waitlist?.seatPick?.waitlistOnly).toBe(true);
    expect(frozen?.seatPick?.joinFrozen).toBe(true);
  });

  it("reaches every Game link stage", () => {
    const stage = (key: string) => {
      const preview = fixtures.links[key];
      if (preview?.status !== "ready" || preview.kind !== "game") {
        throw new Error(key);
      }
      return gameInviteLinkStage(preview.game, true);
    };
    expect(stage("game")).toBe("accept");
    expect(stage("gameSeatPick")).toBe("seat_pick");
    expect(stage("gamePartner")).toBe("partner");
    expect(stage("gameLevelRange")).toBe("level_range");
  });
});
