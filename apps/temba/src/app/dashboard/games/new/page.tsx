"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { CreateFlowShell } from "~/app/dashboard/games/new/create-flow-shell";
import { FriendlyGameSteps } from "~/app/dashboard/games/new/friendly-game-steps";
import { FriendlyTournamentSteps } from "~/app/dashboard/games/new/friendly-tournament-steps";
import { TypeStep } from "~/app/dashboard/games/new/type-step";
import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  CREATE_FLOW_FIELD_IDS,
  DEFAULT_MATCH_MINUTES,
  createFlowLaterSteps,
  createFlowStepForField,
  createGameFlowHref,
  createVenueCopy,
  earliestCreateDay,
  friendlyGameKickoff,
  friendlyGamePreviewLine,
  friendlyTournamentDefaultName,
  friendlyTournamentMatchCountLabel,
  friendlyTournamentPreviewDetail,
  openLevelRange,
  parseCreateFlowStep,
  parseCreateFlowType,
  parseCreateMatchMinutes,
  resolveCreateFlowStep,
  validateFriendlyGameWhen,
  validateFriendlyGameWhere,
  validateTournamentName,
  type CreateFlowStep,
  type CreateGameTypeId,
  type FriendlyGameDraft,
} from "~/lib/create-game-flow";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  splitTrpcFormError,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { formatGameWindowName } from "~/lib/game-window";
import {
  LEVEL_BAND_SELECT_NONE,
  LEVEL_RANGE_INVERTED_MESSAGE,
  parseLevelBandSelectTenths,
  type LevelBandSelectValue,
} from "~/lib/level-range";
import { parseOptionalPricePerPlayerCents } from "~/lib/price-per-player";
import {
  defaultPoolCount,
  poolCountOptions,
  sizeFriendlyTournament,
  TOURNAMENT_DEFAULT_TEAM_COUNT,
} from "~/lib/tournament-sizing";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type FormFailure = Parameters<typeof focusFormFailure>[0];

function focusElement(id: string) {
  document.getElementById(id)?.focus();
}

