"use client";

import * as React from "react";

import { DayField } from "~/app/dashboard/games/new/_parts/day-field";
import {
  GroupField,
  type CreateGroup,
} from "~/app/dashboard/games/new/_parts/group-field";
import { LevelBandRow } from "~/app/dashboard/games/new/_parts/level-band-row";
import { RatingField } from "~/app/dashboard/games/new/_parts/rating-field";
import { ReviewRow } from "~/app/dashboard/games/new/_parts/review-row";
import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
import {
  VenueField,
  type CreateVenue,
} from "~/app/dashboard/games/new/_parts/venue-field";
import { useLocale, useMessages } from "~/components/locale-provider";
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
  createFlowPriceChips,
  tournamentShapeOptions,
  applyLevelBoundChange,
  friendlyTournamentCourtsLabel,
  friendlyTournamentFormatLabel,
  friendlyTournamentGroupsLine,
  gameTeamOfTwoCopy,
  parseCreateMatchMinutes,
  previewStartSlots,
  priceChipIsSelected,
  createRatingChoice,
  reconcileWindowForDay,
  selectStartSlot,
  visibleCreateCourts,
  type CreateTournamentShape,
} from "@repo/domain/create-game-flow";
import { formatGameClock } from "@repo/domain/format-game-start";
import {
  formatTimeSlotLabel,
  upcomingGameWindowFinishSlots,
  upcomingGameWindowTimeSlots,
} from "@repo/domain/game-window";
import { type LevelBandSelectValue } from "@repo/domain/level-range";
import {
  groupsThenKnockoutReviewValue,
  knockoutOnlyReviewValue,
  qualifierUnit,
  qualifiersConsequenceLine,
  throughFromEachGroupLabel,
} from "@repo/domain/tournament-knockout";
import {
  friendlyTournamentPlan,
  friendlyTournamentScheduleFor,
} from "@repo/domain/create-game-submit";
import {
  playersInPairsLine,
  poolCountOptions,
  reviewRoundsValue,
  TOURNAMENT_TEAM_MAX,
  TOURNAMENT_TEAM_MIN,
  TOURNAMENT_TEAM_STEP,
} from "@repo/domain/tournament-sizing";
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
  qualifiersPerPool,
  qualifiersPerPoolError,
  onQualifiersPerPool,
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
  groupVerified,
  rated,
  onRated,
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
  qualifiersPerPool: number;
  qualifiersPerPoolError?: string;
  onQualifiersPerPool: (qualifiersPerPool: number) => void;
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
  groupVerified: boolean;
  rated: boolean;
  onRated: (rated: boolean) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const c = m.webDashboard.createGame;
  const sizingCopy = m.tournament.sizing;
  const ratingChoice = createRatingChoice({ groupVerified, rated, locale });
  const [courtsExpandedVenueId, setCourtsExpandedVenueId] = React.useState<
    string | null
  >(null);
  const [startExpanded, setStartExpanded] = React.useState(false);
  const [finishExpanded, setFinishExpanded] = React.useState(false);

  const startSlots = upcomingGameWindowTimeSlots(day, now);
  const visibleStarts = previewStartSlots(startSlots, startTime, startExpanded);
  const finishSlots = startTime
    ? upcomingGameWindowFinishSlots(day, startTime, now)
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
  const plan = friendlyTournamentPlan({
    teamCount,
    poolCount,
    roundCount,
    qualifiersPerPool,
    tournamentShape,
  });
  const {
    knockoutOnly,
    knockoutTree,
    sizing,
    rounds,
    qualifiersRange,
    poolKnockoutTree,
  } = plan;
  const poolOptions = poolCountOptions(teamCount);
  const poolMin = poolOptions[0] ?? 1;
  const poolMax = poolOptions[poolOptions.length - 1] ?? poolMin;
  const parsedMinutes = parseCreateMatchMinutes(matchMinutes, locale);
  const schedule = friendlyTournamentScheduleFor({
    plan,
    day,
    startTime,
    finishTime,
    matchMinutes,
    courtCount: courtIds.length,
    now,
    clock: (date) => formatGameClock(date, locale),
    locale,
  });
  const selectedCourtNames = courts
    .filter((court) => courtIds.includes(court.id))
    .map((court) => court.name);
  const teamPrice = gameTeamOfTwoCopy(price, locale);

  function selectDay(next: string) {
    onDay(next);
    const reconciled = reconcileWindowForDay(
      { startTime, finishTime },
      next,
      now,
      "blocked",
    );
    if (reconciled.startTime !== startTime) {
      onStartTime(reconciled.startTime);
      onFinishTime(reconciled.finishTime);
      return;
    }
    if (reconciled.finishTime !== finishTime) {
      onFinishTime(reconciled.finishTime);
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
            unlocked={Boolean(selectedGroupId)}
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
              title={c.courts}
              meta={m.common.optional}
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
                  {selectedVenue ? c.noCourtsToRecord : c.pickVenueForCourts}
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
                      {c.allCourts(courts.length)}
                    </ChoiceChip>
                  ) : null}
                </>
              )}
            </div>
            <FieldError id="game-court-error">{courtError}</FieldError>
          </section>

          <StepperField
            id="tournament-team-count"
            label={c.gameTeams}
            labelClassName={STEPPER_LABEL}
            value={teamCount}
            unit={c.gameTeams}
            min={TOURNAMENT_TEAM_MIN}
            max={TOURNAMENT_TEAM_MAX}
            step={TOURNAMENT_TEAM_STEP}
            onChange={onTeamCount}
            decreaseLabel={c.fewerGameTeams}
            increaseLabel={c.moreGameTeams}
            error={teamCountError}
            description={
              <p className="text-muted-foreground text-meta">
                {playersInPairsLine(teamCount, locale)}
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
              title={m.createGame.tournamentFormat}
            />
            <RovingRadioGroup
              id="tournament-shape"
              aria-labelledby="tournament-shape-label"
              tabIndex={-1}
              className="border-rule rounded-card flex flex-col overflow-hidden border outline-none"
            >
              {tournamentShapeOptions(locale).map((option) => (
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
              label={c.groups}
              labelClassName={STEPPER_LABEL}
              value={poolCount}
              unit={c.groupUnit(poolCount)}
              min={poolMin}
              max={poolMax}
              step={1}
              onChange={onPoolCount}
              decreaseLabel={c.fewerGroups}
              increaseLabel={c.moreGroups}
              error={poolCountError}
              description={
                sizing ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-muted-foreground text-meta">
                      {friendlyTournamentGroupsLine(sizing, locale)}
                    </p>
                    {sizing.uneven ? (
                      <p className="text-muted-foreground text-meta">
                        {m.createGame.unevenGroups}
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

          {qualifiersRange ? (
            <StepperField
              id="tournament-qualifiers-per-pool"
              label={throughFromEachGroupLabel(locale)}
              labelClassName={STEPPER_LABEL}
              value={qualifiersPerPool}
              unit={qualifierUnit(qualifiersPerPool, locale)}
              min={qualifiersRange.min}
              max={qualifiersRange.max}
              step={1}
              onChange={onQualifiersPerPool}
              decreaseLabel={c.fewerTeamsThrough}
              increaseLabel={c.moreTeamsThrough}
              error={qualifiersPerPoolError}
              description={
                poolKnockoutTree ? (
                  <p className="text-muted-foreground text-meta">
                    {qualifiersConsequenceLine(poolKnockoutTree, locale)}
                  </p>
                ) : null
              }
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
              title={c.startTime}
              meta={c.halfHourSteps}
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
                        const next = selectStartSlot(
                          { startTime, finishTime },
                          slot,
                          false,
                        );
                        onStartTime(next.startTime);
                        if (next.finishTime !== finishTime) {
                          onFinishTime(next.finishTime);
                        }
                      }}
                    >
                      {formatTimeSlotLabel(slot, locale)}
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
                    {startExpanded ? m.common.less : m.common.more}
                  </ChoiceChip>
                ) : null}
              </div>
            </div>
            {startSlots.length === 0 ? (
              <p className="text-muted-foreground text-body">
                {c.noUpcomingTimes}
              </p>
            ) : null}
            <FieldError id="game-window-start-error">{startError}</FieldError>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="game-window-finish-label"
              title={c.finish}
              meta={
                finishTime ? formatTimeSlotLabel(finishTime, locale) : undefined
              }
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
                      {formatTimeSlotLabel(slot, locale)}
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
                    {finishExpanded ? m.common.less : m.common.more}
                  </ChoiceChip>
                ) : null}
              </div>
            </div>
            {!startTime ? (
              <p className="text-muted-foreground text-body">
                {c.pickStartFirst}
              </p>
            ) : null}
            <FieldError id="game-window-finish-error">{finishError}</FieldError>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="tournament-match-minutes-label"
              title={c.gameLength}
              meta={m.common.required}
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
                    {c.minutes(minutes)}
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
              aria-label={c.customMinutes}
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
              {c.matchMinutesCopy}
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
                  {sizingCopy.oneDayOverrun}
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
              title={c.name}
              meta={m.common.required}
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
              title={c.whoCanEnter}
              meta={m.common.optional}
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
                {c.anyone}
              </ChoiceChip>
              <ChoiceChip
                role="radio"
                selected={showLevelRange}
                onClick={() => {
                  onEntryMode("range");
                }}
              >
                {c.setLevelRange}
              </ChoiceChip>
            </RovingRadioGroup>
            {showLevelRange ? (
              <>
                <LevelBandRow
                  id="game-level-min"
                  label={c.minimumLevel}
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
                  label={c.maximumLevel}
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
                  {m.level.rangeFieldDescription}
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
              title={c.pricePerPlayer}
              meta={m.common.optional}
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
              {createFlowPriceChips(locale).map((chip) => {
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
              {m.createGame.price.fieldDescription}
              {teamPrice ? ` ${teamPrice}` : ""}
            </FieldDescription>
            <FieldError id="game-price-per-player-error">
              {priceError}
            </FieldError>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="tournament-public-label"
              title={sizingCopy.whoCanTakeASeat}
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
              {groupVerified ? (
                <ChoiceChip
                  role="radio"
                  selected={isPublic}
                  onClick={() => {
                    onIsPublic(true);
                  }}
                >
                  {sizingCopy.anyoneWithTheLink}
                </ChoiceChip>
              ) : null}
            </RovingRadioGroup>
          </section>

          <RatingField
            idPrefix="tournament"
            groupVerified={groupVerified}
            rated={rated}
            onRated={onRated}
          />

          <section className="flex flex-col gap-3">
            <SectionHeading
              id="tournament-join-label"
              title={sizingCopy.howPeopleJoin}
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
                {sizingCopy.aloneOrWithPartner}
              </ChoiceChip>
              <ChoiceChip
                role="radio"
                selected={!allowSoloRegister}
                onClick={() => {
                  onAllowSoloRegister(false);
                }}
              >
                {sizingCopy.withPartnerOnly}
              </ChoiceChip>
            </RovingRadioGroup>
          </section>

          <div className="border-rule rounded-card overflow-hidden border">
            <ReviewRow label={m.invite.kind.group} value={groupName} />
            <ReviewRow
              label={m.webDashboard.venue.title}
              value={selectedVenue?.name ?? m.webDashboard.venue.title}
            />
            <ReviewRow
              label={m.createGame.tournamentFormat}
              value={
                knockoutOnly
                  ? m.createGame.knockoutOnly
                  : friendlyTournamentFormatLabel(
                      sizing?.poolCount ?? poolCount,
                      locale,
                      poolKnockoutTree != null,
                    )
              }
            />
            {knockoutTree ? (
              <ReviewRow
                label={m.createGame.knockout}
                value={knockoutOnlyReviewValue(knockoutTree, locale)}
              />
            ) : null}
            {poolKnockoutTree && sizing ? (
              <ReviewRow
                label={m.createGame.knockout}
                value={groupsThenKnockoutReviewValue({
                  tree: poolKnockoutTree,
                  poolCount: sizing.poolCount,
                  qualifiersPerPool,
                  locale,
                })}
              />
            ) : null}
            {sizing && rounds ? (
              <ReviewRow
                label={sizingCopy.roundsLabel}
                value={reviewRoundsValue(
                  rounds.roundCount,
                  sizing.roundCount,
                  locale,
                )}
              />
            ) : null}
            <ReviewRow
              label={c.courts}
              value={friendlyTournamentCourtsLabel(selectedCourtNames, locale)}
            />
            <ReviewRow
              label={c.gameLength}
              value={
                parsedMinutes.ok
                  ? c.minutes(parsedMinutes.minutes)
                  : c.gameLength
              }
            />
            <ReviewRow
              label={ratingChoice.title}
              value={ratingChoice.scopeLabel}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
