import { challengeCardView } from "@repo/domain/challenge-card";
import { challengeExpiresAt } from "@repo/domain/challenge-clock";
import {
  challengeNudgeView,
  challengeReviewLines,
  challengeSlotDayOptions,
  challengeSlotInstant,
  emptyChallengeDraft,
  validateChallengeDraft,
  type ChallengeDraft,
  type ChallengeDraftField,
  type ChallengePostInput,
} from "@repo/domain/challenge-form";
import { formatsPlayable } from "@repo/domain/team-roster";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import {
  CHALLENGES_PATH,
  challengePath,
  draftTeam,
  previewCardInput,
  rematchDraft,
  toggleValue,
} from "./challenges-model";
import { PostChallengeForm, PostChallengeReview } from "./post-challenge-view";

const DEFAULT_SLOT_MINUTES = 19 * 60;

export function PostChallengeScreen({
  rematch = null,
}: {
  rematch?: { teamId: string; opponentTeamId: string } | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const now = useMemo(() => new Date(), []);
  const options = api.challenges.listPostOptions.useQuery();
  const [draft, setDraft] = useState<ChallengeDraft>(() =>
    emptyChallengeDraft(),
  );
  const [errors, setErrors] = useState<
    Partial<Record<ChallengeDraftField, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [review, setReview] = useState<ChallengePostInput | null>(null);
  const [slotDay, setSlotDay] = useState(
    () => challengeSlotDayOptions(now, locale)[1]?.value ?? "",
  );
  const [slotMinutes, setSlotMinutes] = useState(DEFAULT_SLOT_MINUTES);
  const [prefilled, setPrefilled] = useState(rematch == null);
  if (!prefilled && rematch && options.data) {
    setPrefilled(true);
    const prefill = rematchDraft(
      options.data,
      rematch.teamId,
      rematch.opponentTeamId,
    );
    if (prefill) {
      setDraft(prefill);
    }
  }

  const post = api.challenges.post.useMutation({
    onSuccess: async ({ id }) => {
      toast.show(m.challenge.post.posted);
      await Promise.all([
        utils.challenges.listOpen.invalidate(),
        utils.challenges.listMine.invalidate(),
        utils.challenges.listPostOptions.invalidate(),
      ]);
      router.replace(challengePath(id));
    },
    onError: (error) => {
      setFormError(error.message);
      toast.show(error.message);
    },
  });

  if (options.isLoading) {
    return (
      <Screen>
        <ScreenHeader
          nav="close"
          fallback={CHALLENGES_PATH}
          title={m.challenge.post.title}
        />
        <Skeleton height={240} radius={16} />
      </Screen>
    );
  }
  if (options.error || !options.data) {
    return (
      <Screen>
        <ScreenHeader
          nav="close"
          fallback={CHALLENGES_PATH}
          title={m.challenge.post.title}
        />
        <Notice
          alert
          title={m.challenge.post.errorTitle}
          description={options.error?.message ?? ""}
          onRetry={() => void options.refetch()}
        />
      </Screen>
    );
  }

  const data = options.data;
  if (data.teams.length === 0) {
    return (
      <Screen>
        <ScreenHeader
          nav="close"
          fallback={CHALLENGES_PATH}
          title={m.challenge.post.title}
        />
        <View style={{ gap: 8 }}>
          <Text size="title" weight="semibold" accessibilityRole="header">
            {m.challenge.post.noTeamsTitle}
          </Text>
          <Text tone="muted">{m.challenge.post.noTeamsCopy}</Text>
        </View>
      </Screen>
    );
  }

  const team =
    data.teams.find((candidate) => candidate.id === draft.teamId) ?? null;
  const venues = team ? data.venues[team.sport] : [];

  function pickTeam(teamId: string) {
    const next = data.teams.find((candidate) => candidate.id === teamId);
    setDraft((current) => {
      const sameSport = current.teamId
        ? data.teams.find((candidate) => candidate.id === current.teamId)
            ?.sport === next?.sport
        : false;
      const playable = next ? formatsPlayable(next.rosterCount) : [];
      return {
        ...current,
        teamId,
        sideSize:
          next?.sport === "football" &&
          current.sideSize != null &&
          playable.some((side) => side === current.sideSize)
            ? current.sideSize
            : null,
        venueIds: sameSport ? current.venueIds : [],
        nudgeTeamId: teamId === current.teamId ? current.nudgeTeamId : null,
      };
    });
    setErrors({});
  }

  function setNudge(nudgeTeamId: string | null) {
    setDraft((current) => ({ ...current, nudgeTeamId }));
    setReview((current) => (current ? { ...current, nudgeTeamId } : current));
  }

  function openReview() {
    setFormError(null);
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
    setReview(result.input);
  }

  if (review && team) {
    const card = challengeCardView(
      previewCardInput(
        team,
        {
          sideSize: review.sideSize,
          levelMinTenths: review.levelMinTenths,
          levelMaxTenths: review.levelMaxTenths,
          days: review.days,
          timings: review.timings,
          exactSlots: review.exactSlots,
          venues: venues.filter((venue) => review.venueIds.includes(venue.id)),
          note: review.note,
        },
        challengeExpiresAt(now),
      ),
      locale,
      now,
    );
    return (
      <Screen>
        <PostChallengeReview
          card={card}
          lines={challengeReviewLines(draftTeam(team), review.sideSize, locale)}
          nudge={challengeNudgeView(
            team.playedTeams,
            review.nudgeTeamId,
            locale,
          )}
          onNudge={setNudge}
          formError={formError}
          pending={post.isPending}
          onBack={() => setReview(null)}
          onSubmit={() => post.mutate(review)}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <PostChallengeForm
        now={now}
        teams={data.teams}
        team={team}
        venues={venues}
        draft={draft}
        errors={errors}
        formError={formError}
        slotDay={slotDay}
        slotMinutes={slotMinutes}
        onSlotDay={setSlotDay}
        onSlotMinutes={setSlotMinutes}
        onAddSlot={() => {
          const slot = challengeSlotInstant(slotDay, slotMinutes);
          setDraft((current) =>
            current.exactSlots.some((each) => each.getTime() === slot.getTime())
              ? current
              : { ...current, exactSlots: [...current.exactSlots, slot] },
          );
        }}
        onRemoveSlot={(slot) =>
          setDraft((current) => ({
            ...current,
            exactSlots: current.exactSlots.filter(
              (each) => each.getTime() !== slot.getTime(),
            ),
          }))
        }
        onTeam={pickTeam}
        onSideSize={(sideSize) =>
          setDraft((current) => ({ ...current, sideSize }))
        }
        onToggleVenue={(venueId) =>
          setDraft((current) => ({
            ...current,
            venueIds: toggleValue(current.venueIds, venueId),
          }))
        }
        onToggleDay={(day) =>
          setDraft((current) => ({
            ...current,
            days: toggleValue(current.days, day),
          }))
        }
        onToggleTiming={(timing) =>
          setDraft((current) => ({
            ...current,
            timings: toggleValue(current.timings, timing),
          }))
        }
        onLevel={(bound, value) =>
          setDraft((current) => ({
            ...current,
            [bound === "min" ? "levelMin" : "levelMax"]: value,
          }))
        }
        onNote={(note) => setDraft((current) => ({ ...current, note }))}
        onReview={openReview}
      />
    </Screen>
  );
}
