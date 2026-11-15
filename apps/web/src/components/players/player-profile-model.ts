import type { Locale } from "@repo/i18n/locale";
import type { PlayerStreaksInput } from "@repo/domain/player-profile";
import {
  footballMatchRowView,
  type FootballMatchInput,
} from "@repo/domain/player-profile-football";
import type { PlayerProfileFixture } from "@repo/domain/player-profile-fixtures";
import type { PlayerLevelInput } from "@repo/domain/player-profile-level";
import {
  LAST_TEN_RECENT_ROWS,
  lastTenSummary,
  playerMatchRowView,
} from "@repo/domain/player-profile-matches";
import {
  earlyDaysView,
  footballPositionView,
  footballStatTiles,
  heroPositionLabel,
  isEarlyDays,
  levelTrendSince,
  padelPositionView,
  padelStatTiles,
  partnerRowsView,
  partnersTitle,
  profileFormView,
  profileHeroSubtitle,
  profileLevelView,
  profileStreaksView,
  profileTierView,
  withViewerView,
  type EarlyDaysView,
  type PartnerRowView,
  type ProfileFormView,
  type ProfileLevelView,
  type ProfilePositionView,
  type ProfileStatTile,
  type ProfileStreaksView,
  type ProfileTierView,
  type WithViewerInput,
  type WithViewerView,
} from "@repo/domain/player-profile-page";
import type { MatchOutcome } from "@repo/domain/result-mark";
import type { Sport } from "@repo/domain/sport";

import { playerMatchesPath } from "~/lib/dashboard-paths";
import type { RouterOutputs } from "~/trpc/react";

type ApiPlayerProfile = RouterOutputs["users"]["playerProfile"];
type ApiFootballProfile = RouterOutputs["users"]["footballProfile"];

export type ProfileMatchRow = {
  key: string;
  outcome: MatchOutcome;
  title: string;
  sub: string;
  score: string | null;
  detail: string | null;
  accessibilityLabel: string;
  href: string | null;
};

export type PlayerProfileModel = {
  sport: Sport;
  sports: Sport[];
  name: string;
  image: string | null;
  subtitle: string | null;
  level: ProfileLevelView;
  early: EarlyDaysView | null;
  streaks: ProfileStreaksView | null;
  position: ProfilePositionView;
  stats: ProfileStatTile[];
  withViewer: WithViewerView | null;
  partners: { title: string; meta: string; rows: PartnerRowView[] } | null;
  form: ProfileFormView;
  rows: ProfileMatchRow[];
  seeAll: { label: string; href: string } | null;
};

type Shared = {
  player: { name: string; image: string | null };
  venue: { name: string } | null;
  rating: PlayerLevelInput | null;
  streaks: PlayerStreaksInput;
  partners: ApiPlayerProfile["partners"];
  withViewer: WithViewerInput | null;
  sports: Sport[];
};

function sharedModel(
  data: Shared,
  options: {
    sport: Sport;
    played: number;
    position: string | null;
    trend: string | null;
  },
  locale: Locale,
) {
  const hasSwitch = data.sports.length > 1;
  const early = isEarlyDays(options.played);
  const rows = partnerRowsView(data.partners, options.sport, locale);
  return {
    sport: options.sport,
    sports: data.sports,
    name: data.player.name,
    image: data.player.image,
    subtitle: profileHeroSubtitle(
      {
        sport: options.sport,
        hasSwitch,
        position: options.position,
        venue: data.venue,
      },
      locale,
    ),
    level: profileLevelView(
      data.rating,
      { sport: options.sport, hasSwitch, trend: options.trend },
      locale,
    ),
    streaks: early ? null : profileStreaksView(data.streaks, locale),
    withViewer: withViewerView(
      data.withViewer,
      { sport: options.sport, playerName: data.player.name },
      locale,
    ),
    partners:
      early || rows.length === 0
        ? null
        : { ...partnersTitle(options.sport, locale), rows },
  };
}

function recentCount(played: number) {
  return isEarlyDays(played) ? played : LAST_TEN_RECENT_ROWS;
}

export function padelProfileModel(
  data: ApiPlayerProfile | PlayerProfileFixture,
  locale: Locale,
): PlayerProfileModel {
  const played = data.overall.played;
  const options = { sport: "padel" as const, played };
  const userId = data.player.id;
  const summary = lastTenSummary(data.lastMatches, locale);
  return {
    ...sharedModel(
      data,
      {
        ...options,
        position: heroPositionLabel(
          { sport: "padel", position: data.position },
          locale,
        ),
        trend: levelTrendSince(data.lastMatches, locale),
      },
      locale,
    ),
    early: earlyDaysView(data.lastMatches, options, locale),
    position: padelPositionView(data.position, locale),
    stats: padelStatTiles(data.overall, locale),
    form: profileFormView(data.lastMatches, options, locale),
    rows: data.lastMatches.slice(0, recentCount(played)).map((match) => {
      const row = playerMatchRowView(match, userId, locale);
      return {
        key: row.matchId,
        outcome: row.outcome,
        title: row.kind,
        sub: row.dateWithPartner,
        score: row.sets.length > 0 ? row.sets.join(", ") : null,
        detail: row.ratingTag ?? row.delta,
        accessibilityLabel: row.accessibilityLabel,
        href: playerMatchesPath(userId, row.matchId),
      };
    }),
    seeAll:
      isEarlyDays(played) || !summary.seeAll
        ? null
        : { label: summary.seeAll, href: playerMatchesPath(userId) },
  };
}

function footballRow(
  match: FootballMatchInput,
  locale: Locale,
): ProfileMatchRow {
  const row = footballMatchRowView(match, locale);
  return {
    key: row.matchId,
    outcome: row.outcome,
    title: row.title,
    sub: row.meta,
    score: row.score,
    detail: row.detail,
    accessibilityLabel: row.accessibilityLabel,
    href: row.canOpenGame ? `/dashboard/games/${row.gameId}` : null,
  };
}

export function footballProfileModel(
  data: ApiFootballProfile,
  locale: Locale,
): PlayerProfileModel {
  const played = data.overall.played;
  const options = { sport: "football" as const, played };
  return {
    ...sharedModel(
      data,
      {
        ...options,
        position: heroPositionLabel(
          { sport: "football", role: data.role },
          locale,
        ),
        trend: null,
      },
      locale,
    ),
    early: earlyDaysView(data.lastMatches, options, locale),
    position: footballPositionView(data.role, locale),
    stats: footballStatTiles(data.overall, locale),
    form: profileFormView(data.lastMatches, options, locale),
    rows: data.lastMatches
      .slice(0, recentCount(played))
      .map((match) => footballRow(match, locale)),
    seeAll: null,
  };
}

/**
 * The player's fish in the tier Groups the viewer shares with them. Tier
 * Groups are football's, so padel shows none.
 */
export function sharedTierView(
  sport: Sport,
  data: Pick<ApiPlayerProfile, "player" | "sharedGroupTiers"> | undefined,
  locale: Locale,
): ProfileTierView | null {
  if (sport !== "football" || !data) {
    return null;
  }
  return profileTierView(
    data.sharedGroupTiers,
    { playerName: data.player.name, isViewer: data.player.isViewer },
    locale,
  );
}
