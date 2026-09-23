import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  MatchStatusEnum,
} from "@repo/db";

import type { LevelBand } from "~/lib/level-bands";
import { matchOutcome } from "~/server/games/match-outcome";
import { computePoolTables } from "~/server/games/pool-table";
import { setWinsForGames } from "~/server/games/set-wins-for-games";
import type { RouterOutputs } from "~/trpc/react";

/**
 * The real `games.byId` door output. Picking the door type — rather than a
 * parallel fixture type — keeps the preview locked to the live payload:
 * a field renamed on `byId.ts` fails this file to compile.
 */
export type TournamentFixture = RouterOutputs["games"]["byId"];

type Occupant = NonNullable<TournamentFixture["sides"][number]["left"]>;
type Occupancy = readonly (Occupant | null)[];
type PoolMatchInput = {
  id: string;
  status: NonNullable<TournamentFixture["matches"][number]["status"]>;
  roundNumber: number;
  startTime: Date;
  slot1GameTeamId: string;
  slot2GameTeamId: string;
  sets: { slot1GamesWon: number; slot2GamesWon: number }[];
};

const TEAM_COUNT = 12;
const POOL_COUNT = 3;
const PRICE_CENTS = 1200;
const VIEWER_ID = "user-viewer";
const ORGANIZER_ID = "user-jonas";

const VENUE: NonNullable<TournamentFixture["venue"]> = {
  name: "Padelhuset Bromma",
  city: "Stockholm",
  country: "SE",
  latitude: null,
  longitude: null,
  archivedAt: null,
  logoImageUrl: null,
};

const ROUND_ROBIN_4: readonly {
  round: number;
  a: number;
  b: number;
}[] = [
  { round: 1, a: 0, b: 3 },
  { round: 1, a: 1, b: 2 },
  { round: 2, a: 0, b: 2 },
  { round: 2, a: 1, b: 3 },
  { round: 3, a: 0, b: 1 },
  { round: 3, a: 2, b: 3 },
];

function occupant(
  userId: string,
  name: string,
  levelBand: LevelBand,
): Occupant {
  return { userId, name, image: null, levelBand };
}

const ORGANIZER = occupant(ORGANIZER_ID, "Jonas B", "C1");
const VIEWER = occupant(VIEWER_ID, "Alex Rivera", "C2");
const PARTNER = occupant("user-sam", "Sam Chen", "C1");
const ADA = occupant("user-ada", "Ada L", "C1");
const SOFIA = occupant("user-sofia", "Sofia M", "C2");
const RASHID = occupant("user-rashid", "Rashid N", "C2");
const KIM = occupant("user-kim", "Kim H", "C3");

const FIELD: Occupant[] = [
  ADA,
  SOFIA,
  RASHID,
  KIM,
  occupant("p05", "Nora V", "C2"),
  occupant("p06", "Erik S", "C1"),
  occupant("p07", "Maya K", "C3"),
  occupant("p08", "Luis P", "C2"),
  occupant("p09", "Ines R", "C1"),
  occupant("p10", "Omar T", "C2"),
  occupant("p11", "Hana W", "C3"),
  occupant("p12", "Leo G", "C2"),
  occupant("p13", "Priya D", "C1"),
  occupant("p14", "Nils B", "C2"),
  occupant("p15", "Yara C", "C3"),
  occupant("p16", "Theo M", "C1"),
  occupant("p17", "Elena F", "C2"),
  occupant("p18", "Hugo A", "C1"),
  occupant("p19", "Mira J", "C3"),
  occupant("p20", "Carl E", "C2"),
  occupant("p21", "Lina Q", "C1"),
  occupant("p22", "Sami Z", "C2"),
  occupant("p23", "Greta O", "C3"),
  occupant("p24", "Paul I", "C2"),
];

function pair(left: Occupant, right: Occupant): Occupancy {
  return [left, right];
}

function half(left: Occupant): Occupancy {
  return [left, null];
}

function vacant(): Occupancy {
  return [null, null];
}

function fullField(override: Occupancy[] = []): Occupancy[] {
  const sides: Occupancy[] = [];
  for (let index = 0; index < TEAM_COUNT; index += 1) {
    const existing = override[index];
    if (existing) {
      sides.push(existing);
      continue;
    }
    sides.push(pair(FIELD[index * 2]!, FIELD[index * 2 + 1]!));
  }
  return sides;
}

