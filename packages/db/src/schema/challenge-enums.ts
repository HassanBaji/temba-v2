import { pgEnum } from "drizzle-orm/pg-core";

export const CHALLENGE_STATUS_VALUES = [
  "open",
  "confirmed",
  "expired",
  "withdrawn",
] as const;

export type ChallengeStatus = (typeof CHALLENGE_STATUS_VALUES)[number];

export const challengeStatuses = pgEnum(
  "challenge_status",
  CHALLENGE_STATUS_VALUES,
);

/** Before noon, noon to 6 PM, after 6 PM: the same cuts as Play windows. */
export const CHALLENGE_TIMING_VALUES = [
  "morning",
  "afternoon",
  "evening",
] as const;

export type ChallengeTiming = (typeof CHALLENGE_TIMING_VALUES)[number];

export const challengeTimings = pgEnum(
  "challenge_timing",
  CHALLENGE_TIMING_VALUES,
);

export const WEEKDAY_VALUES = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type Weekday = (typeof WEEKDAY_VALUES)[number];

export const weekdays = pgEnum("weekday", WEEKDAY_VALUES);

export const PROPOSAL_STATUS_VALUES = [
  "pending",
  "confirmed",
  "declined",
  "withdrawn",
  "expired",
  "passed_over",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUS_VALUES)[number];

export const proposalStatuses = pgEnum(
  "proposal_status",
  PROPOSAL_STATUS_VALUES,
);
