import type { RouterOutputs } from "~/trpc/react";

/** The live hub row, so a renamed `HubListRow` field fails this file. */
export type TournamentCardFixture =
  RouterOutputs["games"]["listMyGames"][number];

type Team = NonNullable<TournamentCardFixture["tournament"]>["teams"][number];
type Occupant = NonNullable<Team["left"]>;

const TEAM_COUNT = 12;
const POOL_COUNT = 3;
const VIEWER_ID = "user-viewer";

const NAMES = [
  "Ada L",
  "Sofia M",
  "Rashid N",
  "Kim H",
  "Elin N",
  "Nils A",
  "Hassan Q",
  "Jonas B",
  "Paula H",
  "Adam R",
  "Maja S",
  "Oskar T",
  "Lena W",
  "Theo V",
  "Iris K",
  "Viktor D",
  "Nora F",
  "Emil G",
  "Sara J",
  "Anton P",
  "Klara E",
  "Hugo O",
  "Ella C",
  "Leo U",
];

function occupant(index: number): Occupant {
  return {
    userId: `user-${index}`,
    name: NAMES[index % NAMES.length] ?? "Player",
    image: null,
    isViewer: false,
  };
}

const VIEWER: Occupant = {
  userId: VIEWER_ID,
  name: "Alex Rivera",
  image: null,
  isViewer: true,
};

type TeamSeats = {
  left: Occupant | null;
  right: Occupant | null;
};

function fullTeam(index: number): TeamSeats {
  return { left: occupant(index * 2), right: occupant(index * 2 + 1) };
}

function buildRow(args: {
  id: string;
  seats: (TeamSeats | null)[];
  now: Date;
  viewerSeated?: boolean;
  drawPosted?: boolean;
  registrationStatus?: TournamentCardFixture["registrationStatus"];
  canRegister?: boolean;
  canWaitlist?: boolean;
}): TournamentCardFixture {
  const drawPosted = args.drawPosted ?? false;
  const windowStart = new Date(args.now);
  windowStart.setDate(windowStart.getDate() + 3);
  windowStart.setHours(18, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 16);
  windowEnd.setHours(21, 0, 0, 0);

  const joinSides = Array.from({ length: TEAM_COUNT }, (_, index) => ({
    sideIndex: index + 1,
    left: args.seats[index]?.left ?? null,
    right: args.seats[index]?.right ?? null,
  }));
  const teams: Team[] = joinSides
    .filter((side) => side.left != null || side.right != null)
    .map((side) => ({
      gameTeamId: `team-${args.id}-${side.sideIndex}`,
      sideIndex: side.sideIndex,
      poolIndex: drawPosted ? ((side.sideIndex - 1) % POOL_COUNT) + 1 : null,
      isViewerTeam:
        side.left?.isViewer === true || side.right?.isViewer === true,
      left: side.left,
      right: side.right,
    }))
    .sort((a, b) => Number(b.isViewerTeam) - Number(a.isViewerTeam));
  const registeredUserCount = joinSides.reduce(
    (count, side) => count + (side.left ? 1 : 0) + (side.right ? 1 : 0),
    0,
  );

  return {
    id: args.id,
    name: "Bromma Winter Friendly",
    format: "friendly_tournament",
    registrationMode: "individual",
    sport: "padel",
    isPublic: false,
    groupId: "group-bromma",
    groupName: "Bromma Tuesday",
    startTime: windowStart,
    windowStart,
    windowEnd,
    venue: { id: "venue-bromma", name: "Padelhuset Bromma", city: "Bromma" },
    pricePerPlayerCents: 10000,
    levelMinTenths: 30,
    levelMaxTenths: 40,
    registeredUserCount,
    playersAllowed: TEAM_COUNT * 2,
    registeredTeamCount: teams.length,
    teamsAllowed: TEAM_COUNT,
    registrationStatus: args.registrationStatus ?? "open",
    joinFrozen: false,
    isRegistered: args.viewerSeated ?? false,
    isSeated: args.viewerSeated ?? false,
    isWaitlisted: false,
    canRegister: args.canRegister ?? false,
    canWaitlist: args.canWaitlist ?? false,
    sides: [],
    poolCount: POOL_COUNT,
    tournament: {
      roundCount: 3,
      drawPosted,
      allowSoloRegister: true,
      teams,
      joinSides,
    },
    matchId: null,
    roundNumber: null,
    roundCount: null,
    courtName: null,
    poolMatch: null,
  };
}

