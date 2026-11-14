"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import {
  CreateFlowShell,
  CreateFlowSkeleton,
} from "~/app/dashboard/games/new/create-flow-shell";
import { FriendlyGameSteps } from "~/app/dashboard/games/new/friendly-game-steps";
import { FriendlyTournamentSteps } from "~/app/dashboard/games/new/friendly-tournament-steps";
import { TypeStep } from "~/app/dashboard/games/new/type-step";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { PageTitle } from "~/components/layout/page-title";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  CREATE_FLOW_FIELD_IDS,
  DEFAULT_MATCH_MINUTES,
  DEFAULT_TOURNAMENT_SHAPE,
  changeFootballPlayersAllowed,
  changeFootballSideSize,
  createFlowFirstStep,
  createFlowLaterSteps,
  createFlowStepForField,
  createVenueCopy,
  earliestCreateDay,
  friendlyGameKickoff,
  friendlyGamePreviewLines,
  friendlyTournamentDefaultName,
  friendlyTournamentMatchCountLabel,
  friendlyTournamentPreviewDetail,
  knockoutMatchCountLabel,
  openLevelRange,
  resetCreateBranch,
  changeCreateGroup,
  changeCreateVenue,
  choosePublicGame,
  choosePublicGameSport,
  createDraftSport,
  isPublicGameDraft,
  publicGameOffered,
  toggleCreateCourt,
  changeCreateDay,
  createLevelRangeShown,
  parseCreateMatchMinutes,
  validateFriendlyGameWhen,
  validateFriendlyGameWhere,
  parseCreateFlowStep,
  parseCreateFlowType,
  resolveCreateFlowStep,
  type CreateFlowStep,
  type CreateGameTypeId,
  type CreateTournamentShape,
  type FriendlyGameDraft,
} from "@repo/domain/create-game-flow";
import {
  applyTeamCountChange,
  friendlyTournamentPlan,
  reclampQualifiersPerPool,
  validateFootballGameSubmit,
  validateFriendlyGameSubmit,
  validateFriendlyTournamentSubmit,
  validateTournamentStepThree,
  type CreateSubmitIssue,
} from "@repo/domain/create-game-submit";
import { browserSessionStorage } from "~/lib/browser-session-storage";
import { createGameFlowHref } from "~/lib/create-game-flow-href";
import {
  clearCreateGameDrafts,
  initialCreateGameDraft,
  isCreateGameDraftDirty,
  readCreateGameDraft,
  serializeCreateGameDraft,
  writeCreateGameDraft,
  type CreateGameDraft,
} from "@repo/domain/create-game-draft";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  splitTrpcFormError,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import {
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";
import {
  DEFAULT_QUALIFIERS_PER_POOL,
  defaultPoolCount,
  TOURNAMENT_DEFAULT_TEAM_COUNT,
} from "@repo/domain/tournament-sizing";
import type { MvpMode } from "@repo/domain/marks";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import { api } from "~/trpc/react";

type FormFailure = Parameters<typeof focusFormFailure>[0];

function focusElement(id: string) {
  document.getElementById(id)?.focus();
}

function NewGameForm() {
  const m = useMessages();
  const locale = useLocale();
  const c = m.webDashboard.createGame;
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedGroupId = searchParams.get("groupId") ?? undefined;
  const typeParam = parseCreateFlowType(searchParams.get("type"));
  const stepParam = parseCreateFlowStep(searchParams.get("step"));

  const summaryRef = React.useRef<HTMLDivElement>(null);
  const pendingFocus = React.useRef<{
    step: CreateFlowStep;
    elementId?: string;
    error?: FormFailure;
  } | null>(null);
  const [session] = React.useState(() => ({ now: new Date() }));
  const [selectedGroupId, setSelectedGroupId] = React.useState("");
  const [groupFieldError, setGroupFieldError] = React.useState<
    string | undefined
  >();
  const [day, setDay] = React.useState(() => earliestCreateDay(session.now));
  const [startTime, setStartTime] = React.useState("");
  const [finishTime, setFinishTime] = React.useState("");
  const [venueId, setVenueId] = React.useState("");
  const [courtId, setCourtId] = React.useState("none");
  const [pricePerPlayer, setPricePerPlayer] = React.useState("");
  const [levelMin, setLevelMin] = React.useState<LevelBandSelectValue>(
    LEVEL_BAND_SELECT_NONE,
  );
  const [levelMax, setLevelMax] = React.useState<LevelBandSelectValue>(
    LEVEL_BAND_SELECT_NONE,
  );
  const [courtIds, setCourtIds] = React.useState<string[]>([]);
  const [teamCount, setTeamCount] = React.useState(
    TOURNAMENT_DEFAULT_TEAM_COUNT,
  );
  const [tournamentShape, setTournamentShape] =
    React.useState<CreateTournamentShape>(DEFAULT_TOURNAMENT_SHAPE);
  const [poolCount, setPoolCount] = React.useState(() =>
    defaultPoolCount(TOURNAMENT_DEFAULT_TEAM_COUNT),
  );
  const [roundCount, setRoundCount] = React.useState<number | null>(null);
  const [qualifiersPerPool, setQualifiersPerPool] = React.useState(
    DEFAULT_QUALIFIERS_PER_POOL,
  );
  const [matchMinutesInput, setMatchMinutesInput] = React.useState(
    String(DEFAULT_MATCH_MINUTES),
  );
  const [nameTouched, setNameTouched] = React.useState(false);
  const [name, setName] = React.useState(() =>
    friendlyTournamentDefaultName(earliestCreateDay(session.now), locale),
  );
  const [customName, setCustomName] = React.useState("");
  const [preferLevelRange, setPreferLevelRange] = React.useState(false);
  const [isPublic, setIsPublic] = React.useState(false);
  const [publicSport, setPublicSport] = React.useState<Sport>(DEFAULT_SPORT);
  const [allowSoloRegister, setAllowSoloRegister] = React.useState(true);
  const [sideSize, setSideSize] = React.useState(
    () => initialCreateGameDraft(session.now, locale).sideSize,
  );
  const [playersAllowed, setPlayersAllowed] = React.useState(
    () => initialCreateGameDraft(session.now, locale).playersAllowed,
  );
  const [rated, setRated] = React.useState(true);
  const [trackPayments, setTrackPayments] = React.useState(false);
  const [keepersPlayFree, setKeepersPlayFree] = React.useState(true);
  const [mvpMode, setMvpMode] = React.useState<MvpMode>("vote");
  const [errors, setErrors] = React.useState<
    Record<string, string | undefined>
  >({});
  const [draftRestored, setDraftRestored] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const draftClosed = React.useRef(false);

  function applyDraft(next: CreateGameDraft) {
    setSelectedGroupId(next.groupId);
    setVenueId(next.venueId);
    setCourtId(next.courtId);
    setCourtIds(next.courtIds);
    setDay(next.day);
    setStartTime(next.startTime);
    setFinishTime(next.finishTime);
    setPricePerPlayer(next.pricePerPlayer);
    setLevelMin(next.levelMin);
    setLevelMax(next.levelMax);
    setPreferLevelRange(next.preferLevelRange);
    setTeamCount(next.teamCount);
    setTournamentShape(next.tournamentShape);
    setPoolCount(next.poolCount);
    setRoundCount(next.roundCount);
    setQualifiersPerPool(next.qualifiersPerPool);
    setMatchMinutesInput(next.matchMinutes);
    setName(next.name);
    setNameTouched(next.nameTouched);
    setCustomName(next.customName);
    setIsPublic(next.isPublic);
    setPublicSport(next.publicSport);
    setAllowSoloRegister(next.allowSoloRegister);
    setSideSize(next.sideSize);
    setPlayersAllowed(next.playersAllowed);
    setRated(next.rated);
    setTrackPayments(next.trackPayments);
    setKeepersPlayFree(next.keepersPlayFree);
  }

  React.useEffect(() => {
    if (draftRestored) {
      return;
    }
    const restored = typeParam
      ? readCreateGameDraft(browserSessionStorage(), typeParam)
      : null;
    if (restored) {
      applyDraft(restored);
    }
    setDraftRestored(true);
  }, [draftRestored, typeParam]);

  const publicGame =
    typeParam === "friendly_game" &&
    isPublicGameDraft({ groupId: selectedGroupId, isPublic });
  const draft: FriendlyGameDraft & { matchMinutes: string } = {
    groupId: selectedGroupId,
    venueId,
    day,
    startTime,
    finishTime,
    isPublic: publicGame,
    matchMinutes: matchMinutesInput,
  };
  const createGroups = api.games.listCreateGroups.useQuery();
  const selectedGroup = createGroups.data?.find(
    (group) => group.id === selectedGroupId,
  );
  const sport = createDraftSport(
    { groupId: selectedGroupId, isPublic: publicGame, publicSport },
    selectedGroup?.sport,
  );
  const football = sport === "football";
  const firstStep = createFlowFirstStep(sport);
  const flowType = football ? "friendly_game" : typeParam;
  const resolvedStep = resolveCreateFlowStep({
    type: flowType,
    requestedStep: stepParam,
    draft,
    now: session.now,
  });
  const displayedStep = Math.max(resolvedStep, firstStep) as CreateFlowStep;
  const groupVerified = selectedGroup?.verified ?? false;
  const venuesWanted = Boolean(selectedGroupId) || publicGame;
  const picker = api.games.listCreateVenues.useQuery(
    publicGame ? { publicGame: true, sport } : { groupId: selectedGroupId },
    { enabled: venuesWanted },
  );
  const selectedVenue = picker.data?.venues.find(
    (venue) => venue.id === venueId,
  );
  const emptyCatalog =
    picker.data !== undefined &&
    !picker.data.locked &&
    picker.data.venues.length === 0;
  const linkedVenueId = picker.data?.locked
    ? picker.data.venues[0]?.id
    : undefined;

  React.useEffect(() => {
    if (!createGroups.data || !requestedGroupId) {
      return;
    }
    const match = createGroups.data.some(
      (group) => group.id === requestedGroupId,
    );
    if (match) {
      setSelectedGroupId((current) => current || requestedGroupId);
      return;
    }
    setGroupFieldError(c.cannotCreateInGroup);
  }, [c.cannotCreateInGroup, createGroups.data, requestedGroupId]);

  React.useEffect(() => {
    if (!linkedVenueId) {
      return;
    }
    setVenueId(linkedVenueId);
  }, [linkedVenueId]);

  const createDraft: CreateGameDraft = {
    groupId: selectedGroupId,
    venueId,
    courtId,
    courtIds,
    day,
    startTime,
    finishTime,
    pricePerPlayer,
    levelMin,
    levelMax,
    preferLevelRange,
    teamCount,
    tournamentShape,
    poolCount,
    roundCount,
    qualifiersPerPool,
    matchMinutes: matchMinutesInput,
    name,
    nameTouched,
    customName,
    isPublic,
    publicSport,
    allowSoloRegister,
    sideSize,
    playersAllowed,
    rated,
    trackPayments,
    keepersPlayFree,
  };
  const initialGroupId =
    requestedGroupId &&
    createGroups.data?.some((group) => group.id === requestedGroupId)
      ? requestedGroupId
      : "";
  const draftDirty = isCreateGameDraftDirty(createDraft, {
    ...initialCreateGameDraft(session.now, locale),
    groupId: initialGroupId,
    venueId:
      initialGroupId && selectedGroupId === initialGroupId
        ? (linkedVenueId ?? "")
        : "",
  });
  const storedDraft = draftDirty ? serializeCreateGameDraft(createDraft) : null;

  React.useEffect(() => {
    if (!draftRestored || !typeParam || draftClosed.current) {
      return;
    }
    writeCreateGameDraft(browserSessionStorage(), typeParam, storedDraft);
  }, [draftRestored, storedDraft, typeParam]);

  React.useEffect(() => {
    if (
      !draftRestored ||
      !createGroups.data ||
      createGroups.data.length === 0
    ) {
      return;
    }
    if (stepParam != null && stepParam !== displayedStep) {
      router.replace(
        createGameFlowHref({
          groupId: requestedGroupId,
          type: flowType,
          step: displayedStep === 1 ? null : displayedStep,
        }),
      );
    }
  }, [
    createGroups.data,
    displayedStep,
    draftRestored,
    requestedGroupId,
    router,
    stepParam,
    flowType,
  ]);

  const utils = api.useUtils();
  const createGame = api.games.create.useMutation({
    onSuccess: async (game) => {
      leaveCreateFlow();
      toast.success(c.gameCreatedToast);
      await utils.users.home.invalidate();
      await utils.games.listPublicPickup.invalidate();
      await utils.games.listMyGames.invalidate();
      if (selectedGroupId) {
        await utils.groups.byId.invalidate({ id: selectedGroupId });
      }
      router.push(`/dashboard/games/${game.id}`);
    },
    onError: (error) => {
      onCreateError(error);
    },
  });
  const createTournament = api.games.createTournament.useMutation({
    onSuccess: async (game) => {
      leaveCreateFlow();
      toast.success(c.tournamentCreatedToast);
      await utils.users.home.invalidate();
      await utils.games.listPublicPickup.invalidate();
      await utils.games.listMyGames.invalidate();
      if (selectedGroupId) {
        await utils.groups.byId.invalidate({ id: selectedGroupId });
      }
      router.push(`/dashboard/games/${game.id}`);
    },
    onError: (error) => {
      onCreateError(error);
    },
  });

  React.useEffect(() => {
    const pending = pendingFocus.current;
    if (pending?.step !== displayedStep) {
      return;
    }
    pendingFocus.current = null;
    if (pending.error) {
      focusFormFailure(
        pending.error,
        CREATE_FLOW_FIELD_IDS,
        summaryRef.current,
      );
      return;
    }
    if (pending.elementId) {
      focusElement(pending.elementId);
    }
  }, [displayedStep]);

  function leaveCreateFlow() {
    draftClosed.current = true;
    clearCreateGameDrafts(browserSessionStorage());
  }

  function onCancel(event: React.MouseEvent<HTMLAnchorElement>) {
    if (draftDirty) {
      event.preventDefault();
      setDiscardOpen(true);
      return;
    }
    leaveCreateFlow();
  }

  function clearField(field: string) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (createGame.error) {
      createGame.reset();
    }
    if (createTournament.error) {
      createTournament.reset();
    }
  }

  function onCreateError(error: FormFailure) {
    toastGlobalFormError(error);
    const firstField = Object.keys(splitTrpcFormError(error).fieldErrors)[0];
    if (!firstField) {
      summaryRef.current?.focus();
      return;
    }
    const target = createFlowStepForField(firstField);
    if (target !== displayedStep) {
      pendingFocus.current = { step: target, error };
      router.push(
        createGameFlowHref({
          groupId: requestedGroupId,
          type: flowType ?? "friendly_game",
          step: target,
        }),
      );
      return;
    }
    focusFormFailure(error, CREATE_FLOW_FIELD_IDS, summaryRef.current);
  }

  function hrefForStep(step: CreateFlowStep) {
    return createGameFlowHref({
      groupId: requestedGroupId,
      type: flowType ?? "friendly_game",
      step,
    });
  }

  function resetBranch(type: CreateGameTypeId) {
    applyDraft(resetCreateBranch(createDraft, type, locale));
    setErrors((current) =>
      type === "friendly_game"
        ? {
            ...current,
            teamCount: undefined,
            courtIds: undefined,
            poolCount: undefined,
            roundCount: undefined,
            qualifiersPerPool: undefined,
            matchMinutes: undefined,
            name: undefined,
          }
        : { ...current, courtId: undefined },
    );
  }

  function onSelectType(type: CreateGameTypeId) {
    clearField("type");
    if (type !== typeParam) {
      resetBranch(type);
    }
    if (typeParam === type && displayedStep === 1) {
      return;
    }
    router.push(
      createGameFlowHref({
        groupId: requestedGroupId,
        type,
        step: 1,
      }),
    );
  }

  function onDayChange(next: string) {
    const changed = changeCreateDay(createDraft, next, locale);
    setDay(changed.day);
    setName(changed.name);
    clearField("windowStart");
    clearField("windowEnd");
  }

  function onTeamCountChange(nextCount: number) {
    const next = applyTeamCountChange(
      { poolCount, qualifiersPerPool },
      nextCount,
    );
    setTeamCount(next.teamCount);
    setPoolCount(next.poolCount);
    setQualifiersPerPool(next.qualifiersPerPool);
    clearField("qualifiersPerPool");
    setRoundCount(null);
    clearField("teamCount");
    clearField("roundCount");
  }

  function continueTournamentStepThree() {
    const issue = validateTournamentStepThree(
      {
        day,
        startTime,
        finishTime,
        matchMinutes: matchMinutesInput,
        tournamentShape,
        teamCount,
        poolCount,
      },
      session.now,
      locale,
    );
    if (issue) {
      setErrors((current) => ({ ...current, [issue.field]: issue.message }));
      focusElement(issue.elementId);
      return false;
    }
    return true;
  }

  function onContinue() {
    if (displayedStep === 1) {
      if (
        typeParam !== "friendly_game" &&
        typeParam !== "friendly_tournament"
      ) {
        setErrors((current) => ({
          ...current,
          type: c.pickGameType,
        }));
        focusElement("game-type");
        return;
      }
      router.push(hrefForStep(2));
      return;
    }
    if (displayedStep === 2) {
      if (picker.isLoading) {
        return;
      }
      if (emptyCatalog) {
        focusElement("game-venue");
        return;
      }
      const where = validateFriendlyGameWhere(
        selectedGroupId,
        venueId,
        locale,
        publicGame,
      );
      if (!where.ok) {
        const message =
          where.field === "groupId" && groupFieldError
            ? groupFieldError
            : where.message;
        setErrors((current) => ({ ...current, [where.field]: message }));
        focusElement(where.elementId);
        return;
      }
      router.push(hrefForStep(3));
      return;
    }
    if (displayedStep === 3) {
      if (flowType === "friendly_tournament") {
        if (!continueTournamentStepThree()) {
          return;
        }
        router.push(hrefForStep(4));
        return;
      }
      const when = validateFriendlyGameWhen(
        day,
        startTime,
        finishTime,
        locale,
        session.now,
      );
      if (!when.ok) {
        setErrors((current) => ({ ...current, [when.field]: when.message }));
        focusElement(when.elementId);
        return;
      }
      router.push(hrefForStep(4));
    }
  }

  function reportSubmitIssue(issue: CreateSubmitIssue) {
    if (issue.step !== 4) {
      pendingFocus.current = { step: issue.step, elementId: issue.elementId };
      router.push(hrefForStep(issue.step));
      setErrors((current) => ({ ...current, [issue.field]: issue.message }));
      return;
    }
    setErrors((current) => ({ ...current, [issue.field]: issue.message }));
    focusElement(issue.elementId);
  }

  function onCreateTournament() {
    if (createTournament.isPending) {
      return;
    }
    const result = validateFriendlyTournamentSubmit(
      {
        groupId: selectedGroupId,
        venueId,
        courtIds,
        day,
        startTime,
        finishTime,
        pricePerPlayer,
        levelMin,
        levelMax,
        teamCount,
        tournamentShape,
        poolCount,
        roundCount,
        qualifiersPerPool,
        matchMinutes: matchMinutesInput,
        name,
        isPublic,
        allowSoloRegister,
        rated,
        trackPayments,
      },
      session.now,
      groupVerified,
      locale,
    );
    if (!result.ok) {
      reportSubmitIssue(result);
      return;
    }
    createTournament.mutate(result.input);
  }

  function onCreate() {
    if (flowType === "friendly_tournament") {
      onCreateTournament();
      return;
    }
    if (createGame.isPending) {
      return;
    }
    if (football) {
      const footballResult = validateFootballGameSubmit(
        {
          groupId: selectedGroupId,
          venueId,
          courtId,
          day,
          startTime,
          finishTime,
          pricePerPlayer,
          sideSize,
          playersAllowed,
          customName,
          rated,
          trackPayments,
          keepersPlayFree,
          levelMin,
          levelMax,
          isPublic: publicGame,
        },
        session.now,
        locale,
        {
          levelRange: createLevelRangeShown({
            sport: "football",
            hasGroup: Boolean(selectedGroupId),
            groupVerified,
            rated,
            isPublic: publicGame,
          }),
        },
      );
      if (!footballResult.ok) {
        reportSubmitIssue(footballResult);
        return;
      }
      createGame.mutate({ ...footballResult.input, mvpMode });
      return;
    }
    const result = validateFriendlyGameSubmit(
      {
        groupId: selectedGroupId,
        venueId,
        courtId,
        day,
        startTime,
        finishTime,
        pricePerPlayer,
        levelMin,
        levelMax,
        customName,
        rated,
        trackPayments,
        isPublic: publicGame,
      },
      session.now,
      locale,
    );
    if (!result.ok) {
      reportSubmitIssue(result);
      return;
    }
    createGame.mutate({ ...result.input, mvpMode });
  }

  const cancelHref = selectedGroupId
    ? `/dashboard/groups/${selectedGroupId}`
    : requestedGroupId
      ? `/dashboard/groups/${requestedGroupId}`
      : "/dashboard/games";
  const tournamentBranch = flowType === "friendly_tournament";
  const formError = tournamentBranch
    ? createTournament.error
    : createGame.error;
  const venueCopy = !venuesWanted
    ? c.pickGroupFirst
    : picker.data
      ? createVenueCopy(picker.data, locale, {
          manyCourts: tournamentBranch,
          sport,
          publicGame,
        })
      : m.createGame.venue.pick(
          tournamentBranch
            ? m.createGame.venue.courtsOptional
            : football
              ? m.createGame.venue.pitchOptional
              : m.createGame.venue.courtOptional,
        );
  const kickoff = friendlyGameKickoff(day, startTime, finishTime, locale);
  const previewLines = friendlyGamePreviewLines({
    day: startTime ? day : "",
    groupName:
      selectedGroup?.name ??
      selectedGroup?.venueName ??
      (publicGame ? m.rating.publicGame.label : null),
    venueName: selectedVenue?.name ?? null,
    courtName:
      courtId !== "none"
        ? (selectedVenue?.courts.find((court) => court.id === courtId)?.name ??
          null)
        : null,
    locale,
  });
  const groupError =
    errors.groupId ??
    groupFieldError ??
    fieldErrorMessage(formError, "groupId");
  const venueError = errors.venueId ?? fieldErrorMessage(formError, "venueId");
  const courtError =
    errors.courtId ??
    errors.courtIds ??
    fieldErrorMessage(formError, "courtId") ??
    fieldErrorMessage(formError, "courtIds");
  const laterSteps = createFlowLaterSteps(flowType, locale, sport);
  const nextTitle = laterSteps.find(
    (item) => item.step === displayedStep + 1,
  )?.title;
  const submitting = createGame.isPending || createTournament.isPending;
  const primaryLabel =
    displayedStep === 4
      ? submitting
        ? m.webDashboard.creating
        : tournamentBranch
          ? c.createTournament
          : c.createGameAction
      : m.common.continue;
  const tournamentPlan = friendlyTournamentPlan({
    teamCount,
    poolCount,
    roundCount,
    qualifiersPerPool,
    tournamentShape,
  });
  const tournamentKnockout = tournamentPlan.knockoutTree;
  const tournamentRounds = tournamentPlan.rounds;
  const tournamentPreviewDetail = friendlyTournamentPreviewDetail({
    day,
    venueName: selectedVenue?.name ?? null,
    courtNames:
      selectedVenue?.courts
        .filter((court) => courtIds.includes(court.id))
        .map((court) => court.name) ?? [],
    locale,
  });
  const showLevelRange =
    preferLevelRange ||
    levelMin !== LEVEL_BAND_SELECT_NONE ||
    levelMax !== LEVEL_BAND_SELECT_NONE;
  const reviewGroupName = selectedGroup
    ? (selectedGroup.name ?? m.group.untitled)
    : publicGame
      ? m.rating.publicGame.label
      : m.invite.kind.group;

  if (createGroups.isLoading || !draftRestored) {
    return (
      <DashboardShell
        title={m.webDashboard.games.createAction}
        hidePageHeader
        hideMobileTopBar
      >
        <CreateFlowSkeleton />
      </DashboardShell>
    );
  }

  if (createGroups.error) {
    return (
      <DashboardShell title={m.webDashboard.games.createAction}>
        <ErrorState
          title={m.webDashboard.groups.errorTitle}
          error={createGroups.error}
          onRetry={() => {
            void createGroups.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  if (createGroups.data?.length === 0 && !publicGame) {
    return (
      <DashboardShell title={m.webDashboard.games.createAction}>
        <EmptyState
          icon={Users}
          title={c.noGroups.title}
          description={c.noGroups.description}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/dashboard/groups/new">{c.noGroups.action}</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  applyDraft(choosePublicGame(createDraft));
                  router.push(
                    createGameFlowHref({ type: "friendly_game", step: 2 }),
                  );
                }}
              >
                {m.rating.publicGame.createAction}
              </Button>
            </div>
          }
        />
      </DashboardShell>
    );
  }

  const preview =
    tournamentBranch && displayedStep > 1 ? (
      <>
        <h1 className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-expanded text-[44px] tabular-nums leading-none">
            {teamCount}
          </span>
          <span className="text-dim text-[18px] leading-none">
            {c.gameTeams}
          </span>
          {tournamentKnockout ? (
            <span className="text-dim text-body leading-none">
              {knockoutMatchCountLabel(tournamentKnockout.matchCount, locale)}
            </span>
          ) : tournamentRounds ? (
            <span className="text-dim text-body leading-none">
              {friendlyTournamentMatchCountLabel(
                tournamentRounds.poolMatches,
                locale,
              )}
            </span>
          ) : null}
        </h1>
        {tournamentPreviewDetail ? (
          <p className="text-dim text-meta mt-2">{tournamentPreviewDetail}</p>
        ) : null}
      </>
    ) : kickoff && displayedStep > 1 ? (
      <>
        <h1 className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-expanded text-[44px] tabular-nums leading-none">
            {kickoff.time}
          </span>
          <span className="text-dim text-[18px] leading-none">
            {kickoff.trailer}
          </span>
        </h1>
        {previewLines.length > 0 ? (
          <div className="text-dim text-meta mt-2">
            {previewLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
      </>
    ) : (
      <>
        <PageTitle variant="hero">
          {displayedStep === 1 ? (
            <>
              {c.hero.titleLead}
              <br />
              {c.hero.titleTrail}
            </>
          ) : (
            m.createGame.format.friendlyGame
          )}
        </PageTitle>
        <div className="text-dim text-meta mt-2.5 leading-normal">
          {displayedStep === 1 ? (
            <p>{c.hero.typeSubline}</p>
          ) : previewLines.length > 0 ? (
            previewLines.map((line) => <p key={line}>{line}</p>)
          ) : (
            <p>{c.hero.groupSubline}</p>
          )}
        </div>
      </>
    );

  return (
    <DashboardShell
      title={m.webDashboard.games.createAction}
      hidePageHeader
      hideMobileTopBar
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (displayedStep === 4) {
            onCreate();
            return;
          }
          onContinue();
        }}
      >
        <CreateFlowShell
          step={displayedStep}
          firstStep={firstStep}
          cancelHref={cancelHref}
          onCancel={onCancel}
          onBack={() => {
            if (displayedStep > firstStep) {
              router.push(hrefForStep((displayedStep - 1) as CreateFlowStep));
            }
          }}
          preview={preview}
          footer={
            <div className="flex items-center gap-2.5">
              {displayedStep > 1 && displayedStep < 4 ? (
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-meta">
                    {m.common.next}
                  </p>
                  <p className="text-body font-semibold">{nextTitle}</p>
                </div>
              ) : null}
              <Button
                type="submit"
                size="lg"
                className={
                  displayedStep === 2 || displayedStep === 3
                    ? "shrink-0"
                    : "flex-1"
                }
                disabled={submitting || (displayedStep === 2 && emptyCatalog)}
              >
                {primaryLabel}
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href={cancelHref} onClick={onCancel}>
                  {m.common.cancel}
                </Link>
              </Button>
            </div>
          }
        >
          <FormErrorSummary
            ref={summaryRef}
            message={
              globalFormErrorMessage(formError) ??
              (displayedStep === 2 && emptyCatalog
                ? publicGame
                  ? football
                    ? m.rating.publicGame.noPartnerPitches
                    : m.rating.publicGame.noPartnerVenues
                  : c.noLiveVenues
                : null) ??
              (picker.error ? picker.error.message : null)
            }
          />
          {displayedStep === 1 ? (
            <TypeStep
              selectedType={typeParam}
              error={errors.type}
              onSelect={onSelectType}
            />
          ) : tournamentBranch ? (
            <FriendlyTournamentSteps
              step={displayedStep}
              now={session.now}
              groups={createGroups.data ?? []}
              selectedGroupId={selectedGroupId}
              groupError={groupError}
              onGroupId={(groupId) => {
                applyDraft(changeCreateGroup(createDraft, groupId));
                setGroupFieldError(undefined);
                clearField("groupId");
              }}
              venueCopy={venueCopy}
              venues={picker.data?.venues ?? []}
              venuesLocked={picker.data?.locked === true}
              venuesPending={venuesWanted && picker.isLoading}
              venueId={venueId}
              venueError={venueError}
              onVenueId={(nextVenueId) => {
                applyDraft(changeCreateVenue(createDraft, nextVenueId));
                clearField("venueId");
              }}
              emptyCatalog={emptyCatalog}
              recentCourtIds={picker.data?.recentCourtIds ?? []}
              courtIds={courtIds}
              courtError={courtError}
              onToggleCourt={(courtIdToToggle) => {
                setCourtIds((current) =>
                  toggleCreateCourt(current, courtIdToToggle),
                );
                clearField("courtIds");
              }}
              teamCount={teamCount}
              teamCountError={
                errors.teamCount ?? fieldErrorMessage(formError, "teamCount")
              }
              onTeamCount={onTeamCountChange}
              tournamentShape={tournamentShape}
              onTournamentShape={(next) => {
                setTournamentShape(next);
                clearField("tournamentShape");
                clearField("poolCount");
                clearField("roundCount");
                clearField("qualifiersPerPool");
              }}
              poolCount={poolCount}
              poolCountError={
                errors.poolCount ?? fieldErrorMessage(formError, "poolCount")
              }
              onPoolCount={(next) => {
                setPoolCount(next);
                setQualifiersPerPool((current) =>
                  reclampQualifiersPerPool(teamCount, next, current),
                );
                clearField("qualifiersPerPool");
                setRoundCount(null);
                clearField("poolCount");
                clearField("roundCount");
              }}
              roundCount={roundCount}
              roundCountError={
                errors.roundCount ?? fieldErrorMessage(formError, "roundCount")
              }
              onRoundCount={(next) => {
                setRoundCount(next);
                clearField("roundCount");
              }}
              qualifiersPerPool={qualifiersPerPool}
              qualifiersPerPoolError={
                errors.qualifiersPerPool ??
                fieldErrorMessage(formError, "qualifiersPerPool")
              }
              onQualifiersPerPool={(next) => {
                setQualifiersPerPool(next);
                clearField("qualifiersPerPool");
              }}
              day={day}
              dayError={
                errors.windowStart === m.createGame.validation.pickDay
                  ? errors.windowStart
                  : undefined
              }
              onDay={onDayChange}
              startTime={startTime}
              startError={
                errors.windowStart &&
                errors.windowStart !== m.createGame.validation.pickDay
                  ? errors.windowStart
                  : fieldErrorMessage(formError, "windowStart")
              }
              onStartTime={(next) => {
                setStartTime(next);
                clearField("windowStart");
              }}
              finishTime={finishTime}
              finishError={
                errors.windowEnd ?? fieldErrorMessage(formError, "windowEnd")
              }
              onFinishTime={(next) => {
                setFinishTime(next);
                clearField("windowEnd");
              }}
              matchMinutes={matchMinutesInput}
              matchMinutesError={
                errors.matchMinutes ??
                fieldErrorMessage(formError, "matchMinutes")
              }
              onMatchMinutes={(next) => {
                setMatchMinutesInput(next);
                if (parseCreateMatchMinutes(next, locale).ok) {
                  clearField("matchMinutes");
                }
              }}
              name={name}
              nameError={errors.name ?? fieldErrorMessage(formError, "name")}
              onName={(next) => {
                setNameTouched(true);
                setName(next);
                clearField("name");
              }}
              showLevelRange={showLevelRange}
              onEntryMode={(mode) => {
                if (mode === "anyone") {
                  setPreferLevelRange(false);
                  const open = openLevelRange();
                  setLevelMin(open.min);
                  setLevelMax(open.max);
                  clearField("levelMinTenths");
                  clearField("levelMaxTenths");
                  return;
                }
                setPreferLevelRange(true);
              }}
              levelMin={levelMin}
              levelMax={levelMax}
              levelMinError={
                errors.levelMinTenths ??
                fieldErrorMessage(formError, "levelMinTenths")
              }
              levelMaxError={
                errors.levelMaxTenths ??
                fieldErrorMessage(formError, "levelMaxTenths")
              }
              onLevelRange={(range) => {
                setPreferLevelRange(true);
                setLevelMin(range.min);
                setLevelMax(range.max);
                clearField("levelMinTenths");
                clearField("levelMaxTenths");
              }}
              price={pricePerPlayer}
              priceError={
                errors.pricePerPlayerFils ??
                fieldErrorMessage(formError, "pricePerPlayerFils")
              }
              onPrice={(next) => {
                setPricePerPlayer(next);
                clearField("pricePerPlayerFils");
              }}
              trackPayments={trackPayments}
              onTrackPayments={setTrackPayments}
              isPublic={isPublic}
              onIsPublic={setIsPublic}
              allowSoloRegister={allowSoloRegister}
              onAllowSoloRegister={setAllowSoloRegister}
              groupName={reviewGroupName}
              groupVerified={groupVerified}
              rated={rated}
              onRated={setRated}
            />
          ) : (
            <FriendlyGameSteps
              sport={sport}
              sideSize={sideSize}
              sideSizeError={
                errors.sideSize ??
                fieldErrorMessage(createGame.error, "sideSize")
              }
              onSideSize={(next) => {
                const changed = changeFootballSideSize(
                  { sideSize, playersAllowed },
                  next,
                );
                setSideSize(changed.sideSize);
                setPlayersAllowed(changed.playersAllowed);
                clearField("sideSize");
                clearField("playersAllowed");
              }}
              playersAllowed={playersAllowed}
              playersAllowedError={
                errors.playersAllowed ??
                fieldErrorMessage(createGame.error, "playersAllowed")
              }
              onPlayersAllowed={(next) => {
                setPlayersAllowed(
                  changeFootballPlayersAllowed(
                    { sideSize, playersAllowed },
                    next,
                  ).playersAllowed,
                );
                clearField("playersAllowed");
              }}
              step={displayedStep}
              now={session.now}
              groups={createGroups.data ?? []}
              selectedGroupId={selectedGroupId}
              groupError={groupError}
              onGroupId={(groupId) => {
                applyDraft(changeCreateGroup(createDraft, groupId));
                setGroupFieldError(undefined);
                clearField("groupId");
              }}
              publicChoice={
                publicGameOffered(flowType)
                  ? {
                      label: m.rating.publicGame.label,
                      note: m.rating.publicGame.createNote,
                      selected: publicGame,
                      sport,
                      onSport: (next) => {
                        applyDraft(choosePublicGameSport(createDraft, next));
                        clearField("venueId");
                      },
                      onSelect: () => {
                        applyDraft(choosePublicGame(createDraft));
                        setGroupFieldError(undefined);
                        clearField("groupId");
                        if (typeParam !== "friendly_game") {
                          router.push(
                            createGameFlowHref({
                              type: "friendly_game",
                              step: 2,
                            }),
                          );
                        }
                      },
                    }
                  : undefined
              }
              venueCopy={venueCopy}
              venues={picker.data?.venues ?? []}
              venuesLocked={picker.data?.locked === true}
              venuesPending={venuesWanted && picker.isLoading}
              venueId={venueId}
              venueError={venueError}
              onVenueId={(nextVenueId) => {
                applyDraft(changeCreateVenue(createDraft, nextVenueId));
                clearField("venueId");
              }}
              emptyCatalog={emptyCatalog}
              recentCourtIds={picker.data?.recentCourtIds ?? []}
              courtId={courtId}
              courtError={courtError}
              onCourtId={(nextCourtId) => {
                setCourtId(nextCourtId);
                clearField("courtId");
              }}
              day={day}
              dayError={
                errors.windowStart === m.createGame.validation.pickDay
                  ? errors.windowStart
                  : undefined
              }
              onDay={onDayChange}
              startTime={startTime}
              startError={
                errors.windowStart &&
                errors.windowStart !== m.createGame.validation.pickDay
                  ? errors.windowStart
                  : fieldErrorMessage(createGame.error, "windowStart")
              }
              onStartTime={(next) => {
                setStartTime(next);
                clearField("windowStart");
              }}
              finishTime={finishTime}
              finishError={
                errors.windowEnd ??
                fieldErrorMessage(createGame.error, "windowEnd")
              }
              onFinishTime={(next) => {
                setFinishTime(next);
                clearField("windowEnd");
              }}
              levelMin={levelMin}
              levelMax={levelMax}
              levelMinError={
                errors.levelMinTenths ??
                fieldErrorMessage(createGame.error, "levelMinTenths")
              }
              levelMaxError={
                errors.levelMaxTenths ??
                fieldErrorMessage(createGame.error, "levelMaxTenths")
              }
              onLevelRange={(range) => {
                setLevelMin(range.min);
                setLevelMax(range.max);
                clearField("levelMinTenths");
                clearField("levelMaxTenths");
              }}
              price={pricePerPlayer}
              priceError={
                errors.pricePerPlayerFils ??
                fieldErrorMessage(createGame.error, "pricePerPlayerFils")
              }
              onPrice={(next) => {
                setPricePerPlayer(next);
                clearField("pricePerPlayerFils");
              }}
              trackPayments={trackPayments}
              onTrackPayments={setTrackPayments}
              keepersPlayFree={keepersPlayFree}
              onKeepersPlayFree={setKeepersPlayFree}
              customName={customName}
              customNameError={
                errors.customName ??
                fieldErrorMessage(createGame.error, "customName")
              }
              onCustomName={(next) => {
                setCustomName(next);
                clearField("customName");
              }}
              reviewGroup={reviewGroupName}
              groupVerified={groupVerified}
              rated={rated}
              onRated={setRated}
              mvpMode={mvpMode}
              onMvpMode={setMvpMode}
              reviewVenue={
                selectedVenue
                  ? courtId === "none"
                    ? selectedVenue.name
                    : `${selectedVenue.name}, ${
                        selectedVenue.courts.find(
                          (court) => court.id === courtId,
                        )?.name ?? m.webDashboard.venue.courtFallback
                      }`
                  : m.webDashboard.venue.title
              }
            />
          )}
        </CreateFlowShell>
      </form>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title={c.discard.title}
        description={c.discard.description}
        confirmLabel={c.discard.confirm}
        onConfirm={() => {
          leaveCreateFlow();
          router.push(cancelHref);
        }}
      />
    </DashboardShell>
  );
}

export default function NewGamePage() {
  const m = useMessages();
  return (
    <React.Suspense
      fallback={
        <DashboardShell
          title={m.webDashboard.games.createAction}
          hidePageHeader
          hideMobileTopBar
        >
          <CreateFlowSkeleton />
        </DashboardShell>
      }
    >
      <NewGameForm />
    </React.Suspense>
  );
}
