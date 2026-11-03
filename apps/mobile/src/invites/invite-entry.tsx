import { View } from "react-native";

import { Button } from "../primitives/button";
import { useSurfaceTone } from "../primitives/surface-context";

export function InviteEntry({ onPress }: { onPress: () => void }) {
  const onInk = useSurfaceTone() === "ink";
  return (
    <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
      <Button
        label="Invite"
        variant={onInk ? "outline-inverse" : "outline"}
        onPress={onPress}
      />
    </View>
  );
}
