"use client";

import { Check, Lock, Search } from "lucide-react";
import * as React from "react";

import { ChoiceChip } from "~/app/dashboard/games/new/choice-chip";
import { PricePerPlayerAmountInput } from "~/components/games/price-per-player-amount-input";
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
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "~/lib/level-bands";
import {
  LEVEL_BAND_SELECT_NONE,
  LEVEL_RANGE_FIELD_DESCRIPTION,
  type LevelBandSelectValue,
} from "~/lib/level-range";
import {
  CREATE_FLOW_DURATIONS,
  CREATE_FLOW_OPEN_SEATS_LABEL,
  CREATE_FLOW_PRICE_CHIPS,
  applyLevelBoundChange,
  createFlowDayOptions,
  dayChipValue,
  finishSlotForDuration,
  isLevelBoundDisabled,
  matchingDurationPreset,
  openLevelRange,
  previewStartSlots,
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
  upcomingGameWindowTimeSlots,
} from "~/lib/game-window";
import { PRICE_PER_PLAYER_FIELD_DESCRIPTION } from "~/lib/price-per-player";
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

export function FriendlyGameSteps({
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
  courtId,
  courtError,
  onCourtId,
  day,
  dayError,
  onDay,
  startTime,
  startError,
  onStartTime,
  finishTime,
  finishError,
  onFinishTime,
  levelMin,
  levelMax,
  levelMinError,
  levelMaxError,
  onLevelRange,
  price,
  priceError,
  onPrice,
  reviewGroup,
  reviewVenue,
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
  courtId: string;
  courtError?: string;
  onCourtId: (courtId: string) => void;
  day: string;
  dayError?: string;
  onDay: (day: string) => void;
  startTime: string;
  startError?: string;
  onStartTime: (startTime: string) => void;
  finishTime: string;
  finishError?: string;
  onFinishTime: (finishTime: string) => void;
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
  reviewGroup: string;
  reviewVenue: string;
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
  const [customFinishOpen, setCustomFinishOpen] = React.useState(false);
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
  const durationPreset = matchingDurationPreset(startTime, finishTime);
  const showCustomFinish =
    customFinishOpen || (Boolean(finishTime) && durationPreset == null);
  const selectedVenue = venues.find((venue) => venue.id === venueId);
  const courts = selectedVenue?.courts ?? [];
  const courtsExpanded = courtsExpandedVenueId === venueId;
  const visibleCourts = courtsExpanded
    ? courts
    : visibleCreateCourts(
        courts,
        recentCourtIds,
        courtId === "none" ? [] : [courtId],
      );
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
  const levelOpen =
    levelMin === LEVEL_BAND_SELECT_NONE && levelMax === LEVEL_BAND_SELECT_NONE;

  function selectDay(next: string) {
    onDay(next);
    const slots = upcomingGameWindowTimeSlots(next, now);
    if (startTime && !slots.includes(startTime)) {
      onStartTime("");
      onFinishTime("");
      setCustomFinishOpen(false);
      return;
    }
    if (
      finishTime &&
      (!slots.includes(finishTime) || (startTime && finishTime < startTime))
    ) {
      onFinishTime("");
    }
  }

  function selectStart(slot: string) {
    onStartTime(slot);
    if (durationPreset) {
      onFinishTime(finishSlotForDuration(slot, durationPreset) ?? "");
      return;
    }
    if (finishTime && finishTime <= slot) {
      onFinishTime("");
    }
  }

  function selectDuration(minutes: (typeof CREATE_FLOW_DURATIONS)[number]) {
    setCustomFinishOpen(false);
    if (!startTime) {
      document.getElementById("game-window-start")?.focus();
      return;
    }
    onFinishTime(finishSlotForDuration(startTime, minutes) ?? "");
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
              title="Court"
              meta="Optional"
            />
            <div
              id="game-court"
              role="radiogroup"
              aria-labelledby="game-court-label"
              aria-invalid={courtError ? true : undefined}
              aria-describedby={
                courtError ? "game-court-error" : "game-court-copy"
              }
              tabIndex={-1}
              className="flex flex-wrap gap-1.5 outline-none"
            >
              <ChoiceChip
                role="radio"
                selected={courtId === "none"}
                disabled={!selectedVenue}
                onClick={() => {
                  onCourtId("none");
                }}
              >
                None
              </ChoiceChip>
              {visibleCourts.map((court) => (
                <ChoiceChip
                  key={court.id}
                  role="radio"
                  selected={courtId === court.id}
                  onClick={() => {
                    onCourtId(court.id);
                  }}
                >
                  {court.name}
                </ChoiceChip>
              ))}
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
            </div>
            <FieldDescription id="game-court-copy">
              Leave on None to settle the court at the venue.
            </FieldDescription>
            <FieldError id="game-court-error">{courtError}</FieldError>
          </section>
        </>
      ) : null}

      {step === 3 ? (
        <>
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
                        selectStart(slot);
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
              title="Duration"
              meta={finishTime ? formatTimeSlotLabel(finishTime) : undefined}
            />
            <div
              id={showCustomFinish ? undefined : "game-window-finish"}
              role="radiogroup"
              aria-labelledby="game-window-finish-label"
              aria-invalid={finishError ? true : undefined}
              aria-describedby={
                finishError ? "game-window-finish-error" : "game-window-copy"
              }
              tabIndex={-1}
              className="grid grid-cols-4 gap-1.5 outline-none"
            >
              {CREATE_FLOW_DURATIONS.map((minutes) => {
                const available =
                  Boolean(startTime) &&
                  finishSlotForDuration(startTime, minutes) != null;
                return (
                  <ChoiceChip
                    key={minutes}
                    role="radio"
                    selected={!showCustomFinish && durationPreset === minutes}
                    disabled={!available}
                    onClick={() => {
                      selectDuration(minutes);
                    }}
                  >
                    {minutes} min
                  </ChoiceChip>
                );
              })}
              <ChoiceChip
                role="radio"
                dashed={!showCustomFinish}
                selected={showCustomFinish}
                disabled={!startTime}
                onClick={() => {
                  setCustomFinishOpen(true);
                }}
              >
                Set
              </ChoiceChip>
            </div>
            {showCustomFinish ? (
              <div
                id="game-window-finish"
                role="radiogroup"
                aria-label="Finish time"
                tabIndex={-1}
                className="flex flex-wrap gap-1.5 outline-none"
              >
                {finishSlots.map((slot) => (
                  <ChoiceChip
                    key={slot}
                    role="radio"
                    selected={finishTime === slot}
                    onClick={() => {
                      onFinishTime(slot);
                    }}
                  >
                    {formatTimeSlotLabel(slot)}
                  </ChoiceChip>
                ))}
              </div>
            ) : null}
            <FieldDescription id="game-window-copy">
              Day, start time, and finish time are required. Pick today or a
              later day. Times are in 30-minute intervals; for today, only
              upcoming times are listed.
            </FieldDescription>
            <FieldError id="game-window-finish-error">{finishError}</FieldError>
          </section>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <section className="flex flex-col gap-3">
            <SectionHeading
              id="game-level-label"
              title="Level range"
              meta="Optional"
            />
            <LevelBandRow
              id="game-level-min"
              label="Minimum Level"
              bound="min"
              value={levelMin}
              other={levelMax}
              invalid={Boolean(levelMinError)}
              describedBy={
                levelMinError ? "game-level-min-error" : "game-level-range-copy"
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
            <FieldError id="game-level-min-error">{levelMinError}</FieldError>
            <LevelBandRow
              id="game-level-max"
              label="Maximum Level"
              bound="max"
              value={levelMax}
              other={levelMin}
              invalid={Boolean(levelMaxError)}
              describedBy={
                levelMaxError ? "game-level-max-error" : "game-level-range-copy"
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
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="text-muted-foreground">
                {levelOpen ? (
                  "Open to anyone"
                ) : (
                  <>
                    Minimum{" "}
                    <span className="text-foreground font-semibold">
                      {levelMin === LEVEL_BAND_SELECT_NONE ? "Open" : levelMin}
                    </span>
                    {" · "}
                    Maximum{" "}
                    <span className="text-foreground font-semibold">
                      {levelMax === LEVEL_BAND_SELECT_NONE ? "Open" : levelMax}
                    </span>
                  </>
                )}
              </p>
              {levelOpen ? null : (
                <button
                  type="button"
                  className="text-muted-foreground focus-visible:ring-ring/50 inline-flex min-h-11 items-center underline outline-none focus-visible:ring-[3px]"
                  onClick={() => {
                    onLevelRange(openLevelRange());
                  }}
                >
                  Open to anyone
                </button>
              )}
            </div>
            <FieldDescription id="game-level-range-copy">
              {LEVEL_RANGE_FIELD_DESCRIPTION}
            </FieldDescription>
            <FieldError id="game-level-max-error">{levelMaxError}</FieldError>
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
            </FieldDescription>
            <FieldError id="game-price-per-player-error">
              {priceError}
            </FieldError>
          </section>

          <div className="border-rule overflow-hidden rounded-[14px] border">
            <ReviewRow label="Group" value={reviewGroup} />
            <ReviewRow label="Venue" value={reviewVenue} />
            <ReviewRow label="Seats" value={CREATE_FLOW_OPEN_SEATS_LABEL} />
          </div>
        </>
      ) : null}
    </>
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-rule flex items-center justify-between gap-3 border-t px-[18px] py-3.5 text-sm first:border-t-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{value}</span>
    </div>
  );
}
