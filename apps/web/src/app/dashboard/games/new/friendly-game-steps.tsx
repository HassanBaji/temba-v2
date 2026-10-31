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
import { StepperField } from "~/components/games/stepper-field";
import { PricePerPlayerAmountInput } from "~/components/games/price-per-player-amount-input";
import { FieldDescription, FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import {
  LEVEL_BAND_SELECT_NONE,
  LEVEL_RANGE_FIELD_DESCRIPTION,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";
import { GAME_CUSTOM_NAME_MAX_LENGTH } from "@repo/domain/game-custom-name";
import {
  CREATE_FLOW_DURATIONS,
  CREATE_FLOW_PRICE_CHIPS,
  FOOTBALL_SIDE_SIZE_PRESETS,
  applyLevelBoundChange,
  createFlowSeatsLabel,
  footballSideSizeStep,
  finishSlotForDuration,
  reconcileWindowForDay,
  selectDurationFinish,
  selectStartSlot,
  matchingDurationPreset,
  openLevelRange,
  previewStartSlots,
  priceChipIsSelected,
  visibleCreateCourts,
} from "@repo/domain/create-game-flow";
import { courtCountLabel, courtFace } from "@repo/domain/court-sport-copy";
import {
  FOOTBALL_PLAYERS_ALLOWED_MAX,
  FOOTBALL_SIDE_SIZES,
  footballPlayersAllowedBounds,
  sideSizeLabel,
} from "@repo/domain/game-shape";
import {
  formatTimeSlotLabel,
  upcomingGameWindowTimeSlots,
} from "@repo/domain/game-window";
import { UNRATED_GROUP_LINE } from "@repo/domain/game-rating-impact";
import { PRICE_PER_PLAYER_FIELD_DESCRIPTION } from "@repo/domain/price-per-player";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";

const SMALLEST_SIDE_SIZE = Math.min(...FOOTBALL_SIDE_SIZES);
const LARGEST_SIDE_SIZE = Math.max(...FOOTBALL_SIDE_SIZES);

export function FriendlyGameSteps({
  sport = DEFAULT_SPORT,
  sideSize,
  sideSizeError,
  onSideSize,
  playersAllowed,
  playersAllowedError,
  onPlayersAllowed,
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
  customName,
  customNameError,
  onCustomName,
  reviewGroup,
  reviewVenue,
  groupVerified,
}: {
  sport?: Sport;
  sideSize: number;
  sideSizeError?: string;
  onSideSize: (sideSize: number) => void;
  playersAllowed: number;
  playersAllowedError?: string;
  onPlayersAllowed: (playersAllowed: number) => void;
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
  customName: string;
  customNameError?: string;
  onCustomName: (customName: string) => void;
  reviewGroup: string;
  reviewVenue: string;
  groupVerified: boolean;
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
  const football = sport === "football";
  const courtWord = courtFace(sport);
  const courtTitle = football ? "Pitch" : "Court";
  const playerBounds = footballPlayersAllowedBounds(sideSize);
  const levelOpen =
    levelMin === LEVEL_BAND_SELECT_NONE && levelMax === LEVEL_BAND_SELECT_NONE;

  function selectDay(next: string) {
    onDay(next);
    const reconciled = reconcileWindowForDay(
      { startTime, finishTime },
      next,
      now,
      "allowed",
    );
    if (reconciled.startTime !== startTime) {
      onStartTime(reconciled.startTime);
      onFinishTime(reconciled.finishTime);
      setCustomFinishOpen(false);
      return;
    }
    if (reconciled.finishTime !== finishTime) {
      onFinishTime(reconciled.finishTime);
    }
  }

  function selectStart(slot: string) {
    const next = selectStartSlot({ startTime, finishTime }, slot, true);
    onStartTime(next.startTime);
    if (next.finishTime !== finishTime) {
      onFinishTime(next.finishTime);
    }
  }

  function selectDuration(minutes: (typeof CREATE_FLOW_DURATIONS)[number]) {
    setCustomFinishOpen(false);
    if (!startTime) {
      document.getElementById("game-window-start")?.focus();
      return;
    }
    onFinishTime(selectDurationFinish(startTime, minutes));
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
            sport={sport}
          />

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="game-court-label"
              title={courtTitle}
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
                  All {courtCountLabel(courts.length, sport)}
                </ChoiceChip>
              ) : null}
            </RovingRadioGroup>
            <FieldDescription id="game-court-copy">
              Leave on None to settle the {courtWord} at the venue.
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
              id="game-custom-name-label"
              title="Name"
              meta="Optional"
            />
            <Input
              id="game-custom-name"
              value={customName}
              maxLength={GAME_CUSTOM_NAME_MAX_LENGTH}
              placeholder={football ? "Friday five-a-side" : "Thursday smash"}
              aria-labelledby="game-custom-name-label"
              aria-invalid={customNameError ? true : undefined}
              aria-describedby={
                customNameError
                  ? "game-custom-name-error"
                  : "game-custom-name-copy"
              }
              onChange={(event) => {
                onCustomName(event.target.value);
              }}
            />
            <FieldDescription id="game-custom-name-copy">
              Shown on the Game and at the top of the invite message.
            </FieldDescription>
            <FieldError id="game-custom-name-error">
              {customNameError}
            </FieldError>
          </section>

          {football ? (
            <>
              <section className="flex flex-col gap-3">
                <SectionHeading id="game-side-size-label" title="Side size" />
                <RovingRadioGroup
                  id="game-side-size"
                  aria-labelledby="game-side-size-label"
                  aria-invalid={sideSizeError ? true : undefined}
                  tabIndex={-1}
                  className="grid grid-cols-3 gap-1.5 outline-none"
                >
                  {FOOTBALL_SIDE_SIZE_PRESETS.map((size) => (
                    <ChoiceChip
                      key={size}
                      role="radio"
                      selected={sideSize === size}
                      onClick={() => {
                        onSideSize(size);
                      }}
                    >
                      {sideSizeLabel(size)}
                    </ChoiceChip>
                  ))}
                </RovingRadioGroup>
                <StepperField
                  id="game-side-size-stepper"
                  label="Side size"
                  value={sideSize}
                  unit="a side"
                  min={SMALLEST_SIDE_SIZE}
                  max={LARGEST_SIDE_SIZE}
                  step={1}
                  onChange={(next) => {
                    onSideSize(
                      footballSideSizeStep(sideSize, next > sideSize ? 1 : -1),
                    );
                  }}
                  decreaseLabel="Smaller side"
                  increaseLabel="Larger side"
                />
                <FieldError id="game-side-size-error">
                  {sideSizeError}
                </FieldError>
              </section>

              <StepperField
                id="game-players-allowed"
                label="Players allowed"
                value={playersAllowed}
                unit="players"
                min={playerBounds.min}
                max={FOOTBALL_PLAYERS_ALLOWED_MAX}
                step={1}
                onChange={onPlayersAllowed}
                decreaseLabel="Fewer players"
                increaseLabel="More players"
                error={playersAllowedError}
                description={
                  <p className="text-muted-foreground text-meta">
                    At least two full sides. Anyone past that is a substitute.
                  </p>
                }
              />
            </>
          ) : (
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
                <div className="text-body flex items-center justify-between gap-3">
                  <p className="text-muted-foreground">
                    {levelOpen ? (
                      "Open to anyone"
                    ) : (
                      <>
                        Minimum{" "}
                        <span className="text-foreground font-semibold">
                          {levelMin === LEVEL_BAND_SELECT_NONE
                            ? "Open"
                            : levelMin}
                        </span>
                        {" · "}
                        Maximum{" "}
                        <span className="text-foreground font-semibold">
                          {levelMax === LEVEL_BAND_SELECT_NONE
                            ? "Open"
                            : levelMax}
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
                <FieldError id="game-level-max-error">
                  {levelMaxError}
                </FieldError>
              </section>
            </>
          )}

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

          {groupVerified ? null : (
            <FieldDescription id="game-unrated-copy">
              {UNRATED_GROUP_LINE}
            </FieldDescription>
          )}

          <div className="border-rule rounded-card overflow-hidden border">
            {customName.trim() ? (
              <ReviewRow label="Name" value={customName.trim()} />
            ) : null}
            <ReviewRow label="Group" value={reviewGroup} />
            <ReviewRow label="Venue" value={reviewVenue} />
            <ReviewRow
              label={football ? "Players" : "Seats"}
              value={createFlowSeatsLabel(sport, { sideSize, playersAllowed })}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
