import { UserRoundPlus } from "lucide-react-native";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { HeaderIconButton } from "../primitives/screen-header";
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

/** The invite door as a framed icon, for a header's action row. */
export function InviteIconEntry({ onPress }: { onPress: () => void }) {
  return (
    <HeaderIconButton
      framed
      icon={UserRoundPlus}
      accessibilityLabel="Invite players"
      onPress={onPress}
    />
  );
}
