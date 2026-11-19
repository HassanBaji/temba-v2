import { and, asc, eq, inArray, lt } from "drizzle-orm";
import { z } from "zod";

import {
  courts,
  gamePlayers,
  games,
  gameTeams,
  liveBoardTvs,
  matches,
  matchGoals,
  MatchStatusEnum,
  matchSets,
  ratings,
} from "@repo/db";
import { gameDisplayName } from "@repo/domain/game-custom-name";
import { gameRatingScope } from "@repo/domain/game-rating-scope";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import {
  liveBoardKind,
  type FootballBoardContent,
  type FootballBoardRole,
  type FootballBoardSide,
  type LiveBoardContent,
  type LiveBoardMatch,
  type LiveBoardRound,
  type LiveBoardRoundMark,
  type LiveBoardTable,
  type PadelBoardPlayer,
  type PadelMatchBoardContent,
  type SocialBoardContent,
} from "@repo/domain/live-board";
import { matchOutcome } from "@repo/domain/match-outcome";
import { computePoolTables } from "@repo/domain/pool-table";
import { americanoTable, isAmericano } from "@repo/domain/tournament-americano";
import {
  tournamentMatchState,
  tournamentRoundState,
} from "@repo/domain/tournament-round-state";
import { tournamentMatchMinutes } from "@repo/domain/tournament-sizing";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type db } from "#src/db";
import { type GameRow } from "#src/games/access";
import {
  americanoDayFinished,
  americanoMatchState,
  americanoResults,
  loadAmericanoMatches,
  loadAmericanoPlayers,
} from "#src/games/americano-matches";
import {
  footballMatch,
  footballScoreOf,
  footballScoreSet,
  footballSides,
} from "#src/games/football-lineup";
import { listGameSides } from "#src/games/seats";
import {
  loadTournamentRoundContext,
  type PostedPoolMatch,
} from "#src/games/tournament-round-context";
import {
  isBoardOpenForGame,
  LIVE_BOARD_TV_SEEN_WITHIN_MS,
  liveBoardFollowUrl,
} from "#src/live-boards/boards";
import { publicProcedure } from "#src/trpc";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function lastCompletedAt(rows: readonly { completedAt: Date | null }[]) {
  const times = rows.flatMap((row) =>
    row.completedAt ? [row.completedAt.getTime()] : [],
  );
  return times.length > 0 ? new Date(Math.max(...times)) : null;
}

function emptySocial(
  game: GameRow,
  ranks: SocialBoardContent["ranks"],
): SocialBoardContent {
  return {
    kind: "social",
    ranks,
    roundCount: game.roundCount ?? 0,
    matchMinutes: tournamentMatchMinutes(game.matchMinutes),
    rounds: [],
    tables: [],
    finished: false,
    finishedAt: null,
  };
}

function roundMark(
  outcome: "slot1" | "slot2" | "draw" | "none",
  slot: 1 | 2,
): LiveBoardRoundMark {
  if (outcome === "none") {
    return "none";
  }
  if (outcome === "draw") {
    return "drawn";
  }
  return (outcome === "slot1") === (slot === 1) ? "won" : "lost";
}

