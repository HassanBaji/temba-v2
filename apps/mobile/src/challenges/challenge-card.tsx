import { radii, sizes, spacing, typeScale } from "@repo/design-tokens";
import type { ChallengeCardView } from "@repo/domain/challenge-card";
import { MapPin } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Hatch } from "../primitives/hatch";
import { InitialsTile } from "../primitives/initials-tile";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const GREYED_OPACITY = 0.5;
const CARD_GAP = 14;
const LEVEL_WIDTH = 52;
const SEAT = { small: 20, large: 28 } as const;

/**
 * The poster's tiles, "vs", then the opponent's seats hatched: not yet.
 * Football rosters draw the smaller tile so six fit on one line.
 */
export function ChallengeSeats({
  card,
  compact,
}: {
  card: Pick<ChallengeCardView, "sport" | "tiles" | "opponentSeats">;
  compact?: boolean;
}) {
  const m = useMessages();
  const small = compact ?? card.sport === "football";
  const seat = small ? SEAT.small : SEAT.large;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", gap: 4 }}>
        {card.tiles.map((tile) => (
          <InitialsTile
            key={tile.key}
            name={tile.name}
            size={small ? "2xs" : "xs"}
          />
        ))}
      </View>
      <Text size="eyebrow" tone="muted">
        {m.challenge.tab.vs}
      </Text>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {Array.from({ length: card.opponentSeats }, (_, index) => (
          <View key={index} style={{ width: seat, height: seat }}>
            <Hatch radius={small ? radii.slot : radii.sm} />
          </View>
        ))}
      </View>
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

/**
 * Accept beside the venues. With `onPress` it opens the detail with the
 * Accept sheet up; without (the review preview) it is drawn only.
 */
function AcceptMark({ onPress }: { onPress?: () => void }) {
  const m = useMessages();
  const palette = useTonePalette();
  const style = {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    backgroundColor: palette.control,
    justifyContent: "center" as const,
  };
  const label = (
    <Text size="meta" weight="semibold" style={{ color: palette.onControl }}>
      {m.challenge.accept.cta}
    </Text>
  );
  if (!onPress) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={style}
      >
        {label}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [style, { opacity: pressed ? 0.8 : 1 }]}
    >
      {label}
    </Pressable>
  );
}

/**
 * The design card's body: the Team Level letter beside the Team, the seats,
 * days, note, venues with Accept, and the proposals line. In a preview
 * (`card.preview`) Accept is drawn the same and does nothing.
 */
export function ChallengeCardBody({
  card,
  onAccept,
}: {
  card: ChallengeCardView;
  onAccept?: () => void;
}) {
  const palette = useTonePalette();
  return (
    <View style={{ gap: CARD_GAP }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ width: LEVEL_WIDTH }}
        >
          {card.levelBand ? (
            <Text
              size="h1"
              width="expanded"
              ltr
              style={{ lineHeight: typeScale.h1.size }}
            >
              {card.levelBand}
            </Text>
          ) : (
            <View style={{ width: SEAT.large, height: SEAT.large }}>
              <Hatch radius={radii.sm} />
            </View>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text weight="semibold">{card.title}</Text>
          <Text size="meta" tone="muted">
            {card.sportLine}
          </Text>
        </View>
      </View>
      <ChallengeSeats card={card} />
      <View style={{ gap: 6 }}>
        <Text weight="medium">{card.daysLine}</Text>
        {card.slotsLine ? (
          <Text size="meta" tone="muted">
            {card.slotsLine}
          </Text>
        ) : null}
        {card.note ? <Text tone="muted">{card.note}</Text> : null}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <MapPin size={sizes.iconRow - 2} color={palette.muted} />
          <Text size="meta" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
            {card.venuesLine}
          </Text>
        </View>
        {card.canAccept || card.preview ? (
          <AcceptMark
            onPress={card.canAccept && !card.preview ? onAccept : undefined}
          />
        ) : null}
      </View>
      <Text size="eyebrow" tone="muted" style={{ marginTop: -6 }}>
        {card.footerLine}
      </Text>
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
    </View>
  );
}

/** The card on its own hairline frame, for the post form's review. */
export function ChallengeCardPreview({ card }: { card: ChallengeCardView }) {
  return (
    <Surface padded={false} style={{ padding: spacing.compact }}>
      <ChallengeCardBody card={card} />
    </Surface>
  );
}

/** One Challenge in the Open feed; greyed when the viewer has no Team that may propose. */
export function ChallengeCard({
  card,
  onOpen,
  onAccept,
}: {
  card: ChallengeCardView;
  onOpen: (challengeId: string) => void;
  onAccept: (challengeId: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={card.accessibilityLabel}
      onPress={() => onOpen(card.id)}
      style={({ pressed }) => ({
        padding: spacing.compact,
        opacity: card.greyed ? GREYED_OPACITY : pressed ? 0.8 : 1,
      })}
    >
      <ChallengeCardBody card={card} onAccept={() => onAccept(card.id)} />
    </Pressable>
  );
}
