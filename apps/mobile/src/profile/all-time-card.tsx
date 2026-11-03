import { spacing } from "@repo/design-tokens";
import {
  profileAllTimeView,
  type ProfileAllTimeInput,
} from "@repo/domain/profile-all-time";
import { View } from "react-native";

import { Card } from "../home/card";
import { Hairline } from "../primitives/hairline";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { MountFill } from "../primitives/mount-fill";
import { Text } from "../primitives/text";

function StatRow({ label, value }: { label: string; value: string }) {
  const m = useMessages();
  return (
    <View
      accessible
      accessibilityLabel={m.mobileHome.join.labelValue(label, value)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingHorizontal: spacing.surface,
        paddingVertical: 14,
      }}
    >
      <Text size="meta" tone="muted">
        {label}
      </Text>
      <Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
        {value}
      </Text>
    </View>
  );
}

export function ProfileAllTimeCard({ input }: { input: ProfileAllTimeInput }) {
  const m = useMessages();
  const locale = useLocale();
  const view = profileAllTimeView(input, locale);

  return (
    <Card title={m.profile.player.allTime} meta={view.sinceLabel ?? undefined}>
      <View
        style={{
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
          gap: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View
            accessible
            accessibilityLabel={m.mobileHome.allTime.matchesSpoken(
              view.matchesPlayed,
            )}
            style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
          >
            <Text size="statTotal" width="expanded" weight="bold">
              {view.matchesPlayed}
            </Text>
            <Text size="meta" tone="muted">
              {m.mobileHome.allTime.matches}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <Text size="figure" width="expanded" weight="bold">
              {view.record}
            </Text>
            {view.winRatePercent != null ? (
              <Text size="meta" tone="muted">
                {m.mobileHome.allTime.percentWon(view.winRatePercent)}
              </Text>
            ) : null}
          </View>
        </View>
        <MountFill percent={view.winRatePercent ?? 0} />
      </View>
      <Hairline />
      <StatRow label={m.profile.allTime.sets} value={view.sets} />
      <Hairline />
      <StatRow
        label={m.mobileHome.allTime.longestStreak}
        value={view.longestStreak}
      />
      <Hairline />
      <StatRow
        label={m.profile.allTime.mostPlayedPartner}
        value={view.mostPlayedPartner}
      />
    </Card>
  );
}
