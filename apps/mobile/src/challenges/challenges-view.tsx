import { radii, sizes } from "@repo/design-tokens";
import {
  challengesSegments,
  type ChallengesCounts,
  type ChallengesTab,
} from "@repo/domain/challenges-tab";
import { Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { ScreenHeader } from "../primitives/screen-header";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { MineSegment, type MineSegmentProps } from "./mine-segment";
import { OpenSegment, type OpenSegmentProps } from "./open-segment";
import { TeamsSegment, type TeamsSegmentProps } from "./teams-segment";

const SEGMENT_GAP = 24;
const UNDERLINE = 2;
const HEADER_GAP = 16;

export type ChallengesViewProps = TeamsSegmentProps & {
  tab: ChallengesTab;
  onTabChange: (tab: ChallengesTab) => void;
  counts: ChallengesCounts;
  open: Omit<OpenSegmentProps, "onGoToTeams">;
  mine: Omit<MineSegmentProps, "onGoToTeams" | "onOpenChallenge">;
};

/** The black square that posts a challenge. */
function PostButton({ onPress }: { onPress: () => void }) {
  const m = useMessages();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.challenge.post.cta}
      onPress={onPress}
      style={({ pressed }) => ({
        width: sizes.touchTarget,
        height: sizes.touchTarget,
        borderRadius: radii.lg,
        backgroundColor: colors.control,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Plus size={sizes.iconAction} color={colors.onControl} />
    </Pressable>
  );
}

/** Open, Mine and Teams with their counts, underlined when picked. */
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
      style={{
        flexDirection: "row",
        gap: SEGMENT_GAP,
        borderBottomWidth: hairline,
        borderBottomColor: colors.rule,
      }}
    >
      {challengesSegments(counts, locale).map((segment) => {
        const selected = segment.key === tab;
        return (
          <Pressable
            key={segment.key}
            accessibilityRole="tab"
            accessibilityLabel={segment.accessibilityLabel}
            accessibilityState={{ selected }}
            onPress={() => onTabChange(segment.key)}
            style={({ pressed }) => ({
              minHeight: sizes.touchTarget,
              flexDirection: "row",
              alignItems: "baseline",
              gap: 6,
              paddingVertical: 12,
              marginBottom: -hairline,
              borderBottomWidth: UNDERLINE,
              borderBottomColor: selected ? colors.ink : "transparent",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              weight={selected ? "semibold" : "regular"}
              tone={selected ? "default" : "muted"}
            >
              {segment.label}
            </Text>
            {segment.count != null ? (
              <Text tone="muted">{segment.count}</Text>
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
    <View style={{ gap: HEADER_GAP }}>
      <ScreenHeader
        title={m.common.challenges}
        actions={<PostButton onPress={props.open.onPost} />}
      />
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
