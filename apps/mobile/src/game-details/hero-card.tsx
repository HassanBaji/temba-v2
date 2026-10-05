import {
  friendlyGameHeroModel,
  type FriendlyGameHeroInput,
} from "@repo/domain/friendly-game-hero";
import { View } from "react-native";

import { ResultMark } from "../primitives/result-mark";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { FigurePair } from "./figure-pair";

function TopLine({ left, right }: { left: string; right: string | null }) {
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}
    >
      <Text
        size="meta"
        tone="muted"
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {left}
      </Text>
      {right ? (
        <Text size="meta" tone="muted">
          {right}
        </Text>
      ) : null}
    </View>
  );
}

export function HeroCard({
  input,
  now,
}: {
  input: FriendlyGameHeroInput;
  now: Date;
}) {
  const model = friendlyGameHeroModel(input, now);

  if (!model) {
    return null;
  }

  if (model.kind === "time_unset") {
    return (
      <Surface tone={model.tone}>
        <Text size="meta" tone="muted">
          Time unset
        </Text>
      </Surface>
    );
  }

  if (model.kind === "final") {
    return (
      <Surface tone={model.tone} style={{ gap: 12 }}>
        <TopLine left={model.dateLabel} right={model.tag} />
        {model.verdict && model.verdictWord ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <ResultMark variant={model.verdict} size={32} decorative />
            <Text size="h1Lg" width="expanded" weight="bold">
              {model.verdictWord}
            </Text>
          </View>
        ) : null}
        {model.setLine ? (
          <Text size="meta" tone="muted">
            {model.setLine}
          </Text>
        ) : null}
        <View>
          {model.venueName ? (
            <Text size="lead" weight="semibold">
              {model.venueName}
            </Text>
          ) : null}
          <Text size="meta" tone="muted">
            {model.courtClockLine}
          </Text>
          {model.venueCity ? (
            <Text size="meta" tone="muted">
              {model.venueCity}
            </Text>
          ) : null}
        </View>
        <FigurePair figures={model.figures} />
      </Surface>
    );
  }

  return (
    <Surface tone={model.tone} style={{ gap: 12 }}>
      <TopLine left={model.leftLabel} right={model.statusLabel} />
      {model.partnerName ? (
        <View style={{ gap: 8 }}>
          <Text size="display" width="expanded" weight="bold">
            You and {model.partnerName}
          </Text>
          <Text size="lead">{model.dateLine}</Text>
        </View>
      ) : (
        <View
          accessible
          accessibilityLabel={`${model.kickoffTime} ${model.trailer}`}
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "baseline",
            columnGap: 8,
          }}
        >
          <Text size="heroTime" width="expanded" weight="bold">
            {model.kickoffTime}
          </Text>
          <Text size="title" tone="muted">
            {model.trailer}
          </Text>
        </View>
      )}
      {model.scheduleLine ? (
        <Text size="meta" tone="muted">
          {model.scheduleLine}
        </Text>
      ) : null}
      <FigurePair figures={model.figures} />
    </Surface>
  );
}
