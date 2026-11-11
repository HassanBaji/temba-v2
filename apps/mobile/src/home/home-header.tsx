import { radii, sizes } from "@repo/design-tokens";
import { Bell } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const BADGE = 8;

export function HomeHeader({
  name,
  dateLine,
  imageUri,
  pendingInviteCount,
  unreadNotificationCount,
  onNotifications,
}: {
  name: string;
  dateLine: string;
  imageUri: string | null;
  pendingInviteCount: number;
  unreadNotificationCount: number;
  onNotifications: () => void;
}) {
  const m = useMessages();
  const palette = useTonePalette();
  const showBadge = pendingInviteCount > 0 || unreadNotificationCount > 0;
  const label = showBadge
    ? m.mobileHome.header.notificationsUnread
    : m.common.notifications;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Avatar name={name} uri={imageUri} size="lg" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {dateLine}
        </Text>
        <Text
          size="h2"
          width="expanded"
          weight="bold"
          numberOfLines={1}
          accessibilityRole="header"
        >
          {name}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onNotifications}
        style={({ pressed }) => ({
          width: sizes.touchTarget,
          height: sizes.touchTarget,
          borderRadius: radii.lg,
          borderWidth: hairline,
          borderColor: palette.rule,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Bell size={sizes.iconAction} color={palette.foreground} />
        {showBadge ? (
          <View
            style={{
              position: "absolute",
              top: 10,
              end: 10,
              width: BADGE,
              height: BADGE,
              borderRadius: BADGE / 2,
              borderWidth: 1.5,
              borderColor: palette.background,
              backgroundColor: palette.foreground,
            }}
          />
        ) : null}
      </Pressable>
    </View>
  );
}
