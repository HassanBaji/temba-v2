import { radii } from "@repo/design-tokens";
import { Pencil, Settings } from "lucide-react-native";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { InitialsTile } from "../primitives/initials-tile";
import { HeaderIconButton, ScreenHeader } from "../primitives/screen-header";
import { Text } from "../primitives/text";

export function ProfileHeader({
  name,
  imageUri,
  line,
  onEdit,
  onSettings,
}: {
  name: string;
  imageUri: string | null;
  line: string | null;
  onEdit: () => void;
  onSettings: () => void;
}) {
  const m = useMessages();
  return (
    <ScreenHeader
      title={m.you.header.title}
      actions={
        <>
          <HeaderIconButton
            icon={Pencil}
            accessibilityLabel={m.you.header.edit}
            onPress={onEdit}
          />
          <HeaderIconButton
            icon={Settings}
            accessibilityLabel={m.you.header.settings}
            onPress={onSettings}
          />
        </>
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        {imageUri ? (
          <Avatar name={name} uri={imageUri} size="court" radius={radii.md} />
        ) : (
          <InitialsTile name={name} size="lg" />
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text size="h2" weight="semibold" numberOfLines={1}>
            {name}
          </Text>
          {line ? (
            <Text size="meta" tone="muted" numberOfLines={1}>
              {line}
            </Text>
          ) : null}
        </View>
      </View>
    </ScreenHeader>
  );
}
