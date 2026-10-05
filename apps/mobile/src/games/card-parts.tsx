import { spacing } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

export function CardShell({
  label,
  onPress,
  footer,
  children,
}: {
  label: string;
  onPress: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Surface tone="paper" padded={false} style={{ overflow: "hidden" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <View style={{ padding: spacing.surface, gap: 14 }}>{children}</View>
      </Pressable>
      {footer}
    </Surface>
  );
}

export function CardFooter({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Hairline />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingHorizontal: spacing.surface,
          paddingVertical: 14,
        }}
      >
        {children}
      </View>
    </>
  );
}

export function MetaCell({
  value,
  note,
}: {
  value: string;
  note: string | null;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text size="lead" weight="semibold" numberOfLines={1}>
        {value}
      </Text>
      {note ? (
        <Text size="meta" tone="muted" numberOfLines={1}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

export function CardBand({
  label,
  meta,
}: {
  label: string;
  meta: string | null;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text size="eyebrow" weight="medium" mono uppercase>
        {label}
      </Text>
      {meta ? (
        <Text size="eyebrow" tone="muted" mono uppercase>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}
