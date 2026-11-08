import { spacing } from "@repo/design-tokens";
import { challengeCardView } from "@repo/domain/challenge-card";
import { View } from "react-native";

import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Section } from "../primitives/section";
import { ChallengeCard } from "./challenge-card";
import { challengeCardInput, type MineChallenge } from "./challenges-model";
import { SegmentEmpty } from "./segment-empty";

/** Mine, posted section: the open Challenges of the Teams the viewer acts for. */
export function MineSegment({
  posted,
  onOpenChallenge,
  onGoToTeams,
}: {
  posted: Slot<MineChallenge[]>;
  onOpenChallenge: (challengeId: string) => void;
  onGoToTeams: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  if (posted.status !== "ready" || posted.value.length === 0) {
    return <SegmentEmpty segment="mine" onGoToTeams={onGoToTeams} />;
  }
  const now = new Date();
  return (
    <Section title={m.challenge.mine.postedTitle}>
      <View style={{ gap: spacing.compact }}>
        {posted.value.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            card={challengeCardView(challengeCardInput(challenge), locale, now)}
            onOpen={onOpenChallenge}
          />
        ))}
      </View>
    </Section>
  );
}
