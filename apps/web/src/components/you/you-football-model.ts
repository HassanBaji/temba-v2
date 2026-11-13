import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { RouterOutputs } from "~/trpc/react";

import { LAST_TEN } from "./you-form-model";
import type { HeroStat } from "./you-hero-model";

export type FootballProfile = RouterOutputs["users"]["footballProfile"];

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
