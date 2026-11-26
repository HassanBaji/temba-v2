import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  gameCustomName,
  gameDisplayName,
  type GameDisplayNameInput,
} from "./game-custom-name";
import { markName, type CoinKind } from "./marks";
import type { SeriesColour, SeriesEmblem } from "./series";
import {
  seriesWinOrdinal,
  seriesWinWho,
  type SeriesWinWith,
} from "./series-copy";
import type { Sport } from "./sport";

/** What Home reads from `marks.cabinet` for the signed-in User. */
export type LatestCabinet =
  | { hidden: true }
  | {
      hidden: false;
      perSport: Record<
        Sport,
        {
          kinds: readonly {
            kind: CoinKind;
            lastFrom: {
              giverName: string | null;
              gameId: string;
              game: GameDisplayNameInput & { groupName: string | null };
              playedAt: Date | string;
            } | null;
          }[];
        }
      >;
    };

/** A mark older than this is not news any more. */
const LATEST_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type LatestMark = {
  key: string;
  kind: CoinKind;
  sport: Sport;
  title: string;
  line: string;
  at: Date;
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** The newest mark the User received in their sports, unless it is old news. */
export function latestMark(
  cabinet: LatestCabinet | undefined,
  sports: readonly Sport[],
  now: Date,
  locale: Locale,
): LatestMark | null {
  if (!cabinet || cabinet.hidden) {
    return null;
  }
  const m = messagesFor(locale).home.latest;
  const newest = sports
    .flatMap((sport) =>
      cabinet.perSport[sport].kinds.flatMap((kind) =>
        kind.lastFrom ? [{ sport, kind, from: kind.lastFrom }] : [],
      ),
    )
    .map((entry) => ({ ...entry, at: new Date(entry.from.playedAt) }))
    .sort((a, b) => b.at.getTime() - a.at.getTime())[0];
  if (!newest || now.getTime() - newest.at.getTime() > LATEST_WINDOW_MS) {
    return null;
  }
  return {
    key: `${newest.kind.kind}:${newest.from.gameId}:${newest.at.getTime()}`,
    kind: newest.kind.kind,
    sport: newest.sport,
    title: newest.from.giverName
      ? m.newMarkFrom(firstName(newest.from.giverName))
      : m.newMark,
    line: m.line(
      markName(newest.kind.kind, locale),
      gameCustomName(newest.from.game) ??
        newest.from.game.groupName ??
        gameDisplayName(newest.from.game, locale),
    ),
    at: newest.at,
  };
}

/** What Home reads from `series.forPlayer` for the signed-in User. */
export type LatestSeriesWins =
  | { hidden: true }
  | {
      hidden: false;
      badges: readonly {
        seriesId: string;
        name: string;
        emblem: SeriesEmblem;
        colour: SeriesColour;
      }[];
      wins: readonly {
        gameId: string;
        seriesId: string;
        edition: number;
        wonAt: Date | string;
        ordinal: number;
        with: SeriesWinWith;
      }[];
    };

export type LatestSeriesWin = {
  type: "series";
  key: string;
  gameId: string;
  emblem: SeriesEmblem;
  colour: SeriesColour;
  title: string;
  line: string;
  at: Date;
};

export type Latest = ({ type: "mark" } & LatestMark) | LatestSeriesWin;

/**
 * The User's newest Series win, counted from when its Edition was decided,
 * unless it is old news: "Series win: Friday Classic", "Edition 30 with
 * Black, 5–3. Your 2nd".
 */
export function latestSeriesWin(
  forPlayer: LatestSeriesWins | undefined,
  now: Date,
  locale: Locale,
): LatestSeriesWin | null {
  if (!forPlayer || forPlayer.hidden) {
    return null;
  }
  const newest = forPlayer.wins
    .map((win) => ({ win, at: new Date(win.wonAt) }))
    .sort((a, b) => b.at.getTime() - a.at.getTime())[0];
  if (!newest || now.getTime() - newest.at.getTime() > LATEST_WINDOW_MS) {
    return null;
  }
  const badge = forPlayer.badges.find(
    (entry) => entry.seriesId === newest.win.seriesId,
  );
  if (!badge) {
    return null;
  }
  const m = messagesFor(locale).series.latest;
  return {
    type: "series",
    key: `series:${newest.win.gameId}`,
    gameId: newest.win.gameId,
    emblem: badge.emblem,
    colour: badge.colour,
    title: m.title(badge.name),
    line: m.line(
      newest.win.edition,
      seriesWinWho(newest.win.with, "short", locale),
      seriesWinOrdinal(null, newest.win.ordinal, locale),
    ),
    at: newest.at,
  };
}

/** Home's one Latest row: the newer of the newest Mark and the newest Series win. */
export function latestUpdate(
  mark: LatestMark | null,
  seriesWin: LatestSeriesWin | null,
): Latest | null {
  if (seriesWin && (!mark || seriesWin.at.getTime() > mark.at.getTime())) {
    return seriesWin;
  }
  return mark ? { type: "mark", ...mark } : null;
}
