import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

export function Notice({
  title,
  description,
  alert = false,
  onRetry,
}: {
  title?: string;
  description?: string | null;
  alert?: boolean;
  onRetry?: () => void;
}) {
  const m = useMessages();
  return (
    <Surface accessibilityRole={alert ? "alert" : undefined} style={{ gap: 4 }}>
      {title ? (
        <Text size="lead" weight="semibold">
          {title}
        </Text>
      ) : null}
      {description ? (
        <Text size="meta" tone="muted">
          {description}
        </Text>
      ) : null}
      {onRetry ? (
        <View style={{ flexDirection: "row", marginTop: 8 }}>
          <Button
            label={m.common.tryAgain}
            variant="outline"
            onPress={onRetry}
          />
        </View>
      ) : null}
    </Surface>
  );
}