function gameTeamId(sideIndex: number) {
  return `game-team-${String(sideIndex).padStart(2, "0")}`;
}

function poolIndexForSide(sideIndex: number) {
  return Math.floor((sideIndex - 1) / 4) + 1;
}

function sidesFromOccupancy(
  occupancy: readonly Occupancy[],
): TournamentFixture["sides"] {
  return occupancy.map((seats, index) => {
    const sideIndex = index + 1;
    return {
      sideIndex,
      gameTeamId: gameTeamId(sideIndex),
      left: seats[0] ?? null,
      right: seats[1] ?? null,
    };
  });
}

function gameTeamsFromSides(
  sides: TournamentFixture["sides"],
  poolIndexes: boolean,
): TournamentFixture["gameTeams"] {
  return sides.map((side) => {
    const members = [
      occupantMember(side.left, "left"),
      occupantMember(side.right, "right"),
    ].filter((member): member is NonNullable<typeof member> => member != null);
    return {
      id: side.gameTeamId ?? gameTeamId(side.sideIndex),
      teamId: null,
      name: null,
      sideIndex: side.sideIndex,
      poolIndex: poolIndexes ? poolIndexForSide(side.sideIndex) : null,
      members,
    };
  });
}

function occupantMember(
  seat: Occupant | null,
  position: "left" | "right",
): TournamentFixture["gameTeams"][number]["members"][number] | null {
  if (!seat) {
    return null;
  }
  return {
    id: seat.userId,
    name: seat.name,
    image: seat.image,
    position,
  };
}

function registeredFromSides(sides: TournamentFixture["sides"]) {
  return sides.flatMap((side) => {
    const people = [];
    if (side.left) {
      people.push({
        id: side.left.userId,
        name: side.left.name,
        image: side.left.image,
      });
    }
    if (side.right) {
      people.push({
        id: side.right.userId,
        name: side.right.name,
        image: side.right.image,
      });
    }
    return people;
  });
}

function windowFor(now: Date) {
  const start = new Date(now);
  start.setHours(18, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 21);
  end.setHours(19, 30, 0, 0);
  return { windowStart: start, windowEnd: end };
}

function poolMatches(args: {
  now: Date;
  gameTeams: TournamentFixture["gameTeams"];
  completeThroughRound: number;
}): PoolMatchInput[] {
  const pools = new Map<number, TournamentFixture["gameTeams"]>();
  for (const team of args.gameTeams) {
    if (team.poolIndex == null) {
      continue;
    }
    const list = pools.get(team.poolIndex) ?? [];
    list.push(team);
    pools.set(team.poolIndex, list);
  }

  const matches: PoolMatchInput[] = [];
  for (const [poolIndex, teams] of [...pools.entries()].sort(
    ([left], [right]) => left - right,
  )) {
    const ordered = [...teams].sort(
      (left, right) => (left.sideIndex ?? 0) - (right.sideIndex ?? 0),
    );
    for (const pairing of ROUND_ROBIN_4) {
      const slot1 = ordered[pairing.a];
      const slot2 = ordered[pairing.b];
      if (!slot1 || !slot2) {
        continue;
      }
      const completed = pairing.round <= args.completeThroughRound;
      const start = new Date(args.now);
      start.setDate(start.getDate() + (pairing.round - 1) * 7);
      start.setHours(18, 0, 0, 0);
      matches.push({
        id: `match-p${poolIndex}-r${pairing.round}-${slot1.id}-${slot2.id}`,
        status: completed ? MatchStatusEnum.COMPLETED : MatchStatusEnum.PENDING,
        roundNumber: pairing.round,
        startTime: start,
        slot1GameTeamId: slot1.id,
        slot2GameTeamId: slot2.id,
        sets: completed ? [{ slot1GamesWon: 6, slot2GamesWon: 4 }] : [],
      });
    }
  }
  return matches;
}

function detailMatches(
  poolMatchRows: readonly PoolMatchInput[],
): TournamentFixture["matches"] {
  return poolMatchRows.map((match) => {
    const bothSlotsFilled = true;
    const frozen = match.status === "completed";
    const scoredSets = match.sets.map((set, index) => ({
      id: `${match.id}-set-${index + 1}`,
      slot1GamesWon: set.slot1GamesWon,
      slot2GamesWon: set.slot2GamesWon,
      wins: setWinsForGames(set.slot1GamesWon, set.slot2GamesWon),
    }));
    const outcome = matchOutcome(scoredSets);
    return {
      id: match.id,
      startTime: match.startTime,
      endTime: null,
      durationInMinutes: 45,
      roundNumber: match.roundNumber,
      status: match.status,
      courtId: "court-1",
      courtName: "Court 1",
      slot1GameTeamId: match.slot1GameTeamId,
      slot2GameTeamId: match.slot2GameTeamId,
      bothSlotsFilled,
      bothSidesComplete: bothSlotsFilled,
      canAddSet: !frozen,
      canScoreSets: !frozen,
      canComplete: !frozen && outcome.result !== "none",
      outcome,
      sets: scoredSets,
    };
  });
}

