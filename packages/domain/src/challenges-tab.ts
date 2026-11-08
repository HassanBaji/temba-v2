import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export const CHALLENGES_TABS = ["open", "mine", "teams"] as const;

export type ChallengesTab = (typeof CHALLENGES_TABS)[number];

export function challengesTabFromQuery(
  tab: string | null | undefined,
): ChallengesTab {
  if (tab === "mine" || tab === "teams") {
    return tab;
  }
  return "open";
}

export function challengesTabQuery(tab: ChallengesTab) {
  return tab === "open" ? "" : `?tab=${tab}`;
}

export type ChallengesCounts = Record<ChallengesTab, number | null>;

/** Open, Mine and Teams in order; a count shows only once it is known and above zero. */
export function challengesSegments(counts: ChallengesCounts, locale: Locale) {
  const m = messagesFor(locale).challenge.segments;
  return CHALLENGES_TABS.map((key) => {
    const count = counts[key] != null && counts[key] > 0 ? counts[key] : null;
    return {
      key,
      label: m[key],
      count,
      accessibilityLabel: count == null ? m[key] : m.withCount(m[key], count),
    };
  });
}
