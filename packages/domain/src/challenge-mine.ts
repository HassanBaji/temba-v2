import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  challengeDaysLine,
  challengeLevelWanted,
  challengeProposalView,
  challengeVenuesLine,
  type ChallengeCardInput,
  type ChallengeProposalInput,
} from "./challenge-card";
import { challengeDaysLeft, proposalHoursLeft } from "./challenge-clock";
import { formatGameDay, formatGameStart } from "./format-game-start";
import { matchOutcome } from "./match-outcome";
import type { ResultMarkVariant } from "./result-mark";
import type { Sport } from "./sport";

/** The Mine segment's item kinds, in the order `challenges.listMine` returns them. */
export const CHALLENGE_MINE_KINDS = [
  "waiting",
  "posted",
  "pending",
  "accepted",
  "played",
] as const;

export type ChallengeMineKind = (typeof CHALLENGE_MINE_KINDS)[number];

/** Played Challenge Games list under Accepted, after the ones still to play. */
const CHALLENGE_MINE_SECTIONS = [
  "waiting",
  "posted",
  "pending",
  "accepted",
] as const;

export type ChallengeMineSectionKind = (typeof CHALLENGE_MINE_SECTIONS)[number];

function sectionOf(kind: ChallengeMineKind): ChallengeMineSectionKind {
  return kind === "played" ? "accepted" : kind;
}

/** A section's heading and the quiet hint beside it: "Posted", "waiting for a team". */
export function challengeMineHeading(
  kind: ChallengeMineSectionKind,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.tab.mine;
  switch (kind) {
    case "waiting":
      return { title: m.waiting, hint: null };
    case "posted":
      return { title: m.postedTitle, hint: m.postedHint };
    case "pending":
      return { title: m.pendingTitle, hint: m.pendingHint };
    case "accepted":
      return { title: m.acceptedTitle, hint: m.acceptedHint };
  }
}

/**
 * Mine's items grouped into headed sections, kept in display order. Only the
 * first Proposal waiting on the viewer is the screen's one focus.
 */
export function challengeMineSections<T extends { kind: ChallengeMineKind }>(
  items: readonly T[],
  locale: Locale,
) {
  return CHALLENGE_MINE_SECTIONS.map((kind) => ({
    kind,
    ...challengeMineHeading(kind, locale),
    items: items
      .filter((item) => sectionOf(item.kind) === kind)
      .sort(
        (a, b) =>
          CHALLENGE_MINE_KINDS.indexOf(a.kind) -
          CHALLENGE_MINE_KINDS.indexOf(b.kind),
      )
      .map((item, index) => ({
        item,
        focus: kind === "waiting" && index === 0,
      })),
  })).filter((section) => section.items.length > 0);
}

/** A played Challenge Game's score from the viewer's Team: "6–4, 3–6, 7–5". Null before a Score. */
export function challengeMineScoreLine(
  sets: readonly { us: number | null; them: number | null }[],
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.mine;
  const scored = sets.flatMap((set) =>
    set.us == null || set.them == null ? [] : [m.setScore(set.us, set.them)],
  );
  return scored.length > 0 ? scored.join(m.scoreSeparator) : null;
}

/** The viewer's Team's result, or not played before a Score. */
export function challengeMineOutcome(
  sets: readonly { us: number | null; them: number | null }[],
): ResultMarkVariant {
  const { result } = matchOutcome(
    sets.map((set) => ({ slot1GamesWon: set.us, slot2GamesWon: set.them })),
  );
  switch (result) {
    case "slot1":
      return "won";
    case "slot2":
      return "lost";
    case "draw":
      return "draw";
    case "none":
      return "not-played";
  }
}

/** "proposal expires in 22h", or "proposal expires within the hour". */
export function challengeMineExpiresLine(
  expiresAt: Date | string,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.tab.mine;
  const hours = proposalHoursLeft(expiresAt, now);
  return hours <= 1 ? m.expiresWithinHour : m.expiresIn(hours);
}

export type ChallengeMineWaitingInput = {
  sport?: Sport | null;
  posterTeam: { displayName: string };
  proposal: ChallengeProposalInput;
};