function baseTournament(args: {
  id: string;
  now: Date;
  occupancy: Occupancy[];
  viewerUserId: string;
  isOrganizer: boolean;
  drawPostedAt: Date | null;
  poolIndexes: boolean;
  completeThroughRound: number | null;
}): TournamentFixture {
  const { windowStart, windowEnd } = windowFor(args.now);
  const sides = sidesFromOccupancy(args.occupancy);
  const gameTeams = gameTeamsFromSides(sides, args.poolIndexes);
  const seated = sides.some(
    (side) =>
      side.left?.userId === args.viewerUserId ||
      side.right?.userId === args.viewerUserId,
  );
  const seatsTaken = sides.reduce(
    (sum, side) => sum + (side.left ? 1 : 0) + (side.right ? 1 : 0),
    0,
  );
  const registeredPlayers = registeredFromSides(sides);
  if (
    args.isOrganizer &&
    !registeredPlayers.some((player) => player.id === ORGANIZER_ID)
  ) {
    registeredPlayers.push({
      id: ORGANIZER.userId,
      name: ORGANIZER.name,
      image: ORGANIZER.image,
    });
  }
  const poolMatchRows =
    args.poolIndexes && args.completeThroughRound != null
      ? poolMatches({
          now: args.now,
          gameTeams,
          completeThroughRound: args.completeThroughRound,
        })
      : [];
  const poolTables = computePoolTables({
    format: GameFormatEnum.FRIENDLY_TOURNAMENT,
    poolCount: POOL_COUNT,
    viewerUserId: args.viewerUserId,
    gameTeams: gameTeams.map((team) => ({
      id: team.id,
      name: team.name,
      sideIndex: team.sideIndex,
      poolIndex: team.poolIndex,
      members: team.members.map((member) => ({
        id: member.id,
        name: member.name,
      })),
    })),
    matches: poolMatchRows.map((match) => ({
      id: match.id,
      status: match.status,
      roundNumber: match.roundNumber,
      startTime: match.startTime,
      slot1GameTeamId: match.slot1GameTeamId,
      slot2GameTeamId: match.slot2GameTeamId,
      sets: match.sets,
    })),
  });

  return {
    id: args.id,
    name: "Bromma Autumn Friendly",
    format: GameFormatEnum.FRIENDLY_TOURNAMENT,
    registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
    allowSoloRegister: true,
    isPublic: false,
    groupId: "group-bromma",
    groupName: "Bromma",
    venueId: "venue-bromma",
    venue: VENUE,
    windowStart,
    windowEnd,
    pricePerPlayerCents: PRICE_CENTS,
    levelMinTenths: null,
    levelMaxTenths: null,
    playersAllowed: TEAM_COUNT * 2,
    teamsAllowed: TEAM_COUNT,
    poolCount: POOL_COUNT,
    matchMinutes: null,
    drawPostedAt: args.drawPostedAt,
    sport: GameSportEnum.PADEL,
    cancelledAt: null,
    registrationClosedAt: args.drawPostedAt,
    createdBy: ORGANIZER_ID,
    createdAt: args.now,
    isOrganizer: args.isOrganizer,
    viewerUserId: args.viewerUserId,
    joinFrozen: false,
    isRegistered: seated || args.isOrganizer,
    isSeated: seated,
    isWaitlisted: false,
    waitlistPlace: null,
    registrationStatus: args.drawPostedAt ? "closed" : "open",
    canRegister: !seated && !args.isOrganizer && !args.drawPostedAt,
    canWaitlist: false,
    canPickSeat: false,
    canMove: false,
    canLeave: seated && !args.drawPostedAt,
    registeredUserCount: seatsTaken,
    registeredTeamCount: sides.filter((side) => side.left && side.right).length,
    waitlist: [],
    matches: detailMatches(poolMatchRows),
    gameTeams,
    sides,
    phase: null,
    matchResultConfirmation: null,
    ratingImpact: null,
    canReportWrongScore: null,
    unseatedPlayers:
      args.isOrganizer && !seated
        ? [
            {
              id: ORGANIZER.userId,
              name: ORGANIZER.name,
              image: ORGANIZER.image,
            },
          ]
        : [],
    registeredPlayers,
    recordedCourts: [
      { id: "court-1", name: "Court 1" },
      { id: "court-2", name: "Court 2" },
    ],
    eligibleTeams: [],
    viewerLevelTenths: 52,
    viewerPassesLevelRange: true,
    levelRangeRequest: null,
    canRequestLevelRange: false,
    pendingLevelRangeRequests: [],
    poolTables,
  };
}

