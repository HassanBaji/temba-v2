import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/** The Mine segment's sections, in the order `challenges.listMine` returns them. */
export const CHALLENGE_MINE_KINDS = [
  "waiting",
  "posted",
  "pending",
  "accepted",
  "played",
] as const;

export type ChallengeMineKind = (typeof CHALLENGE_MINE_KINDS)[number];

export function challengeMineTitle(kind: ChallengeMineKind, locale: Locale) {
  const m = messagesFor(locale).challenge.mine;
  switch (kind) {
    case "waiting":
      return m.waitingTitle;
    case "posted":
      return m.postedTitle;
    case "pending":
      return m.pendingTitle;
    case "accepted":
      return m.acceptedTitle;
    case "played":
      return m.playedTitle;
  }
}

/**
 * Mine's items grouped into titled sections, kept in display order. Only the
 * first Proposal waiting on the viewer is the screen's one focus.
 */
export function challengeMineSections<T extends { kind: ChallengeMineKind }>(
  items: readonly T[],
  locale: Locale,
) {
  return CHALLENGE_MINE_KINDS.map((kind) => ({
    kind,
    title: challengeMineTitle(kind, locale),
    items: items
      .filter((item) => item.kind === kind)
      .map((item, index) => ({
        item,
        focus: kind === "waiting" && index === 0,
      })),
  })).filter((section) => section.items.length > 0);
}
