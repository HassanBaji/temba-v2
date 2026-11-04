import { footballSelfPlacementChoices } from "@repo/domain/football-self-placement";
import { initials } from "@repo/domain/initials";
import {
  displayLabelFromStoredBand,
  type LevelBand,
} from "@repo/domain/level-bands";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "~/trpc/react";

import { displayBand, signedLevel } from "./you-format";
import { LAST_TEN } from "./you-form-model";
import type { GroupLevelRow, HeroStat } from "./you-hero-model";

export type FootballProfile = RouterOutputs["users"]["footballProfile"];

/**
 * A football Level reads as the self-placement word it sits on (Casual,
 * Competitive …), and as the band letter once results or an Organizer move
 * it off those rungs.
 */
export function footballLevelLabel(band: LevelBand, locale: Locale): string {
  const display = displayLabelFromStoredBand(band);
  return (
    footballSelfPlacementChoices(locale).find(
      (choice) => choice.band === display,
    )?.label ?? displayBand(band)
  );
}

export type GoalBar = { key: string; goals: number | null; height: number };

/** Goals per Match over the Last 10, oldest first, each as a share of the best. */
export function goalBars(
  newestFirst: readonly { matchId: string; goals: number }[],
): GoalBar[] {
  const shown = newestFirst.slice(0, LAST_TEN).reverse();
  const most = Math.max(1, ...shown.map((match) => match.goals));
  const bars = shown.map((match) => ({
    key: match.matchId,
    goals: match.goals,
    height: Math.round((match.goals / most) * 100),
  }));
  const empty = Array.from({ length: LAST_TEN - bars.length }, (_, index) => ({
    key: `empty-${index}`,
    goals: null,
    height: 0,
  }));
  return [...empty, ...bars];
}

export function footballHeroStats(
  overall: FootballProfile["overall"],
  locale: Locale,
): HeroStat[] {
  const m = messagesFor(locale);
  return [
    { value: String(overall.played), label: m.you.hero.matches },
    { value: String(overall.goals), label: m.webYou.football.goals },
    {
      value:
        overall.played === 0
          ? m.webYou.noData
          : (overall.goals / overall.played).toFixed(2),
      label: m.webYou.football.goalsPerGame,
    },
  ];
}

/** Win, draw and loss shares of every football Match, summing to 100. */
export function recordShares(overall: FootballProfile["overall"]) {
  if (overall.played === 0) {
    return { won: 0, drawn: 0, lost: 0 };
  }
  const won = (overall.won / overall.played) * 100;
  const drawn = (overall.drawn / overall.played) * 100;
  return {
    won: Math.round(won * 10) / 10,
    drawn: Math.round(drawn * 10) / 10,
    lost: Math.round((100 - won - drawn) * 10) / 10,
  };
}

export function winRatePercent(overall: FootballProfile["overall"]) {
  return overall.played === 0
    ? null
    : Math.round((overall.won / overall.played) * 100);
}

export type FootballGroupRowView = {
  groupId: string;
  initials: string;
  name: string;
  sub: string;
  level: string;
  difference: { text: string; above: boolean } | null;
};

export function footballGroupRowView(
  row: GroupLevelRow,
  locale: Locale,
): FootballGroupRowView {
  const m = messagesFor(locale);
  const difference = row.differenceFromGeneral;
  return {
    groupId: row.groupId,
    initials: initials(row.name),
    name: row.name,
    sub: row.setBy
      ? m.you.groups.setBy(row.setBy.name)
      : m.webYou.football.sameAsYours,
    level: footballLevelLabel(row.levelBand, locale),
    difference:
      difference === null
        ? null
        : difference === 0
          ? { text: m.webYou.football.same, above: false }
          : { text: signedLevel(difference), above: difference > 0 },
  };
}
