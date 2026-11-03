import { radii } from "@repo/design-tokens";
import { LOCALES, LOCALE_LABELS } from "@repo/i18n/locale";
import { Pressable, View } from "react-native";

import { useLocaleSwitch, useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const SEGMENT_HEIGHT = 34;

/** Two segments, each language named in its own language. */
export function LanguageSwitch() {
  const m = useMessages();
  const palette = useTonePalette();
  const { locale, setLocale, restartNeeded } = useLocaleSwitch();

  return (
    <View style={{ alignItems: "flex-start", gap: 6 }}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={m.common.language}
        style={{
          flexDirection: "row",
          borderRadius: radii.md,
          borderWidth: hairline,
          borderColor: palette.rule,
          overflow: "hidden",
        }}
      >
        {LOCALES.map((value, index) => {
          const selected = value === locale;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={LOCALE_LABELS[value]}
              accessibilityState={{ checked: selected }}
              onPress={() => setLocale(value)}
              style={{
                height: SEGMENT_HEIGHT,
                paddingHorizontal: 12,
                justifyContent: "center",
                backgroundColor: selected
                  ? palette.foreground
                  : palette.background,
                borderLeftWidth: index === 0 ? 0 : hairline,
                borderLeftColor: palette.rule,
              }}
            >
              <Text
                size="meta"
                weight={selected ? "semibold" : "regular"}
                style={{
                  color: selected ? palette.background : palette.foreground,
                }}
              >
                {LOCALE_LABELS[value]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {restartNeeded ? (
        <Text size="eyebrow" tone="muted">
          {m.common.restartToApplyLayout}
        </Text>
      ) : null}
    </View>
  );
}
