"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldTitle,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import { challengeCardView } from "@repo/domain/challenge-card";
import { challengeExpiresAt } from "@repo/domain/challenge-clock";
import {
  CHALLENGE_MAX_SLOTS,
  CHALLENGE_MAX_VENUES,
  CHALLENGE_NOTE_MAX,
  challengeFormatOptions,
  challengeNoteCount,
  challengeReviewLines,
  challengeSlotDayOptions,
  challengeSlotInstant,
  challengeSlotTimeOptions,
  challengeTimingOptions,
  challengeWeekdayOptions,
  emptyChallengeDraft,
  validateChallengeDraft,
  type ChallengeDraft,
  type ChallengeDraftField,
  type ChallengePostInput,
} from "@repo/domain/challenge-form";
import { isLevelBoundDisabled } from "@repo/domain/create-game-flow";
import { formatGameStart } from "@repo/domain/format-game-start";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import {
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";
import { formatsPlayable } from "@repo/domain/team-roster";
import { api, type RouterOutputs } from "~/trpc/react";

import { ChallengeCardBody } from "./challenge-card";
import { ChallengeChips } from "./challenge-chips";

type PostableTeam =
  RouterOutputs["challenges"]["listPostOptions"]["teams"][number];

const DEFAULT_SLOT_MINUTES = 19 * 60;

function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

function draftTeam(team: PostableTeam) {
  return {
    id: team.id,
    displayName: team.displayName,
    sport: team.sport,
    rosterCount: team.rosterCount,
  };
}

function LevelBound({
  bound,
  value,
  other,
  onChange,
}: {
  bound: "min" | "max";
  value: LevelBandSelectValue;
  other: LevelBandSelectValue;
  onChange: (value: LevelBandSelectValue) => void;
}) {
  const copy = useMessages().challenge.post;
  const label = bound === "min" ? copy.levelMin : copy.levelMax;
  return (
    <div className="space-y-1.5">
      <p className="text-meta text-muted-foreground">{label}</p>
      <ChallengeChips
        label={label}
        chips={ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => ({
          value: band,
          label: band,
          accessibilityLabel:
            bound === "min" ? copy.levelMinA11y(band) : copy.levelMaxA11y(band),
          disabled: isLevelBoundDisabled(bound, band, other),
        }))}
        isSelected={(band) => band === value}
        onSelect={(band) =>
          onChange(band === value ? LEVEL_BAND_SELECT_NONE : band)
        }
      />
    </div>
  );
}

