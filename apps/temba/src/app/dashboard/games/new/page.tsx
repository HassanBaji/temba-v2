"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { CreateFlowShell } from "~/app/dashboard/games/new/create-flow-shell";
import { FriendlyGameSteps } from "~/app/dashboard/games/new/friendly-game-steps";
import { TypeStep } from "~/app/dashboard/games/new/type-step";
import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  CREATE_FLOW_FIELD_IDS,
  FRIENDLY_GAME_LATER_STEPS,
  createFlowStepForField,
  createGameFlowHref,
  createVenueCopy,
  earliestCreateDay,
  friendlyGameKickoff,
  friendlyGamePreviewLine,
  friendlyTournamentCreateHref,
  parseCreateFlowStep,
  parseCreateFlowType,
  resolveCreateFlowStep,
  validateFriendlyGameWhen,
  validateFriendlyGameWhere,
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
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

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
    elementId: string;
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
  const [errors, setErrors] = React.useState<
    Record<string, string | undefined>
  >({});

  const draft: FriendlyGameDraft = {
    groupId: selectedGroupId,
    venueId,
    day,
    startTime,
    finishTime,
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
    if (typeParam === "friendly_tournament" && stepParam !== 1) {
      router.replace(friendlyTournamentCreateHref(requestedGroupId));
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
      toastGlobalFormError(error);
      const firstField = Object.keys(splitTrpcFormError(error).fieldErrors)[0];
      if (!firstField) {
        summaryRef.current?.focus();
        return;
      }
      const target = createFlowStepForField(firstField);
      if (target !== displayedStep) {
        pendingFocus.current = {
          step: target,
          elementId: CREATE_FLOW_FIELD_IDS[firstField] ?? firstField,
        };
        router.push(
          createGameFlowHref({
            groupId: requestedGroupId,
            type: "friendly_game",
            step: target,
          }),
        );
        return;
      }
      focusFormFailure(error, CREATE_FLOW_FIELD_IDS, summaryRef.current);
    },
  });

  React.useEffect(() => {
    const pending = pendingFocus.current;
    if (pending?.step !== displayedStep) {
      return;
    }
    pendingFocus.current = null;
    focusElement(pending.elementId);
  }, [displayedStep]);

  function clearField(field: string) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (createGame.error) {
      createGame.reset();
    }
  }

  function hrefForStep(step: CreateFlowStep) {
    return createGameFlowHref({
      groupId: requestedGroupId,
      type: typeParam ?? "friendly_game",
      step,
    });
  }

  function onSelectType(type: CreateGameTypeId) {
    clearField("type");
    if (type === "friendly_tournament") {
      router.push(
        friendlyTournamentCreateHref(selectedGroupId || requestedGroupId),
      );
      return;
    }
    if (typeParam === "friendly_game" && displayedStep === 1) {
      return;
    }
    router.push(
      createGameFlowHref({
        groupId: requestedGroupId,
        type: "friendly_game",
        step: 1,
      }),
    );
  }

  function onContinue() {
    if (displayedStep === 1) {
      if (typeParam === "friendly_tournament") {
        router.push(
          friendlyTournamentCreateHref(selectedGroupId || requestedGroupId),
        );
        return;
      }
      if (typeParam !== "friendly_game") {
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

  function onCreate() {
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
  const venueCopy = !selectedGroupId
    ? "Pick a Group first. Venue rules depend on the Group."
    : picker.data
      ? createVenueCopy(picker.data)
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
    fieldErrorMessage(createGame.error, "groupId");
  const venueError =
    errors.venueId ?? fieldErrorMessage(createGame.error, "venueId");
  const courtError =
    errors.courtId ?? fieldErrorMessage(createGame.error, "courtId");
  const futureSteps = FRIENDLY_GAME_LATER_STEPS.filter(
    (item) => item.step > displayedStep,
  );
  const primaryLabel =
    displayedStep === 4
      ? createGame.isPending
        ? "Creating…"
        : "Create Game"
      : "Continue";

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

  if (typeParam === "friendly_tournament" && stepParam !== 1) {
    return (
      <DashboardShell title="Create Game" hideMobileTopBar>
        <p className="text-muted-foreground text-sm">Loading…</p>
      </DashboardShell>
    );
  }

  const preview =
    kickoff && displayedStep > 1 ? (
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
                  <p className="text-sm font-semibold">
                    {displayedStep === 2 ? "When" : "Level and price"}
                  </p>
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
                disabled={
                  createGame.isPending || (displayedStep === 2 && emptyCatalog)
                }
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
              globalFormErrorMessage(createGame.error) ??
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
              onDay={(next) => {
                setDay(next);
                clearField("windowStart");
                clearField("windowEnd");
              }}
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
              reviewGroup={
                selectedGroup
                  ? (selectedGroup.name ?? "Untitled Group")
                  : "Group"
              }
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
