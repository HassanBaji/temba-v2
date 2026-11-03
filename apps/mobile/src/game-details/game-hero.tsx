import { radii, spacing } from "@repo/design-tokens";
import type { FriendlyGameHeroModel } from "@repo/domain/friendly-game-hero";
import type { CourtFigure } from "@repo/domain/friendly-game-court";
import { MoreVertical, Navigation, Share } from "lucide-react-native";
import { View } from "react-native";

import { useLightStatusBar } from "../create-game/step-shell";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { ResultMark } from "../primitives/result-mark";
import { HeaderIconButton, ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { FigurePair } from "./figure-pair";
import { HeroTopLine } from "./hero-top-line";

const HERO_PADDING_BOTTOM = 22;
const HERO_GAP = 14;
const GAMES_FALLBACK = "/games";

export type GameHeroPlace = {
  name: string | null;
  line: string | null;
  onDirections: (() => void) | null;
};

function LightStatusBar() {
  useLightStatusBar();
  return null;
}

/** The countdown tag: outlined while the Game is ahead, solid once it has started. */
function StatusPill({ label, solid }: { label: string; solid: boolean }) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        borderRadius: radii.surface,
        paddingVertical: 3,
        paddingHorizontal: 9,
        borderWidth: hairline,
        borderColor: solid ? palette.foreground : palette.rule,
        backgroundColor: solid ? palette.foreground : "transparent",
      }}
    >
      <Text
        size="eyebrow"
        weight={solid ? "semibold" : "regular"}
        style={{ color: solid ? palette.background : palette.foreground }}
      >
        {label}
      </Text>
    </View>
  );
}

function PlaceRow({ place }: { place: GameHeroPlace }) {
  const palette = useTonePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {place.name ? (
          <Text weight="semibold" numberOfLines={1}>
            {place.name}
          </Text>
        ) : null}
        {place.line ? (
          <Text size="meta" tone="muted" numberOfLines={1}>
            {place.line}
          </Text>
        ) : null}
      </View>
      {place.onDirections ? (
        <Button
          label="Directions"
          accessibilityLabel={
            place.name ? `Directions to ${place.name}` : "Directions"
          }
          variant="outline-inverse"
          size="sm"
          icon={<Navigation size={14} color={palette.foreground} />}
          onPress={place.onDirections}
        />
      ) : null}
    </View>
  );
}

function Figures({ figures }: { figures: CourtFigure[] }) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        borderTopWidth: hairline,
        borderTopColor: palette.rule,
        paddingTop: 16,
      }}
    >
      <FigurePair figures={figures} />
    </View>
  );
}

/**
 * The full-bleed head of Game details: back and the Game's actions, when it
 * is, where, and how full the court is.
 */
export function GameHero({
  model,
  place,
  figures,
  onShare,
  onMore,
}: {
  model: FriendlyGameHeroModel;
  place: GameHeroPlace | null;
  figures: CourtFigure[];
  onShare?: () => void;
  onMore?: () => void;
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
      <View style={{ gap: HERO_GAP }}>
        <ScreenHeader
          nav="back"
          fallback={GAMES_FALLBACK}
          actions={
            onShare || onMore ? (
              <>
                {onShare ? (
                  <HeaderIconButton
                    framed
                    icon={Share}
                    accessibilityLabel="Share Game"
                    onPress={onShare}
                  />
                ) : null}
                {onMore ? (
                  <HeaderIconButton
                    framed
                    icon={MoreVertical}
                    accessibilityLabel="Game actions"
                    onPress={onMore}
                  />
                ) : null}
              </>
            ) : undefined
          }
        />
        <HeroBody model={model} />
        {model.kind !== "final" && place && (place.name || place.line) ? (
          <PlaceRow place={place} />
        ) : null}
        {model.kind !== "final" ? <Figures figures={figures} /> : null}
      </View>
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
        <HeroTopLine
          left={model.dateLabel}
          right={
            <Text size="meta" tone="muted">
              {model.tag}
            </Text>
          }
        />
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
    <View style={{ gap: HERO_GAP }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text
          size="meta"
          tone="muted"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {model.leftLabel}
        </Text>
        {model.statusLabel ? (
          <StatusPill
            label={model.statusLabel}
            solid={model.phase !== "upcoming"}
          />
        ) : null}
      </View>
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
            columnGap: 10,
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
    </View>
  );
}
