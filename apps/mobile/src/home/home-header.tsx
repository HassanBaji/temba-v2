import { sizes } from "@repo/design-tokens";
import { Bell } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const BADGE = 8;

export function HomeHeader({
  name,
  imageUri,
  pendingInviteCount,
  unreadNotificationCount,
  onNotifications,
}: {
  name: string;
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
      <Text
        size="h2"
        width="expanded"
        weight="bold"
        numberOfLines={1}
        accessibilityRole="header"
        style={{ flex: 1, minWidth: 0 }}
      >
        {name}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onNotifications}
        style={({ pressed }) => ({
          width: sizes.touchTarget,
          height: sizes.touchTarget,
          marginEnd: -10,
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
              top: 11,
              end: 11,
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
