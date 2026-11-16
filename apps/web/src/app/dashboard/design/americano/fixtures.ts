import {
  americanoRounds,
  americanoTable,
  type AmericanoResult,
} from "@repo/domain/tournament-americano";
import type { TournamentDetails } from "@repo/domain/tournament-details";
import { createTournamentFixtures } from "@repo/domain/tournament-details-fixtures";

import type { AmericanoBoard } from "~/components/games/tournament-americano-parts";

const NAMES = [
  "Ahmed Buhazza",
  "Dana Al-Khalifa",
  "Hassan Haji",
  "Khalid Janahi",
  "Layla Haddad",
  "Mariam Zayani",
  "Noor Abdulla",
  "Omar Al-Sayed",
  "Rashed Kanoo",
  "Qasim Albaqali",
  "Sara Fakhro",
  "Yousif Mansoor",
  "Ali Haji",
  "Nora Newman",
  "Jassim Kanoo",
  "Reem Fakhro",
];
const VIEWER = 2;
const MINUTE_MS = 60 * 1000;
const ROUNDS = 7;
const MATCH_MINUTES = 30;
const COURTS = ["Court 1", "Court 2", "Court 3", "Court 4"];

const playerId = (index: number) =>
  `00000000-0000-4000-8000-0000000000${String(index + 10)}`;
const userId = (index: number) =>
  `00000000-0000-4000-9000-0000000000${String(index + 10)}`;

/** Games won by the first pair, then the second, varied but repeatable. */
function scoreFor(round: number, position: number): [number, number] {
  const scores: [number, number][] = [
    [6, 4],
    [5, 6],
    [7, 4],
    [6, 6],
    [3, 6],
    [6, 2],
    [6, 5],
  ];
  return scores[(round * 3 + position) % scores.length] ?? [6, 4];
}

type BoardOptions = {
  isOrganizer: boolean;
  /** Rounds fully confirmed before the one on court. */
  played: number;
  /** The Round on court has its first game confirmed and its third to confirm. */
  liveRound: boolean;
  start: Date;
};

export function americanoPreviewBoard(options: BoardOptions): AmericanoBoard {
  const ids = NAMES.map((_, index) => playerId(index));
  const players = NAMES.map((name, index) => ({
    gamePlayerId: playerId(index),
    userId: userId(index),
    name,
    image: null,
  }));
  const pairings = americanoRounds(ids, ROUNDS);
  const results: AmericanoResult[] = [];
  const rounds: AmericanoBoard["rounds"] = [];
  const memberOf = (id: string) => {
    const index = ids.indexOf(id);
    return { id: userId(index), name: NAMES[index] ?? "", image: null };
  };
  for (let roundNumber = 1; roundNumber <= ROUNDS; roundNumber += 1) {
    const startTime = new Date(
      options.start.getTime() + (roundNumber - 1) * MATCH_MINUTES * MINUTE_MS,
    );
    const live = options.liveRound && roundNumber === options.played + 1;
    const matches = pairings
      .filter((pairing) => pairing.roundNumber === roundNumber)
      .map((pairing) => {
        const matchId = `${roundNumber}-${pairing.position}`;
        const [first, second] = scoreFor(roundNumber, pairing.position);
        const confirmed =
          roundNumber <= options.played || (live && pairing.position === 1);
        const awaiting = live && pairing.position === 3;
        const viewerSlot = pairing.slot1.includes(playerId(VIEWER))
          ? (1 as const)
          : pairing.slot2.includes(playerId(VIEWER))
            ? (2 as const)
            : null;
        if (confirmed) {
          results.push({
            slot1: pairing.slot1,
            slot2: pairing.slot2,
            slot1GamesWon: first,
            slot2GamesWon: second,
          });
        }
        const state = confirmed
          ? ("confirmed" as const)
          : awaiting
            ? ("awaiting_confirmation" as const)
            : live
              ? ("on_court" as const)
              : ("scheduled" as const);
        const liveState =
          state === "on_court" || state === "awaiting_confirmation";
        return {
          matchId,
          position: pairing.position,
          courtName: COURTS[pairing.position - 1] ?? null,
          startTime,
          slot1PlayerIds: [...pairing.slot1],
          slot2PlayerIds: [...pairing.slot2],
          state,
          slot1GamesWon: confirmed || awaiting ? first : null,
          slot2GamesWon: confirmed || awaiting ? second : null,
          enteredBySlot: awaiting ? (1 as const) : null,
          enteredByName: awaiting
            ? (memberOf(pairing.slot1[0]).name ?? null)
            : null,
          standsAt: awaiting
            ? new Date(startTime.getTime() + 40 * MINUTE_MS)
            : null,
          viewerSlot,
          canEnterScore:
            (options.isOrganizer && (liveState || state === "confirmed")) ||
            (viewerSlot != null && liveState),
          canConfirm: awaiting && (options.isOrganizer || viewerSlot === 2),
          canMarkNotFinished:
            liveState && (options.isOrganizer || viewerSlot != null),
        };
      });
    const scored = matches.some((match) => match.slot1GamesWon != null);
    rounds.push({
      roundNumber,
      state:
        roundNumber <= options.played
          ? "played"
          : live
            ? "on_court"
            : "scheduled",
      startTime,
      canSwap: options.isOrganizer && !scored,
      matches,
    });
  }
  const finished = options.played >= ROUNDS;
  return {
    isOrganizer: options.isOrganizer,
    posted: true,
    roundCount: ROUNDS,
    matchMinutes: MATCH_MINUTES,
    viewerGamePlayerId: playerId(VIEWER),
    players,
    rounds,
    currentRoundNumber: finished ? ROUNDS : options.played + 1,
    table: americanoTable(ids, results),
    finished,
  };
}

export function americanoPreviewDetails(options: {
  isOrganizer: boolean;
  taken: number;
  drawn: boolean;
  start: Date;
}): TournamentDetails {
  const base = createTournamentFixtures(options.start).preDrawWithoutSeat;
  const viewerIn = options.taken > VIEWER || options.drawn;
  const registered = NAMES.slice(0, options.taken).map((name, index) => ({
    id: userId(index),
    name,
    image: null,
  }));
  const players = viewerIn
    ? registered
    : registered.filter((player) => player.id !== userId(VIEWER));
  return {
    ...base,
    id: "americano-preview",
    name: "Sunday Social",
    tournamentShape: "americano",
    poolCount: null,
    qualifiersPerPool: null,
    roundCount: ROUNDS,
    matchMinutes: MATCH_MINUTES,
    playersAllowed: 16,
    teamsAllowed: 8,
    pricePerPlayerFils: 3500,
    rated: false,
    ratingScope: "unrated",
    windowStart: options.start,
    windowEnd: new Date(options.start.getTime() + 210 * MINUTE_MS),
    drawPostedAt: options.drawn ? options.start : null,
    registrationClosedAt: options.drawn ? options.start : null,
    createdBy: userId(VIEWER),
    isOrganizer: options.isOrganizer,
    viewerUserId: userId(VIEWER),
    isRegistered: viewerIn,
    isSeated: false,
    isWaitlisted: false,
    canRegister: !viewerIn && players.length < 16,
    canWaitlist: false,
    canLeave: viewerIn && !options.drawn,
    registeredPlayers: players,
    unseatedPlayers: [],
    registeredUserCount: players.length,
    registeredTeamCount: 0,
    sides: [],
    gameTeams: [],
    matches: [],
    poolTables: null,
    knockout: null,
    groupName: "Tuesday Night Padel",
    recordedCourts: COURTS.map((name, index) => ({
      id: `court-${index}`,
      name,
    })),
  };
}
