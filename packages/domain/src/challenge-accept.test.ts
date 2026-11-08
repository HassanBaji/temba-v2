import { describe, expect, it } from "vitest";

import {
  acceptCtaLabel,
  acceptPickCourt,
  acceptPickDay,
  acceptPickVenue,
  acceptSlotDays,
  acceptTeamToPropose,
  acceptVenueChips,
  initialAcceptDraft,
  validateAcceptDraft,
  type AcceptOptions,
} from "./challenge-accept";

const friday = new Date("2026-11-13T16:00:00Z");
const fridayLate = new Date("2026-11-13T17:30:00Z");
const saturday = new Date("2026-11-14T16:00:00Z");

function options(overrides: Partial<AcceptOptions> = {}): AcceptOptions {
  return {
    posterTeam: { displayName: "Seef Smashers" },
    teams: [
      { id: "riffa", displayName: "Riffa Rackets", pendingProposal: null },
    ],
    venues: [
      {
        id: "central",
        name: "Padel Central",
        preferred: true,
        courts: [{ id: "c1", name: "Court 1" }],
      },
      { id: "atlas", name: "Atlas Padel", preferred: false, courts: [] },
    ],
    slots: [friday, fridayLate, saturday],
    ...overrides,
  };
}

describe("the Accept sheet", () => {
  it("reads its CTA from the catalog with the posting Team's name", () => {
    expect(acceptCtaLabel(options(), "en")).toBe(
      "Send proposal to Seef Smashers",
    );
    expect(acceptCtaLabel(options(), "ar")).toContain("أرسل العرض إلى");
  });

  it("starts on the first Team, the first preferred Venue and the first day, with no time picked", () => {
    const draft = initialAcceptDraft(options());
    expect(draft).toEqual({
      teamId: "riffa",
      venueId: "central",
      courtId: null,
      dayKey: "2026-11-13",
      startsAt: null,
      price: "",
    });
    expect(acceptSlotDays(options(), "en").map((day) => day.key)).toEqual([
      "2026-11-13",
      "2026-11-14",
    ]);
    expect(acceptVenueChips(options(), "en")[0]).toMatchObject({
      label: "Padel Central",
      accessibilityLabel: "Padel Central, preferred",
    });
  });

  it("prefills a Team's pending Proposal, which the sheet then changes", () => {
    const pending = options({
      teams: [
        {
          id: "riffa",
          displayName: "Riffa Rackets",
          pendingProposal: {
            id: "p1",
            venueId: "central",
            courtId: "c1",
            startsAt: saturday,
            pricePerPlayerFils: 1500,
          },
        },
      ],
    });
    const draft = initialAcceptDraft(pending);
    expect(draft).toMatchObject({
      dayKey: "2026-11-14",
      startsAt: saturday,
      courtId: "c1",
      price: "1.500",
    });
    expect(validateAcceptDraft(draft, pending, "en")).toEqual({
      ok: true,
      proposalId: "p1",
      value: {
        teamId: "riffa",
        venueId: "central",
        courtId: "c1",
        startsAt: saturday,
        pricePerPlayerFils: 1500,
      },
    });
  });

  it("clears a Court with its Venue and a start with its day, and asks for what is missing", () => {
    let draft = initialAcceptDraft(options());
    draft = acceptPickCourt(draft, "c1");
    expect(draft.courtId).toBe("c1");
    expect(acceptPickCourt(draft, "c1").courtId).toBeNull();
    draft = { ...draft, startsAt: friday };
    expect(acceptPickVenue(draft, "atlas").courtId).toBeNull();
    expect(acceptPickDay(draft, "2026-11-14").startsAt).toBeNull();
    expect(
      validateAcceptDraft(
        { ...draft, startsAt: null, price: "-1" },
        options(),
        "en",
      ),
    ).toEqual({
      ok: false,
      errors: { slot: "Pick a time", price: expect.any(String) },
    });
  });

  it("opens Accept on the first eligible Team that has not proposed here yet", () => {
    const teams = [{ id: "a" }, { id: "b" }];
    expect(acceptTeamToPropose(teams, [{ team: { id: "a" } }])).toEqual({
      id: "b",
    });
    expect(
      acceptTeamToPropose(teams, [
        { team: { id: "a" } },
        { team: { id: "b" } },
      ]),
    ).toBeNull();
  });
});
