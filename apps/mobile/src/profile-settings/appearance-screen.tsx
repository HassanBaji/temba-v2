import {
  invertedFocusPalettes,
  radii,
  type ColorScheme,
  type Palette,
} from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Text } from "../primitives/text";
import { APPEARANCES, type Appearance } from "../theme/appearance";
import { useAppearance, useColors } from "../theme/theme-provider";
import { SettingsGroup } from "./settings-rows";

const RADIO = 22;
const PREVIEW_MARKS = [false, true, true, false, true, true, false, true];

/** A miniature of one scheme, drawn from that scheme's palette whatever is on. */
function SchemePreview({ scheme }: { scheme: ColorScheme }) {
  const c: Palette = invertedFocusPalettes[scheme];
  const bar = (width: number, color: string) => (
    <View
      style={{ width, height: 6, borderRadius: 3, backgroundColor: color }}
    />
  );
  const field = (
    <View
      style={{
        height: 22,
        borderRadius: radii.slot,
        borderWidth: hairline,
        borderColor: c.rule,
        backgroundColor: c.paper,
      }}
    />
  );
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radii.lg,
        overflow: "hidden",
        borderWidth: hairline,
        borderColor: scheme === "dark" ? c.dimrule : c.rule,
        backgroundColor: c.paper,
      }}
    >
      <View
        style={{
          height: 74,
          padding: 12,
          gap: 6,
          backgroundColor: c.focus,
          borderBottomWidth: hairline,
          borderBottomColor: c.focusEdge,
        }}
      >
        {bar(54, c.onFocus)}
        {bar(84, c.dim)}
      </View>
      <View
        style={{
          padding: 12,
          gap: 8,
          backgroundColor: scheme === "dark" ? c.paper : c.wash,
        }}
      >
        {field}
        {field}
        <View style={{ flexDirection: "row", gap: 4 }}>
          {PREVIEW_MARKS.map((won, index) => (
            <View
              key={index}
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: c.ink,
                backgroundColor: won ? c.ink : "transparent",
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function AppearanceRow({
  title,
  hint,
  selected,
  onPress,
}: {
  title: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${hint}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? colors.wash : colors.paper,
      })}
    >
      <View
        style={{
          width: RADIO,
          height: RADIO,
          borderRadius: RADIO / 2,
          borderWidth: 2,
          borderColor: selected ? colors.ink : colors.inputBorder,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected ? (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.ink,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold">{title}</Text>
        <Text size="eyebrow" tone="muted">
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

export function AppearanceScreen() {
  const m = useMessages();
  const copy = m.you.settings.appearance;
  const { appearance, setAppearance } = useAppearance();
  const options: Record<Appearance, { title: string; hint: string }> = {
    system: { title: copy.system, hint: copy.systemHint },
    light: { title: copy.light, hint: copy.lightHint },
    dark: { title: copy.dark, hint: copy.darkHint },
  };

  return (
    <Screen>
      <ScreenHeader
        nav="back"
        fallback="/profile/settings"
        title={copy.title}
      />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: "row", gap: 12 }}
      >
        <SchemePreview scheme="light" />
        <SchemePreview scheme="dark" />
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel={copy.title}>
        <SettingsGroup>
          {APPEARANCES.map((option) => (
            <AppearanceRow
              key={option}
              title={options[option].title}
              hint={options[option].hint}
              selected={appearance === option}
              onPress={() => setAppearance(option)}
            />
          ))}
        </SettingsGroup>
      </View>
      <Text size="meta" tone="muted">
        {copy.shareNote}
      </Text>
    </Screen>
  );
}
