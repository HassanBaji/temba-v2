"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameLevelBandSelect } from "~/components/games/game-level-band-select";
import { GameVenueSelect } from "~/components/games/game-venue-select";
import { GameWindowFields } from "~/components/games/game-window-fields";
import { PricePerPlayerAmountInput } from "~/components/games/price-per-player-amount-input";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  formatDateInputValue,
  formatGameWindowName,
  parseRequiredGameWindow,
} from "~/lib/game-window";
import {
  LEVEL_BAND_SELECT_NONE,
  LEVEL_RANGE_FIELD_DESCRIPTION,
  LEVEL_RANGE_INVERTED_MESSAGE,
  parseLevelBandSelectTenths,
  type LevelBandSelectValue,
} from "~/lib/level-range";
import {
  parseOptionalPricePerPlayerCents,
  PRICE_PER_PLAYER_FIELD_DESCRIPTION,
} from "~/lib/price-per-player";
import { api } from "~/trpc/react";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";

function createVenueCopy(picker: {
  locked: boolean;
  groupKind: "club" | "loose" | "none";
  venues: { archivedAt: Date | string | null }[];
}) {
  if (picker.locked) {
    if (picker.venues[0]?.archivedAt) {
      return "This Community’s linked Venue is Soft-archived. You can still create this Game here. Skip Court.";
    }
    return "Venue is this Community’s linked Venue and cannot be changed. Court is optional.";
  }
  if (picker.groupKind === "club") {
    return "This Community has no Venue link. Pick a Venue. Court is optional.";
  }
  return "Pick a Venue. Court is optional.";
}

function groupOptionLabel(group: {
  name: string | null;
  communityName: string | null;
}) {
  const name = group.name ?? "Untitled Group";
  if (!group.communityName) {
    return name;
  }
  return `${name} · ${group.communityName}`;
}

function NewGameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedGroupId = searchParams.get("groupId") ?? undefined;

  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [selectedGroupId, setSelectedGroupId] = React.useState("");
  const [groupFieldError, setGroupFieldError] = React.useState<
    string | undefined
  >();
  const [day, setDay] = React.useState(() => formatDateInputValue(new Date()));
  const [startTime, setStartTime] = React.useState("");
  const [finishTime, setFinishTime] = React.useState("");
  const [venueId, setVenueId] = React.useState("");
  const [courtId, setCourtId] = React.useState("none");
  const [pricePerPlayer, setPricePerPlayer] = React.useState("");
  const [pricePerPlayerError, setPricePerPlayerError] = React.useState<
    string | undefined
  >();
  const [levelMin, setLevelMin] = React.useState<LevelBandSelectValue>(
    LEVEL_BAND_SELECT_NONE,
  );
  const [levelMax, setLevelMax] = React.useState<LevelBandSelectValue>(
    LEVEL_BAND_SELECT_NONE,
  );
  const [levelMinError, setLevelMinError] = React.useState<
    string | undefined
  >();
  const [levelMaxError, setLevelMaxError] = React.useState<
    string | undefined
  >();

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
    if (!createGroups.data) {
      return;
    }
    if (!requestedGroupId) {
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
      focusFormFailure(
        error,
        {
          groupId: "game-group",
          venueId: "game-venue",
          courtId: "game-court",
          pricePerPlayerCents: "game-price-per-player",
          levelMinTenths: "game-level-min",
          levelMaxTenths: "game-level-max",
          windowStart: "game-window-start",
          windowEnd: "game-window-finish",
        },
        summaryRef.current,
      );
    },
  });

  function onGroupChange(nextGroupId: string) {
    setSelectedGroupId(nextGroupId);
    setGroupFieldError(undefined);
    setVenueId("");
    setCourtId("none");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createGame.isPending) {
      return;
    }
    if (!selectedGroupId) {
      setGroupFieldError("Pick a Group");
      document.getElementById("game-group")?.focus();
      return;
    }
    const gameWindow = parseRequiredGameWindow(day, startTime, finishTime);
    if (!gameWindow) {
      return;
    }
    if (emptyCatalog) {
      return;
    }
    setPricePerPlayerError(undefined);
    setLevelMinError(undefined);
    setLevelMaxError(undefined);
    const parsedPrice = parseOptionalPricePerPlayerCents(pricePerPlayer);
    if (!parsedPrice.ok) {
      setPricePerPlayerError(parsedPrice.message);
      document.getElementById("game-price-per-player")?.focus();
      return;
    }
    const parsedMin = parseLevelBandSelectTenths(levelMin, "min");
    const parsedMax = parseLevelBandSelectTenths(levelMax, "max");
    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      setLevelMinError(LEVEL_RANGE_INVERTED_MESSAGE);
      document.getElementById("game-level-min")?.focus();
      return;
    }
    createGame.mutate({
      name: formatGameWindowName(day, startTime, finishTime),
      groupId: selectedGroupId,
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      windowStart: gameWindow.windowStart,
      windowEnd: gameWindow.windowEnd,
      venueId,
      courtId: courtId === "none" ? undefined : courtId,
      ...(parsedPrice.cents !== null
        ? { pricePerPlayerCents: parsedPrice.cents }
        : {}),
      ...(parsedMin !== null ? { levelMinTenths: parsedMin } : {}),
      ...(parsedMax !== null ? { levelMaxTenths: parsedMax } : {}),
    });
  }

  const cancelHref = selectedGroupId
    ? `/dashboard/groups/${selectedGroupId}`
    : requestedGroupId
      ? `/dashboard/groups/${requestedGroupId}`
      : "/dashboard/games";

  if (createGroups.isLoading) {
    return (
      <DashboardShell title="Create Game">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </DashboardShell>
    );
  }

  if (createGroups.error) {
    return (
      <DashboardShell title="Create Game">
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

  if (createGroups.data && createGroups.data.length === 0) {
    return (
      <DashboardShell title="Create Game">
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

  return (
    <DashboardShell
      title="Create Game"
      description="Padel only. A Friendly game creates one Match with caps 4 / 2. This Game belongs to the chosen Group."
    >
      <Card variant="outlined" className="w-full">
        <form onSubmit={onSubmit} className="space-y-6">
          <FormErrorSummary
            ref={summaryRef}
            message={
              globalFormErrorMessage(createGame.error) ??
              (emptyCatalog
                ? "No live Venues. Create is not available."
                : null) ??
              (picker.error ? picker.error.message : null)
            }
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="game-group">Group</FieldLabel>
              <Select
                value={selectedGroupId || undefined}
                onValueChange={onGroupChange}
              >
                <SelectTrigger
                  id="game-group"
                  className="w-full"
                  aria-invalid={
                    groupFieldError ||
                    fieldErrorMessage(createGame.error, "groupId")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    groupFieldError ||
                    fieldErrorMessage(createGame.error, "groupId")
                      ? "game-group-error"
                      : undefined
                  }
                >
                  <SelectValue placeholder="Select a Group" />
                </SelectTrigger>
                <SelectContent>
                  {(createGroups.data ?? []).map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {groupOptionLabel(group)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="game-group-error">
                {groupFieldError ??
                  fieldErrorMessage(createGame.error, "groupId")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="game-venue">Venue</FieldLabel>
              <GameVenueSelect
                id="game-venue"
                venues={picker.data?.venues ?? []}
                value={venueId}
                onValueChange={(nextVenueId) => {
                  setVenueId(nextVenueId);
                  setCourtId("none");
                }}
                disabled={!selectedGroupId || picker.data?.locked === true}
                pending={Boolean(selectedGroupId) && picker.isLoading}
                error={
                  Boolean(fieldErrorMessage(createGame.error, "venueId")) ||
                  emptyCatalog
                }
                describedBy={
                  fieldErrorMessage(createGame.error, "venueId")
                    ? "game-venue-error"
                    : "game-venue-copy"
                }
              />
              <FieldDescription id="game-venue-copy">
                {selectedGroupId
                  ? picker.data
                    ? createVenueCopy(picker.data)
                    : "Pick a Venue. Court is optional."
                  : "Pick a Group first. Venue rules depend on the Group."}
              </FieldDescription>
              <FieldError id="game-venue-error">
                {fieldErrorMessage(createGame.error, "venueId") ??
                  (emptyCatalog
                    ? "No live Venues. Create is not available."
                    : undefined)}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="game-court">Court (optional)</FieldLabel>
              <Select
                value={courtId}
                onValueChange={setCourtId}
                disabled={!selectedGroupId}
              >
                <SelectTrigger
                  id="game-court"
                  aria-invalid={
                    fieldErrorMessage(createGame.error, "courtId")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    fieldErrorMessage(createGame.error, "courtId")
                      ? "game-court-error"
                      : undefined
                  }
                >
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(selectedVenue?.courts ?? []).map((court) => (
                    <SelectItem key={court.id} value={court.id}>
                      {court.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="game-court-error">
                {fieldErrorMessage(createGame.error, "courtId")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="game-price-per-player">
                Price per player
              </FieldLabel>
              <PricePerPlayerAmountInput
                id="game-price-per-player"
                type="number"
                step="0.01"
                min="0"
                value={pricePerPlayer}
                onChange={(event) => {
                  setPricePerPlayer(event.target.value);
                  setPricePerPlayerError(undefined);
                }}
                aria-invalid={
                  pricePerPlayerError ||
                  fieldErrorMessage(createGame.error, "pricePerPlayerCents")
                    ? true
                    : undefined
                }
                aria-describedby={
                  pricePerPlayerError ||
                  fieldErrorMessage(createGame.error, "pricePerPlayerCents")
                    ? "game-price-per-player-error"
                    : "game-price-per-player-copy"
                }
              />
              <FieldDescription id="game-price-per-player-copy">
                {PRICE_PER_PLAYER_FIELD_DESCRIPTION}
              </FieldDescription>
              <FieldError id="game-price-per-player-error">
                {pricePerPlayerError ??
                  fieldErrorMessage(createGame.error, "pricePerPlayerCents")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="game-level-min">Minimum Level</FieldLabel>
              <GameLevelBandSelect
                id="game-level-min"
                value={levelMin}
                onValueChange={(value) => {
                  setLevelMin(value);
                  setLevelMinError(undefined);
                }}
                invalid={
                  levelMinError ||
                  fieldErrorMessage(createGame.error, "levelMinTenths")
                    ? true
                    : undefined
                }
                describedBy={
                  levelMinError ||
                  fieldErrorMessage(createGame.error, "levelMinTenths")
                    ? "game-level-min-error"
                    : "game-level-range-copy"
                }
              />
              <FieldError id="game-level-min-error">
                {levelMinError ??
                  fieldErrorMessage(createGame.error, "levelMinTenths")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="game-level-max">Maximum Level</FieldLabel>
              <GameLevelBandSelect
                id="game-level-max"
                value={levelMax}
                onValueChange={(value) => {
                  setLevelMax(value);
                  setLevelMaxError(undefined);
                }}
                invalid={
                  levelMaxError ||
                  fieldErrorMessage(createGame.error, "levelMaxTenths")
                    ? true
                    : undefined
                }
                describedBy={
                  levelMaxError ||
                  fieldErrorMessage(createGame.error, "levelMaxTenths")
                    ? "game-level-max-error"
                    : "game-level-range-copy"
                }
              />
              <FieldDescription id="game-level-range-copy">
                {LEVEL_RANGE_FIELD_DESCRIPTION}
              </FieldDescription>
              <FieldError id="game-level-max-error">
                {levelMaxError ??
                  fieldErrorMessage(createGame.error, "levelMaxTenths")}
              </FieldError>
            </Field>

            <GameWindowFields
              dayId="game-window-day"
              startId="game-window-start"
              finishId="game-window-finish"
              day={day}
              startTime={startTime}
              finishTime={finishTime}
              onDayChange={setDay}
              onStartTimeChange={setStartTime}
              onFinishTimeChange={setFinishTime}
              startError={fieldErrorMessage(createGame.error, "windowStart")}
              finishError={fieldErrorMessage(createGame.error, "windowEnd")}
            />
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={createGame.isPending || emptyCatalog}
            >
              {createGame.isPending ? "Creating…" : "Create Game"}
            </Button>
            <Button variant="outline" asChild>
              <Link href={cancelHref}>Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}

export default function NewGamePage() {
  return (
    <React.Suspense
      fallback={
        <DashboardShell title="Create Game">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </DashboardShell>
      }
    >
      <NewGameForm />
    </React.Suspense>
  );
}
