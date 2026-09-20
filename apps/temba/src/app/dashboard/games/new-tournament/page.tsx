"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameVenueSelect } from "~/components/games/game-venue-select";
import { GameWindowFields } from "~/components/games/game-window-fields";
import { PricePerPlayerAmountInput } from "~/components/games/price-per-player-amount-input";
import { StepperField } from "~/components/games/stepper-field";
import {
  TournamentDetailRows,
  type TournamentDetailRow,
} from "~/components/games/tournament-detail-rows";
import { TAB_SEGMENT } from "~/components/groups/group-home-chrome";
import { Button } from "~/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
  formatPricePerPlayerCents,
  parseOptionalPricePerPlayerCents,
  PRICE_PER_PLAYER_FIELD_DESCRIPTION,
} from "~/lib/price-per-player";
import {
  COUNTS_FOR_RATING_LABEL,
  COUNTS_FOR_RATING_YES,
  PRICE_ROW_LABEL,
} from "~/lib/tournament-home";
import {
  DRAW_RANDOM_VALUE,
  DRAW_ROW_LABEL,
  PRICE_PER_PLAYER_JOIN_SUFFIX,
  ROUNDS_ROW_LABEL,
} from "~/lib/tournament-join";
import {
  defaultPoolCount,
  formatMatchesPerTeam,
  formatPoolSizeLine,
  ONE_DAY_OVERRUN_MESSAGE,
  oneDayFit,
  poolCountOptions,
  sizeFriendlyTournament,
  TOURNAMENT_DEFAULT_TEAM_COUNT,
  TOURNAMENT_SLOT_MINUTES,
  TOURNAMENT_TEAM_MAX,
  TOURNAMENT_TEAM_MIN,
  TOURNAMENT_TEAM_STEP,
  type TournamentSizing,
} from "~/lib/tournament-sizing";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

type Duration = "one_day" | "few_weeks";
type RoundSlot = { day: string; startTime: string };

const FIELD_LABEL = "text-muted-foreground text-[13px] font-normal";
const CREATE_SUBLINE =
  "Same as setting up a Friendly game, only it runs a few Rounds.";
const CREATE_FOOTER_COPY =
  "It shows up in Games like any other Game. You draw once the seats are full.";
const UNEVEN_POOLS_COPY =
  "Pools are uneven. Some Game teams play one more Match than others.";
const POOL_MATCHES_ROW_LABEL = "Pool Matches";
const MATCHES_PER_TEAM_ROW_LABEL = "Matches per Game team";
const EACH_MATCH_ROW_LABEL = "Each Match";
const COURTS_ROW_LABEL = "Courts";
const ONE_DAY_CALLOUT_LABEL = "The day";

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

