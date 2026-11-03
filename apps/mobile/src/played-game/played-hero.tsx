import { colors, radii, spacing } from "@repo/design-tokens";
import type { PlayedResultLine, PlayedYouLine } from "@repo/domain/played-game";
import type { Href } from "expo-router";
import { MoreVertical, Share } from "lucide-react-native";
import { View } from "react-native";

import { useLightStatusBar } from "../create-game/step-shell";
import { Avatar } from "../primitives/avatar";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { ResultMark } from "../primitives/result-mark";
import { HeaderIconButton, ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

const HERO_PADDING_BOTTOM = 22;
const CONFIRMED_LABEL = "CONFIRMED";

function LightStatusBar() {
  useLightStatusBar();
  return null;
}

/** A small mono tag: solid for a win, outlined otherwise. */
function Pill({ label, solid = false }: { label: string; solid?: boolean }) {
  return (
    <View
      style={{
        borderRadius: radii.slot + 1,
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderWidth: hairline,
        borderColor: solid ? colors.paper : colors.muted,
        backgroundColor: solid ? colors.paper : "transparent",
      }}
    >
      <Text
        size="eyebrow"
        mono
        style={{ color: solid ? colors.ink : colors.paper }}
      >
        {label}
      </Text>
    </View>
  );
}

export type PlayedHeroProps = {
  dateLine: string;
  tag: string | null;
  fallback: Href;
  result: PlayedResultLine;
  venueLine: string | null;
  whenLine: string | null;
  you: PlayedYouLine | null;
  avatar: { name: string; image: string | null } | null;
  onShare: () => void;
  onMore?: () => void;
  children: React.ReactNode;
};

/**
 * The black head of a played Game: the result leads, then where it was and
 * your own line. Join and leave are gone; share and the organizer's menu
 * take their place.
 */
export function PlayedHero({
  dateLine,
  tag,
  fallback,
  result,
  venueLine,
  whenLine,
  you,
  avatar,
  onShare,
  onMore,
  children,
}: PlayedHeroProps) {
  return (
    <Surface
      tone="ink"
      style={{
        paddingTop: spacing.compact,
        paddingBottom: HERO_PADDING_BOTTOM,
        borderRadius: 0,
        borderWidth: 0,
      }}
    >
      <LightStatusBar />
      <ScreenHeader
        nav="back"
        fallback={fallback}
        actions={
          <>
            <HeaderIconButton
              framed
              icon={Share}
              accessibilityLabel="Share result"
              onPress={onShare}
            />
            {onMore ? (
              <HeaderIconButton
                framed
                icon={MoreVertical}
                accessibilityLabel="More"
                onPress={onMore}
              />
            ) : null}
          </>
        }
      >
        <View style={{ gap: 16 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Text
              size="meta"
              tone="muted"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {dateLine}
            </Text>
            {tag ? (
              <Text size="eyebrow" tone="muted" mono>
                {tag}
              </Text>
            ) : null}
          </View>

          {children}

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {result.hasWinner ? (
              <ResultMark variant="won" size={16} decorative />
            ) : null}
            <Text
              weight="semibold"
              numberOfLines={2}
              style={{ flex: 1, minWidth: 0 }}
            >
              {result.line}
            </Text>
            <View
              style={{
                borderRadius: radii.slot + 1,
                paddingVertical: 4,
                paddingHorizontal: 7,
                borderWidth: hairline,
                borderColor: colors.dimrule,
              }}
            >
              <Text size="eyebrow" tone="muted" mono>
                {CONFIRMED_LABEL}
              </Text>
            </View>
          </View>

          {venueLine || whenLine ? (
            <View style={{ marginTop: 6 }}>
              {venueLine ? <Text size="lead">{venueLine}</Text> : null}
              {whenLine ? (
                <Text size="meta" tone="muted">
                  {whenLine}
                </Text>
              ) : null}
            </View>
          ) : null}

          {you ? (
            <View style={{ gap: 16, marginTop: 6 }}>
              <Hairline />
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                {avatar ? (
                  <Avatar name={avatar.name} uri={avatar.image} size="lg" />
                ) : null}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text weight="semibold" numberOfLines={1}>
                    {you.line}
                  </Text>
                  <Text size="meta" tone="muted" numberOfLines={2}>
                    {you.ratingLine}
                  </Text>
                </View>
                <Pill label={you.tag} solid={you.won} />
              </View>
            </View>
          ) : null}
        </View>
      </ScreenHeader>
    </Surface>
  );
}
