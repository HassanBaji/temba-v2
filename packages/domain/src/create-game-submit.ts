import {
  CREATE_FLOW_FIELD_IDS,
  createShapeHasPools,
  friendlyTournamentSchedule,
  parseCreateMatchMinutes,
  validateFriendlyGameWhen,
  validateFriendlyGameWhere,
  validateTournamentName,
  type CreateFlowFieldIssue,
  type CreateFlowStep,
  type CreateTournamentShape,
} from "./create-game-flow";
import { formatGameWindowName, parseRequiredGameWindow } from "./game-window";
import {
  LEVEL_RANGE_INVERTED_MESSAGE,
  parseLevelBandSelectTenths,
  type LevelBandSelectValue,
} from "./level-range";
import { parseOptionalPricePerPlayerFils } from "./price-per-player";
import {
  buildKnockoutTree,
  buildPoolKnockoutTree,
} from "./tournament-knockout";
import { sizeTournamentRounds } from "./tournament-schedule";
import {
  clampQualifiersPerPool,
  defaultPoolCount,
  poolCountOptions,
  qualifiersPerPoolRange,
  resolveRoundCount,
  sizeFriendlyTournament,
} from "./tournament-sizing";

export type CreateSubmitIssue = CreateFlowFieldIssue & {
  step: CreateFlowStep;
};

type GameFields = {
  groupId: string;
  venueId: string;
  courtId: string;
  day: string;
  startTime: string;
  finishTime: string;
  pricePerPlayer: string;
  levelMin: LevelBandSelectValue;
  levelMax: LevelBandSelectValue;
};

type TournamentFields = Omit<GameFields, "courtId"> & {
  courtIds: readonly string[];
  teamCount: number;
  tournamentShape: CreateTournamentShape;
  poolCount: number;
  roundCount: number | null;
  qualifiersPerPool: number;
  matchMinutes: string;
  name: string;
  isPublic: boolean;
  allowSoloRegister: boolean;
};

function issueAtStep(
  issue: CreateFlowFieldIssue,
  step: CreateFlowStep,
): CreateSubmitIssue {
  return { ...issue, step };
}

function validateWhereAndWhen(draft: Omit<GameFields, "courtId">, now: Date) {
  const where = validateFriendlyGameWhere(draft.groupId, draft.venueId);
  if (!where.ok) {
    return { failed: true as const, issue: issueAtStep(where, 2) };
  }
  const when = validateFriendlyGameWhen(
    draft.day,
    draft.startTime,
    draft.finishTime,
    now,
  );
  if (!when.ok) {
    return { failed: true as const, issue: issueAtStep(when, 3) };
  }
  return { failed: false as const, when };
}

function validatePriceAndLevel(draft: Omit<GameFields, "courtId">) {
  const price = parseOptionalPricePerPlayerFils(draft.pricePerPlayer);
  if (!price.ok) {
    return {
      failed: true as const,
      issue: {
        ok: false as const,
        field: "pricePerPlayerFils",
        message: price.message,
        elementId: CREATE_FLOW_FIELD_IDS.pricePerPlayerFils ?? "",
        step: 4 as const,
      },
    };
  }
  const levelMinTenths = parseLevelBandSelectTenths(draft.levelMin, "min");
  const levelMaxTenths = parseLevelBandSelectTenths(draft.levelMax, "max");
  if (
    levelMinTenths != null &&
    levelMaxTenths != null &&
    levelMinTenths > levelMaxTenths
  ) {
    return {
      failed: true as const,
      issue: {
        ok: false as const,
        field: "levelMinTenths",
        message: LEVEL_RANGE_INVERTED_MESSAGE,
        elementId: CREATE_FLOW_FIELD_IDS.levelMinTenths ?? "",
        step: 4 as const,
      },
    };
  }
  return {
    failed: false as const,
    fils: price.fils,
    levelMinTenths,
    levelMaxTenths,
  };
}

