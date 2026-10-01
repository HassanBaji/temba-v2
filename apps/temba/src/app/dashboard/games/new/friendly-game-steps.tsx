"use client";

import * as React from "react";

import { DayField } from "~/app/dashboard/games/new/_parts/day-field";
import {
  GroupField,
  type CreateGroup,
} from "~/app/dashboard/games/new/_parts/group-field";
import { LevelBandRow } from "~/app/dashboard/games/new/_parts/level-band-row";
import { ReviewRow } from "~/app/dashboard/games/new/_parts/review-row";
import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
import {
  VenueField,
  type CreateVenue,
} from "~/app/dashboard/games/new/_parts/venue-field";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { PricePerPlayerAmountInput } from "~/components/games/price-per-player-amount-input";
import { FieldDescription, FieldError } from "~/components/ui/field";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
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
  finishSlotForDuration,
  matchingDurationPreset,
  openLevelRange,
  previewStartSlots,
  priceChipIsSelected,
  visibleCreateCourts,
} from "~/lib/create-game-flow";
import {
  formatTimeSlotLabel,
  upcomingGameWindowTimeSlots,
} from "~/lib/game-window";
import { PRICE_PER_PLAYER_FIELD_DESCRIPTION } from "~/lib/price-per-player";

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
  const [courtsExpandedVenueId, setCourtsExpandedVenueId] = React.useState<
    string | null
  >(null);
  const [startExpanded, setStartExpanded] = React.useState(false);
  const [customFinishOpen, setCustomFinishOpen] = React.useState(false);

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
          <GroupField
            groups={groups}
            selectedGroupId={selectedGroupId}
            groupError={groupError}
            onGroupId={onGroupId}
          />

          <VenueField
            selectedGroupId={selectedGroupId}
            venueCopy={venueCopy}
            venues={venues}
            venuesLocked={venuesLocked}
            venuesPending={venuesPending}
            venueId={venueId}
            venueError={venueError}
            onVenueId={onVenueId}
            emptyCatalog={emptyCatalog}
          />

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="game-court-label"
              title="Court"
              meta="Optional"
            />
            <RovingRadioGroup
              id="game-court"
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
            </RovingRadioGroup>
            <FieldDescription id="game-court-copy">
              Leave on None to settle the court at the venue.
            </FieldDescription>
            <FieldError id="game-court-error">{courtError}</FieldError>
          </section>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <DayField
            now={now}
            day={day}
            dayError={dayError}
            onSelectDay={selectDay}
          />

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="game-window-start-label"
              title="Start time"
              meta="30 minute steps"
            />
            <div id="game-window-start" tabIndex={-1} className="outline-none">
              <div className="grid grid-cols-4 gap-1.5">
                <RovingRadioGroup
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
                </RovingRadioGroup>
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
              <p className="text-muted-foreground text-body">
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
            <RovingRadioGroup
              id={showCustomFinish ? undefined : "game-window-finish"}
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
            </RovingRadioGroup>
            {showCustomFinish ? (
              <RovingRadioGroup
                id="game-window-finish"
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
              </RovingRadioGroup>
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
            <div className="text-body flex items-center justify-between gap-3">
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

          <div className="border-rule rounded-card overflow-hidden border">
            <ReviewRow label="Group" value={reviewGroup} />
            <ReviewRow label="Venue" value={reviewVenue} />
            <ReviewRow label="Seats" value={CREATE_FLOW_OPEN_SEATS_LABEL} />
          </div>
        </>
      ) : null}
    </>
  );
}
