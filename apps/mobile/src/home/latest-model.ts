import type { CoinKind } from "@repo/domain/marks";
import { markName } from "@repo/domain/marks";
import type { Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { cabinetGameLabel } from "../marks/cabinet-model";
import type { RouterOutputs } from "../trpc/react";

type ApiCabinet = RouterOutputs["marks"]["cabinet"];

export const LATEST_SEEN_KEY = "temba.home.latestSeen";

/** A mark older than this is not news any more. */
const LATEST_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export type LatestMark = {
  key: string;
  kind: CoinKind;
  sport: Sport;
  title: string;
  line: string;
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** The newest mark the User received in their sports, unless it is old news. */
export function latestMark(
  cabinet: ApiCabinet | undefined,
  sports: readonly Sport[],
  now: Date,
  locale: Locale,
): LatestMark | null {
  if (!cabinet || cabinet.hidden) {
    return null;
  }
  const m = messagesFor(locale).mobileHome.latest;
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
      cabinetGameLabel(newest.from.game, locale),
    ),
  };
}
