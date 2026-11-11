import { sizes, spacing } from "@repo/design-tokens";
import {
  homeStandingRowView,
  standingSplit,
  type HomeStandingRow,
} from "@repo/domain/home-standing";
import { ArrowRight } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import type { HomeNavTarget } from "./home-target";
import { SectionTitle } from "./section-title";

const ARROW_ICON = 16;

export function StandingCard({
  rows,
  onNavigate,
}: {
  rows: readonly HomeStandingRow[];
  onNavigate: (target: HomeNavTarget) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const palette = useTonePalette();
  const { counted, uncounted, total } = standingSplit(rows);
  if (counted.length === 0) {
    return null;
  }
  const copy = m.home.standingSection;

  return (
    <View style={{ gap: 12 }}>
      <SectionTitle
        title={m.mobileHome.standing.title}
        meta={copy.groupsOf(counted.length, total)}
      />
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        {counted.map((row, index) => {
          const view = homeStandingRowView(row, locale);
          return (
            <View key={row.groupId}>
              {index === 0 ? null : <Hairline />}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={m.mobileHome.standing.rowSpoken(
                  view.groupName,
                  view.rank,
                  view.ofCount,
                )}
                onPress={() =>
                  onNavigate({ kind: "group", groupId: row.groupId })
                }
                style={({ pressed }) => ({
                  minHeight: sizes.touchTarget + 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: spacing.compact,
                  paddingVertical: 12,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text weight="semibold" numberOfLines={1}>
                    {view.groupName}
                  </Text>
                  {row.countedGames != null ? (
                    <Text size="eyebrow" tone="muted" numberOfLines={1}>
                      {copy.countedGames(row.countedGames)}
                    </Text>
                  ) : null}
                </View>
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    gap: 4,
                  }}
                >
                  <Text size="title" width="expanded" weight="bold">
                    {view.rank}
                  </Text>
                  <Text size="meta" tone="muted">
                    {copy.of(row.memberCount)}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })}
        {uncounted > 0 ? (
          <>
            <Hairline />
            <Pressable
              accessibilityRole="link"
              onPress={() => onNavigate({ kind: "groups" })}
              style={({ pressed }) => ({
                minHeight: sizes.touchTarget + 4,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                paddingHorizontal: spacing.compact,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text size="meta" tone="muted" numberOfLines={1}>
                {copy.moreGroups(uncounted)}
              </Text>
              <ArrowRight
                size={ARROW_ICON}
                color={palette.foreground}
                style={mirrorInRtl}
              />
            </Pressable>
          </>
        ) : null}
      </Surface>
    </View>
  );
}
