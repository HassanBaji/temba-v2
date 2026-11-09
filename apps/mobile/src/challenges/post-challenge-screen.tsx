import { challengeCardView } from "@repo/domain/challenge-card";
import { challengeExpiresAt } from "@repo/domain/challenge-clock";
import {
  challengeDraftWithTeam,
  challengeInitialDraft,
  challengeLevelTap,
  challengeNudgeView,
  challengePreviewCardInput,
  challengeReviewRows,
  validateChallengeDraft,
  type ChallengeDraft,
  type ChallengeDraftField,
  type ChallengePostInput,
} from "@repo/domain/challenge-form";
import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { View, type ScrollView } from "react-native";

import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import { useLeaveScreen } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import {
  CHALLENGES_PATH,
  challengePath,
  toggleValue,
} from "./challenges-model";
import { PostChallengeHeader } from "./post-challenge-parts";
import { PostChallengeSlotSheet } from "./post-challenge-slot-sheet";
import { PostChallengeForm, PostChallengeReview } from "./post-challenge-view";

const SECONDARY_WIDTH = 104;

/** The footer's way back out: Cancel on the form, Edit on the review. */
function FooterSecondary({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <View style={{ width: SECONDARY_WIDTH }}>
      <Button label={label} variant="outline" size="lg" onPress={onPress} />
    </View>
  );
}

/**
 * 3a and 3b on one route: the post form, then the review step. A link may
 * name the Team; a Rematch opens pre-filled from the Team played.
 */
export function PostChallengeScreen({
  teamId = null,
  opponentTeamId = null,
}: {
  teamId?: string | null;
  opponentTeamId?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const leave = useLeaveScreen(CHALLENGES_PATH);
  const scrollRef = useRef<ScrollView>(null);
  const now = useMemo(() => new Date(), []);
  const options = api.challenges.listPostOptions.useQuery();
  const [draft, setDraft] = useState<ChallengeDraft | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<ChallengeDraftField, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [review, setReview] = useState<ChallengePostInput | null>(null);
  const [slotOpen, setSlotOpen] = useState(false);
  if (draft == null && options.data) {
    setDraft(challengeInitialDraft(options.data, { teamId, opponentTeamId }));
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

  const header = <PostChallengeHeader title={m.challenge.post.title} />;
  if (options.isLoading) {
    return (
      <Screen>
        {header}
        <Skeleton height={240} radius={16} />
      </Screen>
    );
  }
  if (options.error || !options.data || !draft) {
    return (
      <Screen>
        {header}
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
        {header}
        <View style={{ gap: 8 }}>
          <Text size="title" weight="semibold" accessibilityRole="header">
            {m.challenge.post.noTeamsTitle}
          </Text>
          <Text tone="muted">{m.challenge.post.noTeamsCopy}</Text>
        </View>
      </Screen>
    );
  }

  const current = draft;
  const team =
    data.teams.find((candidate) => candidate.id === current.teamId) ?? null;
  const venues = team ? data.venues[team.sport] : [];
  const update = (patch: Partial<ChallengeDraft>) =>
    setDraft((previous) => (previous ? { ...previous, ...patch } : previous));

  function setNudge(nudgeTeamId: string | null) {
    update({ nudgeTeamId });
    setReview((previous) =>
      previous ? { ...previous, nudgeTeamId } : previous,
    );
  }

  function toTop() {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function openReview() {
    setFormError(null);
    const result = validateChallengeDraft(current, team, locale, new Date());
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setReview(result.input);
    toTop();
  }

  function backToForm() {
    setReview(null);
    toTop();
  }

  if (review && team) {
    const card = challengeCardView(
      challengePreviewCardInput(team, review, venues, challengeExpiresAt(now)),
      locale,
      now,
      { preview: true },
    );
    return (
      <Screen
        scrollRef={scrollRef}
        footer={
          <>
            <View style={{ flex: 1 }}>
              <Button
                label={m.challenge.post.submit}
                size="lg"
                pending={post.isPending}
                onPress={() => post.mutate(review)}
              />
            </View>
            <FooterSecondary
              label={m.challenge.post.edit}
              onPress={backToForm}
            />
          </>
        }
      >
        <PostChallengeReview
          card={card}
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
          formError={formError}
          onBack={backToForm}
        />
      </Screen>
    );
  }

  return (
    <>
      <Screen
        scrollRef={scrollRef}
        footer={
          <>
            <View style={{ flex: 1 }}>
              <Button
                label={m.challenge.post.review}
                size="lg"
                onPress={openReview}
              />
            </View>
            <FooterSecondary label={m.common.cancel} onPress={leave} />
          </>
        }
      >
        <PostChallengeForm
          now={now}
          teams={data.teams}
          team={team}
          venues={venues}
          draft={current}
          errors={errors}
          formError={formError}
          onTeam={(id) => {
            setDraft((previous) =>
              previous
                ? challengeDraftWithTeam(previous, data.teams, id)
                : previous,
            );
            setErrors({});
          }}
          onSideSize={(sideSize) => update({ sideSize })}
          onToggleVenue={(venueId) =>
            update({ venueIds: toggleValue(current.venueIds, venueId) })
          }
          onAnyVenue={() => update({ venueIds: [] })}
          onToggleDay={(day) =>
            update({ days: toggleValue(current.days, day) })
          }
          onToggleTiming={(timing) =>
            update({ timings: toggleValue(current.timings, timing) })
          }
          onAddSlot={() => setSlotOpen(true)}
          onRemoveSlot={(slot) =>
            update({
              exactSlots: current.exactSlots.filter(
                (each) => each.getTime() !== slot.getTime(),
              ),
            })
          }
          onLevel={(band) =>
            update(
              challengeLevelTap(
                { levelMin: current.levelMin, levelMax: current.levelMax },
                band,
              ),
            )
          }
          onNote={(note) => update({ note })}
        />
      </Screen>
      <PostChallengeSlotSheet
        visible={slotOpen}
        now={now}
        onClose={() => setSlotOpen(false)}
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
    </>
  );
}
