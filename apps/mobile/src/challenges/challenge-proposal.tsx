import type { ChallengeProposalView } from "@repo/domain/challenge-card";
import { View } from "react-native";

import { Text } from "../primitives/text";

/** A Proposal's time, place, price and clock, as one block of lines. */
export function ProposalLines({
  view,
  lead,
}: {
  view: ChallengeProposalView;
  /** The line above the terms, such as "Waiting on Seef Smashers to confirm". */
  lead?: string | null;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text size="lead" weight="semibold">
        {view.title}
      </Text>
      {lead ? <Text size="meta">{lead}</Text> : null}
      <Text>{view.whenLine}</Text>
      <Text size="meta" tone="muted">
        {view.whereLine}
      </Text>
      {view.priceLine ? (
        <Text size="meta" tone="muted">
          {view.priceLine}
        </Text>
      ) : null}
      <Text size="meta" tone="muted">
        {view.expiresLine}
      </Text>
    </View>
  );
}
