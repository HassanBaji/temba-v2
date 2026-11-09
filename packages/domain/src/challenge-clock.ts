import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export const CHALLENGE_OPEN_DAYS = 7;

export const PROPOSAL_PENDING_HOURS = 48;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

type ClockRow = { status: string; expiresAt: Date | string };

function instant(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function challengeExpiresAt(postedAt: Date): Date {
  return new Date(postedAt.getTime() + CHALLENGE_OPEN_DAYS * MS_PER_DAY);
}

export function proposalExpiresAt(sentAt: Date): Date {
  return new Date(sentAt.getTime() + PROPOSAL_PENDING_HOURS * MS_PER_HOUR);
}

export function isProposalPending(row: ClockRow, now: Date) {
  return row.status === "pending" && instant(row.expiresAt) > now.getTime();
}

/**
 * A Challenge is open until `expires_at`, and past it while a Proposal is
 * still pending. Every read and door asks this, so a row the clock job has not
 * stamped yet never acts.
 */
export function isChallengeOpen(
  row: ClockRow,
  now: Date,
  hasPendingProposal = false,
) {
  if (row.status !== "open") {
    return false;
  }
  return instant(row.expiresAt) > now.getTime() || hasPendingProposal;
}

/** Whole days left, rounded up: a Challenge posted now has 7. Zero once due. */
export function challengeDaysLeft(expiresAt: Date | string, now: Date) {
  return Math.max(
    0,
    Math.ceil((instant(expiresAt) - now.getTime()) / MS_PER_DAY),
  );
}

/** Whole hours left on a Proposal, rounded up; zero once it is due. */
export function proposalHoursLeft(expiresAt: Date | string, now: Date) {
  return Math.max(
    0,
    Math.ceil((instant(expiresAt) - now.getTime()) / MS_PER_HOUR),
  );
}

/** "Expires in 22h", "Expires within the hour", or "Expired". */
export function proposalExpiresLine(
  expiresAt: Date | string,
  now: Date,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.proposal;
  if (instant(expiresAt) <= now.getTime()) {
    return m.expired;
  }
  const hours = proposalHoursLeft(expiresAt, now);
  return hours <= 1 ? m.expiresWithinHour : m.expiresIn(hours);
}
