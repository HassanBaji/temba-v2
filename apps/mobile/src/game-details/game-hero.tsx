import { spacing } from "@repo/design-tokens";
import type { FriendlyGameHeroModel } from "@repo/domain/friendly-game-hero";
import type { Href } from "expo-router";
import { View } from "react-native";

import { useLightStatusBar } from "../create-game/step-shell";
import { hairline } from "../primitives/hairline-width";
import { ResultMark } from "../primitives/result-mark";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { FigurePair } from "./figure-pair";

const HERO_PADDING_BOTTOM = 22;

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

function LightStatusBar() {
  useLightStatusBar();
  return null;
}

/** The full-bleed header of Game details: back, actions, then the Game. */
export function GameHero({
  model,
  fallback,
  actions,
}: {
  model: FriendlyGameHeroModel;
  fallback: Href;
  actions?: React.ReactNode;
}) {
  return (
    <Surface
      tone={model.tone}
      style={{
        paddingTop: spacing.compact,
        paddingBottom: HERO_PADDING_BOTTOM,
        borderRadius: 0,
        borderWidth: 0,
        borderBottomWidth: model.tone === "paper" ? hairline : 0,
      }}
    >
      {model.tone === "ink" ? <LightStatusBar /> : null}
      <ScreenHeader nav="back" fallback={fallback} actions={actions}>
        <HeroBody model={model} />
      </ScreenHeader>
    </Surface>
  );
}

function HeroBody({ model }: { model: FriendlyGameHeroModel }) {
  if (model.kind === "time_unset") {
    return (
      <Text size="meta" tone="muted">
        Time unset
      </Text>
    );
  }

  if (model.kind === "final") {
    return (
      <View style={{ gap: 12 }}>
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
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
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
    </View>
  );
}
