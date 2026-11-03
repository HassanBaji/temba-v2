import { bibColors, colors, radii } from "@repo/design-tokens";
import type { FootballBib } from "@repo/domain/football-lineup";
import type {
  PlayedFootballSide,
  PlayedScorer,
} from "@repo/domain/played-game";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";

const CHIP = 14;

/** A bib square as it reads on ink: a black bib gets a dim edge. */
function InkBibChip({ bib }: { bib: FootballBib }) {
  const { fill } = bibColors[bib];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: CHIP,
        height: CHIP,
        borderRadius: radii.slot - 1,
        backgroundColor: fill,
        borderWidth: hairline,
        borderColor: fill === colors.ink ? colors.dim : fill,
      }}
    />
  );
}

function SideName({
  side,
  align,
}: {
  side: PlayedFootballSide;
  align: "left" | "right";
}) {
  const right = align === "right";
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        gap: 4,
        alignItems: right ? "flex-end" : "flex-start",
      }}
    >
      <View
        style={{
          flexDirection: right ? "row-reverse" : "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <InkBibChip bib={side.bib} />
        <Text weight="semibold" numberOfLines={1}>
          {side.name}
        </Text>
      </View>
      <Text size="meta" tone="muted">
        {side.average}
      </Text>
    </View>
  );
}

function ScorerList({
  scorers,
  align,
}: {
  scorers: PlayedScorer[];
  align: "left" | "right";
}) {
  const right = align === "right";
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        gap: 6,
        alignItems: right ? "flex-end" : "flex-start",
      }}
    >
      {scorers.map((scorer) => (
        <View
          key={scorer.userId}
          style={{
            flexDirection: right ? "row-reverse" : "row",
            alignItems: "baseline",
            gap: 8,
            maxWidth: "100%",
          }}
        >
          <Text
            size="meta"
            weight={scorer.isYou ? "semibold" : "regular"}
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {scorer.name}
          </Text>
          <Text size="eyebrow" tone="muted" mono>
            {scorer.count}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Both teams' goals, the winner in full ink, then who scored them. */
export function PlayedFootballBoard({
  sides,
  hasWinner,
  scorers,
}: {
  sides: [PlayedFootballSide, PlayedFootballSide];
  hasWinner: boolean;
  scorers: { a: PlayedScorer[]; b: PlayedScorer[] } | null;
}) {
  const m = useMessages();
  const [a, b] = sides;
  const ink = (side: PlayedFootballSide) =>
    side.won || !hasWinner ? colors.paper : colors.muted;
  return (
    <View style={{ gap: 18 }}>
      <View
        accessible
        accessibilityLabel={m.mobilePlayer.played.scoreSpoken(
          a.name,
          a.score,
          b.name,
          b.score,
        )}
        style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      >
        <SideName side={a} align="left" />
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Text
            size="heroTime"
            width="expanded"
            weight="bold"
            style={{ color: ink(a) }}
          >
            {String(a.score)}
          </Text>
          <Text size="h2" tone="muted">
            –
          </Text>
          <Text
            size="heroTime"
            width="expanded"
            weight="bold"
            style={{ color: ink(b) }}
          >
            {String(b.score)}
          </Text>
        </View>
        <SideName side={b} align="right" />
      </View>
      {scorers ? (
        <View
          style={{
            flexDirection: "row",
            gap: 16,
            paddingTop: 16,
            borderTopWidth: hairline,
            borderTopColor: colors.dimrule,
          }}
        >
          <ScorerList scorers={scorers.a} align="left" />
          <ScorerList scorers={scorers.b} align="right" />
        </View>
      ) : null}
    </View>
  );
}