/** 3a and 3b: the post form, then the card as it will appear before posting. */
export function ChallengePostForm() {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const copy = m.challenge.post;
  const [now] = React.useState(() => new Date());
  const options = api.challenges.listPostOptions.useQuery();
  const [draft, setDraft] = React.useState<ChallengeDraft>(() =>
    emptyChallengeDraft(),
  );
  const [errors, setErrors] = React.useState<
    Partial<Record<ChallengeDraftField, string>>
  >({});
  const [review, setReview] = React.useState<ChallengePostInput | null>(null);
  const [slotDay, setSlotDay] = React.useState(
    () => challengeSlotDayOptions(now, locale)[1]?.value ?? "",
  );
  const [slotMinutes, setSlotMinutes] = React.useState(DEFAULT_SLOT_MINUTES);

  const post = api.challenges.post.useMutation({
    onSuccess: async ({ id }) => {
      toast.success(copy.posted);
      await Promise.all([
        utils.challenges.listOpen.invalidate(),
        utils.challenges.listMine.invalidate(),
        utils.challenges.listPostOptions.invalidate(),
      ]);
      router.push(`/dashboard/challenges/${id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (options.error) {
    return (
      <ErrorState
        headingLevel={2}
        title={copy.errorTitle}
        message={options.error.message}
        onRetry={() => {
          void options.refetch();
        }}
      />
    );
  }
  if (!options.data) {
    return <DetailPageSkeleton />;
  }
  const data = options.data;
  if (data.teams.length === 0) {
    return (
      <Card variant="outlined" className="w-full space-y-2">
        <h2 className="text-title font-semibold">{copy.noTeamsTitle}</h2>
        <p className="text-body text-muted-foreground">{copy.noTeamsCopy}</p>
      </Card>
    );
  }

  const team = data.teams.find((candidate) => candidate.id === draft.teamId);
  const venues = team ? data.venues[team.sport] : [];

  function pickTeam(teamId: string) {
    const next = data.teams.find((candidate) => candidate.id === teamId);
    setDraft((current) => {
      const previous = data.teams.find(
        (candidate) => candidate.id === current.teamId,
      );
      const playable = next ? formatsPlayable(next.rosterCount) : [];
      return {
        ...current,
        teamId,
        sideSize:
          next?.sport === "football" &&
          playable.some((side) => side === current.sideSize)
            ? current.sideSize
            : null,
        venueIds: previous?.sport === next?.sport ? current.venueIds : [],
      };
    });
    setErrors({});
  }

  function onReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateChallengeDraft(
      draft,
      team ? draftTeam(team) : null,
      locale,
      new Date(),
    );
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    post.reset();
    setReview(result.input);
  }

  if (review && team) {
    const card = challengeCardView(
      {
        id: "preview",
        sport: team.sport,
        sideSize: review.sideSize,
        levelMinTenths: review.levelMinTenths,
        levelMaxTenths: review.levelMaxTenths,
        days: review.days,
        timings: review.timings,
        exactSlots: review.exactSlots,
        venues: venues.filter((venue) => review.venueIds.includes(venue.id)),
        note: review.note,
        proposalCount: 0,
        expiresAt: challengeExpiresAt(now),
        team: {
          displayName: team.displayName,
          rosterCount: team.rosterCount,
          teamLevel: team.teamLevel,
          members: team.members,
        },
        viewer: { ineligibleReason: null },
      },
      locale,
      now,
    );
    return (
      <Card variant="outlined" className="w-full space-y-6">
        <h2 className="text-title font-semibold">{m.challenge.review.title}</h2>
        <div className="space-y-2">
          <p className="text-eyebrow text-muted-foreground font-mono uppercase">
            {m.challenge.review.cardTitle}
          </p>
          <div className="border-border space-y-3 rounded-lg border p-5">
            <ChallengeCardBody card={card} />
          </div>
        </div>
        <ul className="space-y-2">
          {challengeReviewLines(draftTeam(team), review.sideSize, locale).map(
            (line) => (
              <li key={line.key} className="text-body">
                {line.text}
              </li>
            ),
          )}
        </ul>
        <FormErrorSummary message={post.error?.message ?? null} />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setReview(null)}
          >
            {copy.back}
          </Button>
          <Button
            type="button"
            disabled={post.isPending}
            onClick={() => post.mutate(review)}
          >
            {copy.submit}
          </Button>
        </div>
      </Card>
    );
  }

  const venuesFull = draft.venueIds.length >= CHALLENGE_MAX_VENUES;
  return (
    <Card variant="outlined" className="w-full">
      <form onSubmit={onReview} className="space-y-6">
        <FieldGroup>
          <Field>
            <FieldTitle>{copy.team}</FieldTitle>
            <ChallengeChips
              label={copy.team}
              chips={data.teams.map((option) => ({
                value: option.id,
                label: option.displayName,
              }))}
              isSelected={(id) => id === draft.teamId}
              onSelect={pickTeam}
            />
            <FieldError>{errors.team}</FieldError>
          </Field>

          {team?.sport === "football" ? (
            <Field>
              <FieldTitle>{copy.format}</FieldTitle>
              <FieldDescription>{copy.formatHelp}</FieldDescription>
              <ChallengeChips
                label={copy.format}
                chips={challengeFormatOptions(team.rosterCount, locale)}
                isSelected={(side) => side === draft.sideSize}
                onSelect={(sideSize) =>
                  setDraft((current) => ({ ...current, sideSize }))
                }
              />
              <FieldError>{errors.format}</FieldError>
            </Field>
          ) : null}

          {team ? (
            <Field>
              <FieldTitle>{copy.venues}</FieldTitle>
              <FieldDescription>
                {copy.venuesHint(CHALLENGE_MAX_VENUES)}
              </FieldDescription>
              <ChallengeChips
                label={copy.venues}
                chips={venues.map((venue) => ({
                  value: venue.id,
                  label: venue.name,
                  disabled: venuesFull && !draft.venueIds.includes(venue.id),
                }))}
                isSelected={(id) => draft.venueIds.includes(id)}
                onSelect={(id) =>
                  setDraft((current) => ({
                    ...current,
                    venueIds: toggle(current.venueIds, id),
                  }))
                }
              />
              <FieldError>{errors.venues}</FieldError>
            </Field>
          ) : null}

          <Field>
            <FieldTitle>{copy.days}</FieldTitle>
            <FieldDescription>{copy.daysHint}</FieldDescription>
            <ChallengeChips
              label={copy.days}
              chips={challengeWeekdayOptions(locale)}
              isSelected={(day) => draft.days.includes(day)}
              onSelect={(day) =>
                setDraft((current) => ({
                  ...current,
                  days: toggle(current.days, day),
                }))
              }
            />
          </Field>

          <Field>
            <FieldTitle>{copy.timings}</FieldTitle>
            <FieldDescription>{copy.timingsHint}</FieldDescription>
            <ChallengeChips
              label={copy.timings}
              chips={challengeTimingOptions(locale)}
              isSelected={(timing) => draft.timings.includes(timing)}
              onSelect={(timing) =>
                setDraft((current) => ({
                  ...current,
                  timings: toggle(current.timings, timing),
                }))
              }
            />
            <FieldDescription>
              {challengeTimingOptions(locale)
                .map((timing) => copy.timingLine(timing.label, timing.detail))
                .join(m.group.metaSeparator)}
            </FieldDescription>
          </Field>

          <Field>
            <FieldTitle>{copy.slots}</FieldTitle>
            <FieldDescription>
              {copy.slotsHint(CHALLENGE_MAX_SLOTS)}
            </FieldDescription>
            {draft.exactSlots.length > 0 ? (
              <ul className="space-y-1">
                {draft.exactSlots.map((slot) => {
                  const label = formatGameStart(slot, locale);
                  return (
                    <li
                      key={slot.toISOString()}
                      className="flex items-center gap-2"
                    >
                      <span className="text-body flex-1">{label}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={copy.removeSlot(label)}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            exactSlots: current.exactSlots.filter(
                              (each) => each.getTime() !== slot.getTime(),
                            ),
                          }))
                        }
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {draft.exactSlots.length < CHALLENGE_MAX_SLOTS ? (
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-meta text-muted-foreground flex flex-col gap-1">
                  {copy.slotDay}
                  <select
                    className="border-input bg-background text-body h-9 rounded-md border px-2"
                    value={slotDay}
                    onChange={(event) => setSlotDay(event.target.value)}
                  >
                    {challengeSlotDayOptions(now, locale).map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-meta text-muted-foreground flex flex-col gap-1">
                  {copy.slotTime}
                  <select
                    className="border-input bg-background text-body h-9 rounded-md border px-2"
                    value={slotMinutes}
                    onChange={(event) =>
                      setSlotMinutes(Number(event.target.value))
                    }
                  >
                    {challengeSlotTimeOptions(locale).map((time) => (
                      <option key={time.value} value={time.value}>
                        {time.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const slot = challengeSlotInstant(slotDay, slotMinutes);
                    setDraft((current) =>
                      current.exactSlots.some(
                        (each) => each.getTime() === slot.getTime(),
                      )
                        ? current
                        : {
                            ...current,
                            exactSlots: [...current.exactSlots, slot],
                          },
                    );
                  }}
                >
                  {copy.addSlot}
                </Button>
              </div>
            ) : null}
            <FieldError>{errors.slots}</FieldError>
          </Field>

          <Field>
            <FieldTitle>{copy.level}</FieldTitle>
            <FieldDescription>{copy.levelHint}</FieldDescription>
            <LevelBound
              bound="min"
              value={draft.levelMin}
              other={draft.levelMax}
              onChange={(levelMin) =>
                setDraft((current) => ({ ...current, levelMin }))
              }
            />
            <LevelBound
              bound="max"
              value={draft.levelMax}
              other={draft.levelMin}
              onChange={(levelMax) =>
                setDraft((current) => ({ ...current, levelMax }))
              }
            />
            <FieldError>{errors.level}</FieldError>
          </Field>

          <Field>
            <FieldTitle>{copy.note}</FieldTitle>
            <Input
              aria-label={copy.note}
              value={draft.note}
              placeholder={copy.notePlaceholder}
              maxLength={CHALLENGE_NOTE_MAX}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
            />
            <FieldDescription>
              {challengeNoteCount(draft.note, locale)}
            </FieldDescription>
            <FieldError>{errors.note}</FieldError>
          </Field>
        </FieldGroup>

        <div className="flex items-center gap-3">
          <Button type="submit">{copy.review}</Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/challenges">{m.common.cancel}</Link>
          </Button>
        </div>
      </form>
    </Card>
  );
}
