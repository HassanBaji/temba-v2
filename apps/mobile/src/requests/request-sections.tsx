import { sizes } from "@repo/design-tokens";
import { ArrowRight } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { mirrorInRtl } from "../i18n/rtl";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const ARROW_ICON = 16;
export const REQUESTS_HEADING_GAP = 10;

/** The last row of a request list that leads on: `Next: … All →`, `2 more requests →`. */
export function RequestLinkRow({
  lead,
  label,
  accessibilityLabel,
  onPress,
}: {
  lead?: string | null;
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const palette = useTonePalette();
  const action = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      {lead ? <Text weight="semibold">{label}</Text> : null}
      <ArrowRight
        size={ARROW_ICON}
        color={palette.foreground}
        style={mirrorInRtl}
      />
    </View>
  );
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={
        accessibilityLabel ?? (lead ? `${lead}, ${label}` : label)
      }
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget + 4,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingHorizontal: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {lead ? (
        <Text
          size="meta"
          tone="muted"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {lead}
        </Text>
      ) : (
        <Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
          {label}
        </Text>
      )}
      {action}
    </Pressable>
  );
}

export function RequestsFootnote({ children }: { children: string }) {
  return (
    <Text size="eyebrow" tone="muted">
      {children}
    </Text>
  );
}