async function poolSocialContent(
  database: DbClient,
  game: GameRow,
  now: Date,
  locale: Locale,
): Promise<SocialBoardContent> {
  if (game.drawPostedAt == null) {
    return emptySocial(game, "teams");
  }
  const [context, teamRows] = await Promise.all([
    loadTournamentRoundContext(database, game),
    database.query.gameTeams.findMany({
      where: eq(gameTeams.gameId, game.id),
      with: {
        players: {
          with: {
            gamePlayer: {
              with: { user: { columns: { id: true, name: true } } },
            },
          },
        },
      },
    }),
  ]);
  const teams = teamRows.map((row) => ({
    id: row.id,
    name: row.name,
    sideIndex: row.sideIndex,
    poolIndex: row.poolIndex,
    members: [...row.players]
      .sort((left, right) =>
        (left.position ?? "").localeCompare(right.position ?? ""),
      )
      .flatMap((link) =>
        link.gamePlayer.user
          ? [{ id: link.gamePlayer.user.id, name: link.gamePlayer.user.name }]
          : [],
      ),
  }));
  const playersOf = new Map(
    teams.map((team) => [
      team.id,
      team.members.length > 0
        ? team.members.map((member) => member.name)
        : [team.name ?? ""],
    ]),
  );
  const side = (gameTeamId: string | null) => ({
    id: gameTeamId ?? "",
    players: playersOf.get(gameTeamId ?? "") ?? [],
  });

  const posted = [...context.posted.values()].flat();
  const courtIds = [
    ...new Set(
      posted.flatMap((match) => (match.courtId ? [match.courtId] : [])),
    ),
  ];
  const courtRows =
    courtIds.length === 0
      ? []
      : await database.query.courts.findMany({
          where: inArray(courts.id, courtIds),
          columns: { id: true, name: true },
        });
  const courtName = new Map(courtRows.map((court) => [court.id, court.name]));

  const boardMatch = (match: PostedPoolMatch): LiveBoardMatch => ({
    id: match.id,
    courtName: match.courtId ? (courtName.get(match.courtId) ?? null) : null,
    startTime: match.startTime,
    state: tournamentMatchState({
      status: match.status,
      notFinishedAt: match.notFinishedAt,
      hasResult: matchOutcome(match.sets).result !== "none",
      startTime: match.startTime,
      now,
    }),
    side1: side(match.slot1GameTeamId),
    side2: side(match.slot2GameTeamId),
    score1: match.sets[0]?.slot1GamesWon ?? null,
    score2: match.sets[0]?.slot2GamesWon ?? null,
  });

  const rounds: LiveBoardRound[] = [];
  for (
    let roundNumber = 1;
    roundNumber <= context.roundCount;
    roundNumber += 1
  ) {
    const inRound = context.posted.get(roundNumber) ?? [];
    const roundMatches = inRound.map(boardMatch);
    rounds.push({
      roundNumber,
      state: tournamentRoundState({
        draftCount: 0,
        matchStates: roundMatches.map((match) => match.state),
      }),
      startTime:
        context.slots.get(roundNumber)?.[0]?.startTime ??
        inRound[0]?.startTime ??
        null,
      matches: roundMatches,
    });
  }

  const computed = computePoolTables({
    format: game.format,
    poolCount: game.poolCount,
    viewerUserId: "",
    locale,
    storedRoundCount: game.roundCount,
    gameTeams: teams,
    matches: posted,
  });
  const games = new Map<string, { won: number; lost: number }>();
  for (const match of posted) {
    const set = match.sets[0];
    if (
      match.status !== MatchStatusEnum.COMPLETED ||
      set?.slot1GamesWon == null ||
      set.slot2GamesWon == null
    ) {
      continue;
    }
    for (const [id, won, lost] of [
      [match.slot1GameTeamId, set.slot1GamesWon, set.slot2GamesWon],
      [match.slot2GameTeamId, set.slot2GamesWon, set.slot1GamesWon],
    ] as const) {
      if (!id) {
        continue;
      }
      const sum = games.get(id) ?? { won: 0, lost: 0 };
      games.set(id, { won: sum.won + won, lost: sum.lost + lost });
    }
  }
  const single = (computed?.pools.length ?? 0) === 1;
  const tables: LiveBoardTable[] = (computed?.pools ?? []).map((pool) => ({
    poolIndex: single ? null : pool.poolIndex,
    rows: pool.rows.map((row) => ({
      id: row.gameTeamId,
      players: playersOf.get(row.gameTeamId) ?? [],
      place: row.position,
      played: row.played ?? 0,
      won: row.won ?? 0,
      drawn: row.drawn ?? 0,
      lost: row.lost ?? 0,
      gamesFor: games.get(row.gameTeamId)?.won ?? 0,
      gamesAgainst: games.get(row.gameTeamId)?.lost ?? 0,
      difference: row.gamesDifference ?? 0,
      points: row.points ?? 0,
      rounds: rounds.map((round) => {
        const played = pool.matches.find(
          (match) =>
            match.roundNumber === round.roundNumber &&
            !match.cancelled &&
            (match.slot1GameTeamId === row.gameTeamId ||
              match.slot2GameTeamId === row.gameTeamId),
        );
        return played
          ? roundMark(
              played.outcome,
              played.slot1GameTeamId === row.gameTeamId ? 1 : 2,
            )
          : "none";
      }),
    })),
  }));

  const finished = computed?.finished ?? false;
  return {
    kind: "social",
    ranks: "teams",
    roundCount: context.roundCount,
    matchMinutes: tournamentMatchMinutes(game.matchMinutes),
    rounds,
    tables,
    finished,
    finishedAt: finished ? lastCompletedAt(posted) : null,
  };
}

