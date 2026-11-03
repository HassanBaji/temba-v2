import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { useSurfaceTone } from "../primitives/surface-context";

export function InviteEntry({ onPress }: { onPress: () => void }) {
  const onInk = useSurfaceTone() === "ink";
  const m = useMessages();
  return (
    <View style={{ flexDirection: "row" }}>
      <Button
        label={m.invite.door.inviteButton}
        variant={onInk ? "outline-inverse" : "outline"}
        onPress={onPress}
      />
    </View>
  );
}
