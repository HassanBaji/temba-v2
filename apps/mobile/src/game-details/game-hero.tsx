import { spacing } from "@repo/design-tokens";
import type { FriendlyGameHeroModel } from "@repo/domain/friendly-game-hero";
import { View } from "react-native";

import { useLightStatusBar } from "../create-game/step-shell";
import { hairline } from "../primitives/hairline-width";
import { ResultMark } from "../primitives/result-mark";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { FigurePair } from "./figure-pair";
import { HeroTopLine } from "./hero-top-line";

const HERO_PADDING_BOTTOM = 22;

function TopLine({
  left,
  right,
  actions,
}: {
  left: string;
  right: string | null;
  actions?: React.ReactNode;
}) {
  return (
    <HeroTopLine
      left={left}
      right={
        right ? (
          <Text size="meta" tone="muted">
            {right}
          </Text>
        ) : null
      }
      actions={actions}
    />
  );
}

function LightStatusBar() {
  useLightStatusBar();
  return null;
}

/** The full-bleed header of Game details: the actions, then the Game. */
export function GameHero({
  model,
  actions,
}: {
  model: FriendlyGameHeroModel;
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
      <HeroBody model={model} actions={actions} />
    </Surface>
  );
}

function HeroBody({
  model,
  actions,
}: {
  model: FriendlyGameHeroModel;
  actions?: React.ReactNode;
}) {
  if (model.kind === "time_unset") {
    return <TopLine left="Time unset" right={null} actions={actions} />;
  }

  if (model.kind === "final") {
    return (
      <View style={{ gap: 12 }}>
        <TopLine left={model.dateLabel} right={model.tag} actions={actions} />
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
      <TopLine
        left={model.leftLabel}
        right={model.statusLabel}
        actions={actions}
      />
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