async function americanoSocialContent(
  database: DbClient,
  game: GameRow,
  now: Date,
): Promise<SocialBoardContent> {
  const [players, rows] = await Promise.all([
    loadAmericanoPlayers(database, game.id),
    loadAmericanoMatches(database, game.id),
  ]);
  if (game.drawPostedAt == null || rows.length === 0) {
    return emptySocial(game, "players");
  }
  const nameOf = new Map(
    players.map((player) => [player.gamePlayerId, player.name]),
  );
  const side = (playerIds: readonly string[]) => ({
    id: playerIds.join("+"),
    players: playerIds.map((id) => nameOf.get(id) ?? ""),
  });

  const roundNumbers = [...new Set(rows.map((row) => row.roundNumber))].sort(
    (left, right) => left - right,
  );
  const rounds: LiveBoardRound[] = roundNumbers.map((roundNumber) => {
    const inRound = rows.filter((row) => row.roundNumber === roundNumber);
    const roundMatches: LiveBoardMatch[] = inRound.map((row) => ({
      id: row.id,
      courtName: row.court?.name ?? null,
      startTime: row.startTime,
      state: americanoMatchState(row, now),
      side1: side(row.slot1),
      side2: side(row.slot2),
      score1: row.sets[0]?.slot1GamesWon ?? null,
      score2: row.sets[0]?.slot2GamesWon ?? null,
    }));
    return {
      roundNumber,
      state: tournamentRoundState({
        draftCount: 0,
        matchStates: roundMatches.map((match) => match.state),
      }),
      startTime: inRound[0]?.startTime ?? null,
      matches: roundMatches,
    };
  });

  const markFor = (playerId: string, roundNumber: number) => {
    const row = rows.find(
      (match) =>
        match.roundNumber === roundNumber &&
        (match.slot1.includes(playerId) || match.slot2.includes(playerId)),
    );
    if (row?.status !== MatchStatusEnum.COMPLETED) {
      return "none" as const;
    }
    return roundMark(
      matchOutcome(row.sets).result,
      row.slot1.includes(playerId) ? 1 : 2,
    );
  };
  const table = americanoTable(
    players.map((player) => player.gamePlayerId),
    americanoResults(rows),
  );
  const finished = americanoDayFinished(rows);
  return {
    kind: "social",
    ranks: "players",
    roundCount: game.roundCount ?? rounds.length,
    matchMinutes: tournamentMatchMinutes(game.matchMinutes),
    rounds,
    tables: [
      {
        poolIndex: null,
        rows: table.map((row) => ({
          id: row.playerId,
          players: [nameOf.get(row.playerId) ?? ""],
          place: row.place,
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          gamesFor: row.gamesWon,
          gamesAgainst: row.gamesLost,
          difference: row.difference,
          points: row.gamesWon,
          rounds: roundNumbers.map((roundNumber) =>
            markFor(row.playerId, roundNumber),
          ),
        })),
      },
    ],
    finished,
    finishedAt: finished ? lastCompletedAt(rows) : null,
  };
}

