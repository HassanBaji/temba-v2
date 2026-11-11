"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { useLocale, useMessages } from "~/components/locale-provider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { Button } from "~/components/ui/button";
import { challengeCardView } from "@repo/domain/challenge-card";
import { challengeExpiresAt } from "@repo/domain/challenge-clock";
import {
  CHALLENGE_MAX_SLOTS,
  CHALLENGE_NOTE_MAX,
  challengeDaysHint,
  challengeDraftWithTeam,
  challengeFormatHelp,
  challengeFormatOptions,
  challengeInitialDraft,
  challengeLevelChips,
  challengeLevelHint,
  challengeLevelSelected,
  challengeLevelTap,
  challengeNoteCount,
  challengeNudgeView,
  challengePreviewCardInput,
  challengeReviewRows,
  challengeRosterHint,
  challengeSlotLabel,
  challengeTeamChoice,
  challengeTimingOptions,
  challengeVenueChoice,
  challengeWeekdayOptions,
  validateChallengeDraft,
  type ChallengeDraft,
  type ChallengeDraftField,
  type ChallengePostInput,
} from "@repo/domain/challenge-form";
import { api } from "~/trpc/react";

import {
  ChallengePostChip,
  ChallengePostFooter,
  ChallengePostGrid,
  ChallengePostHeader,
  ChallengePostSection,
  ChallengePostTeamCard,
} from "./challenge-post-parts";
import { ChallengePostReview } from "./challenge-post-review";
import { ChallengePostSlotDialog } from "./challenge-post-slot-dialog";

const CHALLENGES_HREF = "/dashboard/challenges";

function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

function PostFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[560px] flex-col">
      {children}
    </div>
  );
}

/**
 * 3a and 3b: the post form, then the card as it will appear before posting.
 * A link may name the Team; a Rematch opens pre-filled from the Team played.
 */