function formatClock(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function emptyRound(day: string): RoundSlot {
  return { day, startTime: "" };
}

function playersInPairsLine(teamCount: number) {
  return `${teamCount * 2} players in pairs. Two seats per team.`;
}

function courtCountValue(courtCount: number) {
  if (courtCount === 0) {
    return "None";
  }
  return courtCount === 1 ? "1 Court" : `${courtCount} Courts`;
}

function tournamentCreateDetailRows(args: {
  sizing: TournamentSizing;
  courtCount: number;
  priceLabel: string | null;
}): TournamentDetailRow[] {
  const rows: TournamentDetailRow[] = [
    {
      label: POOL_MATCHES_ROW_LABEL,
      value:
        args.sizing.poolMatches === 1
          ? "1 Match"
          : `${args.sizing.poolMatches} Matches`,
    },
    {
      label: MATCHES_PER_TEAM_ROW_LABEL,
      value: formatMatchesPerTeam(args.sizing),
    },
    {
      label: ROUNDS_ROW_LABEL,
      value:
        args.sizing.roundCount === 1
          ? "1 Round"
          : `${args.sizing.roundCount} Rounds`,
    },
    {
      label: EACH_MATCH_ROW_LABEL,
      value: `${TOURNAMENT_SLOT_MINUTES} min`,
    },
    {
      label: COURTS_ROW_LABEL,
      value: courtCountValue(args.courtCount),
    },
  ];
  if (args.priceLabel) {
    rows.push({
      label: PRICE_ROW_LABEL,
      value:
        args.priceLabel === "Free"
          ? args.priceLabel
          : `${args.priceLabel} ${PRICE_PER_PLAYER_JOIN_SUFFIX}`,
    });
  }
  rows.push(
    {
      label: COUNTS_FOR_RATING_LABEL,
      value: COUNTS_FOR_RATING_YES,
    },
    {
      label: DRAW_ROW_LABEL,
      value: DRAW_RANDOM_VALUE,
    },
  );
  return rows;
}

function SegmentedField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  const labelId = `${id}-label`;
  return (
    <Field>
      <FieldLabel id={labelId} className={FIELD_LABEL}>
        {label}
      </FieldLabel>
      <Tabs
        value={value}
        onValueChange={(next) => {
          const match = options.find((option) => option.value === next);
          if (match) {
            onChange(match.value);
          }
        }}
      >
        <TabsList
          id={id}
          aria-labelledby={labelId}
          className="border-rule bg-paper w-full max-w-full justify-stretch overflow-hidden rounded-[12px] border p-0 group-data-[orientation=horizontal]/tabs:h-auto"
        >
          {options.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className={cn(TAB_SEGMENT, "px-2 text-[14px]")}
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </Field>
  );
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
  const [rounds, setRounds] = React.useState<RoundSlot[]>(() => {
    const initialDay = formatDateInputValue(new Date());
    const initial = sizeFriendlyTournament(
      TOURNAMENT_DEFAULT_TEAM_COUNT,
      defaultPoolCount(TOURNAMENT_DEFAULT_TEAM_COUNT),
    );
    const count = initial.ok ? initial.sizing.roundCount : 1;
    return Array.from({ length: count }, () => emptyRound(initialDay));
  });
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

  const selectedGroup = (createGroups.data ?? []).find(
    (group) => group.id === selectedGroupId,
  );
  const selectedGroupName = selectedGroup
    ? (selectedGroup.name ?? "Untitled Group")
    : undefined;
  const poolOptions = poolCountOptions(teamCount);
  const poolMin = poolOptions[0] ?? 1;
  const poolMax = poolOptions[poolOptions.length - 1] ?? poolMin;
  const parsedPriceForSummary =
    parseOptionalPricePerPlayerCents(pricePerPlayer);
  const priceLabel = parsedPriceForSummary.ok
    ? formatPricePerPlayerCents(parsedPriceForSummary.cents)
    : null;

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
      hidePageHeader
      hideMobileTopBar
      hideNav
      isSubPage
    >
      <form
        onSubmit={onSubmit}
        className="flex min-h-[calc(100svh-2rem)] flex-col max-lg:pb-32"
      >
        <div className="border-rule -mx-4 border-b px-4 pb-0 pt-[22px] min-[430px]:-mx-5 min-[430px]:px-5 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
          <div className="flex items-center justify-between">
            <Link
              href={cancelHref}
              aria-label="Close"
              className="border-rule text-ink focus-visible:ring-ring/50 flex size-11 min-h-11 min-w-11 items-center justify-center rounded-[10px] border outline-none focus-visible:ring-[3px]"
            >
              <X aria-hidden="true" className="size-5" strokeWidth={2} />
            </Link>
            {selectedGroupName ? (
              <p className="text-muted-foreground text-[13px]">
                {selectedGroupName}
              </p>
            ) : null}
          </div>
          <h1 className="font-expanded mt-6 text-[38px] leading-none tracking-[-0.03em]">
            New tournament,
            <br />
            several Rounds
          </h1>
          <p className="text-muted-foreground mt-2.5 pb-[22px] text-[15px] leading-relaxed">
            {CREATE_SUBLINE}
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-[18px] py-[22px]">
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
          <FieldGroup className="gap-[18px]">
            <Field>
              <FieldLabel htmlFor="tournament-name" className={FIELD_LABEL}>
                Name
              </FieldLabel>
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
              <FieldLabel htmlFor="tournament-group" className={FIELD_LABEL}>
                Group
              </FieldLabel>
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

            <StepperField
              id="tournament-team-count"
              label="Game teams"
              value={teamCount}
              unit="Game teams"
              min={TOURNAMENT_TEAM_MIN}
              max={TOURNAMENT_TEAM_MAX}
              step={TOURNAMENT_TEAM_STEP}
              onChange={onTeamCountChange}
              decreaseLabel="Fewer Game teams"
              increaseLabel="More Game teams"
              error={fieldErrorMessage(createTournament.error, "teamCount")}
              description={
                <p className="text-muted-foreground text-[13px]">
                  {playersInPairsLine(teamCount)}
                </p>
              }
            />

            <StepperField
              id="tournament-pool-count"
              label="Pools"
              value={poolCount}
              unit={poolCount === 1 ? "Pool" : "Pools"}
              min={poolMin}
              max={poolMax}
              step={1}
              onChange={setPoolCount}
              decreaseLabel="Fewer Pools"
              increaseLabel="More Pools"
              error={fieldErrorMessage(createTournament.error, "poolCount")}
              description={
                sizing ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-muted-foreground text-[13px]">
                      {formatPoolSizeLine(sizing)}
                    </p>
                    {sizing.uneven ? (
                      <p className="text-muted-foreground text-[13px]">
                        {UNEVEN_POOLS_COPY}
                      </p>
                    ) : null}
                  </div>
                ) : null
              }
            />

            <SegmentedField
              id="tournament-duration"
              label="How long it runs"
              value={duration}
              onChange={setDuration}
              options={[
                { value: "one_day", label: "One day" },
                { value: "few_weeks", label: "A few weeks" },
              ]}
            />

            {duration === "one_day" ? (
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
              <FieldLabel htmlFor="tournament-venue" className={FIELD_LABEL}>
                Venue
              </FieldLabel>
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
              <FieldLabel className={FIELD_LABEL}>Courts</FieldLabel>
              <div id="tournament-courts" className="flex flex-wrap gap-2">
                {(selectedVenue?.courts ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {selectedVenue
                      ? "This Venue has no Courts to record."
                      : "Pick a Venue to choose Courts."}
                  </p>
                ) : (
                  (selectedVenue?.courts ?? []).map((court) => {
                    const selected = courtIds.includes(court.id);
                    return (
                      <button
                        key={court.id}
                        type="button"
                        id={`tournament-court-${court.id}`}
                        aria-pressed={selected}
                        onClick={() => {
                          toggleCourt(court.id, !selected);
                        }}
                        className={cn(
                          "min-h-11 min-w-11 rounded-[12px] border px-4 text-sm",
                          "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
                          selected
                            ? "border-ink bg-ink text-paper"
                            : "border-rule bg-paper text-ink hover:bg-wash",
                        )}
                      >
                        {court.name}
                      </button>
                    );
                  })
                )}
              </div>
              <FieldError>
                {fieldErrorMessage(createTournament.error, "courtIds")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel
                htmlFor="tournament-price-per-player"
                className={FIELD_LABEL}
              >
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

            <SegmentedField
              id="tournament-public"
              label="Who can take a seat"
              value={isPublic ? "anyone" : "group"}
              onChange={(value) => setIsPublic(value === "anyone")}
              options={[
                {
                  value: "group",
                  label: selectedGroupName ?? "This Group only",
                },
                { value: "anyone", label: "Anyone with the link" },
              ]}
            />

            <SegmentedField
              id="tournament-registration"
              label="How people join"
              value={registrationMode}
              onChange={setRegistrationMode}
              options={[
                { value: "individual", label: "Individual seats" },
                { value: "team_only", label: "Complete Teams only" },
              ]}
            />
          </FieldGroup>

          {sizing ? (
            <TournamentDetailRows
              rows={tournamentCreateDetailRows({
                sizing,
                courtCount: courtIds.length,
                priceLabel,
              })}
            />
          ) : null}

          {duration === "one_day" && fit ? (
            <div className="border-ink rounded-[14px] border p-5">
              <p className="text-muted-foreground text-[13px]">
                {ONE_DAY_CALLOUT_LABEL}
              </p>
              {fit.lastFinish ? (
                <p className="mt-2 text-[17px] leading-snug">
                  The last Match would finish at {formatClock(fit.lastFinish)}.
                </p>
              ) : null}
              {fit.overruns ? (
                <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
                  {ONE_DAY_OVERRUN_MESSAGE}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "bg-background border-rule flex flex-col gap-2.5 border-t",
            "max-lg:fixed max-lg:inset-x-0 max-lg:z-40 max-lg:px-4 max-lg:pb-[max(26px,env(safe-area-inset-bottom))] max-lg:pt-5",
            "lg:mt-auto lg:px-0 lg:pb-2 lg:pt-5",
          )}
        >
          <Button
            type="submit"
            disabled={createTournament.isPending || emptyCatalog}
            className="h-[52px] min-h-[52px] w-full rounded-[12px] text-base font-semibold"
          >
            {createTournament.isPending ? "Creating…" : "Create tournament"}
          </Button>
          <p className="text-muted-foreground text-center text-[12px] leading-relaxed">
            {CREATE_FOOTER_COPY}
          </p>
        </div>
      </form>
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
