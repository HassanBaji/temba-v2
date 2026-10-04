import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../src/trpc/react";

const WEIGHTS = [
  ["font-archivo-regular", "Regular 400"],
  ["font-archivo-medium", "Medium 500"],
  ["font-archivo-semibold", "SemiBold 600"],
  ["font-archivo-bold", "Bold 700"],
] as const;

export default function Placeholder() {
  const insets = useSafeAreaInsets();
  const invite = api.games.previewInviteLink.useQuery({
    token: "unknown-token",
  });

  return (
    <View
      className="bg-background flex-1 gap-4 px-5"
      style={{ paddingTop: insets.top + 24 }}
    >
      <Text className="text-eyebrow text-muted-foreground font-mono uppercase">
        Temba
      </Text>
      <Text className="font-archivo-expanded text-display text-primary">
        1,234.56
      </Text>
      {WEIGHTS.map(([family, label]) => (
        <Text
          key={family}
          className={`${family} text-body text-primary tabular-nums`}
        >
          {label} 0123456789
        </Text>
      ))}
      <Text className="font-archivo-regular text-meta text-muted-foreground">
        {invite.isPending
          ? "Calling the API…"
          : invite.error
            ? `API error: ${invite.error.message}`
            : `API replied: ${invite.data.status}`}
      </Text>
    </View>
  );
}
