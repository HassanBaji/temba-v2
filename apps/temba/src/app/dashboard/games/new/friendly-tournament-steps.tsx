"use client";

import { Check, Lock, Search } from "lucide-react";
import * as React from "react";

import { ChoiceChip } from "~/app/dashboard/games/new/choice-chip";
import { PricePerPlayerAmountInput } from "~/components/games/price-per-player-amount-input";
import { StepperField } from "~/components/games/stepper-field";
import { Calendar } from "~/components/ui/calendar";
import { FieldDescription, FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  CREATE_FLOW_MATCH_MINUTE_CHIPS,
  CREATE_FLOW_PRICE_CHIPS,
  FRIENDLY_TOURNAMENT_UNEVEN_GROUPS,
  applyLevelBoundChange,
  createFlowDayOptions,
  dayChipValue,
  friendlyTournamentCourtsLabel,
  friendlyTournamentFormatLabel,
  friendlyTournamentGroupsLine,
  friendlyTournamentSchedule,
  gameTeamOfTwoCopy,
  isLevelBoundDisabled,
  parseCreateMatchMinutes,
  previewStartSlots,
  validateFriendlyGameWhen,
  priceChipIsSelected,
  venueCardMeta,
  venueMatchesQuery,
  visibleCreateCourts,
  visibleCreateGroups,
  VISIBLE_GROUP_CHIP_COUNT,
} from "~/lib/create-game-flow";
import {
  earliestGameWindowDay,
  formatDateInputValue,
  formatDayLabel,
  formatTimeSlotLabel,
  parseDateInputValue,
  parseRequiredGameWindow,
  upcomingGameWindowTimeSlots,
} from "~/lib/game-window";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "~/lib/level-bands";
import {
  LEVEL_BAND_SELECT_NONE,
  LEVEL_RANGE_FIELD_DESCRIPTION,
  type LevelBandSelectValue,
} from "~/lib/level-range";
import { PRICE_PER_PLAYER_FIELD_DESCRIPTION } from "~/lib/price-per-player";
import {
  COUNTS_FOR_RATING_LABEL,
  COUNTS_FOR_RATING_YES,
} from "~/lib/tournament-home";
import {
  ALONE_OR_WITH_A_PARTNER_LABEL,
  ANYONE_WITH_THE_LINK_LABEL,
  HOW_PEOPLE_JOIN_LABEL,
  ONE_DAY_OVERRUN_MESSAGE,
  playersInPairsLine,
  poolCountOptions,
  sizeFriendlyTournament,
  TOURNAMENT_TEAM_MAX,
  TOURNAMENT_TEAM_MIN,
  TOURNAMENT_TEAM_STEP,
  WHO_CAN_TAKE_A_SEAT_LABEL,
  WITH_A_PARTNER_ONLY_LABEL,
} from "~/lib/tournament-sizing";
import { cn } from "~/lib/utils";

type CreateGroup = {
  id: string;
  name: string | null;
  communityName: string | null;
};

type CreateCourt = { id: string; name: string };

type CreateVenue = {
  id: string;
  name: string;
  city: string;
  courts: CreateCourt[];
};

const STEPPER_LABEL = "text-foreground font-expanded text-title font-normal";

function groupOptionLabel(group: CreateGroup) {
  const name = group.name ?? "Untitled Group";
  if (!group.communityName) {
    return name;
  }
  return `${name} · ${group.communityName}`;
}

function SectionHeading({
  id,
  title,
  meta,
}: {
  id: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="font-expanded text-title">
        {title}
      </h2>
      {meta ? <p className="text-muted-foreground text-meta">{meta}</p> : null}
    </div>
  );
}

function GroupChips({
  groups,
  selectedGroupId,
  labelledBy,
  onSelect,
}: {
  groups: readonly CreateGroup[];
  selectedGroupId: string;
  labelledBy?: string;
  onSelect: (groupId: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : "Group"}
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-2"
    >
      {groups.map((group) => {
        const selected = group.id === selectedGroupId;
        return (
          <ChoiceChip
            key={group.id}
            role="radio"
            selected={selected}
            onClick={() => {
              onSelect(group.id);
            }}
          >
            {selected ? (
              <Check aria-hidden="true" className="size-3.5" />
            ) : null}
            {groupOptionLabel(group)}
          </ChoiceChip>
        );
      })}
    </div>
  );
}

