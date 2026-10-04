import { View } from "react-native";

import { Button } from "../primitives/button";

export function InviteEntry({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ flexDirection: "row" }}>
      <Button label="Invite" variant="outline" onPress={onPress} />
    </View>
  );
}
