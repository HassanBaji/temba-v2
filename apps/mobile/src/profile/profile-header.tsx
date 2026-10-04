import { playingSinceLine } from "@repo/domain/profile-all-time";
import {
  preferredPositionProfileLine,
  type PreferredPosition,
} from "@repo/domain/preferred-position";
import { View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Text } from "../primitives/text";

export function ProfileHeader({
  name,
  imageUri,
  position,
  firstMatchAt,
  changingPhoto,
  onChangePhoto,
}: {
  name: string;
  imageUri: string | null;
  position: PreferredPosition | null;
  firstMatchAt: Date | string | null;
  changingPhoto: boolean;
  onChangePhoto: () => void;
}) {
  const lines = [
    preferredPositionProfileLine(position),
    playingSinceLine(firstMatchAt),
  ].filter((line): line is string => line != null);

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Avatar name={name} uri={imageUri} size="xl" />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            size="h2"
            weight="semibold"
            numberOfLines={1}
            accessibilityRole="header"
          >
            {name}
          </Text>
          {lines.map((line) => (
            <Text key={line} size="meta" tone="muted" numberOfLines={1}>
              {line}
            </Text>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row" }}>
        <Button
          label={imageUri ? "Edit profile photo" : "Add profile photo"}
          variant="outline"
          pending={changingPhoto}
          onPress={onChangePhoto}
        />
      </View>
    </View>
  );
}
