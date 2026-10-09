import type { CreateGroupOption, CreateVenuePicker } from "./create-game-flow";
import {
  initialCreateGameDraft,
  type CreateGameDraft,
} from "./create-game-draft";

export type CreateGameFixtureKey =
  | "emptyGame"
  | "gameWhereFilled"
  | "gameWhenFilled"
  | "gameReview"
  | "tournamentWhere"
  | "tournamentGroupsOnly"
  | "tournamentKnockoutOnly"
  | "tournamentGroupsThenKnockout"
  | "tournamentReview"
  | "invertedLevelRange"
  | "badPrice"
  | "teamCountDoesNotFit";

export type CreateGameFixtures = {
  now: Date;
  groups: CreateGroupOption[];
  pickers: {
    loose: CreateVenuePicker;
    club: CreateVenuePicker;
    clubUnlinked: CreateVenuePicker;
    archivedClub: CreateVenuePicker;
    emptyCatalog: CreateVenuePicker;
  };
  drafts: Record<CreateGameFixtureKey, CreateGameDraft>;
};

const courts = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-court-${index + 1}`,
    name: `Court ${index + 1}`,
  }));

export function createCreateGameFixtures(
  now: Date = new Date("2026-10-04T09:00:00Z"),
): CreateGameFixtures {
  const venue = (
    id: string,
    name: string,
    city: string,
    courtCount: number,
  ) => ({
    id,
    name,
    city,
    country: "BH",
    archivedAt: null,
    courts: courts(id, courtCount),
  });
  const seef = venue("venue-seef", "Seef Padel Club", "Manama", 4);
  const riffa = venue("venue-riffa", "Riffa Padel", "Riffa", 2);
  const budaiya = venue("venue-budaiya", "Budaiya Courts", "Budaiya", 1);

  const base = initialCreateGameDraft(now);
  const where = {
    ...base,
    groupId: "group-friends",
    venueId: seef.id,
  };
  const timed = {
    ...where,
    startTime: "20:00",
    finishTime: "21:30",
  };
  const tournamentBase = {
    ...timed,
    startTime: "09:00",
    finishTime: "18:00",
    courtIds: [`${seef.id}-court-1`, `${seef.id}-court-2`],
    name: "Friday cup",
    nameTouched: true,
  };

  return {
    now,
    groups: [
      { id: "group-friends", name: "Friday Padel", communityName: null },
      {
        id: "group-club",
        name: null,
        communityName: "Seef Padel Club",
      },
      { id: "group-juniors", name: "Weekend Juniors", communityName: null },
    ],
    pickers: {
      loose: {
        locked: false,
        groupKind: "loose",
        venues: [seef, riffa, budaiya],
        recentCourtIds: [`${seef.id}-court-2`],
      },
      club: {
        locked: true,
        groupKind: "club",
        venues: [seef],
        recentCourtIds: [],
      },
      clubUnlinked: {
        locked: false,
        groupKind: "club",
        venues: [seef, riffa],
        recentCourtIds: [],
      },
      archivedClub: {
        locked: true,
        groupKind: "club",
        venues: [
          {
            ...riffa,
            archivedAt: new Date("2026-09-01T00:00:00Z"),
            courts: [],
          },
        ],
        recentCourtIds: [],
      },
      emptyCatalog: {
        locked: false,
        groupKind: "loose",
        venues: [],
        recentCourtIds: [],
      },
    },
    drafts: {
      emptyGame: base,
      gameWhereFilled: where,
      gameWhenFilled: timed,
      gameReview: {
        ...timed,
        courtId: `${seef.id}-court-1`,
        levelMin: "C",
        levelMax: "B",
        preferLevelRange: true,
        pricePerPlayer: "4.5",
      },
      tournamentWhere: { ...where, courtIds: [`${seef.id}-court-1`] },
      tournamentGroupsOnly: tournamentBase,
      tournamentKnockoutOnly: {
        ...tournamentBase,
        tournamentShape: "knockout_only",
        teamCount: 8,
      },
      tournamentGroupsThenKnockout: {
        ...tournamentBase,
        tournamentShape: "groups_then_knockout",
        teamCount: 12,
        poolCount: 3,
      },
      tournamentReview: {
        ...tournamentBase,
        pricePerPlayer: "5.25",
        levelMin: "C",
        levelMax: "B",
        preferLevelRange: true,
        allowSoloRegister: false,
      },
      invertedLevelRange: {
        ...timed,
        levelMin: "B+",
        levelMax: "C",
        preferLevelRange: true,
      },
      badPrice: { ...timed, pricePerPlayer: "4,5 BD" },
      teamCountDoesNotFit: {
        ...tournamentBase,
        teamCount: 4,
        poolCount: 3,
      },
    },
  };
}
