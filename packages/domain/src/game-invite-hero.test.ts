import { describe, expect, it } from "vitest";

import {
  gameInviteHeroModel,
  gameInviteHeroTiles,
  gameInviteInfoRows,
  gameInviteLevelCard,
  gameInviteLevelFit,
  gameInviteLevelRow,
  gameInviteWebRows,
  type GameInviteHero,
} from "./game-invite-hero";

const NOW = new Date("2026-11-07T12:00:00+03:00");

function hero(overrides: Partial<GameInviteHero> = {}): GameInviteHero {
  return {
    sport: "football",
    windowStart: new Date("2026-11-11T19:00:00+03:00"),
    windowEnd: new Date("2026-11-11T20:30:00+03:00"),
    cancelledAt: null,
    venueName: "Fantasy Football Center",
    venueCity: "Manama",
    courtName: "Pitch 1",
    sideSize: 6,
    seatCount: 12,
    players: [
      { name: "Yousif Kadhem", isViewer: false },
      { name: "Ali Mahmood", isViewer: false },
    ],
    pricePerPlayerFils: 1500,
    rated: true,
    organizerName: "Yousif Kadhem",
    sharedByName: "Yousif Kadhem",
    linkExpiresAt: null,
    groupCard: {
      id: "group-1",
      name: "Gooz of Arad",
      sport: "football",
      imageUrl: null,
      memberCount: 14,
      memberNames: ["Yousif Kadhem", "Ali Mahmood"],
    },
    ...overrides,
  };
}

describe("gameInviteHeroModel", () => {
  it("reads the Game like the design's ink head", () => {
    const model = gameInviteHeroModel(hero(), NOW, "en");
    expect(model.tag).toBe("From a link");
    expect(model.status).toBe("Upcoming, Wednesday");
    expect(model.time).toBe("7:00");
    expect(model.meridiem).toBe("PM");
    expect(model.dayLine).toContain("Fantasy Football Center");
    expect(model.detailLine).toContain("Pitch 1");
    expect(model.detailLine).toContain("90 min");
    expect(model.detailLine).toContain("each");
    expect(model.countLine).toBe("2 of 12 in");
    expect(model.openSeats).toBe(10);
  });

  it("counts without a cap", () => {
    const model = gameInviteHeroModel(hero({ seatCount: null }), NOW, "en");
    expect(model.countLine).toBe("2 in");
    expect(model.openSeats).toBeNull();
  });

  it("speaks Arabic", () => {
    const model = gameInviteHeroModel(hero(), NOW, "ar");
    expect(model.tag).toBe("من رابط");
    expect(model.countLine).toBe("2 من 12 انضموا");
  });
});

describe("gameInviteHeroTiles", () => {
  it("puts the viewer first and hatches the open seats", () => {
    const tiles = gameInviteHeroTiles(
      hero({
        seatCount: 4,
        players: [
          { name: "Yousif Kadhem", isViewer: false },
          { name: "Hassan Haji", isViewer: true },
        ],
      }),
    );
    expect(tiles).toEqual([
      { kind: "player", initials: "HH", isViewer: true },
      { kind: "player", initials: "YK", isViewer: false },
      { kind: "open" },
      { kind: "open" },
    ]);
  });

  it("caps the open seats it draws", () => {
    const tiles = gameInviteHeroTiles(hero({ seatCount: 40, players: [] }));
    expect(tiles).toHaveLength(12);
  });
});

describe("Level", () => {
  it("decides how the viewer stands to the range", () => {
    expect(
      gameInviteLevelFit({
        isSignedIn: false,
        viewerLevelTenths: null,
        viewerPassesLevelRange: null,
      }),
    ).toBe("signed_out");
    expect(
      gameInviteLevelFit({
        isSignedIn: true,
        viewerLevelTenths: null,
        viewerPassesLevelRange: null,
      }),
    ).toBe("no_level");
    expect(
      gameInviteLevelFit({
        isSignedIn: true,
        viewerLevelTenths: 30,
        viewerPassesLevelRange: false,
      }),
    ).toBe("outside");
    expect(
      gameInviteLevelFit({
        isSignedIn: true,
        viewerLevelTenths: 30,
        viewerPassesLevelRange: true,
      }),
    ).toBe("fits");
  });

  it("says the range fits in the row", () => {
    const row = gameInviteLevelRow({
      levelMinTenths: 20,
      levelMaxTenths: 35,
      fit: "fits",
      locale: "en",
    });
    expect(row).toMatch(/, yours fits$/);
    expect(
      gameInviteLevelRow({
        levelMinTenths: null,
        levelMaxTenths: null,
        fit: "fits",
        locale: "en",
      }),
    ).toBeNull();
  });

  it("reads a football Game's range in OVR in the row", () => {
    expect(
      gameInviteLevelRow({
        levelMinTenths: 20,
        levelMaxTenths: 35,
        fit: "fits",
        locale: "en",
        sport: "football",
      }),
    ).toBe("OVR 57 to 70, yours fits");
  });

  it("asks a signed-out holder to sign in on the card", () => {
    const card = gameInviteLevelCard({
      levelMinTenths: 20,
      levelMaxTenths: 35,
      viewerLevelTenths: null,
      fit: "signed_out",
      asksAboutGroup: true,
      locale: "en",
    });
    expect(card?.band).toBeNull();
    expect(card?.text).toMatch(/Sign in to see if you fit/);
  });

  it("names the viewer's band and the Group question when they fit", () => {
    const card = gameInviteLevelCard({
      levelMinTenths: 20,
      levelMaxTenths: 35,
      viewerLevelTenths: 30,
      fit: "fits",
      asksAboutGroup: true,
      locale: "en",
    });
    expect(card?.band).toBeTruthy();
    expect(card?.text).toMatch(
      /so you fit\. Joining asks about the group first\.$/,
    );
  });

  it("shows the viewer's OVR, not a band, on a football card", () => {
    const card = gameInviteLevelCard({
      levelMinTenths: 20,
      levelMaxTenths: 35,
      viewerLevelTenths: 30,
      fit: "outside",
      asksAboutGroup: false,
      locale: "en",
      sport: "football",
    });
    expect(card).toEqual({
      band: "65",
      text: "This game is OVR 57 to 70. You're OVR 65, so joining asks the organizer.",
    });
  });
});

describe("rows", () => {
  it("lists the organizer, the Group and the Level", () => {
    const rows = gameInviteInfoRows({
      hero: hero(),
      levelRow: "OVR 57 to 70, yours fits",
      locale: "en",
    });
    expect(rows).toEqual([
      { label: "Organizer", value: "Yousif Kadhem" },
      { label: "Group", value: "Gooz of Arad, football, 14 members" },
      { label: "Level", value: "OVR 57 to 70, yours fits" },
    ]);
  });

  it("tells the web holder how long the link works", () => {
    const rows = gameInviteWebRows(hero(), "en");
    expect(rows.map((row) => row.label)).toEqual(["Format", "Court", "Link"]);
    expect(rows[0]?.value).toBe("Counts for rating");
    expect(rows[1]?.value).toBe("Pitch 1, pay at the venue");
    expect(rows[2]?.value).toBe("Works until the seats fill");
  });
});