export function validateFriendlyGameSubmit(draft: GameFields, now: Date) {
  const placed = validateWhereAndWhen(draft, now);
  if (placed.failed) {
    return placed.issue;
  }
  const priced = validatePriceAndLevel(draft);
  if (priced.failed) {
    return priced.issue;
  }
  return {
    ok: true as const,
    input: {
      name: formatGameWindowName(draft.day, draft.startTime, draft.finishTime),
      groupId: draft.groupId,
      isPublic: false,
      format: "friendly_game" as const,
      registrationMode: "individual" as const,
      windowStart: placed.when.windowStart,
      windowEnd: placed.when.windowEnd,
      venueId: draft.venueId,
      courtId: draft.courtId === "none" ? undefined : draft.courtId,
      ...(priced.fils !== null ? { pricePerPlayerFils: priced.fils } : {}),
      ...(priced.levelMinTenths !== null
        ? { levelMinTenths: priced.levelMinTenths }
        : {}),
      ...(priced.levelMaxTenths !== null
        ? { levelMaxTenths: priced.levelMaxTenths }
        : {}),
    },
  };
}

export function validateTournamentStepThree(
  draft: Pick<
    TournamentFields,
    | "day"
    | "startTime"
    | "finishTime"
    | "matchMinutes"
    | "tournamentShape"
    | "teamCount"
    | "poolCount"
  >,
  now: Date,
): CreateSubmitIssue | null {
  const when = validateFriendlyGameWhen(
    draft.day,
    draft.startTime,
    draft.finishTime,
    now,
  );
  if (!when.ok) {
    return issueAtStep(when, 3);
  }
  const minutes = parseCreateMatchMinutes(draft.matchMinutes);
  if (!minutes.ok) {
    return {
      ok: false as const,
      field: "matchMinutes",
      message: minutes.message,
      elementId: "tournament-match-minutes",
      step: 3 as const,
    };
  }
  if (
    createShapeHasPools(draft.tournamentShape) &&
    !sizeFriendlyTournament(draft.teamCount, draft.poolCount).ok
  ) {
    return {
      ok: false as const,
      field: "poolCount",
      message: "Pick a groups count",
      elementId: "tournament-pool-count",
      step: 3 as const,
    };
  }
  return null;
}

export function validateFriendlyTournamentSubmit(
  draft: TournamentFields,
  now: Date,
) {
  const placed = validateWhereAndWhen(draft, now);
  if (placed.failed) {
    return placed.issue;
  }
  const minutes = parseCreateMatchMinutes(draft.matchMinutes);
  if (!minutes.ok) {
    return {
      ok: false as const,
      field: "matchMinutes",
      message: minutes.message,
      elementId: "tournament-match-minutes",
      step: 3 as const,
    };
  }
  const named = validateTournamentName(draft.name);
  if (!named.ok) {
    return issueAtStep(named, 4);
  }
  const priced = validatePriceAndLevel(draft);
  if (priced.failed) {
    return priced.issue;
  }
  return {
    ok: true as const,
    input: {
      name: named.name,
      groupId: draft.groupId,
      isPublic: draft.isPublic,
      allowSoloRegister: draft.allowSoloRegister,
      teamCount: draft.teamCount,
      tournamentShape: draft.tournamentShape,
      ...(createShapeHasPools(draft.tournamentShape)
        ? {
            poolCount: draft.poolCount,
            ...(draft.roundCount !== null
              ? { roundCount: draft.roundCount }
              : {}),
          }
        : {}),
      ...(draft.tournamentShape === "groups_then_knockout"
        ? { qualifiersPerPool: draft.qualifiersPerPool }
        : {}),
      matchMinutes: minutes.minutes,
      windowStart: placed.when.windowStart,
      windowEnd: placed.when.windowEnd,
      venueId: draft.venueId,
      ...(draft.courtIds.length > 0 ? { courtIds: [...draft.courtIds] } : {}),
      ...(priced.fils !== null ? { pricePerPlayerFils: priced.fils } : {}),
      ...(priced.levelMinTenths !== null
        ? { levelMinTenths: priced.levelMinTenths }
        : {}),
      ...(priced.levelMaxTenths !== null
        ? { levelMaxTenths: priced.levelMaxTenths }
        : {}),
    },
  };
}

