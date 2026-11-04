import { formatDayMonth } from "@repo/domain/format-game-start";
import { initials } from "@repo/domain/initials";
import type { MatchOutcome } from "@repo/domain/result-mark";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { compactDelta, monthYear, nameList, signedLevel } from "./you-format";
import type { MyProfile } from "./you-hero-model";

export const LAST_TEN = 10;

export type FormSlotView =
  | { kind: "empty"; key: string; spoken: string }
  | {
      kind: "played";
      key: string;
      outcome: MatchOutcome;
      mark: string;
      delta: string | null;
      spoken: string;
    };

function outcomeMark(outcome: MatchOutcome, locale: Locale) {
  const m = messagesFor(locale).you.form;
  return outcome === "won" ? m.won : outcome === "lost" ? m.lost : m.drawn;
}

function outcomeWord(outcome: MatchOutcome, locale: Locale) {
  const m = messagesFor(locale).webYou.outcome;
  return outcome === "won" ? m.won : outcome === "lost" ? m.lost : m.draw;
}

/**
 * Ten slots, oldest first, padded with "not played" on the older side. The
 * strip follows the reading direction, so Arabic puts the latest on the left.
 */
export function lastTenSlots(
  newestFirst: readonly {
    matchId: string;
    outcome: MatchOutcome;
    delta?: number | null;
  }[],
  locale: Locale,
): FormSlotView[] {
  const m = messagesFor(locale).you.form;
  const played = newestFirst
    .slice(0, LAST_TEN)
    .reverse()
    .map((match): FormSlotView => {
      const delta = compactDelta(match.delta ?? null);
      const word = outcomeWord(match.outcome, locale);
      return {
        kind: "played",
        key: match.matchId,
        outcome: match.outcome,
        mark: outcomeMark(match.outcome, locale),
        delta,
        spoken: delta ? m.spoken(word, delta) : word,
      };
    });
  const empty = Array.from(
    { length: LAST_TEN - played.length },
    (_, index): FormSlotView => ({
      kind: "empty",
      key: `empty-${index}`,
      spoken: m.notPlayed,
    }),
  );
  return [...empty, ...played];
}

export function formRecord(
  newestFirst: readonly { outcome: MatchOutcome }[],
  locale: Locale,
): string {
  const m = messagesFor(locale).you.form;
  const shown = newestFirst.slice(0, LAST_TEN);
  const won = shown.filter((match) => match.outcome === "won").length;
  const lost = shown.filter((match) => match.outcome === "lost").length;
  const drawn = shown.length - won - lost;
  return drawn > 0 ? m.recordWithDrawn(won, lost, drawn) : m.record(won, lost);
}

export type TileView = { label: string; value: string; sub: string | null };

export function profileTiles(
  stats: MyProfile["stats"],
  locale: Locale,
): [TileView, TileView] {
  const m = messagesFor(locale).you.tiles;
  const setsPlayed = stats.sets.won + stats.sets.lost;
  const streak = stats.longestStreak;
  return [
    {
      label: m.sets,
      value: `${stats.sets.won}–${stats.sets.lost}`,
      sub:
        setsPlayed === 0
          ? null
          : m.setsWon(Math.round((stats.sets.won / setsPlayed) * 100)),
    },
    streak
      ? {
          label: m.longestStreak,
          value: m.wins(streak.count),
          sub: streak.reachedAt
            ? monthYear(streak.reachedAt, locale, "long")
            : null,
        }
      : { label: m.longestStreak, value: m.none, sub: null },
  ];
}

export type PartnerRowView = {
  userId: string;
  initials: string;
  name: string;
  image: string | null;
  record: string;
  percent: number;
  spoken: string;
};

export function partnerRows(
  partners: MyProfile["partners"],
  locale: Locale,
): PartnerRowView[] {
  const m = messagesFor(locale).you.partners;
  return partners.map((partner) => {
    const decided = partner.won + partner.lost;
    const percent =
      decided === 0 ? 0 : Math.round((partner.won / decided) * 100);
    return {
      userId: partner.userId,
      initials: initials(partner.name),
      name: partner.name,
      image: partner.image,
      record: m.record(partner.won, partner.lost),
      percent,
      spoken: m.spoken(partner.name, partner.won, partner.lost, percent),
    };
  });
}

export type RecentRowView = {
  matchId: string;
  outcome: MatchOutcome;
  title: string;
  sub: string;
  score: string | null;
  delta: string | null;
  href: string | null;
};

export function recentRows(
  recent: MyProfile["recent"],
  locale: Locale,
): RecentRowView[] {
  const m = messagesFor(locale).you.recent;
  return recent.map((match) => {
    const opponents = nameList(match.opponents, locale);
    return {
      matchId: match.matchId,
      outcome: match.outcome,
      title:
        match.partners.length > 0
          ? m.withVs(nameList(match.partners, locale), opponents)
          : m.vs(opponents),
      sub: m.when(
        formatDayMonth(match.playedAt, locale, { weekday: "short" }),
        match.groupName?.trim() ? match.groupName : m.friendly,
      ),
      score:
        match.sets.length === 0
          ? null
          : match.sets.map((set) => `${set.us}–${set.them}`).join("  "),
      delta: match.delta === null ? null : signedLevel(match.delta),
      href: match.canOpenGame ? `/dashboard/games/${match.gameId}` : null,
    };
  });
}
