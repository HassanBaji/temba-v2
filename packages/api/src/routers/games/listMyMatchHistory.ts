import type { DbClient } from "@repo/db";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  gameNotes,
  gameTeams,
  gamePhotos,
  gamePlayers,
  games,
  marks,
  matches,
  ratingEvents,
} from "@repo/db";
import {
  GAME_ALBUM_SLOTS,
  type GameAlbumSummary,
} from "@repo/domain/game-album";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { gamePhotoUrl } from "#src/storage/game-photos";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { matchOutcome } from "@repo/domain/match-outcome";
import {
  outcomeForSlot,
  scoredSetsFromMatch,
  slotMembers,
  userSlotOnMatch,
  type MatchSlotMember,
} from "@repo/domain/match-slots";
import { gameListTime, isGameLive } from "#src/home/upcoming-games";
import { sportOrDefault, type Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";
import {
  gameRatingScope,
  type GameRatingScope,
} from "@repo/domain/game-rating-scope";
import { MARK_KINDS, type MarkKind } from "@repo/domain/marks";
import type { MyTournament } from "@repo/domain/hub-game-row";
import { hasKnockout, hasPools } from "@repo/domain/tournament-rounds";
import { isKingOfTheCourt } from "@repo/domain/tournament-king";
import {
  kingPlayedSummary,
  type KingPlayedSummary,
} from "@repo/domain/tournament-king-view";
import {
  myTournamentFromRow,
  queryHubGames,
  type HubQueryRow,
} from "#src/games/helpers/hub-list";

export type MatchHistoryMember = MatchSlotMember;

export type MatchHistoryRow = {
  id: string;
  name: string | null;
  hasCustomName: boolean;
  windowStart: Date | null;
  windowEnd: Date | null;
  format: string;
  sport: Sport;
  venue: { name: string };
  displayTime: Date;
  matchId: string;
  groupName: string | null;
  slot1Members: MatchHistoryMember[];
  slot2Members: MatchHistoryMember[];
  scoredSets: { slot1GamesWon: number; slot2GamesWon: number }[];
  /** Slot the signed-in User sat on, so cards can read scores as us-vs-them. */
  viewerSlot: 1 | 2;
  outcome: "won" | "lost" | "draw";
  rated: boolean;
  ratingScope: GameRatingScope;
  /** The kinds of Mark the viewer received on this Match, most received first. */
  viewerMarks: MarkKind[];
  /** The viewer is this Game's settled MVP. */
  viewerIsMvp: boolean;
  /**
   * What this Match moved the viewer's Temba Level, when it counted for it.
   * Null on a tier Game or an Unrated Game, which never move a Level.
   */
  levelMove: { muBefore: number; muAfter: number } | null;
  /**
   * Set when `groupTournaments` folds a Groups only tournament into one row:
   * the row's Match fields are its latest scored Match (ADR-0074).
   */
  myTournament: MyTournament | null;
  /**
   * Set on a King of the court row, which `kingOfTheCourt` asks for: it has
   * no Match, so its Match fields are empty and `matchId` is the Game id.
   */
  kingOfTheCourt?: KingPlayedSummary | null;
  /** The Game's Album thumbnails and the notes the viewer can read; set by the Played list. */
  album?: GameAlbumSummary;
};

type HistoryRowWithoutMarks = Omit<
  MatchHistoryRow,
  "viewerMarks" | "levelMove"
>;

const DEFAULT_PAGE_SIZE = 20;

const historyPageInput = z
  .object({
    limit: z.number().int().min(1).max(100).default(DEFAULT_PAGE_SIZE),
    sport: sportSchema.optional(),
    /** One row per Groups only tournament, once it is no longer live (ADR-0074). */
    groupTournaments: z.boolean().optional(),
    /** Also list King of the court Games the viewer played, one row each. */
    kingOfTheCourt: z.boolean().optional(),
    cursor: z
      .object({ displayTime: z.date(), matchId: z.string().uuid() })
      .optional(),
  })
  .optional();

export type MatchHistoryPage = z.infer<typeof historyPageInput>;

/**
 * Past Matches the signed-in User sat on via a completed Match slot.
 * Soft-archived Club Group Games are included when they otherwise qualify.
 * Friendly games appear once the Game is no longer live, one row per Game.
 * Friendly tournament Pool Matches appear as they complete, one row each,
 * unless `groupTournaments` asks for one row per Groups only tournament.
 * Americano is excluded this slice.
 */
export async function listMyMatchHistoryRows(
  database: DbClient,
  userId: string,
  now: Date = new Date(),
  page?: MatchHistoryPage,
  locale: Locale = DEFAULT_LOCALE,
): Promise<MatchHistoryRow[]> {
  const myPlayerRows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.userId, userId),
    columns: { id: true },
    with: {
      gameTeamPlayers: {
        columns: { gameTeamId: true },
      },
    },
  });
  const myGameTeamIds = [
    ...new Set(
      myPlayerRows.flatMap((row) =>
        row.gameTeamPlayers.map((link) => link.gameTeamId),
      ),
    ),
  ];
  if (myGameTeamIds.length === 0) {
    return [];
  }

  const kingRows =
    page?.kingOfTheCourt === true
      ? await kingOfTheCourtRows(
          database,
          userId,
          myGameTeamIds,
          now,
          page,
          locale,
        )
      : [];

  const completedMatches = await database.query.matches.findMany({
    where: and(
      eq(matches.status, MatchStatusEnum.COMPLETED),
      or(
        inArray(matches.slot1GameTeamId, myGameTeamIds),
        inArray(matches.slot2GameTeamId, myGameTeamIds),
      ),
    ),
    columns: {
      id: true,
      startTime: true,
      createdAt: true,
      slot1GameTeamId: true,
      slot2GameTeamId: true,
    },
    with: {
      game: {
        columns: {
          id: true,
          name: true,
          hasCustomName: true,
          format: true,
          sport: true,
          groupId: true,
          poolCount: true,
          tournamentShape: true,
          cancelledAt: true,
          windowStart: true,
          windowEnd: true,
          createdAt: true,
          rated: true,
          groupRated: true,
          mvpUserId: true,
          mvpSettledAt: true,
        },
        with: {
          group: {
            columns: { name: true },
          },
          venue: {
            columns: { name: true },
          },
          matches: {
            columns: {
              startTime: true,
              status: true,
            },
          },
        },
      },
      sets: {
        columns: {
          slot1GamesWon: true,
          slot2GamesWon: true,
        },
        orderBy: (table, { asc }) => [asc(table.setNumber)],
      },
      slot1GameTeam: {
        with: {
          players: {
            with: {
              gamePlayer: {
                with: {
                  user: {
                    columns: {
                      id: true,
                      name: true,
                      image: true,
                      guestAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      slot2GameTeam: {
        with: {
          players: {
            with: {
              gamePlayer: {
                with: {
                  user: {
                    columns: {
                      id: true,
                      name: true,
                      image: true,
                      guestAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const byGameId = new Map<string, typeof completedMatches>();
  for (const match of completedMatches) {
    if (!match.game) {
      continue;
    }
    const list = byGameId.get(match.game.id) ?? [];
    list.push(match);
    byGameId.set(match.game.id, list);
  }

  const rows: HistoryRowDraft[] = [...kingRows];
  for (const gameMatches of byGameId.values()) {
    const game = gameMatches[0]?.game;
    if (!game) {
      continue;
    }
    if (game.format === "americano") {
      continue;
    }
    if (
      game.format !== "friendly_game" &&
      game.format !== "friendly_tournament"
    ) {
      continue;
    }
    if (game.cancelledAt != null) {
      continue;
    }
    const sport = sportOrDefault(game.sport);
    if (page?.sport && page.sport !== sport) {
      continue;
    }
    const grouped =
      page?.groupTournaments === true &&
      hasPools(game.format, game.poolCount) &&
      !hasKnockout(game.format, game.tournamentShape);
    if (
      (game.format === "friendly_game" || grouped) &&
      isGameLive(
        {
          id: game.id,
          groupId: game.groupId,
          cancelledAt: game.cancelledAt,
          windowStart: game.windowStart,
          windowEnd: game.windowEnd,
          createdAt: game.createdAt,
          format: game.format,
          matches: game.matches,
        },
        now,
      )
    ) {
      continue;
    }

    const myTeams = new Set(myGameTeamIds);
    const candidates: {
      match: (typeof gameMatches)[number];
      userSlot: 1 | 2;
      outcome: "won" | "lost" | "draw";
      displayTime: Date;
    }[] = [];
    for (const match of gameMatches) {
      const userSlot = userSlotOnMatch(match, myTeams);
      if (userSlot == null) {
        continue;
      }
      const outcome = outcomeForSlot(userSlot, matchOutcome(match.sets).result);
      if (outcome == null) {
        continue;
      }
      candidates.push({
        match,
        userSlot,
        outcome,
        displayTime: match.startTime ?? gameListTime(game),
      });
    }
    candidates.sort((a, b) => {
      const timeDelta = b.displayTime.getTime() - a.displayTime.getTime();
      if (timeDelta !== 0) {
        return timeDelta;
      }
      return b.match.createdAt.getTime() - a.match.createdAt.getTime();
    });
    const chosenMatches =
      game.format === "friendly_tournament" && !grouped
        ? candidates
        : candidates.slice(0, 1);
    const venueName = game.venue?.name;
    if (!venueName) {
      continue;
    }
    for (const chosen of chosenMatches) {
      rows.push({
        id: game.id,
        name: game.name,
        hasCustomName: game.hasCustomName,
        windowStart: game.windowStart,
        windowEnd: game.windowEnd,
        format: game.format,
        sport,
        venue: { name: venueName },
        displayTime: chosen.displayTime,
        matchId: chosen.match.id,
        groupName: game.group?.name ?? null,
        slot1Members: slotMembers(chosen.match.slot1GameTeam, userId),
        slot2Members: slotMembers(chosen.match.slot2GameTeam, userId),
        scoredSets: scoredSetsFromMatch(chosen.match.sets),
        viewerSlot: chosen.userSlot,
        outcome: chosen.outcome,
        rated: game.rated,
        ratingScope: gameRatingScope(game),
        viewerIsMvp: game.mvpSettledAt != null && game.mvpUserId === userId,
        groupedTournament: grouped,
      });
    }
  }

  rows.sort((a, b) => {
    const timeDelta = b.displayTime.getTime() - a.displayTime.getTime();
    if (timeDelta !== 0) {
      return timeDelta;
    }
    return a.matchId < b.matchId ? 1 : a.matchId > b.matchId ? -1 : 0;
  });

  const pageRows = pageOf(rows, page);
  return withLevelMoves(
    database,
    userId,
    await withViewerMarks(
      database,
      userId,
      await withMyTournaments(database, userId, locale, pageRows),
    ),
  );
}

type HistoryRowDraft = Omit<HistoryRowWithoutMarks, "myTournament"> & {
  groupedTournament: boolean;
};

/**
 * King of the court has no Matches, so each Game the viewer played is one row
 * of its own once its final order is posted or its window has passed.
 */
async function kingOfTheCourtRows(
  database: DbClient,
  userId: string,
  myGameTeamIds: readonly string[],
  now: Date,
  page: MatchHistoryPage,
  locale: Locale,
): Promise<HistoryRowDraft[]> {
  const links = await database.query.gameTeams.findMany({
    where: inArray(gameTeams.id, [...myGameTeamIds]),
    columns: { gameId: true },
    with: {
      game: {
        columns: {
          id: true,
          format: true,
          tournamentShape: true,
          drawPostedAt: true,
          cancelledAt: true,
        },
      },
    },
  });
  const gameIds = [
    ...new Set(
      links.flatMap((link) =>
        link.game &&
        isKingOfTheCourt(link.game.format, link.game.tournamentShape) &&
        link.game.drawPostedAt != null &&
        link.game.cancelledAt == null
          ? [link.game.id]
          : [],
      ),
    ),
  ];
  if (gameIds.length === 0) {
    return [];
  }
  const kingGames = await database.query.games.findMany({
    where: inArray(games.id, gameIds),
    with: {
      group: { columns: { name: true } },
      venue: { columns: { name: true } },
      teams: {
        with: {
          players: {
            with: {
              gamePlayer: {
                with: {
                  user: {
                    columns: {
                      id: true,
                      name: true,
                      image: true,
                      guestAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return kingGames.flatMap((game): HistoryRowDraft[] => {
    const over =
      game.finalOrderPostedAt != null ||
      (game.windowEnd != null && game.windowEnd.getTime() < now.getTime());
    if (!over || !game.venue) {
      return [];
    }
    if (page?.sport && page.sport !== sportOrDefault(game.sport)) {
      return [];
    }
    const summary = kingPlayedSummary(
      {
        teamsAllowed: game.teamsAllowed,
        viewerUserId: userId,
        finalOrderPostedAt: game.finalOrderPostedAt,
        gameTeams: game.teams.map((team) => ({
          id: team.id,
          sideIndex: team.sideIndex,
          startCourt: team.startCourt,
          finalPlace: team.finalPlace,
          members: slotMembers(team, userId),
        })),
      },
      locale,
    );
    const viewerTeam = game.teams.find((team) =>
      team.players.some((link) => link.gamePlayer?.user?.id === userId),
    );
    if (!summary || !viewerTeam) {
      return [];
    }
    return [
      {
        id: game.id,
        name: game.name,
        hasCustomName: game.hasCustomName,
        windowStart: game.windowStart,
        windowEnd: game.windowEnd,
        format: game.format,
        sport: sportOrDefault(game.sport),
        venue: { name: game.venue.name },
        displayTime: game.windowStart ?? game.createdAt,
        matchId: game.id,
        groupName: game.group?.name ?? null,
        slot1Members: slotMembers(viewerTeam, userId),
        slot2Members: [],
        scoredSets: [],
        viewerSlot: 1,
        outcome: "draw",
        rated: false,
        ratingScope: gameRatingScope({ rated: false, groupRated: false }),
        viewerIsMvp: false,
        groupedTournament: false,
        kingOfTheCourt: summary,
      },
    ];
  });
}

async function withMyTournaments(
  database: DbClient,
  userId: string,
  locale: Locale,
  rows: HistoryRowDraft[],
): Promise<HistoryRowWithoutMarks[]> {
  const gameIds = rows.flatMap((row) =>
    row.groupedTournament ? [row.id] : [],
  );
  const hubRows =
    gameIds.length === 0
      ? []
      : ((await queryHubGames(
          database,
          inArray(games.id, gameIds),
        )) as HubQueryRow[]);
  const byGameId = new Map(
    hubRows.map((row) => [row.id, myTournamentFromRow(row, userId, locale)]),
  );
  return rows.map(({ groupedTournament, ...row }) => ({
    ...row,
    myTournament: groupedTournament ? (byGameId.get(row.id) ?? null) : null,
  }));
}

function pageOf<Row extends { displayTime: Date; matchId: string }>(
  rows: Row[],
  page: MatchHistoryPage,
): Row[] {
  if (!page) {
    return rows;
  }
  const { cursor, limit } = page;
  const start = cursor
    ? rows.findIndex(
        (row) =>
          row.displayTime.getTime() < cursor.displayTime.getTime() ||
          (row.displayTime.getTime() === cursor.displayTime.getTime() &&
            row.matchId < cursor.matchId),
      )
    : 0;
  if (start === -1) {
    return [];
  }
  return rows.slice(start, start + limit);
}

async function withViewerMarks(
  database: DbClient,
  userId: string,
  rows: HistoryRowWithoutMarks[],
): Promise<Omit<MatchHistoryRow, "levelMove">[]> {
  const received =
    rows.length === 0
      ? []
      : await database.query.marks.findMany({
          where: and(
            eq(marks.receiverUserId, userId),
            inArray(
              marks.matchId,
              rows.map((row) => row.matchId),
            ),
          ),
          columns: { matchId: true, kind: true },
        });
  const countsByMatch = new Map<string, Map<MarkKind, number>>();
  for (const mark of received) {
    const counts =
      countsByMatch.get(mark.matchId) ?? new Map<MarkKind, number>();
    counts.set(mark.kind, (counts.get(mark.kind) ?? 0) + 1);
    countsByMatch.set(mark.matchId, counts);
  }
  return rows.map((row) => ({
    ...row,
    viewerMarks: [...(countsByMatch.get(row.matchId) ?? [])]
      .sort(
        ([leftKind, leftCount], [rightKind, rightCount]) =>
          rightCount - leftCount ||
          MARK_KINDS.indexOf(leftKind) - MARK_KINDS.indexOf(rightKind),
      )
      .map(([kind]) => kind),
  }));
}

async function withLevelMoves(
  database: DbClient,
  userId: string,
  rows: Omit<MatchHistoryRow, "levelMove">[],
): Promise<MatchHistoryRow[]> {
  const events =
    rows.length === 0
      ? []
      : await database.query.ratingEvents.findMany({
          where: and(
            eq(ratingEvents.userId, userId),
            inArray(
              ratingEvents.matchId,
              rows.map((row) => row.matchId),
            ),
          ),
          columns: { matchId: true, muBefore: true, muAfter: true },
        });
  const byMatch = new Map(
    events.map((event) => [
      event.matchId,
      { muBefore: event.muBefore, muAfter: event.muAfter },
    ]),
  );
  return rows.map((row) => ({
    ...row,
    levelMove: byMatch.get(row.matchId) ?? null,
  }));
}

/** Each row's Album: up to six photos oldest first, and the public notes plus the viewer's own. */
export async function withAlbumSummaries(
  database: DbClient,
  userId: string,
  rows: MatchHistoryRow[],
): Promise<MatchHistoryRow[]> {
  const gameIds = [...new Set(rows.map((row) => row.id))];
  if (gameIds.length === 0) {
    return rows;
  }
  const [photos, notes] = await Promise.all([
    database.query.gamePhotos.findMany({
      where: inArray(gamePhotos.gameId, gameIds),
      columns: { id: true, gameId: true },
      orderBy: [asc(gamePhotos.createdAt), asc(gamePhotos.id)],
    }),
    database.query.gameNotes.findMany({
      where: and(
        inArray(gameNotes.gameId, gameIds),
        or(
          eq(gameNotes.visibility, "public"),
          eq(gameNotes.authorUserId, userId),
        ),
      ),
      columns: { gameId: true },
    }),
  ]);
  const summaries = new Map<string, GameAlbumSummary>(
    gameIds.map((id) => [id, { photoUrls: [], photoCount: 0, noteCount: 0 }]),
  );
  for (const photo of photos) {
    const summary = summaries.get(photo.gameId)!;
    summary.photoCount += 1;
    if (summary.photoUrls.length < GAME_ALBUM_SLOTS) {
      summary.photoUrls.push(gamePhotoUrl(photo.gameId, photo.id));
    }
  }
  for (const note of notes) {
    summaries.get(note.gameId)!.noteCount += 1;
  }
  return rows.map((row) => ({ ...row, album: summaries.get(row.id) }));
}

export const listMyMatchHistory = protectedProcedure
  .input(historyPageInput)
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return withAlbumSummaries(
      ctx.db,
      appUser.id,
      await listMyMatchHistoryRows(
        ctx.db,
        appUser.id,
        new Date(),
        input,
        ctx.locale,
      ),
    );
  });
