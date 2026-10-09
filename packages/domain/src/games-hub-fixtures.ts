import { createTournamentCardFixtures } from "./tournament-card-fixtures";
import type {
  HubGameOccupant,
  HubGameRow,
  HubGameSide,
  HubHistoryMember,
  HubHistoryRow,
} from "./hub-game-row";

const HOUR_MS = 60 * 60 * 1000;

function player(id: string, name: string, isViewer = false): HubGameOccupant {
  return { userId: id, name, image: null, isViewer };
}

const VIEWER = player("viewer", "Alex Rivera", true);
const ADA = player("ada", "Ada Lindqvist");
const KIM = player("kim", "Kim Holm");
const ELIN = player("elin", "Elin Nilsson");
const NILS = player("nils", "Nils Axelsson");

function friendlyRow(args: {
  id: string;
  startTime: Date;
  sides: HubGameSide[];
  viewerIn?: boolean;
  canRegister?: boolean;
  canWaitlist?: boolean;
  registrationStatus?: HubGameRow["registrationStatus"];
  name?: string | null;
}): HubGameRow {
  const registeredUserCount = args.sides.reduce(
    (count, side) => count + (side.left ? 1 : 0) + (side.right ? 1 : 0),
    0,
  );
  return {
    id: args.id,
    name: args.name ?? null,
    format: "friendly_game",
    registrationMode: "individual",
    sport: "padel",
    isPublic: false,
    groupId: "group-bromma",
    groupName: "Bromma Tuesday",
    startTime: args.startTime,
    windowStart: args.startTime,
    windowEnd: new Date(args.startTime.getTime() + 1.5 * HOUR_MS),
    venue: { id: "venue-bromma", name: "Padelhuset Bromma", city: "Bromma" },
    pricePerPlayerFils: 3000,
    levelMinTenths: 30,
    levelMaxTenths: 45,
    registeredUserCount,
    playersAllowed: 4,
    registeredTeamCount: 0,
    teamsAllowed: null,
    registrationStatus: args.registrationStatus ?? "open",
    joinFrozen: false,
    isRegistered: args.viewerIn ?? false,
    isSeated: args.viewerIn ?? false,
    isWaitlisted: false,
    canRegister: args.canRegister ?? false,
    canWaitlist: args.canWaitlist ?? false,
    sides: args.sides,
    poolCount: null,
    tournamentShape: null,
    tournament: null,
    matchId: null,
    roundNumber: null,
    roundCount: null,
    courtName: "Court 2",
    poolMatch: null,
    knockoutMatch: null,
  };
}

function inDays(now: Date, days: number, hour: number) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function historyMember(
  id: string,
  name: string,
  isViewer = false,
): HubHistoryMember {
  return { id, name, image: null, isViewer };
}

function historyRow(args: {
  matchId: string;
  daysAgo: number;
  now: Date;
  viewerSlot: 1 | 2;
  outcome: HubHistoryRow["outcome"];
  scoredSets: HubHistoryRow["scoredSets"];
  groupName?: string | null;
  opponents?: HubHistoryMember[];
}): HubHistoryRow {
  const mine = [
    historyMember("viewer", "Alex Rivera", true),
    historyMember("ada", "Ada Lindqvist"),
  ];
  const theirs = args.opponents ?? [
    historyMember("kim", "Kim Holm"),
    historyMember("elin", "Elin Nilsson"),
  ];
  return {
    id: `game-${args.matchId}`,
    name: null,
    format: "friendly_game",
    venue: { name: "Padelhuset Bromma" },
    displayTime: new Date(args.now.getTime() - args.daysAgo * 24 * HOUR_MS),
    matchId: args.matchId,
    groupName: args.groupName === undefined ? "Bromma Tuesday" : args.groupName,
    slot1Members: args.viewerSlot === 1 ? mine : theirs,
    slot2Members: args.viewerSlot === 1 ? theirs : mine,
    scoredSets: args.scoredSets,
    viewerSlot: args.viewerSlot,
    outcome: args.outcome,
  };
}

export type GamesHubFixture = {
  myGames: HubGameRow[];
  history: HubHistoryRow[];
};

/** Each key is one state of the Games tab: a mixed list, a drawn tournament as Match rows, or empty lists. */
export function createGamesHubFixtures(now = new Date()): {
  mixed: GamesHubFixture;
  tournamentMatches: GamesHubFixture;
  empty: GamesHubFixture;
} {
  const cards = createTournamentCardFixtures(now);
  const history = [
    historyRow({
      matchId: "match-won",
      daysAgo: 2,
      now,
      viewerSlot: 1,
      outcome: "won",
      scoredSets: [
        { slot1GamesWon: 6, slot2GamesWon: 3 },
        { slot1GamesWon: 6, slot2GamesWon: 4 },
      ],
    }),
    historyRow({
      matchId: "match-lost",
      daysAgo: 9,
      now,
      viewerSlot: 2,
      outcome: "lost",
      scoredSets: [
        { slot1GamesWon: 6, slot2GamesWon: 2 },
        { slot1GamesWon: 3, slot2GamesWon: 6 },
        { slot1GamesWon: 6, slot2GamesWon: 4 },
      ],
    }),
    historyRow({
      matchId: "match-unscored",
      daysAgo: 16,
      now,
      viewerSlot: 1,
      outcome: "draw",
      scoredSets: [],
      groupName: null,
      opponents: [historyMember("kim", "Kim Holm")],
    }),
  ];

  const mixed: HubGameRow[] = [
    friendlyRow({
      id: "game-open",
      startTime: inDays(now, 1, 19),
      canRegister: true,
      sides: [
        { sideIndex: 1, left: ADA, right: null },
        { sideIndex: 2, left: null, right: null },
      ],
    }),
    friendlyRow({
      id: "game-viewer-in",
      startTime: inDays(now, 3, 18),
      viewerIn: true,
      sides: [
        { sideIndex: 1, left: VIEWER, right: ADA },
        { sideIndex: 2, left: KIM, right: null },
      ],
    }),
    friendlyRow({
      id: "game-full",
      startTime: inDays(now, 5, 20),
      registrationStatus: "full",
      canWaitlist: true,
      sides: [
        { sideIndex: 1, left: ADA, right: KIM },
        { sideIndex: 2, left: ELIN, right: NILS },
      ],
    }),
    cards.open,
  ];

  return {
    mixed: { myGames: mixed, history },
    tournamentMatches: {
      myGames: [
        cards.matchNeedsResults,
        cards.matchUpcoming,
        cards.knockoutSemiFinal,
        cards.drawn,
      ],
      history,
    },
    empty: { myGames: [], history: [] },
  };
}