async function padelMatchContent(
  database: DbClient,
  game: GameRow,
): Promise<PadelMatchBoardContent> {
  const [sides, match] = await Promise.all([
    listGameSides(database, game),
    database.query.matches.findFirst({
      where: eq(matches.gameId, game.id),
      orderBy: asc(matches.createdAt),
      with: {
        sets: {
          columns: { slot1GamesWon: true, slot2GamesWon: true },
          orderBy: asc(matchSets.setNumber),
        },
        court: { columns: { name: true } },
      },
    }),
  ]);
  const seated = sides.flatMap((side) =>
    [side.left, side.right].flatMap((seat) => (seat ? [seat.userId] : [])),
  );
  const bandRows =
    seated.length === 0
      ? []
      : await database.query.ratings.findMany({
          where: and(
            inArray(ratings.userId, seated),
            eq(ratings.sport, "padel"),
          ),
          columns: { userId: true, levelBand: true },
        });
  const bandOf = new Map(
    bandRows.map((row) => [
      row.userId,
      displayLabelFromStoredBand(row.levelBand),
    ]),
  );
  const playersOn = (sideIndex: number): PadelBoardPlayer[] => {
    const side = sides.find((row) => row.sideIndex === sideIndex);
    return [side?.left, side?.right].flatMap((seat) =>
      seat
        ? [{ name: seat.name, levelBand: bandOf.get(seat.userId) ?? null }]
        : [],
    );
  };
  // The scoreboard lists side 1 first; a Match that seats side 2 in its
  // first slot has its Sets turned round to match.
  const turned =
    match?.slot1GameTeamId != null &&
    match.slot1GameTeamId ===
      sides.find((side) => side.sideIndex === 2)?.gameTeamId;
  return {
    kind: "padel_match",
    sides: [playersOn(1), playersOn(2)],
    // A Friendly game is created with empty Set shells: only a saved Set shows.
    sets: (match?.sets ?? [])
      .filter((set) => set.slot1GamesWon != null && set.slot2GamesWon != null)
      .map((set) =>
        turned
          ? { score1: set.slot2GamesWon, score2: set.slot1GamesWon }
          : { score1: set.slot1GamesWon, score2: set.slot2GamesWon },
      ),
    completed: match?.status === MatchStatusEnum.COMPLETED,
    courtName: match?.court?.name ?? null,
    ratingScope: gameRatingScope(game),
  };
}

const FOOTBALL_ROLE_ORDER: Record<FootballBoardRole, number> = {
  gk: 0,
  def: 1,
  mid: 2,
  fwd: 3,
};

async function footballContent(
  database: DbClient,
  game: GameRow,
): Promise<FootballBoardContent> {
  const [sideRows, match, roster] = await Promise.all([
    footballSides(database, game.id),
    footballMatch(database, game.id),
    database.query.gamePlayers.findMany({
      where: eq(gamePlayers.gameId, game.id),
      columns: {
        userId: true,
        footballRole: true,
        footballPosition: true,
        kickoffFootballRole: true,
      },
      with: {
        user: { columns: { id: true, name: true } },
        gameTeamPlayers: { columns: { gameTeamId: true } },
      },
      orderBy: asc(gamePlayers.createdAt),
    }),
  ]);
  const court = match?.courtId
    ? await database.query.courts.findFirst({
        where: eq(courts.id, match.courtId),
        columns: { name: true },
      })
    : null;
  const base = {
    kind: "football" as const,
    completed: match?.status === MatchStatusEnum.COMPLETED,
    courtName: court?.name ?? null,
    sideSize: game.sideSize,
    playersAllowed: game.playersAllowed,
    hasMvp: game.mvpMode !== "none",
    mvpName:
      game.mvpSettledAt && game.mvpUserId
        ? (roster.find((row) => row.userId === game.mvpUserId)?.user?.name ??
          null)
        : null,
  };
  if (!sideRows.slot1 || !sideRows.slot2 || !match) {
    return { ...base, sides: null };
  }

  const [score, goals] = await Promise.all([
    footballScoreSet(database, match.id).then(footballScoreOf),
    database.query.matchGoals.findMany({
      where: eq(matchGoals.matchId, match.id),
      columns: { userId: true, goals: true },
    }),
  ]);
  const goalsOf = new Map(goals.map((row) => [row.userId, row.goals]));
  const side = (
    row: { id: string; bib: string | null },
    sideGoals: number | null,
  ): FootballBoardSide => {
    const players = roster
      .filter(
        (player) =>
          player.user &&
          player.gameTeamPlayers.some((link) => link.gameTeamId === row.id),
      )
      .map((player) => {
        const keeper =
          (player.kickoffFootballRole ?? player.footballRole) === "keeper";
        const role: FootballBoardRole | null = keeper
          ? "gk"
          : player.footballPosition;
        return {
          userId: player.user!.id,
          name: player.user!.name,
          role,
        };
      })
      .sort(
        (left, right) =>
          (left.role ? FOOTBALL_ROLE_ORDER[left.role] : 4) -
          (right.role ? FOOTBALL_ROLE_ORDER[right.role] : 4),
      );
    return {
      bib: row.bib,
      goals: sideGoals,
      players: players.map(({ name, role }) => ({ name, role })),
      scorers: players.flatMap((player) => {
        const scored = goalsOf.get(player.userId);
        return scored ? [{ name: player.name, goals: scored }] : [];
      }),
    };
  };
  return {
    ...base,
    sides: [
      side(sideRows.slot1, score?.slot1 ?? null),
      side(sideRows.slot2, score?.slot2 ?? null),
    ],
  };
}

