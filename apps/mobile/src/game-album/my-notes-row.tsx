import { radii, sizes } from "@repo/design-tokens";
import { ChevronRight, NotebookPen } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

/** The profile's way into Your notes. */
export function MyNotesRow({ onOpen }: { onOpen: () => void }) {
  const colors = useColors();
  const m = useMessages().gameAlbum.myNotes;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${m.entry}. ${m.entryHint}`}
      onPress={onOpen}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: pressed ? colors.wash : colors.paper,
      })}
    >
      <NotebookPen size={sizes.iconAction} color={colors.ink} />
      <View style={{ flex: 1 }}>
        <Text weight="semibold">{m.entry}</Text>
        <Text size="eyebrow" tone="muted">
          {m.entryHint}
        </Text>
      </View>
      <ChevronRight
        size={sizes.iconAction}
        color={colors.muted}
        style={mirrorInRtl}
      />
    </Pressable>
  );
}
