import { spacing } from "@repo/design-tokens";
import { challengeProposalView } from "@repo/domain/challenge-card";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Section } from "../primitives/section";
import { Surface } from "../primitives/surface";
import { ProposalLines } from "./challenge-proposal";
import type { ChallengeDetail } from "./challenges-model";

type Proposal = ChallengeDetail["proposalQueue"][number];

/** 2c: the viewer's Team's pending Proposal, to change or withdraw. */
export function ViewerProposals({
  proposals,
  posterTeamName,
  focus,
  withdrawingId,
  onChange,
  onWithdraw,
}: {
  proposals: readonly Proposal[];
  posterTeamName: string;
  /** The first Proposal is the screen's one focus. */
  focus: boolean;
  withdrawingId: string | null;
  onChange: (proposal: Proposal) => void;
  onWithdraw: (proposal: Proposal) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  if (proposals.length === 0) {
    return null;
  }
  const now = new Date();
  return (
    <Section title={m.challenge.proposal.pendingTitle}>
      <View style={{ gap: spacing.compact }}>
        {proposals.map((proposal, index) => (
          <Surface
            key={proposal.id}
            tone={focus && index === 0 ? "ink" : "paper"}
            style={{ gap: spacing.compact }}
          >
            <ProposalLines
              view={challengeProposalView(proposal, now, locale)}
              lead={m.challenge.proposal.waitingOn(posterTeamName)}
            />
            <View style={{ gap: 8 }}>
              <Button
                label={m.challenge.proposal.change}
                onPress={() => onChange(proposal)}
              />
              <Button
                label={m.challenge.proposal.withdraw}
                variant={focus && index === 0 ? "outline-inverse" : "outline"}
                pending={withdrawingId === proposal.id}
                onPress={() => onWithdraw(proposal)}
              />
            </View>
          </Surface>
        ))}
      </View>
    </Section>
  );
}

/** The posting Team's queue: each pending Proposal, oldest first, with Another time. */
export function ProposalQueue({
  proposals,
  decliningId,
  onDecline,
}: {
  proposals: readonly Proposal[];
  decliningId: string | null;
  onDecline: (proposal: Proposal) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  if (proposals.length === 0) {
    return null;
  }
  const now = new Date();
  return (
    <Section title={m.challenge.proposal.queueTitle}>
      <View style={{ gap: spacing.compact }}>
        {proposals.map((proposal, index) => {
          const view = challengeProposalView(proposal, now, locale);
          const focus = index === 0;
          return (
            <Surface
              key={proposal.id}
              tone={focus ? "ink" : "paper"}
              style={{ gap: spacing.compact }}
            >
              <ProposalLines view={view} lead={view.sentLine} />
              <Button
                label={m.challenge.proposal.anotherTime}
                accessibilityLabel={m.challenge.proposal.anotherTimeA11y(
                  view.title,
                )}
                variant={focus ? "outline-inverse" : "outline"}
                pending={decliningId === proposal.id}
                onPress={() => onDecline(proposal)}
              />
            </Surface>
          );
        })}
      </View>
    </Section>
  );
}
