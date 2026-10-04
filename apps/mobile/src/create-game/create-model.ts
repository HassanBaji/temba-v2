import {
  createFlowStepForField,
  applyLevelBoundChange,
  changeCreateDay,
  changeCreateGroup,
  changeCreateVenue,
  openLevelRange,
  resetCreateBranch,
  selectDurationFinish,
  selectStartSlot,
  reconcileWindowForDay,
  toggleCreateCourt,
  validateFriendlyGameWhen,
  validateFriendlyGameWhere,
  type CreateFlowStep,
  type CreateGameTypeId,
  type CreateTournamentShape,
} from "@repo/domain/create-game-flow";
import {
  initialCreateGameDraft,
  type CreateGameDraft,
} from "@repo/domain/create-game-draft";
import {
  applyTeamCountChange,
  reclampQualifiersPerPool,
  validateFriendlyGameSubmit,
  validateFriendlyTournamentSubmit,
  validateTournamentStepThree,
  type CreateSubmitIssue,
} from "@repo/domain/create-game-submit";
import type { LevelBandSelectValue } from "@repo/domain/level-range";

import { splitTrpcFormError } from "../lib/form-error";

export type CreateState = {
  type: CreateGameTypeId | null;
  step: CreateFlowStep;
  draft: CreateGameDraft;
};

export type CreateAction =
  | { kind: "selectType"; type: CreateGameTypeId }
  | { kind: "setStep"; step: CreateFlowStep }
  | { kind: "setGroup"; groupId: string }
  | { kind: "setVenue"; venueId: string }
  | { kind: "setCourt"; courtId: string }
  | { kind: "toggleCourt"; courtId: string }
  | { kind: "setDay"; day: string; now: Date }
  | { kind: "setStart"; slot: string }
  | { kind: "setFinish"; slot: string }
  | { kind: "setDuration"; minutes: number }
  | {
      kind: "setLevelBound";
      bound: "min" | "max";
      value: LevelBandSelectValue;
    }
  | { kind: "openLevelRange" }
  | { kind: "setPrice"; price: string }
  | { kind: "setTeamCount"; teamCount: number }
  | { kind: "setShape"; shape: CreateTournamentShape }
  | { kind: "setPoolCount"; poolCount: number }
  | { kind: "setRoundCount"; roundCount: number | null }
  | { kind: "setQualifiers"; qualifiersPerPool: number }
  | { kind: "setMatchMinutes"; minutes: string }
  | { kind: "setName"; name: string }
  | { kind: "setPublic"; isPublic: boolean }
  | { kind: "setAllowSolo"; allowSoloRegister: boolean };

export function initialCreateState(
  now: Date,
  groupId?: string,
  type: CreateGameTypeId | null = null,
): CreateState {
  return {
    type,
    step: type ? 2 : 1,
    draft: { ...initialCreateGameDraft(now), groupId: groupId ?? "" },
  };
}

function patch(state: CreateState, next: Partial<CreateGameDraft>) {
  return { ...state, draft: { ...state.draft, ...next } };
}

export function createReducer(
  state: CreateState,
  action: CreateAction,
): CreateState {
  const { draft } = state;
  switch (action.kind) {
    case "selectType": {
      if (action.type === state.type) {
        return { ...state, step: 1 };
      }
      return {
        type: action.type,
        step: 1,
        draft: resetCreateBranch(draft, action.type),
      };
    }
    case "setStep":
      return { ...state, step: action.step };
    case "setGroup":
      return { ...state, draft: changeCreateGroup(draft, action.groupId) };
    case "setVenue":
      return { ...state, draft: changeCreateVenue(draft, action.venueId) };
    case "setCourt":
      return patch(state, { courtId: action.courtId });
    case "toggleCourt":
      return patch(state, {
        courtIds: toggleCreateCourt(draft.courtIds, action.courtId),
      });
    case "setDay": {
      const named = changeCreateDay(draft, action.day);
      const times = reconcileWindowForDay(
        draft,
        action.day,
        action.now,
        state.type === "friendly_tournament" ? "blocked" : "allowed",
      );
      return { ...state, draft: { ...named, ...times } };
    }
    case "setStart":
      return patch(
        state,
        selectStartSlot(
          draft,
          action.slot,
          state.type !== "friendly_tournament",
        ),
      );
    case "setFinish":
      return patch(state, { finishTime: action.slot });
    case "setDuration":
      return patch(state, {
        finishTime: selectDurationFinish(draft.startTime, action.minutes),
      });
    case "setLevelBound": {
      const range = applyLevelBoundChange(
        { min: draft.levelMin, max: draft.levelMax },
        action.bound,
        action.value,
      );
      return patch(state, {
        levelMin: range.min,
        levelMax: range.max,
        preferLevelRange: true,
      });
    }
    case "openLevelRange": {
      const open = openLevelRange();
      return patch(state, {
        levelMin: open.min,
        levelMax: open.max,
        preferLevelRange: false,
      });
    }
    case "setPrice":
      return patch(state, { pricePerPlayer: action.price });
    case "setTeamCount":
      return patch(
        state,
        applyTeamCountChange(
          {
            poolCount: draft.poolCount,
            qualifiersPerPool: draft.qualifiersPerPool,
          },
          action.teamCount,
        ),
      );
    case "setShape":
      return patch(state, { tournamentShape: action.shape });
    case "setPoolCount":
      return patch(state, {
        poolCount: action.poolCount,
        qualifiersPerPool: reclampQualifiersPerPool(
          draft.teamCount,
          action.poolCount,
          draft.qualifiersPerPool,
        ),
        roundCount: null,
      });
    case "setRoundCount":
      return patch(state, { roundCount: action.roundCount });
    case "setQualifiers":
      return patch(state, { qualifiersPerPool: action.qualifiersPerPool });
    case "setMatchMinutes":
      return patch(state, { matchMinutes: action.minutes });
    case "setName":
      return patch(state, { name: action.name, nameTouched: true });
    case "setPublic":
      return patch(state, { isPublic: action.isPublic });
    case "setAllowSolo":
      return patch(state, { allowSoloRegister: action.allowSoloRegister });
  }
}

