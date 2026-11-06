import type { Locale } from "@repo/i18n/locale";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  footballMatchRowView,
  type FootballMatchInput,
} from "@repo/domain/player-profile-football";
import type { PlayerStreaksInput } from "@repo/domain/player-profile";
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
  withViewerView,
  type EarlyDaysView,
  type PartnerRowView,
  type ProfileFormView,
  type ProfileLevelView,
  type ProfilePositionView,
  type ProfileStatTile,
  type ProfileStreaksView,
  type WithViewerInput,
  type WithViewerView,
} from "@repo/domain/player-profile-page";
import type { MatchOutcome } from "@repo/domain/result-mark";
import type { Sport } from "@repo/domain/sport";

import { mediaUrl } from "../lib/media-url";
import type { RouterOutputs } from "../trpc/react";

type ApiPlayerProfile = RouterOutputs["users"]["playerProfile"];
type ApiFootballProfile = RouterOutputs["users"]["footballProfile"];
type PartnerInput = ApiPlayerProfile["partners"][number];

/** Where a recent row leads: the padel Match sheet, a football Game, or nowhere. */
export type ProfileRowTarget =
  | { kind: "match"; matchId: string }
  | { kind: "game"; gameId: string }
  | null;

export type ProfileMatchRow = {
  key: string;
  outcome: MatchOutcome;
  title: string;
  sub: string;
  score: string | null;
  detail: string | null;
  accessibilityLabel: string;
  target: ProfileRowTarget;
};

export type PlayerProfileModel = {
  sport: Sport;
  /** Sports played, for the switch: two or more draw it. */
  sports: Sport[];
  played: number;
  name: string;
  imageUri: string | null;
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
  seeAll: string | null;
};

export type ProfileState<Model> =
  | { status: "loading" }
  | { status: "refused" }
  | { status: "error"; message: string }
  | { status: "ready"; model: Model };

type ProfileQuery<Data> = {
  data: Data | undefined;
  error: ({ message: string } & object) | null;
};

function profileState<Data, Model>(
  query: ProfileQuery<Data>,
  build: (data: Data) => Model,
): ProfileState<Model> {
  if (isNotFoundError(query.error)) {
    return { status: "refused" };
  }
  if (query.data) {
    return { status: "ready", model: build(query.data) };
  }
  if (query.error) {
    return { status: "error", message: query.error.message };
  }
  return { status: "loading" };
}

type Shared = {
  player: { name: string; image: string | null };
  venue: { name: string } | null;
  rating: PlayerLevelInput | null;
  streaks: PlayerStreaksInput;
  partners: PartnerInput[];
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
  apiOrigin: string,
  locale: Locale,
) {
  const hasSwitch = data.sports.length > 1;
  const early = isEarlyDays(options.played);
  const rows = partnerRowsView(data.partners, options.sport, locale).map((row) => ({
    ...row,
    image: mediaUrl(row.image, apiOrigin),
  }));
  return {
    sport: options.sport,
    sports: data.sports,
    played: options.played,
    name: data.player.name,
    imageUri: mediaUrl(data.player.image, apiOrigin),
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

export function playerProfileModel(
  data: ApiPlayerProfile | PlayerProfileFixture,
  apiOrigin: string,
  locale: Locale,
): PlayerProfileModel {
  const played = data.overall.played;
  const options = { sport: "padel" as const, played };
  const rows = data.lastMatches
    .slice(0, recentCount(played))
    .map((match): ProfileMatchRow => {
      const row = playerMatchRowView(match, data.player.id, locale);
      return {
        key: row.matchId,
        outcome: row.outcome,
        title: row.kind,
        sub: row.dateWithPartner,
        score: row.sets.length > 0 ? row.sets.join(", ") : null,
        detail: row.ratingTag ?? row.delta,
        accessibilityLabel: row.accessibilityLabel,
        target: { kind: "match", matchId: row.matchId },
      };
    });
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
      apiOrigin,
      locale,
    ),
    early: earlyDaysView(data.lastMatches, options, locale),
    position: padelPositionView(data.position, locale),
    stats: padelStatTiles(data.overall, locale),
    form: profileFormView(data.lastMatches, options, locale),
    rows,
    seeAll: isEarlyDays(played)
      ? null
      : lastTenSummary(data.lastMatches, locale).seeAll,
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
    detail: row.goals,
    accessibilityLabel: row.accessibilityLabel,
    target: row.canOpenGame ? { kind: "game", gameId: row.gameId } : null,
  };
}

export function footballProfileModel(
  data: ApiFootballProfile,
  apiOrigin: string,
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
      apiOrigin,
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

export function playerProfileState(
  query: ProfileQuery<ApiPlayerProfile>,
  apiOrigin: string,
  locale: Locale,
): ProfileState<PlayerProfileModel> {
  return profileState(query, (data) =>
    playerProfileModel(data, apiOrigin, locale),
  );
}

export function footballProfileState(
  query: ProfileQuery<ApiFootballProfile>,
  apiOrigin: string,
  locale: Locale,
): ProfileState<PlayerProfileModel> {
  return profileState(query, (data) =>
    footballProfileModel(data, apiOrigin, locale),
  );
}
