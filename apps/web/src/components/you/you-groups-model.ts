import { initials } from "@repo/domain/initials";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { displayBand, signedLevel } from "./you-format";
import { bandRange, bandTicks, type GroupLevelRow } from "./you-hero-model";

export type GroupRowView = {
  groupId: string;
  initials: string;
  name: string;
  sub: string;
  band: string;
  level: string;
  difference: { text: string; above: boolean } | null;
  provisional: boolean;
};

export function groupRowView(row: GroupLevelRow, locale: Locale): GroupRowView {
  const m = messagesFor(locale).you.groups;
  let sub: string;
  if (row.setBy) {
    sub = m.setBy(row.setBy.name);
  } else if (row.provisional) {
    sub = m.provisionalLeft(row.ratedMatchesRemaining);
  } else {
    sub = m.rankOf(row.rank, row.rankedCount, row.ratedMatchCount);
  }
  return {
    groupId: row.groupId,
    initials: initials(row.name),
    name: row.name,
    sub,
    band: displayBand(row.levelBand),
    level: row.rating.toFixed(2),
    difference:
      row.differenceFromGeneral === null
        ? null
        : {
            text: signedLevel(row.differenceFromGeneral),
            above: row.differenceFromGeneral > 0,
          },
    provisional: row.provisional,
  };
}

export type ScaleMarker = {
  key: string;
  tag: string;
  /** Distance from the start edge, 0 to 100, so Arabic puts higher Levels on the left. */
  position: number;
  general: boolean;
};

export type LevelScale = {
  markers: ScaleMarker[];
  ticks: { label: string; position: number }[];
};

/** Each Group Level and General on one band-aligned scale, low to high. */
export function levelScale(
  general: number,
  groups: readonly { groupId: string; name: string; rating: number }[],
  locale: Locale,
): LevelScale {
  const values = [general, ...groups.map((group) => group.rating)];
  const { low, high } = bandRange(values);
  const at = (value: number) =>
    Math.round(((value - low) / (high - low)) * 1000) / 10;
  return {
    markers: [
      ...groups.map((group) => ({
        key: group.groupId,
        tag: initials(group.name),
        position: at(group.rating),
        general: false,
      })),
      {
        key: "general",
        tag: messagesFor(locale).you.groups.general,
        position: at(general),
        general: true,
      },
    ],
    ticks: bandTicks(low, high).map((tick) => ({
      label: tick.label,
      position: at(tick.value),
    })),
  };
}
