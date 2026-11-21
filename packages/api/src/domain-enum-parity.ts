import type {
  CHALLENGE_TIMING_VALUES,
  GAME_PAYMENT_RETURN_REASON_VALUES,
  GAME_PAYMENT_STATUS_VALUES,
  LIVE_BOARD_COLOR_SCHEME_VALUES,
  LIVE_BOARD_SCREEN_VALUES,
  MARK_KIND_VALUES,
  MatchStatusEnum,
  PERFORMANCE_RATER_ROLE_VALUES,
  RATING_LEVEL_BAND_VALUES,
  SERIES_COLOUR_VALUES,
  SERIES_EMBLEM_VALUES,
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
import type {
  LIVE_BOARD_COLOR_SCHEMES,
  LIVE_BOARD_SCREENS,
} from "@repo/domain/live-board";
import type { MARK_KINDS } from "@repo/domain/marks";
import type { MatchStatus } from "@repo/domain/match-status";
import type { RATER_ROLES } from "@repo/domain/performance-rating";
import type { SERIES_COLOURS, SERIES_EMBLEMS } from "@repo/domain/series";

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
    Equal<
      (typeof LIVE_BOARD_SCREENS)[number],
      (typeof LIVE_BOARD_SCREEN_VALUES)[number]
    >
  >,
  AssertTrue<
    Equal<
      (typeof LIVE_BOARD_COLOR_SCHEMES)[number],
      (typeof LIVE_BOARD_COLOR_SCHEME_VALUES)[number]
    >
  >,
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
  AssertTrue<
    Equal<
      (typeof RATER_ROLES)[number],
      (typeof PERFORMANCE_RATER_ROLE_VALUES)[number]
    >
  >,
  AssertTrue<
    Equal<
      (typeof SERIES_EMBLEMS)[number],
      (typeof SERIES_EMBLEM_VALUES)[number]
    >
  >,
  AssertTrue<
    Equal<
      (typeof SERIES_COLOURS)[number],
      (typeof SERIES_COLOUR_VALUES)[number]
    >
  >,
];
