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
import { RoundCountField } from "~/components/games/round-count-field";
import { StepperField } from "~/components/games/stepper-field";
import { FieldDescription, FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { SelectCard } from "~/components/ui/select-card";
import {
  CREATE_FLOW_MATCH_MINUTE_CHIPS,
  CREATE_FLOW_PRICE_CHIPS,
  FRIENDLY_TOURNAMENT_UNEVEN_GROUPS,
  KNOCKOUT_ONLY_FORMAT_LABEL,
  KNOCKOUT_REVIEW_LABEL,
  TOURNAMENT_FORMAT_LABEL,
  TOURNAMENT_SHAPE_OPTIONS,
  applyLevelBoundChange,
  friendlyTournamentCourtsLabel,
  friendlyTournamentFormatLabel,
  friendlyTournamentGroupsLine,
  friendlyTournamentSchedule,
  gameTeamOfTwoCopy,
  parseCreateMatchMinutes,
  previewStartSlots,
  validateFriendlyGameWhen,
  priceChipIsSelected,
  visibleCreateCourts,
  type CreateTournamentShape,
} from "~/lib/create-game-flow";
import { formatGameClock } from "~/lib/format-game-start";
import {
  formatTimeSlotLabel,
  parseRequiredGameWindow,
  upcomingGameWindowTimeSlots,
} from "~/lib/game-window";
import {
  LEVEL_RANGE_FIELD_DESCRIPTION,
  type LevelBandSelectValue,
} from "~/lib/level-range";
import { PRICE_PER_PLAYER_FIELD_DESCRIPTION } from "~/lib/price-per-player";
import {
  COUNTS_FOR_RATING_LABEL,
  COUNTS_FOR_RATING_YES,
} from "~/lib/tournament-home";
import {
  buildKnockoutTree,
  knockoutOnlyReviewValue,
} from "~/lib/tournament-knockout";
import { sizeTournamentRounds } from "~/lib/tournament-schedule";
import {
  ALONE_OR_WITH_A_PARTNER_LABEL,
  ANYONE_WITH_THE_LINK_LABEL,
  HOW_PEOPLE_JOIN_LABEL,
  ONE_DAY_OVERRUN_MESSAGE,
  playersInPairsLine,
  poolCountOptions,
  resolveRoundCount,
  reviewRoundsValue,
  ROUNDS_LABEL,
  sizeFriendlyTournament,
  TOURNAMENT_TEAM_MAX,
  TOURNAMENT_TEAM_MIN,
  TOURNAMENT_TEAM_STEP,
  WHO_CAN_TAKE_A_SEAT_LABEL,
  WITH_A_PARTNER_ONLY_LABEL,
} from "~/lib/tournament-sizing";
import { cn } from "~/lib/utils";

const STEPPER_LABEL = "text-foreground font-expanded text-title font-normal";

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
  tournamentShape,
  onTournamentShape,
  poolCount,
  poolCountError,
  onPoolCount,
  roundCount,
  roundCountError,
  onRoundCount,
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
  tournamentShape: CreateTournamentShape;
  onTournamentShape: (tournamentShape: CreateTournamentShape) => void;
  poolCount: number;
  poolCountError?: string;
  onPoolCount: (poolCount: number) => void;
  roundCount: number | null;
  roundCountError?: string;
  onRoundCount: (roundCount: number | null) => void;
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
  const [courtsExpandedVenueId, setCourtsExpandedVenueId] = React.useState<
    string | null
  >(null);
  const [startExpanded, setStartExpanded] = React.useState(false);
  const [finishExpanded, setFinishExpanded] = React.useState(false);

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
  const knockoutOnly = tournamentShape === "knockout_only";
  const knockoutTree = knockoutOnly
    ? buildKnockoutTree({ entrantCount: teamCount })
    : null;
  const sized = sizeFriendlyTournament(teamCount, poolCount);
  const sizing = !knockoutOnly && sized.ok ? sized.sizing : null;
  const resolvedRoundCount = sizing
    ? resolveRoundCount(sizing.poolSizes, roundCount)
    : null;
  const rounds =
    sizing && resolvedRoundCount != null
      ? sizeTournamentRounds(sizing.poolSizes, resolvedRoundCount)
      : null;
  const poolOptions = poolCountOptions(teamCount);
  const poolMin = poolOptions[0] ?? 1;
  const poolMax = poolOptions[poolOptions.length - 1] ?? poolMin;
  const parsedMinutes = parseCreateMatchMinutes(matchMinutes);
  const parsedWindow = parseRequiredGameWindow(day, startTime, finishTime);
  const whenOk = validateFriendlyGameWhen(day, startTime, finishTime, now).ok;
  const roundMatches = knockoutTree
    ? knockoutTree.matchesPerRound
    : rounds?.roundMatches;
  const schedule =
    whenOk && parsedMinutes.ok && parsedWindow && roundMatches
      ? friendlyTournamentSchedule({
          start: parsedWindow.windowStart,
          finish: parsedWindow.windowEnd,
          roundMatches,
          courtCount: courtIds.length,
          matchMinutes: parsedMinutes.minutes,
          clock: formatGameClock,
          knockoutOnly,
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
                <p className="text-muted-foreground text-body">
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
              <p className="text-muted-foreground text-meta">
                {playersInPairsLine(teamCount)}
              </p>
            }
          />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <section className="flex flex-col gap-3">
            <SectionHeading
              id="tournament-shape-label"
              title={TOURNAMENT_FORMAT_LABEL}
            />
            <RovingRadioGroup
              id="tournament-shape"
              aria-labelledby="tournament-shape-label"
              tabIndex={-1}
              className="border-rule rounded-card flex flex-col overflow-hidden border outline-none"
            >
              {TOURNAMENT_SHAPE_OPTIONS.map((option) => (
                <SelectCard
                  key={option.id}
                  role="radio"
                  layout="row"
                  selected={tournamentShape === option.id}
                  title={option.title}
                  description={option.description}
                  trailing="check"
                  onClick={() => {
                    onTournamentShape(option.id);
                  }}
                />
              ))}
            </RovingRadioGroup>
          </section>

          {knockoutOnly ? null : (
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
                    <p className="text-muted-foreground text-meta">
                      {friendlyTournamentGroupsLine(sizing)}
                    </p>
                    {sizing.uneven ? (
                      <p className="text-muted-foreground text-meta">
                        {FRIENDLY_TOURNAMENT_UNEVEN_GROUPS}
                      </p>
                    ) : null}
                  </div>
                ) : null
              }
            />
          )}

          {sizing ? (
            <RoundCountField
              id="tournament-round-count"
              labelClassName={STEPPER_LABEL}
              poolSizes={sizing.poolSizes}
              roundCount={roundCount}
              onRoundCount={onRoundCount}
              error={roundCountError}
            />
          ) : null}

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
                        onStartTime(slot);
                        if (finishTime && finishTime <= slot) {
                          onFinishTime("");
                        }
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
              title="Finish"
              meta={finishTime ? formatTimeSlotLabel(finishTime) : undefined}
            />
            <div id="game-window-finish" tabIndex={-1} className="outline-none">
              <div className="grid grid-cols-4 gap-1.5">
                <RovingRadioGroup
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
                </RovingRadioGroup>
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
              <p className="text-muted-foreground text-body">
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
            <RovingRadioGroup
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
            </RovingRadioGroup>
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
            <div className="border-ink rounded-card border px-[18px] py-4">
              {schedule.line ? (
                <p className="text-lead leading-snug">{schedule.line}</p>
              ) : null}
              {schedule.overruns ? (
                <p
                  className={cn(
                    "text-muted-foreground text-meta leading-relaxed",
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
            <RovingRadioGroup
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
            </RovingRadioGroup>
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
            <RovingRadioGroup
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
            </RovingRadioGroup>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="tournament-join-label"
              title={HOW_PEOPLE_JOIN_LABEL}
            />
            <RovingRadioGroup
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
            </RovingRadioGroup>
          </section>

          <div className="border-rule rounded-card overflow-hidden border">
            <ReviewRow label="Group" value={groupName} />
            <ReviewRow label="Venue" value={selectedVenue?.name ?? "Venue"} />
            <ReviewRow
              label={TOURNAMENT_FORMAT_LABEL}
              value={
                knockoutOnly
                  ? KNOCKOUT_ONLY_FORMAT_LABEL
                  : sizing
                    ? friendlyTournamentFormatLabel(sizing.poolCount)
                    : friendlyTournamentFormatLabel(poolCount)
              }
            />
            {knockoutTree ? (
              <ReviewRow
                label={KNOCKOUT_REVIEW_LABEL}
                value={knockoutOnlyReviewValue(knockoutTree)}
              />
            ) : null}
            {sizing && rounds ? (
              <ReviewRow
                label={ROUNDS_LABEL}
                value={reviewRoundsValue(rounds.roundCount, sizing.roundCount)}
              />
            ) : null}
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