/** The waiting card: "Riffa Rackets accepted your challenge", "Seef Smashers, padel", the time and the venue. */
export function challengeMineWaitingView(
  input: ChallengeMineWaitingInput,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.tab;
  const proposal = challengeProposalView(input.proposal, now, locale);
  return {
    waitingLabel: m.mine.waiting,
    proposingTeam: proposal.title,
    posterTeam: input.posterTeam.displayName,
    title: m.mine.accepted(proposal.title),
    subtitle: input.sport
      ? m.mine.teamSport(input.posterTeam.displayName, m.sports[input.sport])
      : input.posterTeam.displayName,
    expiresLine: challengeMineExpiresLine(
      input.proposal.expiresAt,
      now,
      locale,
    ),
    proposedLabel: m.mine.proposed,
    proposedLine: proposal.whenLine,
    venueLabel: m.mine.venue,
    venueLine: proposal.whereLine,
    accessibilityLabel: proposal.accessibilityLabel,
  };
}

/** A posted row: "Gooz FC, football", "Fri, Sat evenings, Fantasy FC. Wants C to B-", "0 proposals", "6 days left". */
export function challengeMinePostedView(
  input: ChallengeCardInput,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const copy = m.challenge;
  const title = copy.tab.mine.teamSport(
    input.team.displayName,
    copy.tab.sports[input.sport],
  );
  const line = copy.tab.mine.postedLine(
    challengeDaysLine(input.days, input.timings, locale),
    challengeVenuesLine(input.venues, locale),
    challengeLevelWanted(
      input.levelMinTenths,
      input.levelMaxTenths,
      locale,
      input.sport,
    ),
  );
  const proposalsLine = copy.tab.mine.proposalCount(input.proposalCount);
  const daysLeftLine = copy.card.daysLeft(
    challengeDaysLeft(input.expiresAt, now),
  );
  return {
    title,
    line,
    proposalsLine,
    daysLeftLine,
    accessibilityLabel: [title, line, proposalsLine, daysLeftLine].join(
      m.group.metaSeparator,
    ),
  };
}

export type ChallengeMineGameInput = {
  kind: "accepted" | "played";
  startsAt: Date | string;
  team: { displayName: string };
  opponent: { displayName: string };
  venue?: { name: string } | null;
  cancelled: boolean;
  nameYourSquad: boolean;
  sets: readonly { us: number | null; them: number | null }[];
};

function resultLine(
  mark: ResultMarkVariant | null,
  score: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.tab.mine;
  if (score == null) {
    return null;
  }
  switch (mark) {
    case "won":
      return m.won(score);
    case "lost":
      return m.lost(score);
    case "draw":
      return m.drew(score);
    default:
      return null;
  }
}

/**
 * An accepted or played row: "Gooz FC vs Hidd United", then "Fri 14 Nov,
 * 7:00 PM, Fantasy FC" still to play, or "Played Mon 2 Nov, won 6–3, 6–4"
 * with its result mark.
 */
export function challengeMineGameView(
  input: ChallengeMineGameInput,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const copy = m.challenge;
  const title = copy.tab.mine.versus(
    input.team.displayName,
    input.opponent.displayName,
  );
  const played = input.kind === "played";
  const mark = played ? challengeMineOutcome(input.sets) : null;
  const result = resultLine(
    mark,
    challengeMineScoreLine(input.sets, locale),
    locale,
  );
  const day = formatGameDay(input.startsAt, locale, { weekday: "short" });
  const when = formatGameStart(input.startsAt, locale);
  const line = played
    ? result
      ? copy.tab.mine.playedWith(day, result)
      : copy.tab.mine.played(day)
    : input.venue
      ? copy.tab.mine.gameLine(when, input.venue.name)
      : when;
  const statusLine = input.cancelled
    ? copy.mine.cancelled
    : input.nameYourSquad
      ? copy.mine.nameYourSquad
      : null;
  return {
    title,
    line,
    statusLine,
    played,
    mark,
    accessibilityLabel: [title, line, statusLine]
      .filter((part): part is string => part != null)
      .join(m.group.metaSeparator),
  };
}