function VenueCards({
  venues,
  venueId,
  labelledBy,
  invalid = false,
  describedBy,
  onSelect,
}: {
  venues: readonly CreateVenue[];
  venueId: string;
  labelledBy?: string;
  invalid?: boolean;
  describedBy?: string;
  onSelect: (venueId: string) => void;
}) {
  return (
    <div
      id={labelledBy ? "game-venue" : undefined}
      role="radiogroup"
      aria-label={labelledBy ? undefined : "Venue"}
      aria-labelledby={labelledBy}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      tabIndex={labelledBy ? -1 : undefined}
      className="border-rule overflow-hidden rounded-[14px] border outline-none"
    >
      {venues.map((venue) => {
        const selected = venue.id === venueId;
        return (
          <button
            key={venue.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onSelect(venue.id);
            }}
            className={cn(
              "focus-visible:ring-ring/50 flex min-h-11 w-full items-center gap-3 border-b px-[18px] py-4 text-left outline-none last:border-b-0 focus-visible:ring-[3px]",
              selected
                ? "border-ink bg-ink text-paper"
                : "border-rule bg-paper hover:bg-wash",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold">
                {venue.name}
              </span>
              <span
                className={cn(
                  "text-meta mt-0.5 block",
                  selected ? "text-dim" : "text-muted-foreground",
                )}
              >
                {venueCardMeta(venue.courts.length, venue.city)}
              </span>
            </span>
            {selected ? (
              <Check aria-hidden="true" className="size-[18px] shrink-0" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-rule flex items-center justify-between gap-3 border-t px-[18px] py-3.5 text-sm first:border-t-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{value}</span>
    </div>
  );
}

function LevelBandRow({
  id,
  label,
  bound,
  value,
  other,
  invalid,
  describedBy,
  onSelect,
}: {
  id: string;
  label: string;
  bound: "min" | "max";
  value: LevelBandSelectValue;
  other: LevelBandSelectValue;
  invalid: boolean;
  describedBy?: string;
  onSelect: (band: LevelBandSelectValue) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p id={`${id}-label`} className="text-muted-foreground text-meta">
        {label}
      </p>
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        tabIndex={-1}
        className="grid grid-cols-4 gap-1.5 outline-none sm:grid-cols-7"
      >
        {ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => (
          <ChoiceChip
            key={band}
            role="radio"
            selected={value === band}
            disabled={isLevelBoundDisabled(bound, band, other)}
            onClick={() => {
              onSelect(value === band ? LEVEL_BAND_SELECT_NONE : band);
            }}
          >
            {band}
          </ChoiceChip>
        ))}
      </div>
    </div>
  );
}

function formatClock(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FriendlyTournamentSteps({
  step,
  now,
  groups,
  selectedGroupId,
  groupError,
  onGroupId,
  venueCopy,
  venues,
  venuesLocked,
  venuesPending,
  venueId,
  venueError,
  onVenueId,
  emptyCatalog,
  recentCourtIds,
  courtIds,
  courtError,
  onToggleCourt,
  teamCount,
  teamCountError,
  onTeamCount,
  poolCount,
  poolCountError,
  onPoolCount,
  day,
  dayError,
  onDay,
  startTime,
  startError,
  onStartTime,
  finishTime,
  finishError,
  onFinishTime,
  matchMinutes,
  matchMinutesError,
  onMatchMinutes,
  name,
  nameError,
  onName,
  showLevelRange,
  onEntryMode,
  levelMin,
  levelMax,
  levelMinError,
  levelMaxError,
  onLevelRange,
  price,
  priceError,
  onPrice,
  isPublic,
  onIsPublic,
  allowSoloRegister,
  onAllowSoloRegister,
  groupName,
}: {
  step: 2 | 3 | 4;
  now: Date;
  groups: readonly CreateGroup[];
  selectedGroupId: string;
  groupError?: string;
  onGroupId: (groupId: string) => void;
  venueCopy: string;
  venues: readonly CreateVenue[];
  venuesLocked: boolean;
  venuesPending: boolean;
  venueId: string;
  venueError?: string;
  onVenueId: (venueId: string) => void;
  emptyCatalog: boolean;
  recentCourtIds: readonly string[];
  courtIds: readonly string[];
  courtError?: string;
  onToggleCourt: (courtId: string) => void;
  teamCount: number;
  teamCountError?: string;
  onTeamCount: (teamCount: number) => void;
  poolCount: number;
  poolCountError?: string;
  onPoolCount: (poolCount: number) => void;
  day: string;
  dayError?: string;
  onDay: (day: string) => void;
  startTime: string;
  startError?: string;
  onStartTime: (startTime: string) => void;
  finishTime: string;
  finishError?: string;
  onFinishTime: (finishTime: string) => void;
  matchMinutes: string;
  matchMinutesError?: string;
  onMatchMinutes: (minutes: string) => void;
  name: string;
  nameError?: string;
  onName: (name: string) => void;
  showLevelRange: boolean;
  onEntryMode: (mode: "anyone" | "range") => void;
  levelMin: LevelBandSelectValue;
  levelMax: LevelBandSelectValue;
  levelMinError?: string;
  levelMaxError?: string;
  onLevelRange: (range: {
    min: LevelBandSelectValue;
    max: LevelBandSelectValue;
  }) => void;
  price: string;
  priceError?: string;
  onPrice: (price: string) => void;
  isPublic: boolean;
  onIsPublic: (isPublic: boolean) => void;
  allowSoloRegister: boolean;
  onAllowSoloRegister: (allowSoloRegister: boolean) => void;
  groupName: string;
}) {
  const [groupsOpen, setGroupsOpen] = React.useState(false);
  const [groupQuery, setGroupQuery] = React.useState("");
  const [venuesOpen, setVenuesOpen] = React.useState(false);
  const [venueQuery, setVenueQuery] = React.useState("");
  const [courtsExpandedVenueId, setCourtsExpandedVenueId] = React.useState<
    string | null
  >(null);
  const [dayOpen, setDayOpen] = React.useState(false);
  const [startExpanded, setStartExpanded] = React.useState(false);
  const [finishExpanded, setFinishExpanded] = React.useState(false);
  const [displayedMonth, setDisplayedMonth] = React.useState(
    () => parseDateInputValue(day) ?? earliestGameWindowDay(now),
  );

  const dayOptions = createFlowDayOptions(now);
  const selectedDay = parseDateInputValue(day);
  const earliestDay = earliestGameWindowDay(now);
  const calendarMonth =
    displayedMonth.getTime() < earliestDay.getTime()
      ? earliestDay
      : displayedMonth;
  const dayInChips = dayOptions.some((option) => dayChipValue(option) === day);
  const startSlots = upcomingGameWindowTimeSlots(day, now);
  const visibleStarts = previewStartSlots(startSlots, startTime, startExpanded);
  const finishSlots = startTime
    ? startSlots.filter((slot) => slot > startTime)
    : [];
  const visibleFinishes = previewStartSlots(
    finishSlots,
    finishTime,
    finishExpanded,
  );
  const selectedVenue = venues.find((venue) => venue.id === venueId);
  const courts = selectedVenue?.courts ?? [];
  const courtsExpanded = courtsExpandedVenueId === venueId;
  const visibleCourts = courtsExpanded
    ? courts
    : visibleCreateCourts(courts, recentCourtIds, courtIds);
  const visibleGroups = visibleCreateGroups(groups, selectedGroupId);
  const filteredGroups = groups.filter((group) =>
    groupOptionLabel(group)
      .toLowerCase()
      .includes(groupQuery.trim().toLowerCase()),
  );
  const visibleVenues = visibleCreateGroups(venues, venueId);
  const filteredVenues = venues.filter((venue) =>
    venueMatchesQuery(venue, venueQuery),
  );
  const sized = sizeFriendlyTournament(teamCount, poolCount);
  const sizing = sized.ok ? sized.sizing : null;
  const poolOptions = poolCountOptions(teamCount);
  const poolMin = poolOptions[0] ?? 1;
  const poolMax = poolOptions[poolOptions.length - 1] ?? poolMin;
  const parsedMinutes = parseCreateMatchMinutes(matchMinutes);
  const parsedWindow = parseRequiredGameWindow(day, startTime, finishTime);
  const whenOk = validateFriendlyGameWhen(day, startTime, finishTime, now).ok;
  const schedule =
    whenOk && parsedMinutes.ok && parsedWindow && sizing
      ? friendlyTournamentSchedule({
          start: parsedWindow.windowStart,
          finish: parsedWindow.windowEnd,
          poolMatches: sizing.poolMatches,
          courtCount: courtIds.length,
          matchMinutes: parsedMinutes.minutes,
          clock: formatClock,
        })
      : null;
  const selectedCourtNames = courts
    .filter((court) => courtIds.includes(court.id))
    .map((court) => court.name);
  const teamPrice = gameTeamOfTwoCopy(price);

  function selectDay(next: string) {
    onDay(next);
    const slots = upcomingGameWindowTimeSlots(next, now);
    if (startTime && !slots.includes(startTime)) {
      onStartTime("");
      onFinishTime("");
      return;
    }
    if (
      finishTime &&
      (!slots.includes(finishTime) || (startTime && finishTime <= startTime))
    ) {
      onFinishTime("");
    }
  }

  return (
    <>
      {step === 2 ? (
        <>
          <section className="flex flex-col gap-3">
            <SectionHeading
              id="game-group-label"
              title="Group"
              meta="Required"
            />
            <div
              id="game-group"
              tabIndex={-1}
              aria-invalid={groupError ? true : undefined}
              aria-describedby={groupError ? "game-group-error" : undefined}
              className="outline-none"
            >
              <GroupChips
                groups={visibleGroups}
                selectedGroupId={selectedGroupId}
                labelledBy="game-group-label"
                onSelect={onGroupId}
              />
            </div>
            {groups.length > VISIBLE_GROUP_CHIP_COUNT ? (
              <ChoiceChip
                dashed
                onClick={() => {
                  setGroupQuery("");
                  setGroupsOpen(true);
                }}
              >
                <Search aria-hidden="true" className="size-3.5" />
                All {groups.length} groups
              </ChoiceChip>
            ) : null}
            <FieldError id="game-group-error">{groupError}</FieldError>
            <Sheet open={groupsOpen} onOpenChange={setGroupsOpen}>
              <SheetContent side="bottom" className="max-h-[85svh]">
                <SheetHeader>
                  <SheetTitle>All {groups.length} groups</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
                  <Input
                    value={groupQuery}
                    onChange={(event) => {
                      setGroupQuery(event.target.value);
                    }}
                    placeholder="Search groups"
                    aria-label="Search groups"
                  />
                  {filteredGroups.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No groups match.
                    </p>
                  ) : (
                    <GroupChips
                      groups={filteredGroups}
                      selectedGroupId={selectedGroupId}
                      onSelect={(groupId) => {
                        onGroupId(groupId);
                        setGroupsOpen(false);
                      }}
                    />
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="game-venue-label"
              title="Venue"
              meta={selectedGroupId ? "Required" : undefined}
            />
            {!selectedGroupId ? (
              <div className="border-rule hatch flex min-h-11 items-center gap-3 rounded-[14px] px-[18px] py-4">
                <Lock
                  aria-hidden="true"
                  className="text-muted-foreground size-4 shrink-0"
                />
                <p className="text-muted-foreground text-sm">{venueCopy}</p>
              </div>
            ) : null}
            {selectedGroupId && venuesPending ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : null}
            {selectedGroupId && !venuesPending && venuesLocked ? (
              <div
                id="game-venue"
                tabIndex={-1}
                className="border-rule rounded-[14px] border px-[18px] py-4 outline-none"
              >
                <p className="font-semibold">{venues[0]?.name ?? "Venue"}</p>
                {venues[0] ? (
                  <p className="text-muted-foreground text-meta mt-0.5">
                    {venueCardMeta(venues[0].courts.length, venues[0].city)}
                  </p>
                ) : null}
              </div>
            ) : null}
            {selectedGroupId && !venuesPending && emptyCatalog ? (
              <div id="game-venue" tabIndex={-1} className="outline-none" />
            ) : null}
            {selectedGroupId &&
            !venuesPending &&
            !venuesLocked &&
            !emptyCatalog ? (
              <>
                <VenueCards
                  venues={visibleVenues}
                  venueId={venueId}
                  labelledBy="game-venue-label"
                  invalid={Boolean(venueError)}
                  describedBy={
                    venueError ? "game-venue-error" : "game-venue-copy"
                  }
                  onSelect={onVenueId}
                />
                {venues.length > VISIBLE_GROUP_CHIP_COUNT ? (
                  <ChoiceChip
                    dashed
                    onClick={() => {
                      setVenueQuery("");
                      setVenuesOpen(true);
                    }}
                  >
                    <Search aria-hidden="true" className="size-3.5" />
                    All {venues.length} venues
                  </ChoiceChip>
                ) : null}
                <Sheet open={venuesOpen} onOpenChange={setVenuesOpen}>
                  <SheetContent
                    side="bottom"
                    className="max-h-[85svh] overflow-hidden"
                  >
                    <SheetHeader>
                      <SheetTitle>All {venues.length} venues</SheetTitle>
                    </SheetHeader>
                    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
                      <Input
                        value={venueQuery}
                        onChange={(event) => {
                          setVenueQuery(event.target.value);
                        }}
                        placeholder="Search venues"
                        aria-label="Search venues"
                      />
                      {filteredVenues.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          No venues match.
                        </p>
                      ) : (
                        <VenueCards
                          venues={filteredVenues}
                          venueId={venueId}
                          onSelect={(nextVenueId) => {
                            onVenueId(nextVenueId);
                            setVenuesOpen(false);
                          }}
                        />
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            ) : null}
            {selectedGroupId ? (
              <FieldDescription id="game-venue-copy">
                {venueCopy}
              </FieldDescription>
            ) : null}
            <FieldError id="game-venue-error">
              {venueError ??
                (emptyCatalog
                  ? "No live Venues. Create is not available."
                  : undefined)}
            </FieldError>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="game-court-label"
              title="Courts"
              meta="Optional"
            />
            <div
              id="game-court"
              aria-labelledby="game-court-label"
              aria-describedby={courtError ? "game-court-error" : undefined}
              tabIndex={-1}
              className="flex flex-wrap gap-1.5 outline-none"
            >
              {courts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {selectedVenue
                    ? "This Venue has no Courts to record."
                    : "Pick a Venue to choose Courts."}
                </p>
              ) : (
                <>
                  {visibleCourts.map((court) => {
                    const selected = courtIds.includes(court.id);
                    return (
                      <ChoiceChip
                        key={court.id}
                        selected={selected}
                        aria-pressed={selected}
                        onClick={() => {
                          onToggleCourt(court.id);
                        }}
                      >
                        {court.name}
                      </ChoiceChip>
                    );
                  })}
                  {!courtsExpanded && courts.length > visibleCourts.length ? (
                    <ChoiceChip
                      dashed
                      onClick={() => {
                        setCourtsExpandedVenueId(venueId);
                      }}
                    >
                      All {courts.length} courts
                    </ChoiceChip>
                  ) : null}
                </>
              )}
            </div>
            <FieldError id="game-court-error">{courtError}</FieldError>
          </section>

          <StepperField
            id="tournament-team-count"
            label="Game teams"
            labelClassName={STEPPER_LABEL}
            value={teamCount}
            unit="Game teams"
            min={TOURNAMENT_TEAM_MIN}
            max={TOURNAMENT_TEAM_MAX}
            step={TOURNAMENT_TEAM_STEP}
            onChange={onTeamCount}
            decreaseLabel="Fewer Game teams"
            increaseLabel="More Game teams"
            error={teamCountError}
            description={
              <p className="text-muted-foreground text-[13px]">
                {playersInPairsLine(teamCount)}
              </p>
            }
          />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <StepperField
            id="tournament-pool-count"
            label="Groups"
            labelClassName={STEPPER_LABEL}
            value={poolCount}
            unit={poolCount === 1 ? "group" : "groups"}
            min={poolMin}
            max={poolMax}
            step={1}
            onChange={onPoolCount}
            decreaseLabel="Fewer groups"
            increaseLabel="More groups"
            error={poolCountError}
            description={
              sizing ? (
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground text-[13px]">
                    {friendlyTournamentGroupsLine(sizing)}
                  </p>
                  {sizing.uneven ? (
                    <p className="text-muted-foreground text-[13px]">
                      {FRIENDLY_TOURNAMENT_UNEVEN_GROUPS}
                    </p>
                  ) : null}
                </div>
              ) : null
            }
          />

          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="game-window-day-label"
                className="font-expanded text-title"
              >
                Day
              </h2>
              <Popover open={dayOpen} onOpenChange={setDayOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground focus-visible:ring-ring/50 inline-flex min-h-11 items-center gap-1.5 text-sm outline-none focus-visible:ring-[3px]"
                    aria-pressed={!dayInChips}
                  >
                    {dayInChips
                      ? "Later date"
                      : (formatDayLabel(day) ?? "Later date")}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDay}
                    month={calendarMonth}
                    startMonth={earliestDay}
                    disabled={{ before: earliestDay }}
                    onMonthChange={setDisplayedMonth}
                    onSelect={(next) => {
                      if (!next) {
                        return;
                      }
                      selectDay(formatDateInputValue(next));
                      setDayOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div
              id="game-window-day"
              role="radiogroup"
              aria-labelledby="game-window-day-label"
              aria-invalid={dayError ? true : undefined}
              aria-describedby={dayError ? "game-window-day-error" : undefined}
              tabIndex={-1}
              className="grid grid-cols-5 gap-1.5 outline-none"
            >
              {dayOptions.map((option) => {
                const value = dayChipValue(option);
                const today = option.toDateString() === now.toDateString();
                const label = today
                  ? "Today"
                  : option.toLocaleDateString("en-US", { weekday: "short" });
                return (
                  <ChoiceChip
                    key={value}
                    role="radio"
                    selected={day === value}
                    className="h-auto flex-col gap-0.5 px-1 py-1.5"
                    onClick={() => {
                      selectDay(value);
                    }}
                  >
                    <span
                      className={cn(
                        "text-[11px]",
                        day === value ? "text-dim" : "text-muted-foreground",
                      )}
                    >
                      {label}
                    </span>
                    <span className="text-base tabular-nums">
                      {option.getDate()}
                    </span>
                  </ChoiceChip>
                );
              })}
            </div>
            <FieldError id="game-window-day-error">{dayError}</FieldError>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="game-window-start-label"
              title="Start time"
              meta="30 minute steps"
            />
            <div id="game-window-start" tabIndex={-1} className="outline-none">
              <div className="grid grid-cols-4 gap-1.5">
                <div
                  role="radiogroup"
                  aria-labelledby="game-window-start-label"
                  aria-invalid={startError ? true : undefined}
                  aria-describedby={
                    startError ? "game-window-start-error" : undefined
                  }
                  className="contents"
                >
                  {visibleStarts.map((slot) => (
                    <ChoiceChip
                      key={slot}
                      role="radio"
                      selected={startTime === slot}
                      className="px-1"
                      onClick={() => {
                        onStartTime(slot);
                        if (finishTime && finishTime <= slot) {
                          onFinishTime("");
                        }
                      }}
                    >
                      {formatTimeSlotLabel(slot)}
                    </ChoiceChip>
                  ))}
                </div>
                {startSlots.length > visibleStarts.length || startExpanded ? (
                  <ChoiceChip
                    dashed={!startExpanded}
                    onClick={() => {
                      setStartExpanded((open) => !open);
                    }}
                  >
                    {startExpanded ? "Less" : "More"}
                  </ChoiceChip>
                ) : null}
              </div>
            </div>
            {startSlots.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No upcoming times for this day.
              </p>
            ) : null}
            <FieldError id="game-window-start-error">{startError}</FieldError>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="game-window-finish-label"
              title="Finish"
              meta={finishTime ? formatTimeSlotLabel(finishTime) : undefined}
            />
            <div id="game-window-finish" tabIndex={-1} className="outline-none">
              <div className="grid grid-cols-4 gap-1.5">
                <div
                  role="radiogroup"
                  aria-labelledby="game-window-finish-label"
                  aria-invalid={finishError ? true : undefined}
                  aria-describedby={
                    finishError ? "game-window-finish-error" : undefined
                  }
                  className="contents"
                >
                  {visibleFinishes.map((slot) => (
                    <ChoiceChip
                      key={slot}
                      role="radio"
                      selected={finishTime === slot}
                      className="px-1"
                      onClick={() => {
                        onFinishTime(slot);
                      }}
                    >
                      {formatTimeSlotLabel(slot)}
                    </ChoiceChip>
                  ))}
                </div>
                {finishSlots.length > visibleFinishes.length ||
                finishExpanded ? (
                  <ChoiceChip
                    dashed={!finishExpanded}
                    disabled={!startTime}
                    onClick={() => {
                      setFinishExpanded((open) => !open);
                    }}
                  >
                    {finishExpanded ? "Less" : "More"}
                  </ChoiceChip>
                ) : null}
              </div>
            </div>
            {!startTime ? (
              <p className="text-muted-foreground text-sm">
                Pick a start time first.
              </p>
            ) : null}
            <FieldError id="game-window-finish-error">{finishError}</FieldError>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="tournament-match-minutes-label"
              title="Game length"
              meta="Required"
            />
            <div
              role="radiogroup"
              aria-labelledby="tournament-match-minutes-label"
              className="grid grid-cols-3 gap-1.5"
            >
              {CREATE_FLOW_MATCH_MINUTE_CHIPS.map((minutes) => {
                const selected =
                  parsedMinutes.ok && parsedMinutes.minutes === minutes;
                return (
                  <ChoiceChip
                    key={minutes}
                    role="radio"
                    selected={selected}
                    onClick={() => {
                      onMatchMinutes(String(minutes));
                    }}
                  >
                    {minutes} min
                  </ChoiceChip>
                );
              })}
            </div>
            <Input
              id="tournament-match-minutes"
              type="number"
              inputMode="numeric"
              min={10}
              max={120}
              step={5}
              value={matchMinutes}
              aria-label="Custom minutes"
              aria-invalid={matchMinutesError ? true : undefined}
              aria-describedby={
                matchMinutesError
                  ? "tournament-match-minutes-error"
                  : "tournament-match-minutes-copy"
              }
              onChange={(event) => {
                onMatchMinutes(event.target.value);
              }}
            />
            <FieldDescription id="tournament-match-minutes-copy">
              10 to 120 minutes, in steps of 5.
            </FieldDescription>
            <FieldError id="tournament-match-minutes-error">
              {matchMinutesError}
            </FieldError>
          </section>

          {schedule ? (
            <div className="border-ink rounded-[14px] border px-[18px] py-4">
              {schedule.line ? (
                <p className="text-[17px] leading-snug">{schedule.line}</p>
              ) : null}
              {schedule.overruns ? (
                <p
                  className={cn(
                    "text-muted-foreground text-[13px] leading-relaxed",
                    schedule.line && "mt-2",
                  )}
                >
                  {ONE_DAY_OVERRUN_MESSAGE}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {step === 4 ? (
        <>
          <section className="flex flex-col gap-3">
            <SectionHeading
              id="tournament-name-label"
              title="Name"
              meta="Required"
            />
            <Input
              id="tournament-name"
              value={name}
              aria-labelledby="tournament-name-label"
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "tournament-name-error" : undefined}
              onChange={(event) => {
                onName(event.target.value);
              }}
            />
            <FieldError id="tournament-name-error">{nameError}</FieldError>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="tournament-entry-label"
              title="Who can enter"
              meta="Optional"
            />
            <div
              role="radiogroup"
              aria-labelledby="tournament-entry-label"
              className="grid grid-cols-2 gap-1.5"
            >
              <ChoiceChip
                role="radio"
                selected={!showLevelRange}
                onClick={() => {
                  onEntryMode("anyone");
                }}
              >
                Anyone
              </ChoiceChip>
              <ChoiceChip
                role="radio"
                selected={showLevelRange}
                onClick={() => {
                  onEntryMode("range");
                }}
              >
                Set a Level range
              </ChoiceChip>
            </div>
            {showLevelRange ? (
              <>
                <LevelBandRow
                  id="game-level-min"
                  label="Minimum Level"
                  bound="min"
                  value={levelMin}
                  other={levelMax}
                  invalid={Boolean(levelMinError)}
                  describedBy={
                    levelMinError
                      ? "game-level-min-error"
                      : "game-level-range-copy"
                  }
                  onSelect={(band) => {
                    onLevelRange(
                      applyLevelBoundChange(
                        { min: levelMin, max: levelMax },
                        "min",
                        band,
                      ),
                    );
                  }}
                />
                <FieldError id="game-level-min-error">
                  {levelMinError}
                </FieldError>
                <LevelBandRow
                  id="game-level-max"
                  label="Maximum Level"
                  bound="max"
                  value={levelMax}
                  other={levelMin}
                  invalid={Boolean(levelMaxError)}
                  describedBy={
                    levelMaxError
                      ? "game-level-max-error"
                      : "game-level-range-copy"
                  }
                  onSelect={(band) => {
                    onLevelRange(
                      applyLevelBoundChange(
                        { min: levelMin, max: levelMax },
                        "max",
                        band,
                      ),
                    );
                  }}
                />
                <FieldDescription id="game-level-range-copy">
                  {LEVEL_RANGE_FIELD_DESCRIPTION}
                </FieldDescription>
                <FieldError id="game-level-max-error">
                  {levelMaxError}
                </FieldError>
              </>
            ) : null}
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="game-price-label"
              title="Price per player"
              meta="Optional"
            />
            <PricePerPlayerAmountInput
              id="game-price-per-player"
              aria-labelledby="game-price-label"
              inputMode="decimal"
              value={price}
              onChange={(event) => {
                onPrice(event.target.value);
              }}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={
                priceError
                  ? "game-price-per-player-error"
                  : "game-price-per-player-copy"
              }
            />
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {CREATE_FLOW_PRICE_CHIPS.map((chip) => {
                const selected = priceChipIsSelected(chip.value, price);
                return (
                  <ChoiceChip
                    key={chip.label}
                    selected={selected}
                    aria-pressed={selected}
                    onClick={() => {
                      onPrice(chip.value);
                    }}
                  >
                    {chip.label}
                  </ChoiceChip>
                );
              })}
            </div>
            <FieldDescription id="game-price-per-player-copy">
              {PRICE_PER_PLAYER_FIELD_DESCRIPTION}
              {teamPrice ? ` ${teamPrice}` : ""}
            </FieldDescription>
            <FieldError id="game-price-per-player-error">
              {priceError}
            </FieldError>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="tournament-public-label"
              title={WHO_CAN_TAKE_A_SEAT_LABEL}
            />
            <div
              role="radiogroup"
              aria-labelledby="tournament-public-label"
              className="flex flex-wrap gap-1.5"
            >
              <ChoiceChip
                role="radio"
                selected={!isPublic}
                onClick={() => {
                  onIsPublic(false);
                }}
              >
                {groupName}
              </ChoiceChip>
              <ChoiceChip
                role="radio"
                selected={isPublic}
                onClick={() => {
                  onIsPublic(true);
                }}
              >
                {ANYONE_WITH_THE_LINK_LABEL}
              </ChoiceChip>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="tournament-join-label"
              title={HOW_PEOPLE_JOIN_LABEL}
            />
            <div
              role="radiogroup"
              aria-labelledby="tournament-join-label"
              className="flex flex-wrap gap-1.5"
            >
              <ChoiceChip
                role="radio"
                selected={allowSoloRegister}
                onClick={() => {
                  onAllowSoloRegister(true);
                }}
              >
                {ALONE_OR_WITH_A_PARTNER_LABEL}
              </ChoiceChip>
              <ChoiceChip
                role="radio"
                selected={!allowSoloRegister}
                onClick={() => {
                  onAllowSoloRegister(false);
                }}
              >
                {WITH_A_PARTNER_ONLY_LABEL}
              </ChoiceChip>
            </div>
          </section>

          <div className="border-rule overflow-hidden rounded-[14px] border">
            <ReviewRow label="Group" value={groupName} />
            <ReviewRow label="Venue" value={selectedVenue?.name ?? "Venue"} />
            <ReviewRow
              label="Format"
              value={
                sizing
                  ? friendlyTournamentFormatLabel(sizing.poolCount)
                  : friendlyTournamentFormatLabel(poolCount)
              }
            />
            <ReviewRow
              label="Courts"
              value={friendlyTournamentCourtsLabel(selectedCourtNames)}
            />
            <ReviewRow
              label="Game length"
              value={
                parsedMinutes.ok
                  ? `${parsedMinutes.minutes} min`
                  : "Game length"
              }
            />
            <ReviewRow
              label={COUNTS_FOR_RATING_LABEL}
              value={COUNTS_FOR_RATING_YES}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
