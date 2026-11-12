import { isolate } from "@repo/i18n/bidi";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatOvr } from "./football-ovr";
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
import type { Sport } from "./sport";

export type HomeLevelInput = {
  /** Padel unless asked. Football reads its Level as OVR. */
  sport?: Sport;
  /** The whole-number OVR from `ratings.me`; the history is in OVR too. */
  ovr?: number | null;
  band: LevelBand;
  level: string;
  provisional: boolean;
  ratedMatchesRemaining: number;
  history: readonly string[];
  /** Rated Matches among the history's changes; Level sets are not Matches. */
  historyMatchCount: number;
  progressPercent: number | null;
};

export type HomeLevelView = {
  displayBand: string;
  /** "Level", or "OVR" on football. */
  numberLabel: string;
  level: string;
  change: {
    direction: LevelChangeDirection;
    amount: string;
    /** "+0.3", "−0.4" or "0.0", isolated so the sign stays put in Arabic. */
    signedAmount: string;
    spoken: string;
    windowLabel: string;
  } | null;
  provisional: boolean;
  progress: { percent: number; label: string } | null;
  legend: { lead: string; rest: string };
};

const SIGN: Record<LevelChangeDirection, string> = {
  up: "+",
  down: "\u2212",
  none: "",
};

export function homeLevelView(
  input: HomeLevelInput,
  locale: Locale,
): HomeLevelView {
  const all = messagesFor(locale);
  const m = all.home.level;
  const ovr =
    input.sport === "football" && input.ovr != null ? input.ovr : null;
  const parsed = parseLevelHistory(input.history);
  const matchCount = input.historyMatchCount;
  const changeView = parsed
    ? levelChangeView(parsed.delta, locale, ovr == null ? 1 : 0)
    : null;
  const change =
    changeView && matchCount > 0
      ? {
          ...changeView,
          signedAmount: isolate(
            `${SIGN[changeView.direction]}${changeView.amount}`,
          ),
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
    numberLabel:
      ovr == null ? all.home.levelSection.level : all.rating.ovr.label,
    level: ovr == null ? input.level : formatOvr(ovr),
    change,
    provisional: input.provisional,
    progress:
      next == null ? null : { percent, label: m.progressTo(percent, next) },
    legend,
  };
}
