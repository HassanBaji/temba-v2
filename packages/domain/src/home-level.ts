import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  levelChangeView,
  parseLevelHistory,
  type LevelChangeDirection,
} from "./home-level-chart";
import {
  displayLabelFromStoredBand,
  nextDistinctDisplayRung,
  type LevelBand,
} from "./level-bands";

export type HomeLevelInput = {
  band: LevelBand;
  level: string;
  provisional: boolean;
  ratedMatchesRemaining: number;
  history: readonly string[];
  progressPercent: number | null;
};

export type HomeLevelView = {
  displayBand: string;
  level: string;
  change: {
    direction: LevelChangeDirection;
    amount: string;
    spoken: string;
    windowLabel: string;
  } | null;
  provisional: boolean;
  progress: { percent: number; label: string } | null;
  legend: { lead: string; rest: string };
};

export function homeLevelView(
  input: HomeLevelInput,
  locale: Locale,
): HomeLevelView {
  const m = messagesFor(locale).home.level;
  const parsed = parseLevelHistory(input.history);
  const matchCount = parsed?.matchCount ?? 0;
  const change =
    parsed && matchCount > 0
      ? {
          ...levelChangeView(parsed.delta, locale),
          windowLabel: m.window(matchCount),
        }
      : null;

  const next = nextDistinctDisplayRung(input.band);
  const percent = Math.min(100, Math.max(0, input.progressPercent ?? 0));

  const remaining = input.ratedMatchesRemaining;
  const legend = input.provisional
    ? { lead: m.provisionalLead, rest: m.provisionalRest(remaining) }
    : { lead: m.confirmedLead, rest: m.confirmedRest };

  return {
    displayBand: displayLabelFromStoredBand(input.band),
    level: input.level,
    change,
    provisional: input.provisional,
    progress:
      next == null ? null : { percent, label: m.progressTo(percent, next) },
    legend,
  };
}
