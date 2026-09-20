"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameVenueSelect } from "~/components/games/game-venue-select";
import { GameWindowFields } from "~/components/games/game-window-fields";
import { PricePerPlayerAmountInput } from "~/components/games/price-per-player-amount-input";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import {
  formatDateInputValue,
  parseGameDateTime,
  parseRequiredGameWindow,
} from "~/lib/game-window";
import {
  parseOptionalPricePerPlayerCents,
  PRICE_PER_PLAYER_FIELD_DESCRIPTION,
} from "~/lib/price-per-player";
import {
  defaultPoolCount,
  ONE_DAY_OVERRUN_MESSAGE,
  oneDayFit,
  poolCountOptions,
  sizeFriendlyTournament,
  TOURNAMENT_DEFAULT_TEAM_COUNT,
  TOURNAMENT_SLOT_MINUTES,
  TOURNAMENT_TEAM_COUNTS,
  type TournamentSizing,
} from "~/lib/tournament-sizing";
import { api } from "~/trpc/react";

type Duration = "one_day" | "few_weeks";
type RoundSlot = { day: string; startTime: string };

function createVenueCopy(picker: {
  locked: boolean;
  groupKind: "club" | "loose" | "none";
  venues: { archivedAt: Date | string | null }[];
}) {
  if (picker.locked) {
    if (picker.venues[0]?.archivedAt) {
      return "This Community’s linked Venue is Soft-archived. You can still create this tournament here. Skip Court.";
    }
    return "Venue is this Community’s linked Venue and cannot be changed. Courts are optional.";
  }
  if (picker.groupKind === "club") {
    return "This Community has no Venue link. Pick a Venue. Courts are optional.";
  }
  return "Pick a Venue. Courts are optional.";
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

function formatPoolSizeLine(sizing: TournamentSizing) {
  const counts = new Map<number, number>();
  for (const size of sizing.poolSizes) {
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(
      ([size, count]) =>
        `${count} ${count === 1 ? "Pool" : "Pools"} of ${size}`,
    )
    .join(", ");
}

function formatMatchesPerTeam(sizing: TournamentSizing) {
  if (sizing.matchesPerTeamMin === sizing.matchesPerTeamMax) {
    return `Each Game team plays ${sizing.matchesPerTeamMin} Matches`;
  }
  return `Game teams in a larger Pool play ${sizing.matchesPerTeamMax} Matches; Game teams in a smaller Pool play ${sizing.matchesPerTeamMin} Matches`;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function emptyRound(day: string): RoundSlot {
  return { day, startTime: "" };
}

function NewTournamentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedGroupId = searchParams.get("groupId") ?? undefined;

  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [nameError, setNameError] = React.useState<string | undefined>();
  const [selectedGroupId, setSelectedGroupId] = React.useState("");
  const [groupFieldError, setGroupFieldError] = React.useState<
    string | undefined
  >();
  const [teamCount, setTeamCount] = React.useState(
    TOURNAMENT_DEFAULT_TEAM_COUNT,
  );
  const [poolCount, setPoolCount] = React.useState(() =>
    defaultPoolCount(TOURNAMENT_DEFAULT_TEAM_COUNT),
  );
  const [duration, setDuration] = React.useState<Duration>("few_weeks");
  const [day, setDay] = React.useState(() => formatDateInputValue(new Date()));
  const [startTime, setStartTime] = React.useState("");
  const [finishTime, setFinishTime] = React.useState("");
  const [rounds, setRounds] = React.useState<RoundSlot[]>(() => [
    emptyRound(formatDateInputValue(new Date())),
  ]);
  const [venueId, setVenueId] = React.useState("");
  const [courtIds, setCourtIds] = React.useState<string[]>([]);
  const [pricePerPlayer, setPricePerPlayer] = React.useState("");
  const [pricePerPlayerError, setPricePerPlayerError] = React.useState<
    string | undefined
  >();
  const [isPublic, setIsPublic] = React.useState(false);
  const [registrationMode, setRegistrationMode] = React.useState<
    "individual" | "team_only"
  >("individual");

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

  const sized = sizeFriendlyTournament(teamCount, poolCount);
  const sizing = sized.ok ? sized.sizing : null;

  const roundCount = sizing?.roundCount;

  React.useEffect(() => {
    if (roundCount == null) {
      return;
    }
    setRounds((current) => {
      if (current.length === roundCount) {
        return current;
      }
      if (current.length > roundCount) {
        return current.slice(0, roundCount);
      }
      const fallbackDay = current[0]?.day ?? formatDateInputValue(new Date());
      return [
        ...current,
        ...Array.from({ length: roundCount - current.length }, () =>
          emptyRound(fallbackDay),
        ),
      ];
    });
  }, [roundCount]);

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
      toastGlobalFormError(error);
      focusFormFailure(
        error,
        {
          name: "tournament-name",
          groupId: "tournament-group",
          teamCount: "tournament-team-count",
          poolCount: "tournament-pool-count",
          venueId: "tournament-venue",
          courtIds: "tournament-courts",
          pricePerPlayerCents: "tournament-price-per-player",
          windowStart: "tournament-window-start",
          windowEnd: "tournament-window-finish",
        },
        summaryRef.current,
      );
    },
  });

  function onGroupChange(nextGroupId: string) {
    setSelectedGroupId(nextGroupId);
    setGroupFieldError(undefined);
    setVenueId("");
    setCourtIds([]);
  }

  function onTeamCountChange(nextCount: number) {
    setTeamCount(nextCount);
    const allowed = poolCountOptions(nextCount);
    setPoolCount((current) =>
      allowed.includes(current) ? current : defaultPoolCount(nextCount),
    );
  }

  function toggleCourt(courtId: string, checked: boolean) {
    setCourtIds((current) => {
      if (checked) {
        return current.includes(courtId) ? current : [...current, courtId];
      }
      return current.filter((id) => id !== courtId);
    });
  }

  const oneDayWindow =
    duration === "one_day"
      ? parseRequiredGameWindow(day, startTime, finishTime)
      : undefined;
  const fit =
    sizing && oneDayWindow
      ? oneDayFit({
          start: oneDayWindow.windowStart,
          finish: oneDayWindow.windowEnd,
          poolMatches: sizing.poolMatches,
          courtCount: courtIds.length,
        })
      : null;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createTournament.isPending) {
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Name the tournament");
      document.getElementById("tournament-name")?.focus();
      return;
    }
    if (!selectedGroupId) {
      setGroupFieldError("Pick a Group");
      document.getElementById("tournament-group")?.focus();
      return;
    }
    if (!sizing) {
      return;
    }
    let windowStart: Date;
    let windowEnd: Date;
    if (duration === "one_day") {
      const gameWindow = parseRequiredGameWindow(day, startTime, finishTime);
      if (!gameWindow) {
        return;
      }
      windowStart = gameWindow.windowStart;
      windowEnd = gameWindow.windowEnd;
    } else {
      const starts: Date[] = [];
      for (const [index, round] of rounds.entries()) {
        const start = parseGameDateTime(round.day, round.startTime);
        if (!start) {
          document
            .getElementById(`tournament-round-${index + 1}-start`)
            ?.focus();
          return;
        }
        starts.push(start);
      }
      const earliest = starts.reduce((min, start) =>
        start.getTime() < min.getTime() ? start : min,
      );
      const latest = starts.reduce((max, start) =>
        start.getTime() > max.getTime() ? start : max,
      );
      windowStart = earliest;
      windowEnd = new Date(
        latest.getTime() + TOURNAMENT_SLOT_MINUTES * 60 * 1000,
      );
    }
    if (emptyCatalog) {
      return;
    }
    setPricePerPlayerError(undefined);
    const parsedPrice = parseOptionalPricePerPlayerCents(pricePerPlayer);
    if (!parsedPrice.ok) {
      setPricePerPlayerError(parsedPrice.message);
      document.getElementById("tournament-price-per-player")?.focus();
      return;
    }
    createTournament.mutate({
      name: trimmedName,
      groupId: selectedGroupId,
      isPublic,
      registrationMode,
      teamCount,
      poolCount,
      windowStart,
      windowEnd,
      venueId,
      ...(courtIds.length > 0 ? { courtIds } : {}),
      ...(parsedPrice.cents !== null
        ? { pricePerPlayerCents: parsedPrice.cents }
        : {}),
    });
  }

  const cancelHref = selectedGroupId
    ? `/dashboard/groups/${selectedGroupId}`
    : requestedGroupId
      ? `/dashboard/groups/${requestedGroupId}`
      : "/dashboard/games";

  if (createGroups.isLoading) {
    return (
      <DashboardShell title="Create tournament">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </DashboardShell>
    );
  }

  if (createGroups.error) {
    return (
      <DashboardShell title="Create tournament">
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
      <DashboardShell title="Create tournament">
        <EmptyState
          emoji="🎾"
          title="Tournaments are created inside a Group"
          description="Create a Group first, then you can create a tournament."
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
      title="Create tournament"
      description="A Friendly tournament draws Game teams into Pools. Each Pool plays a round robin. There is a winner in each Pool, not an overall champion."
    >
      <Card variant="outlined" className="w-full">
        <form onSubmit={onSubmit} className="space-y-6">
          <FormErrorSummary
            ref={summaryRef}
            message={
              globalFormErrorMessage(createTournament.error) ??
              (emptyCatalog
                ? "No live Venues. Create is not available."
                : null) ??
              (picker.error ? picker.error.message : null)
            }
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="tournament-name">Name</FieldLabel>
              <Input
                id="tournament-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError(undefined);
                }}
                aria-invalid={
                  nameError || fieldErrorMessage(createTournament.error, "name")
                    ? true
                    : undefined
                }
              />
              <FieldError id="tournament-name-error">
                {nameError ?? fieldErrorMessage(createTournament.error, "name")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="tournament-group">Group</FieldLabel>
              <Select
                value={selectedGroupId || undefined}
                onValueChange={onGroupChange}
              >
                <SelectTrigger
                  id="tournament-group"
                  className="w-full"
                  aria-invalid={
                    groupFieldError ||
                    fieldErrorMessage(createTournament.error, "groupId")
                      ? true
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
              <FieldError id="tournament-group-error">
                {groupFieldError ??
                  fieldErrorMessage(createTournament.error, "groupId")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="tournament-team-count">
                Game teams
              </FieldLabel>
              <Select
                value={String(teamCount)}
                onValueChange={(value) => onTeamCountChange(Number(value))}
              >
                <SelectTrigger id="tournament-team-count" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOURNAMENT_TEAM_COUNTS.map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>
                {fieldErrorMessage(createTournament.error, "teamCount")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="tournament-pool-count">Pools</FieldLabel>
              <Select
                value={String(poolCount)}
                onValueChange={(value) => setPoolCount(Number(value))}
              >
                <SelectTrigger id="tournament-pool-count" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {poolCountOptions(teamCount).map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>
                {fieldErrorMessage(createTournament.error, "poolCount")}
              </FieldError>
            </Field>

            {sizing ? (
              <div className="border-rule rounded-[12px] border px-4 py-3 text-sm">
                <p>{formatPoolSizeLine(sizing)}</p>
                <p>{formatMatchesPerTeam(sizing)}</p>
                <p>
                  {sizing.roundCount}{" "}
                  {sizing.roundCount === 1 ? "Round" : "Rounds"},{" "}
                  {sizing.poolMatches} Matches in total
                </p>
                {sizing.uneven ? (
                  <p className="mt-2">
                    Pools are uneven. Some Game teams play one more Match than
                    others.
                  </p>
                ) : null}
              </div>
            ) : null}

            <Field>
              <FieldLabel htmlFor="tournament-duration">
                When it runs
              </FieldLabel>
              <Select
                value={duration}
                onValueChange={(value) => setDuration(value as Duration)}
              >
                <SelectTrigger id="tournament-duration" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="few_weeks">Over a few weeks</SelectItem>
                  <SelectItem value="one_day">One day</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {duration === "one_day" ? (
              <>
                <GameWindowFields
                  dayId="tournament-window-day"
                  startId="tournament-window-start"
                  finishId="tournament-window-finish"
                  day={day}
                  startTime={startTime}
                  finishTime={finishTime}
                  onDayChange={setDay}
                  onStartTimeChange={setStartTime}
                  onFinishTimeChange={setFinishTime}
                  startError={fieldErrorMessage(
                    createTournament.error,
                    "windowStart",
                  )}
                  finishError={fieldErrorMessage(
                    createTournament.error,
                    "windowEnd",
                  )}
                />
                {fit?.lastFinish ? (
                  <p className="text-muted-foreground text-sm">
                    The last Match would finish at {formatClock(fit.lastFinish)}
                    .
                  </p>
                ) : null}
                {fit?.overruns ? (
                  <p className="text-sm">{ONE_DAY_OVERRUN_MESSAGE}</p>
                ) : null}
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <FieldDescription>
                  Round count comes from the Pools. Give each Round a date and
                  start time.
                </FieldDescription>
                {rounds.map((round, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Round {index + 1}</p>
                    <GameWindowFields
                      dayId={`tournament-round-${index + 1}-day`}
                      startId={`tournament-round-${index + 1}-start`}
                      day={round.day}
                      startTime={round.startTime}
                      finishTime=""
                      onDayChange={(value) => {
                        setRounds((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, day: value }
                              : item,
                          ),
                        );
                      }}
                      onStartTimeChange={(value) => {
                        setRounds((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, startTime: value }
                              : item,
                          ),
                        );
                      }}
                      onFinishTimeChange={() => undefined}
                      includeFinish={false}
                    />
                  </div>
                ))}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor="tournament-venue">Venue</FieldLabel>
              <GameVenueSelect
                id="tournament-venue"
                venues={picker.data?.venues ?? []}
                value={venueId}
                onValueChange={(nextVenueId) => {
                  setVenueId(nextVenueId);
                  setCourtIds([]);
                }}
                disabled={!selectedGroupId || picker.data?.locked === true}
                pending={Boolean(selectedGroupId) && picker.isLoading}
                error={
                  Boolean(
                    fieldErrorMessage(createTournament.error, "venueId"),
                  ) || emptyCatalog
                }
                describedBy={
                  fieldErrorMessage(createTournament.error, "venueId")
                    ? "tournament-venue-error"
                    : "tournament-venue-copy"
                }
              />
              <FieldDescription id="tournament-venue-copy">
                {selectedGroupId
                  ? picker.data
                    ? createVenueCopy(picker.data)
                    : "Pick a Venue. Courts are optional."
                  : "Pick a Group first. Venue rules depend on the Group."}
              </FieldDescription>
              <FieldError id="tournament-venue-error">
                {fieldErrorMessage(createTournament.error, "venueId") ??
                  (emptyCatalog
                    ? "No live Venues. Create is not available."
                    : undefined)}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel>Courts</FieldLabel>
              <div id="tournament-courts" className="flex flex-col gap-2">
                {(selectedVenue?.courts ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {selectedVenue
                      ? "This Venue has no Courts to record."
                      : "Pick a Venue to choose Courts."}
                  </p>
                ) : (
                  (selectedVenue?.courts ?? []).map((court) => (
                    <div key={court.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`tournament-court-${court.id}`}
                        checked={courtIds.includes(court.id)}
                        onCheckedChange={(checked) =>
                          toggleCourt(court.id, checked === true)
                        }
                      />
                      <FieldLabel htmlFor={`tournament-court-${court.id}`}>
                        {court.name}
                      </FieldLabel>
                    </div>
                  ))
                )}
              </div>
              <FieldError>
                {fieldErrorMessage(createTournament.error, "courtIds")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="tournament-price-per-player">
                Price per player
              </FieldLabel>
              <PricePerPlayerAmountInput
                id="tournament-price-per-player"
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
                  fieldErrorMessage(
                    createTournament.error,
                    "pricePerPlayerCents",
                  )
                    ? true
                    : undefined
                }
              />
              <FieldDescription>
                {PRICE_PER_PLAYER_FIELD_DESCRIPTION}
              </FieldDescription>
              <FieldError>
                {pricePerPlayerError ??
                  fieldErrorMessage(
                    createTournament.error,
                    "pricePerPlayerCents",
                  )}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="tournament-public">
                Who can take a seat
              </FieldLabel>
              <Select
                value={isPublic ? "anyone" : "group"}
                onValueChange={(value) => setIsPublic(value === "anyone")}
              >
                <SelectTrigger id="tournament-public" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">This Group only</SelectItem>
                  <SelectItem value="anyone">Anyone with the link</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="tournament-registration">
                Registration
              </FieldLabel>
              <Select
                value={registrationMode}
                onValueChange={(value) =>
                  setRegistrationMode(value as "individual" | "team_only")
                }
              >
                <SelectTrigger id="tournament-registration" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual seats</SelectItem>
                  <SelectItem value="team_only">Complete Teams only</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={createTournament.isPending || emptyCatalog}
            >
              {createTournament.isPending ? "Creating…" : "Create tournament"}
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

export default function NewTournamentPage() {
  return (
    <React.Suspense
      fallback={
        <DashboardShell title="Create tournament">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </DashboardShell>
      }
    >
      <NewTournamentForm />
    </React.Suspense>
  );
}