/** A posted Pool Match row as My Games expands it (ADR-0018). */
function buildMatchRow(args: {
  id: string;
  drawn: TournamentCardFixture;
  startTime: Date;
  roundNumber: number;
  poolMatch: NonNullable<TournamentCardFixture["poolMatch"]>;
}): TournamentCardFixture {
  return {
    ...args.drawn,
    id: args.id,
    startTime: args.startTime,
    isRegistered: true,
    isSeated: true,
    matchId: `match-${args.id}`,
    roundNumber: args.roundNumber,
    roundCount: 3,
    courtName: "Court 2",
    sides: [
      { sideIndex: 1, left: occupant(10), right: occupant(11) },
      { sideIndex: 2, left: VIEWER, right: occupant(1) },
    ],
    registeredUserCount: 4,
    playersAllowed: 4,
    poolMatch: args.poolMatch,
  };
}

function atHalfPast(now: Date, dayOffset: number, hour: number) {
  const date = new Date(now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 30, 0, 0);
  return date;
}

export function createTournamentCardFixtures(now = new Date()) {
  const openSeats: (TeamSeats | null)[] = [
    fullTeam(0),
    fullTeam(1),
    { left: occupant(4), right: null },
    fullTeam(3),
    null,
    fullTeam(5),
    fullTeam(6),
  ];
  const halfTeamSeats: (TeamSeats | null)[] = [
    fullTeam(0),
    fullTeam(1),
    { left: VIEWER, right: null },
  ];
  const fullSeats = Array.from({ length: TEAM_COUNT }, (_, index) =>
    fullTeam(index),
  );

  const drawn = buildRow({
    id: "card-drawn",
    seats: fullSeats,
    now,
    drawPosted: true,
    registrationStatus: "closed",
  });
  const tonight = atHalfPast(now, 0, 19);

  return {
    open: buildRow({
      id: "card-open",
      seats: openSeats,
      now,
      canRegister: true,
    }),
    inWithHalfTeam: buildRow({
      id: "card-half",
      seats: halfTeamSeats,
      now,
      viewerSeated: true,
    }),
    full: buildRow({
      id: "card-full",
      seats: fullSeats,
      now,
      registrationStatus: "full",
      canWaitlist: true,
    }),
    drawn,
    matchUpcoming: buildMatchRow({
      id: "card-match-upcoming",
      drawn,
      startTime: tonight > now ? tonight : atHalfPast(now, 1, 19),
      roundNumber: 1,
      poolMatch: {
        poolLabel: "1",
        poolSize: 4,
        viewerPosition: null,
        lastResult: null,
      },
    }),
    matchWonRoundOne: buildMatchRow({
      id: "card-match-won",
      drawn,
      startTime: atHalfPast(now, 7, 19),
      roundNumber: 2,
      poolMatch: {
        poolLabel: "1",
        poolSize: 4,
        viewerPosition: 2,
        lastResult: {
          roundNumber: 1,
          outcome: "won",
          viewerSets: [
            { viewer: 6, opponent: 3 },
            { viewer: 6, opponent: 4 },
          ],
        },
      },
    }),
    matchNeedsResults: buildMatchRow({
      id: "card-match-needs-results",
      drawn,
      startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      roundNumber: 2,
      poolMatch: {
        poolLabel: "1",
        poolSize: 4,
        viewerPosition: 2,
        lastResult: {
          roundNumber: 1,
          outcome: "won",
          viewerSets: [
            { viewer: 6, opponent: 3 },
            { viewer: 6, opponent: 4 },
          ],
        },
      },
    }),
  };
}

export type TournamentCardFixtures = ReturnType<
  typeof createTournamentCardFixtures
>;
