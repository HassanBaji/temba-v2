import type {
  CHALLENGE_TIMING_VALUES,
  GAME_PAYMENT_RETURN_REASON_VALUES,
  GAME_PAYMENT_STATUS_VALUES,
  MARK_KIND_VALUES,
  MatchStatusEnum,
  RATING_LEVEL_BAND_VALUES,
  WEEKDAY_VALUES,
} from "@repo/db/schema";

import type {
  CHALLENGE_TIMINGS,
  CHALLENGE_WEEKDAYS,
} from "@repo/domain/challenge-form";

import type {
  GAME_PAYMENT_RETURN_REASONS,
  GAME_PAYMENT_STATUSES,
} from "@repo/domain/game-payments";
import type { LEVEL_BANDS } from "@repo/domain/level-bands";
import type { MARK_KINDS } from "@repo/domain/marks";
import type { MatchStatus } from "@repo/domain/match-status";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type AssertTrue<T extends true> = T;

export type DomainEnumParity = [
  AssertTrue<
    Equal<
      (typeof GAME_PAYMENT_STATUSES)[number],
      (typeof GAME_PAYMENT_STATUS_VALUES)[number]
    >
  >,
  AssertTrue<
    Equal<
      (typeof GAME_PAYMENT_RETURN_REASONS)[number],
      (typeof GAME_PAYMENT_RETURN_REASON_VALUES)[number]
    >
  >,
  AssertTrue<
    Equal<
      (typeof LEVEL_BANDS)[number],
      (typeof RATING_LEVEL_BAND_VALUES)[number]
    >
  >,
  AssertTrue<Equal<`${MatchStatusEnum}`, MatchStatus>>,
  AssertTrue<
    Equal<(typeof MARK_KINDS)[number], (typeof MARK_KIND_VALUES)[number]>
  >,
  AssertTrue<
    Equal<(typeof CHALLENGE_WEEKDAYS)[number], (typeof WEEKDAY_VALUES)[number]>
  >,
  AssertTrue<
    Equal<
      (typeof CHALLENGE_TIMINGS)[number],
      (typeof CHALLENGE_TIMING_VALUES)[number]
    >
  >,
];
