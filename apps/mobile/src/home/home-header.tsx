import { homeStateLine } from "@repo/domain/home-state-line";
import { View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";

export function HomeHeader({
  name,
  imageUri,
  pendingInviteCount,
  bookedGameCount,
  ready,
  failed,
}: {
  name: string;
  imageUri: string | null;
  pendingInviteCount: number;
  bookedGameCount: number;
  ready: boolean;
  failed: boolean;
}) {
  const stateLine = ready
    ? homeStateLine(pendingInviteCount, bookedGameCount)
    : null;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Avatar name={name} uri={imageUri} size="lg" />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          size="h2"
          weight="semibold"
          numberOfLines={1}
          accessibilityRole="header"
        >
          {name}
        </Text>
        {stateLine ? (
          <Text size="meta" tone="muted">
            {stateLine}
          </Text>
        ) : ready || failed ? null : (
          <Skeleton width={112} height={12} />
        )}
      </View>
    </View>
  );
}
