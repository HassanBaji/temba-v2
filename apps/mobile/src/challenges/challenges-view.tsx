import { radii, sizes, spacing, type Palette } from "@repo/design-tokens";
import {
  challengesSegments,
  type ChallengesCounts,
  type ChallengesTab,
} from "@repo/domain/challenges-tab";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { ScreenHeader } from "../primitives/screen-header";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { MineSegment, type MineSegmentProps } from "./mine-segment";
import { OpenSegment, type OpenSegmentProps } from "./open-segment";
import { TeamsSegment, type TeamsSegmentProps } from "./teams-segment";

export type ChallengesViewProps = TeamsSegmentProps & {
  tab: ChallengesTab;
  onTabChange: (tab: ChallengesTab) => void;
  counts: ChallengesCounts;
  open: Omit<OpenSegmentProps, "onGoToTeams">;
  mine: Omit<MineSegmentProps, "onGoToTeams" | "onOpenChallenge">;
};

function segmentBarStyle(colors: Palette) {
  return {
    flexDirection: "row",
    borderRadius: radii.lg,
    borderWidth: hairline,
    borderColor: colors.rule,
    overflow: "hidden",
  } as const;
}

function SegmentBar({
  tab,
  counts,
  onTabChange,
}: Pick<ChallengesViewProps, "tab" | "counts" | "onTabChange">) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={m.challenge.segments.label}
      style={segmentBarStyle(colors)}
    >
      {challengesSegments(counts, locale).map((segment, index) => {
        const selected = segment.key === tab;
        const color = selected ? colors.onControl : colors.muted;
        return (
          <Pressable
            key={segment.key}
            accessibilityRole="tab"
            accessibilityLabel={segment.accessibilityLabel}
            accessibilityState={{ selected }}
            onPress={() => onTabChange(segment.key)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: sizes.touchTarget,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              backgroundColor: selected ? colors.control : colors.paper,
              borderStartWidth: index === 0 ? 0 : hairline,
              borderStartColor: colors.rule,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text weight={selected ? "semibold" : "regular"} style={{ color }}>
              {segment.label}
            </Text>
            {segment.count != null ? (
              <Text style={{ color }}>{segment.count}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChallengesView(props: ChallengesViewProps) {
  const m = useMessages();
  return (
    <View style={{ gap: spacing.compact }}>
      <ScreenHeader title={m.common.challenges} />
      <SegmentBar
        tab={props.tab}
        counts={props.counts}
        onTabChange={props.onTabChange}
      />
      {props.tab === "teams" ? (
        <TeamsSegment {...props} />
      ) : props.tab === "open" ? (
        <OpenSegment
          {...props.open}
          onGoToTeams={() => props.onTabChange("teams")}
        />
      ) : (
        <MineSegment
          {...props.mine}
          onOpenChallenge={props.open.onOpenChallenge}
          onGoToTeams={() => props.onTabChange("teams")}
        />
      )}
    </View>
  );
}