export function reclampQualifiersPerPool(
  teamCount: number,
  poolCount: number,
  current: number,
) {
  const sized = sizeFriendlyTournament(teamCount, poolCount);
  if (!sized.ok) {
    return current;
  }
  return clampQualifiersPerPool(sized.sizing.poolSizes, current) ?? current;
}

export function applyTeamCountChange(
  current: { poolCount: number; qualifiersPerPool: number },
  teamCount: number,
) {
  const poolCount = poolCountOptions(teamCount).includes(current.poolCount)
    ? current.poolCount
    : defaultPoolCount(teamCount);
  return {
    teamCount,
    poolCount,
    qualifiersPerPool: reclampQualifiersPerPool(
      teamCount,
      poolCount,
      current.qualifiersPerPool,
    ),
    roundCount: null,
  };
}

export function friendlyTournamentPlan(input: {
  teamCount: number;
  poolCount: number;
  roundCount: number | null;
  qualifiersPerPool: number;
  tournamentShape: CreateTournamentShape;
}) {
  const knockoutOnly = input.tournamentShape === "knockout_only";
  const groupsThenKnockout = input.tournamentShape === "groups_then_knockout";
  const knockoutTree = knockoutOnly
    ? buildKnockoutTree({ entrantCount: input.teamCount })
    : null;
  const sized = sizeFriendlyTournament(input.teamCount, input.poolCount);
  const sizing = !knockoutOnly && sized.ok ? sized.sizing : null;
  const resolvedRoundCount = sizing
    ? resolveRoundCount(sizing.poolSizes, input.roundCount)
    : null;
  const rounds =
    sizing && resolvedRoundCount != null
      ? sizeTournamentRounds(sizing.poolSizes, resolvedRoundCount)
      : null;
  const qualifiersRange =
    groupsThenKnockout && sizing
      ? qualifiersPerPoolRange(sizing.poolSizes)
      : null;
  const poolKnockoutTree =
    qualifiersRange && sizing
      ? buildPoolKnockoutTree({
          poolCount: sizing.poolCount,
          qualifiersPerPool: input.qualifiersPerPool,
        })
      : null;
  return {
    knockoutOnly,
    groupsThenKnockout,
    knockoutTree,
    sizing,
    rounds,
    qualifiersRange,
    poolKnockoutTree,
  };
}

export type FriendlyTournamentPlan = ReturnType<typeof friendlyTournamentPlan>;

export function friendlyTournamentScheduleFor(input: {
  plan: FriendlyTournamentPlan;
  day: string;
  startTime: string;
  finishTime: string;
  matchMinutes: string;
  courtCount: number;
  now: Date;
  clock: (date: Date) => string;
}) {
  const { plan } = input;
  const minutes = parseCreateMatchMinutes(input.matchMinutes);
  const window = parseRequiredGameWindow(
    input.day,
    input.startTime,
    input.finishTime,
  );
  const whenOk = validateFriendlyGameWhen(
    input.day,
    input.startTime,
    input.finishTime,
    input.now,
  ).ok;
  const roundMatches = plan.knockoutTree
    ? plan.knockoutTree.matchesPerRound
    : plan.rounds?.roundMatches;
  if (!whenOk || !minutes.ok || !window || !roundMatches) {
    return null;
  }
  return friendlyTournamentSchedule({
    start: window.windowStart,
    finish: window.windowEnd,
    roundMatches,
    courtCount: input.courtCount,
    matchMinutes: minutes.minutes,
    clock: input.clock,
    knockoutOnly: plan.knockoutOnly,
    knockoutRoundMatches: plan.poolKnockoutTree?.matchesPerRound,
  });
}