export function ChallengePostForm({
  teamId = null,
  opponentTeamId = null,
}: {
  teamId?: string | null;
  opponentTeamId?: string | null;
}) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const copy = m.challenge.post;
  const [now] = React.useState(() => new Date());
  const options = api.challenges.listPostOptions.useQuery();
  const [draft, setDraft] = React.useState<ChallengeDraft | null>(null);
  const [errors, setErrors] = React.useState<
    Partial<Record<ChallengeDraftField, string>>
  >({});
  const [review, setReview] = React.useState<ChallengePostInput | null>(null);
  const [slotOpen, setSlotOpen] = React.useState(false);
  const noteId = React.useId();
  const noteCountId = React.useId();
  if (draft == null && options.data) {
    setDraft(challengeInitialDraft(options.data, { teamId, opponentTeamId }));
  }

  const post = api.challenges.post.useMutation({
    onSuccess: async ({ id }) => {
      toast.success(copy.posted);
      await Promise.all([
        utils.challenges.listOpen.invalidate(),
        utils.challenges.listMine.invalidate(),
        utils.challenges.listPostOptions.invalidate(),
      ]);
      router.push(`${CHALLENGES_HREF}/${id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (options.error) {
    return (
      <PostFrame>
        <ChallengePostHeader title={copy.title} backHref={CHALLENGES_HREF} />
        <div className="pt-[22px]">
          <ErrorState
            headingLevel={2}
            title={copy.errorTitle}
            error={options.error}
            onRetry={() => {
              void options.refetch();
            }}
          />
        </div>
      </PostFrame>
    );
  }
  if (!options.data || !draft) {
    return (
      <PostFrame>
        <ChallengePostHeader title={copy.title} backHref={CHALLENGES_HREF} />
        <div className="pt-[22px]">
          <DetailPageSkeleton />
        </div>
      </PostFrame>
    );
  }
  const data = options.data;
  if (data.teams.length === 0) {
    return (
      <PostFrame>
        <ChallengePostHeader title={copy.title} backHref={CHALLENGES_HREF} />
        <div className="space-y-2 pt-[22px]">
          <h2 className="text-title font-semibold">{copy.noTeamsTitle}</h2>
          <p className="text-body text-muted-foreground">{copy.noTeamsCopy}</p>
        </div>
      </PostFrame>
    );
  }

  const current = draft;
  const team = data.teams.find((candidate) => candidate.id === current.teamId);
  const venues = team ? data.venues[team.sport] : [];
  const update = (patch: Partial<ChallengeDraft>) =>
    setDraft((previous) => (previous ? { ...previous, ...patch } : previous));

  function setNudge(nudgeTeamId: string | null) {
    update({ nudgeTeamId });
    setReview((previous) =>
      previous ? { ...previous, nudgeTeamId } : previous,
    );
  }

  function onReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateChallengeDraft(
      current,
      team ?? null,
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
    window.scrollTo({ top: 0 });
  }

  if (review && team) {
    return (
      <PostFrame>
        <ChallengePostReview
          card={challengeCardView(
            challengePreviewCardInput(
              team,
              review,
              venues,
              challengeExpiresAt(now),
            ),
            locale,
            now,
            { preview: true },
          )}
          rows={challengeReviewRows(
            team,
            review,
            venues.filter((venue) => review.venueIds.includes(venue.id)),
            locale,
          )}
          nudge={challengeNudgeView(
            team.playedTeams,
            review.nudgeTeamId,
            locale,
          )}
          onNudge={setNudge}
          error={post.error?.message ?? null}
          pending={post.isPending}
          onEdit={() => setReview(null)}
          onPost={() => post.mutate(review)}
        />
      </PostFrame>
    );
  }

  const venueChoice = challengeVenueChoice(venues, current.venueIds, locale);
  const levelRange = { levelMin: current.levelMin, levelMax: current.levelMax };
  return (
    <PostFrame>
      <form onSubmit={onReview} noValidate>
        <ChallengePostHeader title={copy.title} backHref={CHALLENGES_HREF} />
        <div className="flex flex-col gap-[26px] pt-[22px]">
          <ChallengePostSection
            title={copy.team}
            hint={copy.teamHint}
            error={errors.team}
          >
            <div
              role="radiogroup"
              aria-label={copy.team}
              className="grid grid-cols-2 gap-2"
            >
              {data.teams.map((option) => {
                const choice = challengeTeamChoice(option, locale);
                return (
                  <ChallengePostTeamCard
                    key={choice.value}
                    title={choice.title}
                    detail={choice.detail}
                    accessibilityLabel={choice.accessibilityLabel}
                    selected={choice.value === current.teamId}
                    onSelect={() => {
                      setDraft((previous) =>
                        previous
                          ? challengeDraftWithTeam(
                              previous,
                              data.teams,
                              option.id,
                            )
                          : previous,
                      );
                      setErrors({});
                    }}
                  />
                );
              })}
            </div>
          </ChallengePostSection>

          {team?.sport === "football" ? (
            <ChallengePostSection
              title={copy.format}
              hint={challengeRosterHint(team.rosterCount, locale)}
              error={errors.format}
            >
              <ChallengePostGrid label={copy.format} columns={3}>
                {challengeFormatOptions(team.rosterCount, locale).map(
                  (option) => (
                    <ChallengePostChip
                      key={option.value}
                      label={option.label}
                      aria-label={option.accessibilityLabel}
                      selected={option.value === current.sideSize}
                      disabled={option.disabled}
                      onClick={() => update({ sideSize: option.value })}
                    />
                  ),
                )}
              </ChallengePostGrid>
              <p className="text-eyebrow text-muted-foreground mt-2 leading-normal">
                {challengeFormatHelp(team, current.sideSize, locale)}
              </p>
            </ChallengePostSection>
          ) : null}

          {team ? (
            <ChallengePostSection
              title={copy.venues}
              hint={venueChoice.hint}
              error={errors.venues}
            >
              <ChallengePostGrid label={copy.venues} columns={2} multiple>
                {venueChoice.chips.map((chip) => (
                  <ChallengePostChip
                    key={chip.value}
                    multiple
                    label={chip.label}
                    selected={current.venueIds.includes(chip.value)}
                    disabled={chip.disabled}
                    onClick={() =>
                      update({
                        venueIds: toggle(current.venueIds, chip.value),
                      })
                    }
                  />
                ))}
                <ChallengePostChip
                  multiple
                  label={venueChoice.anywhere.label}
                  selected={venueChoice.anywhere.selected}
                  onClick={() => update({ venueIds: [] })}
                />
              </ChallengePostGrid>
            </ChallengePostSection>
          ) : null}

          <ChallengePostSection
            title={copy.days}
            hint={challengeDaysHint(current.days, locale)}
          >
            <ChallengePostGrid label={copy.days} columns={7} multiple>
              {challengeWeekdayOptions(locale).map((day) => (
                <ChallengePostChip
                  key={day.value}
                  multiple
                  label={day.label}
                  aria-label={day.accessibilityLabel}
                  selected={current.days.includes(day.value)}
                  onClick={() =>
                    update({ days: toggle(current.days, day.value) })
                  }
                />
              ))}
            </ChallengePostGrid>
          </ChallengePostSection>

          <ChallengePostSection
            title={copy.timings}
            hint={copy.timingsHint}
            error={errors.slots}
          >
            <ChallengePostGrid label={copy.timings} columns={3} multiple>
              {challengeTimingOptions(locale).map((timing) => (
                <ChallengePostChip
                  key={timing.value}
                  multiple
                  label={timing.label}
                  aria-label={timing.accessibilityLabel}
                  selected={current.timings.includes(timing.value)}
                  onClick={() =>
                    update({ timings: toggle(current.timings, timing.value) })
                  }
                />
              ))}
            </ChallengePostGrid>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {current.exactSlots.map((slot) => {
                const label = challengeSlotLabel(slot, now, locale);
                return (
                  <button
                    key={slot.toISOString()}
                    type="button"
                    aria-label={copy.removeSlot(label)}
                    onClick={() =>
                      update({
                        exactSlots: current.exactSlots.filter(
                          (each) => each.getTime() !== slot.getTime(),
                        ),
                      })
                    }
                    className="border-ink text-meta focus-visible:ring-ring/50 hover:bg-wash flex h-10 items-center gap-1.5 rounded-md border px-3 font-semibold outline-none focus-visible:ring-[3px]"
                  >
                    {label}
                    <X
                      aria-hidden="true"
                      className="text-muted-foreground size-3.5"
                    />
                  </button>
                );
              })}
              {current.exactSlots.length < CHALLENGE_MAX_SLOTS ? (
                <ChoiceChip
                  dashed
                  className="text-meta h-10 min-h-10 px-3"
                  onClick={() => setSlotOpen(true)}
                >
                  <Plus aria-hidden="true" className="size-3.5" />
                  {copy.addSlot}
                </ChoiceChip>
              ) : null}
            </div>
            <ChallengePostSlotDialog
              open={slotOpen}
              onOpenChange={setSlotOpen}
              now={now}
              onAdd={(slot) =>
                update({
                  exactSlots: current.exactSlots.some(
                    (each) => each.getTime() === slot.getTime(),
                  )
                    ? current.exactSlots
                    : [...current.exactSlots, slot],
                })
              }
            />
          </ChallengePostSection>

          <ChallengePostSection
            title={copy.level}
            hint={challengeLevelHint(levelRange, locale)}
            error={errors.level}
          >
            <ChallengePostGrid label={copy.level} columns={6} multiple>
              {challengeLevelChips(
                team?.teamLevel?.tenths ?? null,
                levelRange,
              ).map((band) => (
                <ChallengePostChip
                  key={band}
                  multiple
                  dir="ltr"
                  label={band}
                  selected={challengeLevelSelected(levelRange, band)}
                  onClick={() => update(challengeLevelTap(levelRange, band))}
                />
              ))}
            </ChallengePostGrid>
          </ChallengePostSection>

          <section>
            <label
              htmlFor={noteId}
              className="font-expanded text-title text-ink block leading-tight"
            >
              {copy.note}
            </label>
            <textarea
              id={noteId}
              aria-describedby={noteCountId}
              value={current.note}
              maxLength={CHALLENGE_NOTE_MAX}
              rows={3}
              onChange={(event) => update({ note: event.target.value })}
              className="border-rule bg-paper text-body focus-visible:ring-ring/50 mt-3 block min-h-[84px] w-full resize-none rounded-lg border px-4 py-3.5 leading-normal outline-none focus-visible:ring-[3px]"
            />
            <div className="text-eyebrow text-muted-foreground mt-1.5 flex justify-between gap-3">
              <span>{copy.noteShown}</span>
              <span id={noteCountId}>
                {challengeNoteCount(current.note, locale)}
              </span>
            </div>
            {errors.note ? (
              <p role="alert" className="text-destructive text-meta mt-2">
                {errors.note}
              </p>
            ) : null}
          </section>
        </div>
        <ChallengePostFooter>
          <Button type="submit" size="lg" className="flex-1">
            {copy.review}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-muted-foreground w-[104px] font-normal"
            asChild
          >
            <Link href={CHALLENGES_HREF}>{m.common.cancel}</Link>
          </Button>
        </ChallengePostFooter>
      </form>
    </PostFrame>
  );
}