export type FieldErrors = Partial<Record<string, string>>;

export type AdvanceContext = {
  now: Date;
  venuesPending: boolean;
  emptyCatalog: boolean;
  groupFieldError?: string;
};

export type AdvanceResult =
  | { moved: true; state: CreateState }
  | { moved: false; errors: FieldErrors };

const STAY: AdvanceResult = { moved: false, errors: {} };

function blockedBy(issue: { field: string; message: string }): AdvanceResult {
  return { moved: false, errors: { [issue.field]: issue.message } };
}

export function advance(
  state: CreateState,
  context: AdvanceContext,
): AdvanceResult {
  const { draft } = state;
  if (state.step === 1) {
    if (!state.type) {
      return blockedBy({ field: "type", message: "Pick a Game type" });
    }
    return { moved: true, state: { ...state, step: 2 } };
  }
  if (state.step === 2) {
    if (context.venuesPending || context.emptyCatalog) {
      return STAY;
    }
    const where = validateFriendlyGameWhere(draft.groupId, draft.venueId);
    if (!where.ok) {
      return blockedBy({
        field: where.field,
        message:
          where.field === "groupId" && context.groupFieldError
            ? context.groupFieldError
            : where.message,
      });
    }
    return { moved: true, state: { ...state, step: 3 } };
  }
  if (state.step === 3) {
    const issue =
      state.type === "friendly_tournament"
        ? validateTournamentStepThree(draft, context.now)
        : (() => {
            const when = validateFriendlyGameWhen(
              draft.day,
              draft.startTime,
              draft.finishTime,
              context.now,
            );
            return when.ok ? null : when;
          })();
    if (issue) {
      return blockedBy(issue);
    }
    return { moved: true, state: { ...state, step: 4 } };
  }
  return STAY;
}

export type SubmitRequest =
  | {
      kind: "friendly_game";
      input: Extract<
        ReturnType<typeof validateFriendlyGameSubmit>,
        { ok: true }
      >["input"];
    }
  | {
      kind: "friendly_tournament";
      input: Extract<
        ReturnType<typeof validateFriendlyTournamentSubmit>,
        { ok: true }
      >["input"];
    };

export type SubmitResult =
  | { ok: true; request: SubmitRequest }
  | { ok: false; step: CreateFlowStep; errors: FieldErrors };

export function submitRequest(state: CreateState, now: Date): SubmitResult {
  const issueResult = (issue: CreateSubmitIssue): SubmitResult => ({
    ok: false,
    step: issue.step,
    errors: { [issue.field]: issue.message },
  });
  if (state.type === "friendly_tournament") {
    const result = validateFriendlyTournamentSubmit(state.draft, now);
    return result.ok
      ? {
          ok: true,
          request: { kind: "friendly_tournament", input: result.input },
        }
      : issueResult(result);
  }
  const result = validateFriendlyGameSubmit(state.draft, now);
  return result.ok
    ? { ok: true, request: { kind: "friendly_game", input: result.input } }
    : issueResult(result);
}

export function serverFailure(
  error: { message: string; data?: { zodError?: unknown } | null },
  currentStep: CreateFlowStep,
) {
  const { fieldErrors, globalMessage } = splitTrpcFormError(error);
  const first = Object.keys(fieldErrors)[0];
  return {
    fieldErrors: fieldErrors as FieldErrors,
    globalMessage,
    step: first ? createFlowStepForField(first) : currentStep,
  };
}
