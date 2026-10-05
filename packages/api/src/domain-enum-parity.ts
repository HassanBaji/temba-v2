import type {
  MatchStatusEnum,
  RATING_LEVEL_BAND_VALUES,
} from "@repo/db/schema";

import type { LEVEL_BANDS } from "@repo/domain/level-bands";
import type { MatchStatus } from "@repo/domain/match-status";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type AssertTrue<T extends true> = T;

export type DomainEnumParity = [
  AssertTrue<
    Equal<
      (typeof LEVEL_BANDS)[number],
      (typeof RATING_LEVEL_BAND_VALUES)[number]
    >
  >,
  AssertTrue<Equal<`${MatchStatusEnum}`, MatchStatus>>,
];
