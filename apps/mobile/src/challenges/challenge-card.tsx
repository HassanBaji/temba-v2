import { radii, spacing } from "@repo/design-tokens";
import type { ChallengeCardView } from "@repo/domain/challenge-card";
import { Pressable, View } from "react-native";

import { Hatch } from "../primitives/hatch";
import { InitialsTile } from "../primitives/initials-tile";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

const TILE = 40;
const GREYED_OPACITY = 0.5;

/** The poster's first six members, then the opponent's seats hatched: not yet. */
export function ChallengeSeats({ card }: { card: ChallengeCardView }) {
  return (
    <View style={{ gap: 6 }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}
      >
        {card.tiles.map((tile) => (
          <InitialsTile key={tile.key} name={tile.name} />
        ))}
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}
      >
        {Array.from({ length: card.opponentSeats }, (_, index) => (
          <View key={index} style={{ width: TILE, height: TILE }}>
            <Hatch radius={radii.md} />
          </View>
        ))}
      </View>
      <Text size="eyebrow" tone="muted" mono uppercase>
        {card.opponentSeatsLabel}
      </Text>
    </View>
  );
}

export function ChallengeLines({ card }: { card: ChallengeCardView }) {
  return (
    <View style={{ gap: 4 }}>
      <Text size="meta">{card.sportLine}</Text>
      <Text size="meta" tone="muted">
        {card.whenLine}
      </Text>
      {card.slotsLine ? (
        <Text size="meta" tone="muted">
          {card.slotsLine}
        </Text>
      ) : null}
      <Text size="meta" tone="muted">
        {card.venuesLine}
      </Text>
    </View>
  );
}

/** One Challenge on the Open board; greyed when the viewer has no Team that may propose. */
export function ChallengeCard({
  card,
  onOpen,
}: {
  card: ChallengeCardView;
  onOpen: (challengeId: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={card.accessibilityLabel}
      onPress={() => onOpen(card.id)}
      style={({ pressed }) => ({
        opacity: card.greyed ? GREYED_OPACITY : pressed ? 0.8 : 1,
      })}
    >
      <Surface style={{ gap: spacing.compact }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text size="lead" weight="semibold" style={{ flex: 1 }}>
            {card.title}
          </Text>
          <Text size="meta" tone="muted">
            {card.proposalsLine}
          </Text>
        </View>
        <ChallengeSeats card={card} />
        <ChallengeLines card={card} />
        {card.note ? <Text size="meta">{card.note}</Text> : null}
        {card.nudgeLine ? (
          <Text size="meta" weight="medium">
            {card.nudgeLine}
          </Text>
        ) : null}
        {card.greyedLine ? (
          <Text size="meta" weight="medium">
            {card.greyedLine}
          </Text>
        ) : null}
      </Surface>
    </Pressable>
  );
}
