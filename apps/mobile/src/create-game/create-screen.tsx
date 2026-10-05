import { useUser } from "@clerk/expo";
import { parseCreateFlowType } from "@repo/domain/create-game-flow";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useReducer, useState } from "react";

import { gamePath } from "../games/games-model";
import { slotOf } from "../lib/slot-of";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import {
  advance,
  createReducer,
  initialCreateState,
  serverFailure,
  submitRequest,
  type CreateAction,
  type FieldErrors,
} from "./create-model";
import { CREATE_ENTRY_HEADER } from "./create-header";
import { CreateView } from "./create-view";
import { StepShell } from "./step-shell";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const GROUP_REFUSED = "You cannot create a Game in that Group.";

export function CreateGameScreen({
  groupId,
  type,
}: {
  groupId?: string;
  type?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const { isLoaded, user } = useUser();
  const utils = api.useUtils();
  const [now, setNow] = useState(() => new Date());
  const [state, rawDispatch] = useReducer(createReducer, undefined, () =>
    initialCreateState(now, undefined, parseCreateFlowType(type ?? null)),
  );
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [groupFieldError, setGroupFieldError] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const groups = api.games.listCreateGroups.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const picker = api.games.listCreateVenues.useQuery(
    { groupId: state.draft.groupId },
    { ...REFETCH_ON_FOREGROUND, enabled: Boolean(state.draft.groupId) },
  );
  const linkedVenueId = picker.data?.locked
    ? picker.data.venues[0]?.id
    : undefined;

  const dispatch = useCallback((action: CreateAction) => {
    setClientErrors({});
    setServerErrors({});
    setFormMessage(null);
    if (action.kind === "setGroup") {
      setGroupFieldError(undefined);
    }
    rawDispatch(action);
  }, []);

  useEffect(() => {
    if (!groups.data || !groupId) {
      return;
    }
    if (groups.data.some((group) => group.id === groupId)) {
      rawDispatch({ kind: "setGroup", groupId });
      return;
    }
    setGroupFieldError(GROUP_REFUSED);
  }, [groups.data, groupId]);

  useEffect(() => {
    if (linkedVenueId) {
      rawDispatch({ kind: "setVenue", venueId: linkedVenueId });
    }
  }, [linkedVenueId, state.draft.groupId]);

  const onCreated = useCallback(
    async (gameId: string, created: string) => {
      toast.show(created);
      await Promise.all([
        utils.users.home.invalidate(),
        utils.games.listPublicPickup.invalidate(),
        utils.games.listMyGames.invalidate(),
        state.draft.groupId
          ? utils.groups.byId.invalidate({ id: state.draft.groupId })
          : Promise.resolve(),
      ]);
      router.replace(gamePath(gameId));
    },
    [router, toast, utils, state.draft.groupId],
  );

  const onFailed = useCallback(
    (error: { message: string; data?: { zodError?: unknown } | null }) => {
      const failure = serverFailure(error, state.step);
      setServerErrors(failure.fieldErrors);
      setFormMessage(failure.globalMessage);
      toast.show(failure.globalMessage ?? error.message);
      rawDispatch({ kind: "setStep", step: failure.step });
    },
    [state.step, toast],
  );

  const createGame = api.games.create.useMutation({
    onSuccess: (game) => onCreated(game.id, "Game created"),
    onError: onFailed,
  });
  const createTournament = api.games.createTournament.useMutation({
    onSuccess: (game) => onCreated(game.id, "Tournament created"),
    onError: onFailed,
  });
  const pending = createGame.isPending || createTournament.isPending;

  const onContinue = useCallback(() => {
    if (pending) {
      return;
    }
    if (state.step < 4) {
      const result = advance(state, {
        now,
        venuesPending: Boolean(state.draft.groupId) && picker.isLoading,
        emptyCatalog:
          picker.data !== undefined &&
          !picker.data.locked &&
          picker.data.venues.length === 0,
        groupFieldError,
      });
      if (result.moved) {
        setClientErrors({});
        rawDispatch({ kind: "setStep", step: result.state.step });
      } else {
        setClientErrors(result.errors);
      }
      return;
    }
    const result = submitRequest(state, now);
    if (!result.ok) {
      setClientErrors(result.errors);
      if (result.step !== state.step) {
        rawDispatch({ kind: "setStep", step: result.step });
      }
      return;
    }
    setServerErrors({});
    setFormMessage(null);
    if (result.request.kind === "friendly_tournament") {
      createTournament.mutate(result.request.input);
    } else {
      createGame.mutate(result.request.input);
    }
  }, [
    pending,
    state,
    now,
    picker.isLoading,
    picker.data,
    groupFieldError,
    createTournament,
    createGame,
  ]);

  const onBack = useCallback(() => {
    if (state.step > 1) {
      setClientErrors({});
      rawDispatch({
        kind: "setStep",
        step: (state.step - 1) as 1 | 2 | 3,
      });
      return;
    }
    router.back();
  }, [router, state.step]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNow(new Date());
    try {
      await Promise.all([
        groups.refetch(),
        state.draft.groupId ? picker.refetch() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [groups, picker, state.draft.groupId]);

  if (isLoaded && user?.publicMetadata.groupCreator !== true) {
    return (
      <StepShell step={null} header={CREATE_ENTRY_HEADER}>
        <Surface style={{ gap: 8 }} accessibilityRole="alert">
          <Text size="lead" weight="semibold">
            Creating Games is not available for your account yet
          </Text>
          <Text size="meta" tone="muted">
            Ask a Group organizer to add you, or join a Game from the Games tab.
          </Text>
        </Surface>
      </StepShell>
    );
  }

  const groupError = clientErrors.groupId ?? groupFieldError;
  const errors: FieldErrors = {
    ...serverErrors,
    ...clientErrors,
    ...(groupError ? { groupId: groupError } : {}),
  };

  return (
    <CreateView
      state={state}
      now={now}
      errors={errors}
      formMessage={formMessage}
      groups={slotOf(groups)}
      picker={state.draft.groupId ? slotOf(picker) : null}
      pending={pending}
      dispatch={dispatch}
      onBack={onBack}
      onContinue={onContinue}
      onCancel={() => router.back()}
      onRetry={() => void groups.refetch()}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}
