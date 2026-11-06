import { sizes } from "@repo/design-tokens";
import { X } from "lucide-react-native";
import { useEffect } from "react";
import { AccessibilityInfo, Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { savedLevelText, type SavedLevel } from "./set-level-model";

export function SavedLevelBanner({
  saved,
  onDismiss,
}: {
  saved: SavedLevel;
  onDismiss: () => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const colors = useColors();
  const text = savedLevelText(saved, locale);
  const spoken = [text.headline, text.reason].filter(Boolean).join(" ");

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(spoken);
  }, [spoken]);

  return (
    <Surface
      tone="ink"
      radius="card"
      accessibilityLiveRegion="polite"
      style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight="semibold">{text.headline}</Text>
        {text.reason ? <Text>{text.reason}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.mobileGroup.setLevel.dismiss}
        hitSlop={sizes.touchTarget / 4}
        onPress={onDismiss}
        style={{
          width: sizes.touchTarget,
          height: sizes.touchTarget,
          margin: -12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={sizes.iconAction} color={colors.onFocus} />
      </Pressable>
    </Surface>
  );
}
