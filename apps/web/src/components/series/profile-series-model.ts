import { formatGameDay } from "@repo/domain/format-game-start";
import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";
import { seriesWinWithLine } from "@repo/domain/series-copy";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { gameHomeHref, seriesPagePath } from "~/lib/dashboard-paths";
import type { RouterOutputs } from "~/trpc/react";

export type SeriesForPlayer = RouterOutputs["series"]["forPlayer"];
export type SeriesPlayerWins = RouterOutputs["series"]["playerWins"];
type ShownForPlayer = Extract<SeriesForPlayer, { hidden: false }>;
type ForPlayerBadge = ShownForPlayer["badges"][number];

export type ProfileSeriesBadge = {
  seriesId: string;
  emblem: SeriesEmblem;
  colour: SeriesColour;
  wins: number;
  name: string;
  groupName: string | null;
  /** The badge button's name: "Sunday Social, 2 wins". */
  label: string;
};

export type ProfileSeriesCardModel = {
  title: string;
  meta: string;
  badges: ProfileSeriesBadge[];
  allWins: string;
};

function badgeOf(badge: ForPlayerBadge, locale: Locale): ProfileSeriesBadge {
  return {
    seriesId: badge.seriesId,
    emblem: badge.emblem,
    colour: badge.colour,
    wins: badge.wins,
    name: badge.name,
    groupName: badge.groupName,
    label: messagesFor(locale).series.profile.badgeLabel(
      badge.name,
      badge.wins,
    ),
  };
}

/**
 * The profile's Series card (4a): a badge per Series won, most recent win
 * first, as the server orders them. Absent while loading, when Match history
 * visibility hides it, and when the player has won nothing.
 */
export function profileSeriesCardModel(
  data: SeriesForPlayer | undefined,
  locale: Locale,
): ProfileSeriesCardModel | null {
  if (!data || data.hidden || data.badges.length === 0) {
    return null;
  }
  const m = messagesFor(locale).series.profile;
  return {
    title: m.title,
    meta: m.meta(data.totalWins, data.badges.length),
    badges: data.badges.map((badge) => badgeOf(badge, locale)),
    allWins: m.allWins,
  };
}

export type ProfileSeriesWinRow = {
  key: string;
  /** The Game, when the viewer may open the Series' Group. */
  href: string | null;
  title: string;
  sub: string | null;
};

export type ProfileSeriesEditionRow = ProfileSeriesWinRow & {
  /** Two digits, "07". */
  edition: string;
  editionSpoken: string;
};

export type ProfileSeriesAllRow = ProfileSeriesWinRow & {
  emblem: SeriesEmblem;
  colour: SeriesColour;
};

export type ProfileSeriesSheetModel =
  | {
      mode: "series";
      badge: ProfileSeriesBadge;
      /** Null while `series.playerWins` loads. */
      wins: {
        heading: string;
        played: string;
        rows: ProfileSeriesEditionRow[];
        seeSeries: { label: string; href: string } | null;
      } | null;
    }
  | {
      mode: "all";
      heading: string;
      meta: string;
      rows: ProfileSeriesAllRow[];
    };

function winDate(playedAt: Date | string, locale: Locale) {
  return formatGameDay(playedAt, locale, { weekday: "short", year: true });
}

function twoDigits(edition: number) {
  return String(edition).padStart(2, "0");
}

/**
 * The wins behind one badge (4b): "Won 2 of 12", "played 9", and a row per
 * win newest first. A win with nobody to name, an Americano's, shows its
 * date alone. Rows and "See the series" link only when the viewer may open
 * the Series' Group.
 */
export function profileSeriesSheetModel(
  badge: ProfileSeriesBadge,
  wins: SeriesPlayerWins | undefined,
  locale: Locale,
): ProfileSeriesSheetModel {
  const m = messagesFor(locale).series;
  if (!wins) {
    return { mode: "series", badge, wins: null };
  }
  return {
    mode: "series",
    badge,
    wins: {
      heading: m.profile.sheetWon(wins.wins, wins.playedBySeries),
      played: m.profile.played(wins.playedByPlayer),
      rows: wins.editions.map((win) => {
        const date = winDate(win.playedAt, locale);
        const withLine = seriesWinWithLine(win.with, locale);
        return {
          key: win.gameId,
          href: wins.canOpenSeries ? gameHomeHref(win.gameId) : null,
          edition: twoDigits(win.edition),
          editionSpoken: m.page.edition(win.edition),
          title: withLine ?? date,
          sub: withLine ? date : null,
        };
      }),
      seeSeries: wins.canOpenSeries
        ? { label: m.profile.seeSeries, href: seriesPagePath(badge.seriesId) }
        : null,
    },
  };
}

/** The sheet's all mode: every win across Series, newest first. */
export function profileSeriesAllModel(
  data: ShownForPlayer,
  locale: Locale,
): ProfileSeriesSheetModel {
  const m = messagesFor(locale).series.profile;
  const badges = new Map(data.badges.map((badge) => [badge.seriesId, badge]));
  return {
    mode: "all",
    heading: m.winsTitle,
    meta: m.meta(data.totalWins, data.badges.length),
    rows: data.wins.flatMap((win) => {
      const badge = badges.get(win.seriesId);
      if (!badge) {
        return [];
      }
      const date = winDate(win.playedAt, locale);
      const withLine = seriesWinWithLine(win.with, locale);
      return [
        {
          key: win.gameId,
          href: badge.canOpenSeries ? gameHomeHref(win.gameId) : null,
          emblem: badge.emblem,
          colour: badge.colour,
          title: m.winTitle(badge.name, win.edition),
          sub: withLine ? m.winLine(withLine, date) : date,
        },
      ];
    }),
  };
}
