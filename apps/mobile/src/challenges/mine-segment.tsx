import { spacing } from "@repo/design-tokens";
import {
  challengeCardView,
  challengeProposalView,
} from "@repo/domain/challenge-card";
import { challengeMineSections } from "@repo/domain/challenge-mine";
import { formatGameStart } from "@repo/domain/format-game-start";
import { Pressable, View } from "react-native";

import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Section } from "../primitives/section";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { ChallengeCard } from "./challenge-card";
import { ProposalLines } from "./challenge-proposal";
import { challengeCardInput, type MineItem } from "./challenges-model";
import { SegmentEmpty } from "./segment-empty";

export type MineSegmentProps = {
  items: Slot<MineItem[]>;
  decliningId: string | null;
  onOpenChallenge: (challengeId: string) => void;
  onDecline: (proposal: { id: string; teamName: string }) => void;
  onGoToTeams: () => void;
};

function MineRow({
  item,
  focus,
  props,
  now,
}: {
  item: MineItem;
  focus: boolean;
  props: MineSegmentProps;
  now: Date;
}) {
  const m = useMessages();
  const locale = useLocale();
  const open = () => props.onOpenChallenge(item.challengeId);
  if (item.kind === "posted") {
    return (
      <ChallengeCard
        card={challengeCardView(
          challengeCardInput(item.challenge),
          locale,
          now,
        )}
        onOpen={props.onOpenChallenge}
      />
    );
  }
  if (item.kind === "waiting" || item.kind === "pending") {
    const view = challengeProposalView(item.proposal, now, locale);
    const lead =
      item.kind === "pending"
        ? m.challenge.proposal.waitingOn(item.posterTeam.displayName)
        : m.challenge.mine.proposedFor(item.posterTeam.displayName);
    return (
      <Surface tone={focus ? "ink" : "paper"} style={{ gap: spacing.compact }}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={m.challenge.mine.open(view.accessibilityLabel)}
          onPress={open}
        >
          <ProposalLines view={view} lead={lead} />
        </Pressable>
        {item.kind === "waiting" ? (
          <Button
            label={m.challenge.proposal.anotherTime}
            accessibilityLabel={m.challenge.proposal.anotherTimeA11y(
              view.title,
            )}
            variant={focus ? "outline-inverse" : "outline"}
            pending={props.decliningId === item.proposal.id}
            onPress={() =>
              props.onDecline({ id: item.proposal.id, teamName: view.title })
            }
          />
        ) : null}
      </Surface>
    );
  }
  const title = m.challenge.mine.acceptedLine(
    item.team.displayName,
    item.opponent.displayName,
  );
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={m.challenge.mine.open(title)}
      onPress={open}
    >
      <Surface style={{ gap: 4 }}>
        <Text weight="semibold">{title}</Text>
        <Text size="meta" tone="muted">
          {formatGameStart(item.startsAt, locale)}
        </Text>
      </Surface>
    </Pressable>
  );
}

/**
 * 1b: Proposals waiting on you first (the first on black), then your
 * Challenges, your pending Proposals, accepted and played.
 */
export function MineSegment(props: MineSegmentProps) {
  const locale = useLocale();
  if (props.items.status !== "ready" || props.items.value.length === 0) {
    return <SegmentEmpty segment="mine" onGoToTeams={props.onGoToTeams} />;
  }
  const now = new Date();
  return (
    <View style={{ gap: spacing.section }}>
      {challengeMineSections(props.items.value, locale).map((section) => (
        <Section key={section.kind} title={section.title}>
          <View style={{ gap: spacing.compact }}>
            {section.items.map(({ item, focus }) => (
              <MineRow
                key={item.key}
                item={item}
                focus={focus}
                props={props}
                now={now}
              />
            ))}
          </View>
        </Section>
      ))}
    </View>
  );
}
