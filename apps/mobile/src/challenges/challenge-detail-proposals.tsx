import { radii } from "@repo/design-tokens";
import {
  challengeProposalCard,
  challengeProposalFootnote,
} from "@repo/domain/challenge-detail";
import { initials } from "@repo/domain/initials";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { ChallengeFootnote, CrestTile } from "./challenge-detail-parts";
import { ProposalCard } from "./challenge-proposal";
import type { ChallengeDetail } from "./challenges-model";

type Proposal = ChallengeDetail["proposalQueue"][number];

const MARKER = 36;

/** 2c: the viewer's Team's pending Proposal, to change or withdraw. */
export function ViewerProposals({
  proposals,
  posterTeamName,
  sport,
  withdrawingId,
  onChange,
  onWithdraw,
}: {
  proposals: readonly Proposal[];
  posterTeamName: string;
  sport: string;
  withdrawingId: string | null;
  onChange: (proposal: Proposal) => void;
  onWithdraw: (proposal: Proposal) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  if (proposals.length === 0) {
    return null;
  }
  const copy = m.challenge.detailScreen.proposal;
  const now = new Date();
  return (
    <View>
      <View style={{ gap: 12 }}>
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            focus
            view={challengeProposalCard(
              proposal,
              { side: "proposer", posterName: posterTeamName },
              now,
              locale,
            )}
            marker={
              <View style={{ width: MARKER, height: MARKER }}>
                <Hatch radius={MARKER / 2} />
              </View>
            }
            primary={{ label: copy.change, onPress: () => onChange(proposal) }}
            secondary={{
              label: copy.withdraw,
              pending: withdrawingId === proposal.id,
              onPress: () => onWithdraw(proposal),
            }}
          />
        ))}
      </View>
      <ChallengeFootnote>
        {challengeProposalFootnote(sport, locale)}
      </ChallengeFootnote>
    </View>
  );
}

/**
 * The posting Team's queue: each pending Proposal, oldest first, with
 * Confirm and Another time. The oldest carries the ink edge.
 */
export function ProposalQueue({
  proposals,
  posterTeamName,
  confirmingId,
  decliningId,
  onConfirm,
  onDecline,
}: {
  proposals: readonly Proposal[];
  posterTeamName: string;
  confirmingId: string | null;
  decliningId: string | null;
  onConfirm: (proposal: Proposal) => void;
  onDecline: (proposal: Proposal) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const palette = useTonePalette();
  const copy = m.challenge.detailScreen.queue;
  const now = new Date();
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="meta" tone="muted" accessibilityRole="header">
          {copy.title}
        </Text>
        {proposals.length > 0 ? (
          <Text
            size="eyebrow"
            tone="muted"
            style={{ flexShrink: 1, textAlign: "right" }}
          >
            {copy.hint}
          </Text>
        ) : null}
      </View>
      {proposals.length === 0 ? (
        <View
          style={{
            borderWidth: hairline,
            borderColor: palette.rule,
            borderRadius: radii.card,
            paddingVertical: 16,
            paddingHorizontal: 18,
          }}
        >
          <Text size="meta" tone="muted">
            {copy.empty}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {proposals.map((proposal, index) => (
            <ProposalCard
              key={proposal.id}
              focus={index === 0}
              view={challengeProposalCard(
                proposal,
                { side: "poster", posterName: posterTeamName },
                now,
                locale,
              )}
              marker={
                <CrestTile
                  size="sm"
                  initials={initials(proposal.team.displayName)}
                />
              }
              primary={{
                label: copy.confirm,
                accessibilityLabel: m.challenge.proposal.confirmA11y(
                  proposal.team.displayName,
                ),
                pending: confirmingId === proposal.id,
                onPress: () => onConfirm(proposal),
              }}
              secondary={{
                label: copy.another,
                accessibilityLabel: m.challenge.proposal.anotherTimeA11y(
                  proposal.team.displayName,
                ),
                pending: decliningId === proposal.id,
                onPress: () => onDecline(proposal),
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