/**
 * Dev-only Pool tournament preview data (TEM-254). Fixture records only —
 * the route renders props and never calls tRPC, matching `~/fixtures/home.ts`
 * and `~/fixtures/game-details.ts`.
 *
 * Six states from `.scratch/friendly-tournament-redesign/spec.md`:
 * - `preDrawWithoutSeat` — viewer is not seated; seats remain.
 * - `preDrawSeatedHalfOpen` — viewer sits on a Half team.
 * - `organizerTwoHalfTeams` — organizer, exactly two Half teams.
 * - `organizerDraftedDraw` — organizer, Pools drafted, draw not posted.
 * - `postedMid` — draw posted, mid-tournament standings.
 * - `finished` — every Pool Match settled, a Pool winner marked.
 */
export function createTournamentFixtures(now = new Date()): {
  preDrawWithoutSeat: TournamentFixture;
  preDrawSeatedHalfOpen: TournamentFixture;
  organizerTwoHalfTeams: TournamentFixture;
  organizerDraftedDraw: TournamentFixture;
  postedMid: TournamentFixture;
  finished: TournamentFixture;
} {
  const preDrawWithoutSeat = baseTournament({
    id: "tournament-predraw-open",
    now,
    occupancy: fullField([
      ...Array.from({ length: 8 }, (_, index) =>
        pair(FIELD[index * 2]!, FIELD[index * 2 + 1]!),
      ),
      half(FIELD[16]!),
      half(FIELD[17]!),
      vacant(),
      vacant(),
    ]),
    viewerUserId: VIEWER_ID,
    isOrganizer: false,
    drawPostedAt: null,
    poolIndexes: false,
    completeThroughRound: null,
  });

  const seatedHalf = fullField();
  seatedHalf[0] = [VIEWER, null];
  seatedHalf[1] = half(PARTNER);
  const preDrawSeatedHalfOpen = baseTournament({
    id: "tournament-predraw-seated",
    now,
    occupancy: seatedHalf,
    viewerUserId: VIEWER_ID,
    isOrganizer: false,
    drawPostedAt: null,
    poolIndexes: false,
    completeThroughRound: null,
  });

  const twoHalf = fullField();
  twoHalf[10] = half(RASHID);
  twoHalf[11] = half(KIM);
  const organizerTwoHalfTeams = baseTournament({
    id: "tournament-organizer-merge",
    now,
    occupancy: twoHalf,
    viewerUserId: ORGANIZER_ID,
    isOrganizer: true,
    drawPostedAt: null,
    poolIndexes: false,
    completeThroughRound: null,
  });

  const organizerDraftedDraw = baseTournament({
    id: "tournament-organizer-draft",
    now,
    occupancy: fullField(),
    viewerUserId: ORGANIZER_ID,
    isOrganizer: true,
    drawPostedAt: null,
    poolIndexes: true,
    completeThroughRound: null,
  });

  const postedMid = baseTournament({
    id: "tournament-posted-mid",
    now,
    occupancy: fullField([[VIEWER, PARTNER]]),
    viewerUserId: VIEWER_ID,
    isOrganizer: false,
    drawPostedAt: now,
    poolIndexes: true,
    completeThroughRound: 1,
  });

  const finished = baseTournament({
    id: "tournament-finished",
    now,
    occupancy: fullField([[VIEWER, PARTNER]]),
    viewerUserId: VIEWER_ID,
    isOrganizer: false,
    drawPostedAt: now,
    poolIndexes: true,
    completeThroughRound: 3,
  });

  return {
    preDrawWithoutSeat,
    preDrawSeatedHalfOpen,
    organizerTwoHalfTeams,
    organizerDraftedDraw,
    postedMid,
    finished,
  };
}