async function liveBoardContent(
  database: DbClient,
  game: GameRow,
  now: Date,
  locale: Locale,
): Promise<LiveBoardContent | null> {
  const kind = liveBoardKind(game);
  if (kind === "football") {
    return footballContent(database, game);
  }
  if (kind === "padel_match") {
    return padelMatchContent(database, game);
  }
  if (kind === "social") {
    return isAmericano(game.format, game.tournamentShape)
      ? americanoSocialContent(database, game, now)
      : poolSocialContent(database, game, now, locale);
  }
  return null;
}

/** How stale a TV's last-seen time may get before a read writes it again. */
const TV_SEEN_WRITE_EVERY_MS = LIVE_BOARD_TV_SEEN_WITHIN_MS / 3;

/**
 * What one TV draws, read every few seconds with the token it was given.
 * View only: names, Level bands and scores, never a phone number. A board
 * that was stopped, closed or taken off this TV says so and sends nothing
 * else. Reading also marks the TV as still there.
 */
export async function liveBoardSnapshot(
  database: DbClient,
  args: { token: string; origin: string; locale?: Locale; now?: Date },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const tv = await database.query.liveBoardTvs.findFirst({
    where: eq(liveBoardTvs.token, args.token),
    with: { board: true },
  });
  if (!tv || tv.disconnectedAt) {
    return { status: "disconnected" as const };
  }
  if (tv.board.stoppedAt) {
    return { status: "stopped" as const };
  }
  const game = await database.query.games.findFirst({
    where: eq(games.id, tv.board.gameId),
    with: {
      group: { columns: { name: true } },
      venue: { columns: { name: true } },
    },
  });
  const content =
    game && isBoardOpenForGame(tv.board, game, now)
      ? await liveBoardContent(database, game, now, locale)
      : null;
  if (!game || !content) {
    return { status: "closed" as const };
  }

  await database
    .update(liveBoardTvs)
    .set({ lastSeenAt: now })
    .where(
      and(
        eq(liveBoardTvs.id, tv.id),
        lt(
          liveBoardTvs.lastSeenAt,
          new Date(now.getTime() - TV_SEEN_WRITE_EVERY_MS),
        ),
      ),
    );

  const { board } = tv;
  return {
    status: "live" as const,
    serverNow: now,
    game: {
      name: gameDisplayName(game, locale),
      groupName: game.group?.name ?? null,
      venueName: game.venue.name,
      sport: game.sport,
      windowStart: game.windowStart,
      windowEnd: game.windowEnd,
      followUrl: liveBoardFollowUrl(args.origin, game.id),
    },
    settings: {
      rotate: board.rotate,
      rotateSeconds: board.rotateSeconds,
      heldScreen: board.heldScreen,
      rotationStartedAt: board.rotationStartedAt,
      theme: board.theme,
      showQr: board.showQr,
      message: board.messageShown ? board.message : null,
    },
    content,
  };
}

export const snapshotProcedure = publicProcedure
  .input(z.object({ token: z.string().min(16).max(64) }))
  .query(({ ctx, input }) =>
    liveBoardSnapshot(ctx.db, {
      token: input.token,
      origin: ctx.webOrigin,
      locale: ctx.locale,
    }),
  );
