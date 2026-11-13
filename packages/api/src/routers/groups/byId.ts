import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  ne,
} from "drizzle-orm";
import { z } from "zod";

import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import {
  games,
  groupJoinRequests,
  GroupJoinRequestStatusEnum,
  groupLinkRequests,
  GroupLinkRequestStatusEnum,
  groupMembers,
  groupRatings,
  groupTierEvents,
  groupTierPoints,
  levelOverrides,
  MatchStatusEnum,
  ratingEvents,
  ratings,
  teamMembers,
  teams,
  user,
  venues,
  type GroupSportEnum,
} from "@repo/db";

import type {
  GroupMemberTierData,
  GroupTierSummaryData,
} from "@repo/domain/group-data";
import { groupHasTier } from "@repo/domain/game-rating-scope";
import {
  ratingSettingsLine,
  type GroupRatingSettings,
} from "@repo/domain/group-rating-settings";
import type { LevelBand } from "@repo/domain/level-bands";
import { wholeOvrFromMu } from "@repo/domain/football-ovr";
import { levelFromMu } from "@repo/domain/level";
import { protectedProcedure } from "#src/trpc";
import { isLevelSetterPublicMetadata } from "#src/auth/require-level-setter";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { mayCreateGameOnGroup } from "#src/games/access";
import {
  applyViewerLevelRangeToHubRows,
  hubListColumns,
  hubListWith,
  toHubListRow,
  viewerHubContext,
} from "#src/games/helpers/hub-list";
import { matchOutcome } from "@repo/domain/match-outcome";
import { isFootballBib, type FootballBib } from "@repo/domain/football-lineup";
import {
  GROUP_PLAYED_FILTERS,
  groupPlayedCounts,
  groupPlayedMatchesFilter,
  type GroupPlayedCounts,
} from "@repo/domain/group-played-filter";
import {
  outcomeForSlot,
  scoredSetsFromMatch,
  seatedUserSlotOnMatch,
  slotMembers,
  type MatchSlotMember,
} from "@repo/domain/match-slots";
import { groupIsVerified } from "#src/groups/group-is-verified";
import {
  groupTierTable,
  tierPointsShownTo,
} from "#src/ratings/group-tier-table";
import { tembaLevelViews } from "#src/ratings/level-confirmed";
import {
  appointedOrganizerUserIds,
  isAppointedOrganizer,
} from "#src/groups/helpers/appointed-organizers";
import { assertCanViewGroup } from "#src/groups/helpers/assert-can-view-group";
import { groupHasGames } from "#src/groups/helpers/group-has-games";
import { isGroupOwner } from "#src/groups/helpers/group-owner";
import { groupJoinMode } from "#src/groups/helpers/group-join-mode";
import { isGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";
import {
  groupFormMarks,
  type GroupFormMatch,
} from "@repo/domain/member-form-marks";
import {
  isHomeCarouselNeedsResults,
  type HomeCarouselCandidate,
} from "#src/home/carousel-games";
import {
  filterAndSortHomeUpcomingGames,
  gameListTime,
  isGameLive,
} from "#src/home/upcoming-games";
import { youRatingViewAfterIdle } from "@repo/domain/idle";
import { startOfProductDay } from "@repo/domain/product-timezone";
import { seasonStandingPosition } from "@repo/domain/season-standing";
import { canManageSeasons } from "#src/groups/helpers/season-access";
import { loadGroupStandings } from "#src/standing/load-group-standing";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";
import { maskPhone } from "#src/unclaimed-players/mask-phone";
import { mayRenameUnclaimedPlayer } from "#src/unclaimed-players/may-rename-unclaimed-player";
import { teamDisplayName } from "#src/teams/helpers/team-display-name";
import { loadTeamMatches, teamRecordFromMatches } from "#src/teams/team-record";

type DbClient = typeof db;

const GROUP_GAME_HISTORY_LIMIT = 20;

const gameHistoryPageInput = z.object({
  limit: z.number().int().min(1).max(100).default(GROUP_GAME_HISTORY_LIMIT),
  cursor: z.object({ id: z.string().uuid() }).optional(),
  /** Omitted reads every past Game, as clients before the filters did. */
  status: z.enum(GROUP_PLAYED_FILTERS).optional(),
});

export type GroupGameHistoryPage = z.infer<typeof gameHistoryPageInput>;

/** A Match slot as the Game teams seat it — `null` before the draw. */
type GroupSlotTeam = {
  bib?: string | null;
  players: readonly {
    position: string | null;
    gamePlayer: {
      userId: string | null;
      user: { id: string; name: string; image: string | null } | null;
    } | null;
  }[];
} | null;

function slotUserIds(team: GroupSlotTeam): string[] {
  const userIds: string[] = [];
  for (const link of team?.players ?? []) {
    const userId = link.gamePlayer?.userId;
    if (userId) {
      userIds.push(userId);
    }
  }
  return userIds;
}

/**
 * One row of the Games tab Played list (design 06b, spec §4.2): the slot
 * rosters, the scored Sets, and the slot the viewer sat on — `null` when they
 * did not play. Same fields `games.listMyMatchHistory` returns, read from the
 * same shared slot derivation.
 */
export type GroupPlayedGame = {
  id: string;
  name: string | null;
  hasCustomName: boolean;
  format: string;
  sport: string | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  venueName: string | null;
  courtName: string | null;
  displayTime: Date;
  cancelled: boolean;
  joinedCount: number;
  playersAllowed: number | null;
  slot1Members: MatchSlotMember[];
  slot2Members: MatchSlotMember[];
  slot1Bib: FootballBib | null;
  slot2Bib: FootballBib | null;
  scoredSets: { slot1GamesWon: number; slot2GamesWon: number }[];
  viewerSlot: 1 | 2 | null;
  outcome: "won" | "lost" | "draw" | null;
};

function slotBib(team: GroupSlotTeam): FootballBib | null {
  return isFootballBib(team?.bib) ? team.bib : null;
}

type GroupGameMatch = {
  id: string;
  startTime: Date | null;
  status: string | null;
  createdAt: Date;
  court?: { name: string } | null;
  slot1GameTeam: GroupSlotTeam;
  slot2GameTeam: GroupSlotTeam;
  sets: readonly {
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
};

/**
 * When the member last played in this Group: the latest completed Match they
 * sat on. A Match still awaiting its result is not played yet.
 */
function memberLastPlayedAt(
  matches: readonly GroupFormMatch[],
  userId: string,
): Date | null {
  let latest: Date | null = null;
  for (const match of matches) {
    if (
      match.status !== MatchStatusEnum.COMPLETED ||
      seatedUserSlotOnMatch(match, userId) == null
    ) {
      continue;
    }
    const playedAt = match.startTime ?? match.createdAt;
    if (latest == null || playedAt.getTime() > latest.getTime()) {
      latest = playedAt;
    }
  }
  return latest;
}

/**
 * The Match a past Game reads as: the latest one the viewer sat on, so the
 * row speaks about their own result, and otherwise the latest Match on the
 * Game, so a Game they did not play in still shows both teams and the score.
 */
function playedMatchForViewer(
  matches: readonly GroupGameMatch[],
  userId: string,
): { match: GroupGameMatch; viewerSlot: 1 | 2 | null } | null {
  const sorted = [...matches].sort((a, b) => {
    const left = a.startTime?.getTime() ?? a.createdAt.getTime();
    const right = b.startTime?.getTime() ?? b.createdAt.getTime();
    if (left !== right) {
      return right - left;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  for (const match of sorted) {
    const viewerSlot = seatedUserSlotOnMatch(
      {
        slot1UserIds: slotUserIds(match.slot1GameTeam),
        slot2UserIds: slotUserIds(match.slot2GameTeam),
      },
      userId,
    );
    if (viewerSlot != null) {
      return { match, viewerSlot };
    }
  }
  const fallback = sorted[0];
  return fallback ? { match: fallback, viewerSlot: null } : null;
}

function toGroupPlayedGame(
  game: {
    id: string;
    name: string | null;
    hasCustomName: boolean;
    groupId: string | null;
    cancelledAt: Date | null;
    windowStart: Date | null;
    windowEnd: Date | null;
    createdAt: Date;
    format: string;
    sport: string | null;
    playersAllowed: number | null;
    players: readonly unknown[];
    venue: { name: string } | null;
    matches: readonly GroupGameMatch[];
  },
  userId: string,
): GroupPlayedGame {
  const played = playedMatchForViewer(game.matches, userId);
  const viewerSlot = played?.viewerSlot ?? null;
  const scoredSets = played ? scoredSetsFromMatch(played.match.sets) : [];
  // Only a completed Match is a result. A Match awaiting result confirmation
  // (ADR-0011) still shows its score, but reads as no result — the same rule
  // `groupFormMarks` applies to the marks on the other tabs.
  const outcome =
    played &&
    viewerSlot != null &&
    played.match.status === MatchStatusEnum.COMPLETED
      ? outcomeForSlot(viewerSlot, matchOutcome(played.match.sets).result)
      : null;

  return {
    id: game.id,
    name: game.name,
    hasCustomName: game.hasCustomName,
    format: game.format,
    sport: game.sport,
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    venueName: game.venue?.name ?? null,
    courtName: played?.match.court?.name ?? null,
    displayTime: played?.match.startTime ?? gameListTime(game),
    cancelled: game.cancelledAt !== null,
    joinedCount: game.players.length,
    playersAllowed: game.playersAllowed,
    slot1Members: played ? slotMembers(played.match.slot1GameTeam, userId) : [],
    slot2Members: played ? slotMembers(played.match.slot2GameTeam, userId) : [],
    slot1Bib: played ? slotBib(played.match.slot1GameTeam) : null,
    slot2Bib: played ? slotBib(played.match.slot2GameTeam) : null,
    scoredSets,
    viewerSlot,
    outcome,
  };
}

/** Teams tagged to the Group, with their record. The Group does not own them. */
async function loadTaggedTeams(database: DbClient, groupId: string) {
  const teamRows = await database.query.teams.findMany({
    where: eq(teams.groupId, groupId),
    columns: { id: true, name: true, sport: true },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
  if (teamRows.length === 0) {
    return [];
  }
  const teamIds = teamRows.map((team) => team.id);
  const memberRows = await database.query.teamMembers.findMany({
    where: inArray(teamMembers.teamId, teamIds),
    columns: { teamId: true },
    with: { user: { columns: { name: true } } },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
  const matchesByTeam = await loadTeamMatches(database, teamIds);
  return teamRows.map((team) => {
    const memberNames = memberRows
      .filter((member) => member.teamId === team.id)
      .map((member) => member.user.name);
    return {
      id: team.id,
      displayName: teamDisplayName(team.name, memberNames),
      sport: team.sport as GroupSportEnum,
      rosterCount: memberNames.length,
      record: teamRecordFromMatches(matchesByTeam.get(team.id) ?? []),
    };
  });
}

/**
 * Every member's Group Tier in a tier Group (ADR-0067). A member with no Tier
 * points yet is Provisional at the start. Points of a Provisional member are
 * shown only to that member and the Group's Organizers.
 */
async function loadGroupTiers(
  database: DbClient,
  args: {
    groupId: string;
    members: readonly { userId: string; createdAt: Date; name: string }[];
    viewerUserId: string;
    viewerOrganizes: boolean;
  },
): Promise<{
  tierByUserId: Map<string, GroupMemberTierData>;
  summary: GroupTierSummaryData;
}> {
  const memberIds = args.members.map((member) => member.userId);
  const rows =
    memberIds.length === 0
      ? []
      : await database.query.groupTierPoints.findMany({
          where: and(
            eq(groupTierPoints.groupId, args.groupId),
            inArray(groupTierPoints.userId, memberIds),
          ),
        });
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));
  const table = groupTierTable(
    args.members.map((member) => ({
      userId: member.userId,
      joinedAt: member.createdAt,
    })),
    (userId) => rowByUser.get(userId),
  );

  const viewer = {
    userId: args.viewerUserId,
    organizes: args.viewerOrganizes,
  };
  const tierByUserId = new Map<string, GroupMemberTierData>();
  for (const row of table.rows) {
    tierByUserId.set(row.userId, {
      band: row.band,
      place: row.place,
      points: tierPointsShownTo(row, viewer),
      provisional: row.provisional,
      gamesOfFive: row.gamesOfFive,
      gamesCounted: row.gamesCounted,
    });
  }

  const sharkRow = table.rows.find((row) => row.band === "shark");
  let shark: GroupTierSummaryData["shark"] = null;
  if (sharkRow) {
    const [became] = await database
      .select({ createdAt: groupTierEvents.createdAt })
      .from(groupTierEvents)
      .where(
        and(
          eq(groupTierEvents.groupId, args.groupId),
          eq(groupTierEvents.userId, sharkRow.userId),
          eq(groupTierEvents.kind, "band_change"),
          eq(groupTierEvents.bandAfter, "shark"),
        ),
      )
      .orderBy(desc(groupTierEvents.createdAt))
      .limit(1);
    shark = {
      userId: sharkRow.userId,
      name:
        args.members.find((member) => member.userId === sharkRow.userId)
          ?.name ?? "",
      points: sharkRow.points,
      since: became?.createdAt ?? null,
    };
  }

  return {
    tierByUserId,
    summary: {
      shark,
      rankedCount: table.rankedCount,
      provisionalCount: table.provisionalCount,
    },
  };
}

export async function groupById(
  database: DbClient,
  args: {
    groupId: string;
    userId: string;
    now?: Date;
    gameHistory?: GroupGameHistoryPage;
    getPublicMetadata?: () => Promise<Record<string, unknown> | undefined>;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const group = await requireGroup(database, args.groupId, locale);
  await assertCanViewGroup(
    database,
    group,
    args.userId,
    args.getPublicMetadata,
    locale,
  );

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
  });

  const venue = group.venueId
    ? await database.query.venues.findFirst({
        where: eq(venues.id, group.venueId),
        columns: { id: true, name: true },
      })
    : undefined;
  const pendingLinkRequestCount =
    !group.venueId && group.createdBy === args.userId
      ? ((
          await database
            .select({ value: count() })
            .from(groupLinkRequests)
            .innerJoin(venues, eq(venues.id, groupLinkRequests.venueId))
            .where(
              and(
                eq(groupLinkRequests.groupId, group.id),
                eq(
                  groupLinkRequests.status,
                  GroupLinkRequestStatusEnum.PENDING,
                ),
                isNull(venues.archivedAt),
              ),
            )
        )[0]?.value ?? 0)
      : null;

  const canUnlinkFromVenue =
    group.createdBy === args.userId && group.venueId !== null;

  const joinMode = await groupJoinMode(database, group, args.userId);
  const canJoin = joinMode === "join";
  const viewerIsAppointedOrganizer = await isAppointedOrganizer(
    database,
    group,
    args.userId,
  );
  const canManageInvites =
    group.createdBy === args.userId || viewerIsAppointedOrganizer;
  const canManageLookupInvites = canManageInvites;
  const canManageInviteLinks = canManageInvites;

  const canEdit = isGroupOwner(group, args.userId);
  const canDelete = canEdit;
  const canChangeSport = canEdit && !(await groupHasGames(database, group.id));
  const canCreateGame = await mayCreateGameOnGroup(
    database,
    group,
    args.userId,
  );
  const isApprover = await isGroupApprover(database, group, args.userId);
  const canSetRequiresApproval = isApprover && group.type === "public";
  const canDecideJoinRequests = canSetRequiresApproval;
  const pendingJoinRequestCount = canDecideJoinRequests
    ? ((
        await database
          .select({ value: count() })
          .from(groupJoinRequests)
          .where(
            and(
              eq(groupJoinRequests.groupId, group.id),
              eq(groupJoinRequests.status, GroupJoinRequestStatusEnum.PENDING),
            ),
          )
      )[0]?.value ?? 0)
    : 0;
  const joinRequestsApprovedToday = canDecideJoinRequests
    ? ((
        await database
          .select({ value: count() })
          .from(groupJoinRequests)
          .where(
            and(
              eq(groupJoinRequests.groupId, group.id),
              eq(groupJoinRequests.status, GroupJoinRequestStatusEnum.APPROVED),
              isNotNull(groupJoinRequests.decidedBy),
              ne(groupJoinRequests.decidedBy, groupJoinRequests.userId),
              gte(
                groupJoinRequests.updatedAt,
                startOfProductDay(args.now ?? new Date()),
              ),
            ),
          )
      )[0]?.value ?? 0)
    : 0;

  const memberRows = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, group.id),
    with: {
      user: {
        columns: {
          id: true,
          name: true,
          image: true,
          clerkId: true,
          addedAt: true,
          addedByUserId: true,
          phoneNumber: true,
        },
      },
    },
  });

  const memberUserIds = memberRows.map((row) => row.userId);
  const memberMarkByUserId = new Map(
    await Promise.all(
      memberRows.map(async (row) => {
        const unclaimed = isUnclaimed(row.user);
        const phoneMasked =
          isApprover && unclaimed && row.user.phoneNumber
            ? maskPhone(row.user.phoneNumber)
            : null;
        const canRename =
          unclaimed &&
          (await mayRenameUnclaimedPlayer(database, {
            playerId: row.userId,
            adderId: row.user.addedByUserId,
            callerId: args.userId,
          }));
        return [row.userId, { unclaimed, phoneMasked, canRename }] as const;
      }),
    ),
  );

  const hasTier = groupHasTier({
    sport: group.sport,
    verified: groupIsVerified(group),
  });
  const groupRatingSettings: GroupRatingSettings = {
    mode: group.performanceRatingMode,
    weightPercent: group.performanceWeightPercent,
    organizerCountsDouble: group.organizerCountsDouble,
  };
  const groupTiers = hasTier
    ? await loadGroupTiers(database, {
        groupId: group.id,
        members: memberRows.map((row) => ({
          userId: row.userId,
          createdAt: row.createdAt,
          name: row.user.name,
        })),
        viewerUserId: args.userId,
        viewerOrganizes:
          group.createdBy === args.userId || viewerIsAppointedOrganizer,
      })
    : null;

  const now = args.now ?? new Date();
  const groupStanding = (
    await loadGroupStandings(database, [group.id], now)
  ).get(group.id);
  const standingRows = groupStanding?.rows ?? [];
  const seasons = groupStanding?.seasons ?? [];
  const memberRowByUserId = new Map(memberRows.map((row) => [row.userId, row]));

  const viewerStandingPosition = membership
    ? seasonStandingPosition(standingRows, args.userId)
    : null;

  // "Organizer" on the Members tab: the Group creator or an Appointed
  // Organizer (`.scratch/groups-redesign/spec.md` D8).
  const appointedUserIds = new Set(
    await appointedOrganizerUserIds(database, group),
  );

  // Level reads `ratings` for `(member.userId, group.sport)` — unique on that
  // pair (D5). A Group with no sport has no Rating to read, so every member
  // falls back to the hatched Provisional placeholder.
  const ratingByUserId = new Map<
    string,
    {
      levelBand: LevelBand;
      provisional: boolean;
      level: string;
      ovr: number | null;
      ratedMatchCount: number;
    }
  >();
  if (group.sport && memberUserIds.length > 0) {
    const ratingRows = await database.query.ratings.findMany({
      where: and(
        eq(ratings.sport, group.sport),
        inArray(ratings.userId, memberUserIds),
      ),
    });
    const matchCountRows = await database
      .select({ userId: ratingEvents.userId, ratedMatchCount: count() })
      .from(ratingEvents)
      .where(
        and(
          eq(ratingEvents.sport, group.sport),
          inArray(ratingEvents.userId, memberUserIds),
        ),
      )
      .groupBy(ratingEvents.userId);
    const ratedMatchCountByUserId = new Map(
      matchCountRows.map((row) => [row.userId, Number(row.ratedMatchCount)]),
    );
    const levelView = await tembaLevelViews(database, ratingRows);
    for (const row of ratingRows) {
      const view = levelView(row);
      ratingByUserId.set(row.userId, {
        levelBand: view.levelBand,
        provisional: view.provisional,
        level: view.level,
        ovr: group.sport === "football" ? wholeOvrFromMu(row.mu) : null,
        ratedMatchCount: ratedMatchCountByUserId.get(row.userId) ?? 0,
      });
    }
  }

  // A padel Group keeps only a Standing (ADR-0066), so it reads no Group
  // Level. A football Group Level an Organizer set earlier is read only as the
  // Tier start hint's preferred Level, never shown and never copied.
  const groupLevelByUserId = new Map<
    string,
    {
      level: string;
      rating: number;
      levelBand: LevelBand;
      provisional: boolean;
    }
  >();
  if (group.sport === "football" && memberUserIds.length > 0) {
    const groupRatingRows = await database.query.groupRatings.findMany({
      where: and(
        eq(groupRatings.groupId, group.id),
        inArray(groupRatings.userId, memberUserIds),
      ),
    });
    for (const row of groupRatingRows) {
      const view = youRatingViewAfterIdle(row, now);
      groupLevelByUserId.set(row.userId, {
        level: view.level,
        rating: Math.round(levelFromMu(row.mu) * 100) / 100,
        levelBand: view.levelBand,
        provisional: view.provisional,
      });
    }
  }

  // One Clerk read per Group page view, and only for a member of a Group with
  // a sport — the only viewer a Level setter can act as.
  const viewerCanSetLevel =
    membership !== undefined &&
    group.sport !== null &&
    args.getPublicMetadata !== undefined &&
    isLevelSetterPublicMetadata(await args.getPublicMetadata());

  const levelOverrideByUserId = new Map<
    string,
    {
      setByName: string;
      setByIsViewer: boolean;
      createdAt: Date;
      reason: (typeof levelOverrides.$inferSelect)["reason"];
      note: string | null;
    }
  >();
  if (viewerCanSetLevel && group.sport && memberUserIds.length > 0) {
    const overrideRows = await database
      .select({
        userId: levelOverrides.userId,
        setByUserId: levelOverrides.setByUserId,
        setByName: user.name,
        createdAt: levelOverrides.createdAt,
        reason: levelOverrides.reason,
        note: levelOverrides.note,
      })
      .from(levelOverrides)
      .innerJoin(user, eq(user.id, levelOverrides.setByUserId))
      .where(
        and(
          eq(levelOverrides.sport, group.sport),
          inArray(levelOverrides.userId, memberUserIds),
        ),
      )
      .orderBy(desc(levelOverrides.createdAt), desc(levelOverrides.id));
    for (const row of overrideRows) {
      if (!levelOverrideByUserId.has(row.userId)) {
        levelOverrideByUserId.set(row.userId, {
          setByName: row.setByName,
          setByIsViewer: row.setByUserId === args.userId,
          createdAt: row.createdAt,
          reason: row.reason,
          note: row.note,
        });
      }
    }
  }

  // Upcoming / history are scoped by this Group id only (excludes null groupId).
  const groupGameRows = await database.query.games.findMany({
    where: eq(games.groupId, group.id),
    // The Scheduled cards are the Games hub's own rows, so this reads the hub
    // column set (`#src/games/helpers/hub-list`) and hands it to the same
    // `toHubListRow`. Matches carry their slot rosters and Sets on top, for
    // the W-L, form-mark and Played derivations below (spec §4, §6).
    columns: hubListColumns,
    with: {
      ...hubListWith,
      matches: {
        columns: {
          id: true,
          gameId: true,
          startTime: true,
          status: true,
          createdAt: true,
          slot1GameTeamId: true,
          slot2GameTeamId: true,
          roundNumber: true,
          knockoutRound: true,
          knockoutPosition: true,
          walkoverGameTeamId: true,
          courtId: true,
        },
        with: {
          court: {
            columns: { name: true },
          },
          slot1GameTeam: {
            columns: { id: true, bib: true },
            with: {
              players: {
                columns: { position: true },
                with: {
                  gamePlayer: {
                    columns: { userId: true },
                    with: {
                      user: { columns: { id: true, name: true, image: true } },
                    },
                  },
                },
              },
            },
          },
          slot2GameTeam: {
            columns: { id: true, bib: true },
            with: {
              players: {
                columns: { position: true },
                with: {
                  gamePlayer: {
                    columns: { userId: true },
                    with: {
                      user: { columns: { id: true, name: true, image: true } },
                    },
                  },
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
        },
      },
    },
  });

  // Scheduled cards are `GameSummaryCard`, the Games hub card, so the rows it
  // reads are built by the hub's own `toHubListRow` — one shape, not two
  // (spec §4.1). The viewer's Level range gates `canRegister` here exactly as
  // it does on the hub.
  const viewer = await viewerHubContext(
    database,
    args.userId,
    args.locale ?? DEFAULT_LOCALE,
  );
  const upcomingRows = filterAndSortHomeUpcomingGames(
    groupGameRows,
    new Set([group.id]),
    now,
  );
  const upcomingGames = await applyViewerLevelRangeToHubRows(
    database,
    upcomingRows.map((row) => toHubListRow(row, viewer, now)),
    upcomingRows,
    args.userId,
  );

  const pastGames = groupGameRows
    .filter((game) => {
      if (game.groupId === null || game.groupId !== group.id) {
        return false;
      }
      return !isGameLive(game, now);
    })
    .sort((a, b) => {
      const timeDelta = gameListTime(b).getTime() - gameListTime(a).getTime();
      if (timeDelta !== 0) {
        return timeDelta;
      }
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
    })
    .map((game) => toGroupPlayedGame(game, args.userId));
  const gameHistoryCounts: GroupPlayedCounts = groupPlayedCounts(pastGames);
  const historyStatus = args.gameHistory?.status ?? "all";
  const gameHistoryCandidates = pastGames.filter((game) =>
    groupPlayedMatchesFilter(game, historyStatus),
  );
  const historyCursor = args.gameHistory?.cursor;
  const historyStart = historyCursor
    ? gameHistoryCandidates.findIndex((game) => game.id === historyCursor.id) +
      1
    : 0;
  const gameHistory =
    historyCursor && historyStart === 0
      ? []
      : gameHistoryCandidates.slice(
          historyStart,
          historyStart + (args.gameHistory?.limit ?? GROUP_GAME_HISTORY_LIMIT),
        );

  // Form marks derive over the Matches already loaded above
  // (`.scratch/groups-redesign/spec.md` §6.2). A cancelled Game never
  // becomes a result, so it is dropped before the derivation sees it.
  const formMatches: GroupFormMatch[] = [];
  for (const game of groupGameRows) {
    if (game.cancelledAt !== null) {
      continue;
    }
    for (const match of game.matches) {
      const occupants = {
        slot1UserIds: slotUserIds(match.slot1GameTeam),
        slot2UserIds: slotUserIds(match.slot2GameTeam),
      };
      formMatches.push({
        ...occupants,
        status: match.status,
        startTime: match.startTime,
        createdAt: match.createdAt,
        sets: match.sets,
      });
    }
  }

  const totalGamesPlayed = groupGameRows.filter((game) => {
    if (game.cancelledAt !== null) {
      return false;
    }
    return game.matches.some(
      (match) => match.status === MatchStatusEnum.COMPLETED,
    );
  }).length;
  const leaderboard = standingRows.map((entry) => {
    const rating = ratingByUserId.get(entry.userId) ?? null;
    return {
      userId: entry.userId,
      name: entry.name,
      image: entry.image,
      position: entry.position,
      ranked: entry.ranked,
      played: entry.played,
      wins: entry.wins,
      draws: entry.draws,
      losses: entry.losses,
      points: entry.points,
      diff: entry.diff,
      form: entry.form,
      isViewer: entry.userId === args.userId,
      levelBand: rating?.levelBand ?? null,
      levelProvisional: rating?.provisional ?? true,
      level: rating?.level ?? null,
      /** The whole-number OVR on a football Group (ADR-0069); null elsewhere. */
      ovr: rating?.ovr ?? null,
      ratedMatchCount: rating?.ratedMatchCount ?? 0,
      levelOverride: levelOverrideByUserId.get(entry.userId) ?? null,
      /**
       * Null on padel, whose Group Level is retired (ADR-0066). On football,
       * a Group Level an Organizer set earlier, read only by the Tier start
       * hint.
       */
      groupLevel: groupLevelByUserId.get(entry.userId) ?? null,
      formMarks: groupFormMarks(formMatches, entry.userId, now),
      lastPlayedAt: memberLastPlayedAt(formMatches, entry.userId),
      /** The member's Group Tier; null outside a tier Group (ADR-0067). */
      tier: groupTiers?.tierByUserId.get(entry.userId) ?? null,
      joinedAt: memberRowByUserId.get(entry.userId)?.createdAt ?? null,
      isOrganizer:
        entry.userId === group.createdBy || appointedUserIds.has(entry.userId),
      isAppointedOrganizer:
        appointedUserIds.has(entry.userId) && entry.userId !== group.createdBy,
      unclaimed: memberMarkByUserId.get(entry.userId)?.unclaimed ?? false,
      phoneMasked: memberMarkByUserId.get(entry.userId)?.phoneMasked ?? null,
      canRename: memberMarkByUserId.get(entry.userId)?.canRename ?? false,
    };
  });

  const awaitingScoreCount = groupGameRows.filter((game) => {
    const candidate: HomeCarouselCandidate = {
      id: game.id,
      groupId: game.groupId,
      cancelledAt: game.cancelledAt,
      windowStart: game.windowStart,
      windowEnd: game.windowEnd,
      createdAt: game.createdAt,
      format: game.format,
      matches: game.matches,
      createdBy: game.createdBy,

      viewerHasGameAdmit: false,
      viewerIsOrganizer: false,
      registrationMode: game.registrationMode,
      playersAllowed: game.playersAllowed,
      teamsAllowed: game.teamsAllowed,
      registeredUserCount: game.players.length,
      registeredTeamCount: game.teams.length,
    };
    return isHomeCarouselNeedsResults(candidate, now);
  }).length;

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    imageUrl: group.imageUrl ?? null,
    type: group.type,
    sport: group.sport as GroupSportEnum | null,
    isLoose: group.venueId === null,
    totalGamesPlayed,
    createdBy: group.createdBy,
    createdAt: group.createdAt,
    membership: membership
      ? {
          id: membership.id,
          standingPosition: viewerStandingPosition,
        }
      : null,
    standing: {
      memberCount: memberRows.length,
      leaderboard,
      awaitingScoreCount,
      seasonId: groupStanding?.seasonId ?? null,
      gamesCounted: groupStanding?.gamesCounted ?? 0,
    },
    seasons,
    canManageSeasons: canEdit && canManageSeasons(group, args.userId),
    upcomingGames,
    gameHistory,
    gameHistoryCounts,
    canJoin,
    joinMode,
    requiresApproval: group.requiresApproval,
    verified: groupIsVerified(group),
    hasTier,
    tierSummary: groupTiers?.summary ?? null,
    /** How ratings work in a tier Group, read-only under Standing (screen 3a). */
    ratingSettingsLine: hasTier
      ? ratingSettingsLine(groupRatingSettings, locale)
      : null,
    /** Set only for an Organizer of a tier Group, who may change them. */
    ratingSettings:
      hasTier && (group.createdBy === args.userId || viewerIsAppointedOrganizer)
        ? groupRatingSettings
        : null,
    venue: venue ? { id: venue.id, name: venue.name } : null,
    pendingLinkRequestCount,
    canUnlinkFromVenue,
    canDecideJoinRequests,
    joinRequestsApprovedToday,
    canSetRequiresApproval,
    canManageLookupInvites,
    canManageInviteLinks,
    canDelete,
    isOwner: group.createdBy === args.userId,
    canEdit,
    canTransferOwnership: canEdit,
    canChangeSport,
    pendingJoinRequestCount,
    canCreateGame,
    canManageImage: isApprover,
    canAddPlayers: isApprover,
    canRemovePlayers: isApprover,
    canAppointOrganizers: isApprover,
    viewerCanSetLevel,
    memberUserIds,
    hasInviteLink: canManageInviteLinks,
    teams: await loadTaggedTeams(database, group.id),
    canCreateTeam: canCreateGame && group.sport !== null,
  };
}

export const byId = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
      gameHistory: gameHistoryPageInput.optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return groupById(ctx.db, {
      groupId: input.id,
      userId: appUser.id,
      gameHistory: input.gameHistory,
      getPublicMetadata: ctx.getPublicMetadata,
      locale: ctx.locale,
    });
  });