function NewGameForm() {
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
  const [poolCount, setPoolCount] = React.useState(() =>
    defaultPoolCount(TOURNAMENT_DEFAULT_TEAM_COUNT),
  );
  const [matchMinutesInput, setMatchMinutesInput] = React.useState(
    String(DEFAULT_MATCH_MINUTES),
  );
  const [nameTouched, setNameTouched] = React.useState(false);
  const [name, setName] = React.useState(() =>
    friendlyTournamentDefaultName(earliestCreateDay(session.now)),
  );
  const [preferLevelRange, setPreferLevelRange] = React.useState(false);
  const [isPublic, setIsPublic] = React.useState(false);
  const [allowSoloRegister, setAllowSoloRegister] = React.useState(true);
  const [errors, setErrors] = React.useState<
    Record<string, string | undefined>
  >({});

  const draft: FriendlyGameDraft & { matchMinutes: string } = {
    groupId: selectedGroupId,
    venueId,
    day,
    startTime,
    finishTime,
    matchMinutes: matchMinutesInput,
  };
  const displayedStep = resolveCreateFlowStep({
    type: typeParam,
    requestedStep: stepParam,
    draft,
    now: session.now,
  });

  const createGroups = api.games.listCreateGroups.useQuery();
  const picker = api.games.listCreateVenues.useQuery(
    { groupId: selectedGroupId },
    { enabled: Boolean(selectedGroupId) },
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
    setGroupFieldError("You cannot create a Game in that Group.");
  }, [createGroups.data, requestedGroupId]);

  React.useEffect(() => {
    if (!linkedVenueId) {
      return;
    }
    setVenueId(linkedVenueId);
  }, [linkedVenueId]);

  React.useEffect(() => {
    if (!createGroups.data || createGroups.data.length === 0) {
      return;
    }
    if (stepParam != null && stepParam !== displayedStep) {
      router.replace(
        createGameFlowHref({
          groupId: requestedGroupId,
          type: typeParam,
          step: displayedStep === 1 ? null : displayedStep,
        }),
      );
    }
  }, [
    createGroups.data,
    displayedStep,
    requestedGroupId,
    router,
    stepParam,
    typeParam,
  ]);

  const utils = api.useUtils();
  const createGame = api.games.create.useMutation({
    onSuccess: async (game) => {
      toast.success("Game created");
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
      toast.success("Tournament created");
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
          type: typeParam ?? "friendly_game",
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
      type: typeParam ?? "friendly_game",
      step,
    });
  }

  function resetTournamentBranch() {
    setCourtIds([]);
    setTeamCount(TOURNAMENT_DEFAULT_TEAM_COUNT);
    setPoolCount(defaultPoolCount(TOURNAMENT_DEFAULT_TEAM_COUNT));
    setMatchMinutesInput(String(DEFAULT_MATCH_MINUTES));
    setNameTouched(false);
    setName(friendlyTournamentDefaultName(day));
    setIsPublic(false);
    setAllowSoloRegister(true);
    setErrors((current) => ({
      ...current,
      teamCount: undefined,
      courtIds: undefined,
      poolCount: undefined,
      matchMinutes: undefined,
      name: undefined,
    }));
  }

  function resetGameBranch() {
    setCourtId("none");
    setErrors((current) => ({ ...current, courtId: undefined }));
  }

  function onSelectType(type: CreateGameTypeId) {
    clearField("type");
    if (type !== typeParam) {
      if (type === "friendly_game") {
        resetTournamentBranch();
      } else {
        resetGameBranch();
      }
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
    setDay(next);
    clearField("windowStart");
    clearField("windowEnd");
    if (!nameTouched) {
      setName(friendlyTournamentDefaultName(next));
    }
  }

  function onTeamCountChange(nextCount: number) {
    setTeamCount(nextCount);
    const allowed = poolCountOptions(nextCount);
    setPoolCount((current) =>
      allowed.includes(current) ? current : defaultPoolCount(nextCount),
    );
    clearField("teamCount");
  }

  function continueTournamentStepThree() {
    const when = validateFriendlyGameWhen(
      day,
      startTime,
      finishTime,
      session.now,
    );
    if (!when.ok) {
      setErrors((current) => ({ ...current, [when.field]: when.message }));
      focusElement(when.elementId);
      return false;
    }
    const minutes = parseCreateMatchMinutes(matchMinutesInput);
    if (!minutes.ok) {
      setErrors((current) => ({
        ...current,
        matchMinutes: minutes.message,
      }));
      focusElement("tournament-match-minutes");
      return false;
    }
    if (!sizeFriendlyTournament(teamCount, poolCount).ok) {
      setErrors((current) => ({
        ...current,
        poolCount: "Pick a groups count",
      }));
      focusElement("tournament-pool-count");
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
          type: "Pick a Game type",
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
      const where = validateFriendlyGameWhere(selectedGroupId, venueId);
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
      if (typeParam === "friendly_tournament") {
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

  function onCreateTournament() {
    if (createTournament.isPending) {
      return;
    }
    const where = validateFriendlyGameWhere(selectedGroupId, venueId);
    if (!where.ok) {
      pendingFocus.current = { step: 2, elementId: where.elementId };
      router.push(hrefForStep(2));
      setErrors((current) => ({ ...current, [where.field]: where.message }));
      return;
    }
    const when = validateFriendlyGameWhen(
      day,
      startTime,
      finishTime,
      session.now,
    );
    if (!when.ok) {
      pendingFocus.current = { step: 3, elementId: when.elementId };
      router.push(hrefForStep(3));
      setErrors((current) => ({ ...current, [when.field]: when.message }));
      return;
    }
    const minutes = parseCreateMatchMinutes(matchMinutesInput);
    if (!minutes.ok) {
      pendingFocus.current = {
        step: 3,
        elementId: "tournament-match-minutes",
      };
      router.push(hrefForStep(3));
      setErrors((current) => ({
        ...current,
        matchMinutes: minutes.message,
      }));
      return;
    }
    const named = validateTournamentName(name);
    if (!named.ok) {
      setErrors((current) => ({ ...current, name: named.message }));
      focusElement(named.elementId);
      return;
    }
    const parsedPrice = parseOptionalPricePerPlayerCents(pricePerPlayer);
    if (!parsedPrice.ok) {
      setErrors((current) => ({
        ...current,
        pricePerPlayerCents: parsedPrice.message,
      }));
      focusElement(CREATE_FLOW_FIELD_IDS.pricePerPlayerCents ?? "");
      return;
    }
    const parsedMin = parseLevelBandSelectTenths(levelMin, "min");
    const parsedMax = parseLevelBandSelectTenths(levelMax, "max");
    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      setErrors((current) => ({
        ...current,
        levelMinTenths: LEVEL_RANGE_INVERTED_MESSAGE,
      }));
      focusElement(CREATE_FLOW_FIELD_IDS.levelMinTenths ?? "");
      return;
    }
    createTournament.mutate({
      name: named.name,
      groupId: selectedGroupId,
      isPublic,
      allowSoloRegister,
      teamCount,
      poolCount,
      matchMinutes: minutes.minutes,
      windowStart: when.windowStart,
      windowEnd: when.windowEnd,
      venueId,
      ...(courtIds.length > 0 ? { courtIds } : {}),
      ...(parsedPrice.cents !== null
        ? { pricePerPlayerCents: parsedPrice.cents }
        : {}),
      ...(parsedMin !== null ? { levelMinTenths: parsedMin } : {}),
      ...(parsedMax !== null ? { levelMaxTenths: parsedMax } : {}),
    });
  }

  function onCreate() {
    if (typeParam === "friendly_tournament") {
      onCreateTournament();
      return;
    }
    if (createGame.isPending) {
      return;
    }
    const where = validateFriendlyGameWhere(selectedGroupId, venueId);
    if (!where.ok) {
      pendingFocus.current = { step: 2, elementId: where.elementId };
      router.push(hrefForStep(2));
      setErrors((current) => ({ ...current, [where.field]: where.message }));
      return;
    }
    const when = validateFriendlyGameWhen(
      day,
      startTime,
      finishTime,
      session.now,
    );
    if (!when.ok) {
      pendingFocus.current = { step: 3, elementId: when.elementId };
      router.push(hrefForStep(3));
      setErrors((current) => ({ ...current, [when.field]: when.message }));
      return;
    }
    const parsedPrice = parseOptionalPricePerPlayerCents(pricePerPlayer);
    if (!parsedPrice.ok) {
      setErrors((current) => ({
        ...current,
        pricePerPlayerCents: parsedPrice.message,
      }));
      focusElement(CREATE_FLOW_FIELD_IDS.pricePerPlayerCents ?? "");
      return;
    }
    const parsedMin = parseLevelBandSelectTenths(levelMin, "min");
    const parsedMax = parseLevelBandSelectTenths(levelMax, "max");
    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      setErrors((current) => ({
        ...current,
        levelMinTenths: LEVEL_RANGE_INVERTED_MESSAGE,
      }));
      focusElement(CREATE_FLOW_FIELD_IDS.levelMinTenths ?? "");
      return;
    }
    createGame.mutate({
      name: formatGameWindowName(day, startTime, finishTime),
      groupId: selectedGroupId,
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      windowStart: when.windowStart,
      windowEnd: when.windowEnd,
      venueId,
      courtId: courtId === "none" ? undefined : courtId,
      ...(parsedPrice.cents !== null
        ? { pricePerPlayerCents: parsedPrice.cents }
        : {}),
      ...(parsedMin !== null ? { levelMinTenths: parsedMin } : {}),
      ...(parsedMax !== null ? { levelMaxTenths: parsedMax } : {}),
    });
  }

  const selectedGroup = createGroups.data?.find(
    (group) => group.id === selectedGroupId,
  );
  const cancelHref = selectedGroupId
    ? `/dashboard/groups/${selectedGroupId}`
    : requestedGroupId
      ? `/dashboard/groups/${requestedGroupId}`
      : "/dashboard/games";
  const tournamentBranch = typeParam === "friendly_tournament";
  const formError = tournamentBranch
    ? createTournament.error
    : createGame.error;
  const venueCopy = !selectedGroupId
    ? "Pick a Group first. Venue rules depend on the Group."
    : picker.data
      ? createVenueCopy(picker.data, { manyCourts: tournamentBranch })
      : tournamentBranch
        ? "Pick a Venue. Courts are optional."
        : "Pick a Venue. Court is optional.";
  const kickoff = friendlyGameKickoff(day, startTime, finishTime);
  const previewDetail = friendlyGamePreviewLine({
    day: startTime ? day : "",
    groupName: selectedGroup?.name ?? selectedGroup?.communityName ?? null,
    venueName: selectedVenue?.name ?? null,
    courtName:
      courtId !== "none"
        ? (selectedVenue?.courts.find((court) => court.id === courtId)?.name ??
          null)
        : null,
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
  const laterSteps = createFlowLaterSteps(typeParam);
  const futureSteps = laterSteps.filter((item) => item.step > displayedStep);
  const nextTitle = laterSteps.find(
    (item) => item.step === displayedStep + 1,
  )?.title;
  const submitting = createGame.isPending || createTournament.isPending;
  const primaryLabel =
    displayedStep === 4
      ? submitting
        ? "Creating…"
        : tournamentBranch
          ? "Create tournament"
          : "Create Game"
      : "Continue";
  const tournamentSizing = sizeFriendlyTournament(teamCount, poolCount);
  const tournamentPreviewDetail = friendlyTournamentPreviewDetail({
    day,
    venueName: selectedVenue?.name ?? null,
    courtNames:
      selectedVenue?.courts
        .filter((court) => courtIds.includes(court.id))
        .map((court) => court.name) ?? [],
  });
  const showLevelRange =
    preferLevelRange ||
    levelMin !== LEVEL_BAND_SELECT_NONE ||
    levelMax !== LEVEL_BAND_SELECT_NONE;
  const reviewGroupName = selectedGroup
    ? (selectedGroup.name ?? "Untitled Group")
    : "Group";

  if (createGroups.isLoading) {
    return (
      <DashboardShell title="Create Game" hideMobileTopBar>
        <p className="text-muted-foreground text-sm">Loading…</p>
      </DashboardShell>
    );
  }

  if (createGroups.error) {
    return (
      <DashboardShell title="Create Game" hideMobileTopBar>
        <ErrorState
          title="Groups could not be loaded"
          message={createGroups.error.message}
          onRetry={() => {
            void createGroups.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  if (createGroups.data?.length === 0) {
    return (
      <DashboardShell title="Create Game" hideMobileTopBar>
        <EmptyState
          emoji="🎾"
          title="Games are created inside a Group"
          description="Create a Group first, then you can create a Game."
          action={
            <Button asChild>
              <Link href="/dashboard/groups/new">Create Group</Link>
            </Button>
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
          <span className="text-dim text-[18px] leading-none">Game teams</span>
          {tournamentSizing.ok ? (
            <span className="text-dim text-[15px] leading-none">
              {friendlyTournamentMatchCountLabel(
                tournamentSizing.sizing.poolMatches,
              )}
            </span>
          ) : null}
        </h1>
        {tournamentPreviewDetail ? (
          <p className="text-dim mt-2 text-sm">{tournamentPreviewDetail}</p>
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
        {previewDetail ? (
          <p className="text-dim mt-2 text-sm">{previewDetail}</p>
        ) : null}
      </>
    ) : (
      <>
        <h1 className="font-expanded text-[36px] leading-none">
          {displayedStep === 1 ? (
            <>
              What are you
              <br />
              setting up?
            </>
          ) : (
            "Friendly game"
          )}
        </h1>
        <p className="text-dim mt-2.5 text-sm leading-normal">
          {displayedStep === 1
            ? "Both start with a court and a time. The rest of the form follows your pick."
            : previewDetail ||
              "Start with the Group. Venues, levels and prices follow from it."}
        </p>
      </>
    );

  return (
    <DashboardShell title="Create Game" hideMobileTopBar>
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
          cancelHref={cancelHref}
          onBack={() => {
            if (displayedStep > 1) {
              router.push(hrefForStep((displayedStep - 1) as CreateFlowStep));
            }
          }}
          preview={preview}
          futureSteps={futureSteps}
          footer={
            <div className="flex items-center gap-2.5">
              {displayedStep > 1 && displayedStep < 4 ? (
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-meta">Next</p>
                  <p className="text-sm font-semibold">{nextTitle}</p>
                </div>
              ) : null}
              <Button
                type="submit"
                className={cn(
                  "h-12 min-h-11",
                  displayedStep === 2 || displayedStep === 3
                    ? "shrink-0 px-5"
                    : "flex-1",
                )}
                disabled={submitting || (displayedStep === 2 && emptyCatalog)}
              >
                {primaryLabel}
                {displayedStep < 4 ? (
                  <ArrowRight aria-hidden="true" className="size-4" />
                ) : null}
              </Button>
              <Button variant="outline" className="h-12 min-h-11" asChild>
                <Link href={cancelHref}>Cancel</Link>
              </Button>
            </div>
          }
        >
          <FormErrorSummary
            ref={summaryRef}
            message={
              globalFormErrorMessage(formError) ??
              (displayedStep === 2 && emptyCatalog
                ? "No live Venues. Create is not available."
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
                setSelectedGroupId(groupId);
                setGroupFieldError(undefined);
                clearField("groupId");
                setVenueId("");
                setCourtId("none");
                setCourtIds([]);
              }}
              venueCopy={venueCopy}
              venues={picker.data?.venues ?? []}
              venuesLocked={picker.data?.locked === true}
              venuesPending={Boolean(selectedGroupId) && picker.isLoading}
              venueId={venueId}
              venueError={venueError}
              onVenueId={(nextVenueId) => {
                if (nextVenueId !== venueId) {
                  setCourtId("none");
                  setCourtIds([]);
                }
                setVenueId(nextVenueId);
                clearField("venueId");
              }}
              emptyCatalog={emptyCatalog}
              courtIds={courtIds}
              courtError={courtError}
              onToggleCourt={(courtIdToToggle) => {
                setCourtIds((current) =>
                  current.includes(courtIdToToggle)
                    ? current.filter((id) => id !== courtIdToToggle)
                    : [...current, courtIdToToggle],
                );
                clearField("courtIds");
              }}
              teamCount={teamCount}
              teamCountError={
                errors.teamCount ?? fieldErrorMessage(formError, "teamCount")
              }
              onTeamCount={onTeamCountChange}
              poolCount={poolCount}
              poolCountError={
                errors.poolCount ?? fieldErrorMessage(formError, "poolCount")
              }
              onPoolCount={(next) => {
                setPoolCount(next);
                clearField("poolCount");
              }}
              day={day}
              dayError={
                errors.windowStart === "Pick a day"
                  ? errors.windowStart
                  : undefined
              }
              onDay={onDayChange}
              startTime={startTime}
              startError={
                errors.windowStart && errors.windowStart !== "Pick a day"
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
                if (parseCreateMatchMinutes(next).ok) {
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
                errors.pricePerPlayerCents ??
                fieldErrorMessage(formError, "pricePerPlayerCents")
              }
              onPrice={(next) => {
                setPricePerPlayer(next);
                clearField("pricePerPlayerCents");
              }}
              isPublic={isPublic}
              onIsPublic={setIsPublic}
              allowSoloRegister={allowSoloRegister}
              onAllowSoloRegister={setAllowSoloRegister}
              groupName={reviewGroupName}
            />
          ) : (
            <FriendlyGameSteps
              step={displayedStep}
              now={session.now}
              groups={createGroups.data ?? []}
              selectedGroupId={selectedGroupId}
              groupError={groupError}
              onGroupId={(groupId) => {
                setSelectedGroupId(groupId);
                setGroupFieldError(undefined);
                clearField("groupId");
                setVenueId("");
                setCourtId("none");
                setCourtIds([]);
              }}
              venueCopy={venueCopy}
              venues={picker.data?.venues ?? []}
              venuesLocked={picker.data?.locked === true}
              venuesPending={Boolean(selectedGroupId) && picker.isLoading}
              venueId={venueId}
              venueError={venueError}
              onVenueId={(nextVenueId) => {
                if (nextVenueId !== venueId) {
                  setCourtId("none");
                  setCourtIds([]);
                }
                setVenueId(nextVenueId);
                clearField("venueId");
              }}
              emptyCatalog={emptyCatalog}
              courtId={courtId}
              courtError={courtError}
              onCourtId={(nextCourtId) => {
                setCourtId(nextCourtId);
                clearField("courtId");
              }}
              day={day}
              dayError={
                errors.windowStart === "Pick a day"
                  ? errors.windowStart
                  : undefined
              }
              onDay={onDayChange}
              startTime={startTime}
              startError={
                errors.windowStart && errors.windowStart !== "Pick a day"
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
                errors.pricePerPlayerCents ??
                fieldErrorMessage(createGame.error, "pricePerPlayerCents")
              }
              onPrice={(next) => {
                setPricePerPlayer(next);
                clearField("pricePerPlayerCents");
              }}
              reviewGroup={reviewGroupName}
              reviewVenue={
                selectedVenue
                  ? courtId === "none"
                    ? selectedVenue.name
                    : `${selectedVenue.name}, ${
                        selectedVenue.courts.find(
                          (court) => court.id === courtId,
                        )?.name ?? "Court"
                      }`
                  : "Venue"
              }
            />
          )}
        </CreateFlowShell>
      </form>
    </DashboardShell>
  );
}

export default function NewGamePage() {
  return (
    <React.Suspense
      fallback={
        <DashboardShell title="Create Game" hideMobileTopBar>
          <p className="text-muted-foreground text-sm">Loading…</p>
        </DashboardShell>
      }
    >
      <NewGameForm />
    </React.Suspense>
  );
}
