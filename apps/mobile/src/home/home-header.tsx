import { sizes } from "@repo/design-tokens";
import { Bell } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const BADGE = 8;

export function HomeHeader({
  name,
  imageUri,
  pendingInviteCount,
  onInvites,
}: {
  name: string;
  imageUri: string | null;
  pendingInviteCount: number;
  onInvites: () => void;
}) {
  const palette = useTonePalette();
  const invites =
    pendingInviteCount === 0
      ? "Invites"
      : `Invites, ${pendingInviteCount} waiting`;

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
        accessibilityLabel={invites}
        onPress={onInvites}
        style={({ pressed }) => ({
          width: sizes.touchTarget,
          height: sizes.touchTarget,
          marginRight: -10,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Bell size={sizes.iconAction} color={palette.foreground} />
        {pendingInviteCount > 0 ? (
          <View
            style={{
              position: "absolute",
              top: 11,
              right: 11,
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
