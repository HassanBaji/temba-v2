import { radii, sizes } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { SurfaceToneContext } from "../primitives/surface-context";
import { tonePalette } from "../primitives/tone-palette";
import { Text } from "../primitives/text";

function ChoiceSurface(props: {
  selected: boolean;
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
  style?: object;
  children: React.ReactNode;
}) {
  const tone = props.selected ? "ink" : "paper";
  const palette = tonePalette(tone);
  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={props.accessibilityLabel}
        accessibilityState={{
          checked: props.selected,
          disabled: props.disabled,
        }}
        disabled={props.disabled}
        onPress={props.onPress}
        style={({ pressed }) => [
          {
            minHeight: sizes.touchTarget,
            borderWidth: hairline,
            borderColor: props.selected ? palette.background : palette.rule,
            backgroundColor:
              pressed && !props.selected ? palette.wash : palette.background,
            opacity: props.disabled ? 0.5 : 1,
          },
          props.style,
        ]}
      >
        {props.children}
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

/** Equal-width tiles with a name and a short line under it, such as Left / backhand side. */
export function TileChoices<T extends string>(props: {
  label: string;
  choices: { value: T; name: string; detail?: string; mono?: boolean }[];
  value: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={props.label}
      style={{ flexDirection: "row", gap: 8 }}
    >
      {props.choices.map((choice) => (
        <ChoiceSurface
          key={choice.value}
          selected={choice.value === props.value}
          accessibilityLabel={
            choice.detail ? `${choice.name}, ${choice.detail}` : choice.name
          }
          disabled={props.disabled}
          onPress={() => props.onSelect(choice.value)}
          style={{
            flex: 1,
            minHeight: 52,
            borderRadius: radii.lg,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 8,
            gap: 2,
          }}
        >
          <Text
            size={choice.mono ? "meta" : "body"}
            weight={choice.mono ? "regular" : "semibold"}
            mono={choice.mono}
          >
            {choice.name}
          </Text>
          {choice.detail ? (
            <Text size="eyebrow" tone="muted">
              {choice.detail}
            </Text>
          ) : null}
        </ChoiceSurface>
      ))}
    </View>
  );
}

/** A compact list row: a bold mark, a name, and a short line under it. */
export function RowChoices<T extends string>(props: {
  label: string;
  choices: { value: T; mark?: string; name: string; detail: string }[];
  value: T | "";
  onSelect: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={props.label}
      style={{ gap: 6 }}
    >
      {props.choices.map((choice) => (
        <ChoiceSurface
          key={choice.value}
          selected={choice.value === props.value}
          accessibilityLabel={[choice.mark, choice.name, choice.detail]
            .filter(Boolean)
            .join(", ")}
          disabled={props.disabled}
          onPress={() => props.onSelect(choice.value)}
          style={{
            borderRadius: radii.md,
            paddingHorizontal: 14,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          {choice.mark ? (
            <Text
              size="title"
              weight="bold"
              width="expanded"
              style={{ width: 34 }}
            >
              {choice.mark}
            </Text>
          ) : null}
          <View style={{ flex: 1, gap: 1 }}>
            <Text size="meta" weight="semibold">
              {choice.name}
            </Text>
            <Text size="eyebrow" tone="muted">
              {choice.detail}
            </Text>
          </View>
        </ChoiceSurface>
      ))}
    </View>
  );
}
