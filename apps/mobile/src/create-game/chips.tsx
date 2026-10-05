import { colors, radii, sizes } from "@repo/design-tokens";
import { Check, Minus, Plus } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, View, type ColorValue } from "react-native";

import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { tonePalette } from "../primitives/tone-palette";
import { gridRows } from "./grid-rows";

export type Chip<T extends string | number> = {
  value: T;
  label: string;
  disabled?: boolean;
  accessibilityLabel?: string;
};

type ChipIcon = ComponentType<{ size: number; color: ColorValue }>;

export type ChoiceChipProps = {
  label: string;
  selected?: boolean;
  selection?: "ink" | "soft";
  dashed?: boolean;
  check?: boolean;
  icon?: ChipIcon;
  role?: "radio" | "checkbox" | "button";
  disabled?: boolean;
  dense?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
};

const CHIP_PADDING = 14;
const CHIP_GAP = 8;
const DENSE_CHIP_GAP = 4;
const DISABLED_OPACITY = 0.4;

export function ChoiceChip({
  label,
  selected = false,
  selection = "ink",
  dashed = false,
  check = false,
  icon: Icon,
  role = "button",
  disabled = false,
  dense = false,
  accessibilityLabel,
  onPress,
}: ChoiceChipProps) {
  const ink = selected && selection === "ink";
  const tone = ink ? "ink" : "paper";
  const palette = tonePalette(tone);
  const escape = dashed && !selected;
  const inactive = disabled || !onPress;
  const borderColor = ink
    ? palette.background
    : selected
      ? palette.foreground
      : escape
        ? colors.inputBorder
        : palette.rule;
  const iconColor = escape ? palette.muted : palette.foreground;

  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole={role}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={
          role === "button"
            ? { disabled: inactive, selected }
            : { checked: selected, disabled: inactive }
        }
        disabled={inactive}
        onPress={onPress}
        style={({ pressed }) => ({
          height: sizes.touchTarget,
          paddingHorizontal: dense ? 0 : CHIP_PADDING,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          borderRadius: radii.md,
          borderWidth: hairline,
          borderStyle: escape ? "dashed" : "solid",
          borderColor,
          backgroundColor:
            ink || (!selected && !pressed) ? palette.background : palette.wash,
          opacity: disabled ? DISABLED_OPACITY : 1,
        })}
      >
        {Icon ? <Icon size={sizes.iconRow} color={iconColor} /> : null}
        <Text
          weight={selected ? "semibold" : "regular"}
          tone={escape ? "muted" : "default"}
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {label}
        </Text>
        {selected && check ? (
          <Check size={sizes.iconRow} color={palette.foreground} />
        ) : null}
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

export type ChipEscape = {
  label: string;
  selected?: boolean;
  icon?: ChipIcon;
  accessibilityLabel?: string;
  onPress?: () => void;
};

export function ChipGrid<T extends string | number>({
  label,
  chips,
  isSelected,
  onSelect,
  columns,
  multiple = false,
  selection = "ink",
  check = false,
  dense = false,
  escape,
}: {
  label: string;
  chips: readonly Chip<T>[];
  isSelected: (value: T) => boolean;
  onSelect: (value: T) => void;
  columns?: number;
  multiple?: boolean;
  selection?: "ink" | "soft";
  check?: boolean;
  dense?: boolean;
  escape?: ChipEscape;
}) {
  const gap = dense ? DENSE_CHIP_GAP : CHIP_GAP;
  const cells = [
    ...chips.map((chip) => (
      <ChoiceChip
        key={String(chip.value)}
        label={chip.label}
        accessibilityLabel={chip.accessibilityLabel}
        role={multiple ? "checkbox" : "radio"}
        selected={isSelected(chip.value)}
        selection={selection}
        check={check}
        dense={dense}
        disabled={chip.disabled}
        onPress={() => onSelect(chip.value)}
      />
    )),
    ...(escape
      ? [
          <ChoiceChip
            key="escape"
            dashed
            selected={escape.selected}
            label={escape.label}
            icon={escape.icon}
            accessibilityLabel={escape.accessibilityLabel}
            onPress={escape.onPress}
          />,
        ]
      : []),
  ];

  return (
    <View
      accessibilityRole={multiple ? undefined : "radiogroup"}
      accessibilityLabel={label}
      style={{ gap }}
    >
      {columns ? (
        gridRows(cells, columns).map((row, rowIndex) => (
          <View key={rowIndex} style={{ flexDirection: "row", gap }}>
            {row.map((cell, cellIndex) => (
              <View key={cell?.key ?? `empty-${cellIndex}`} style={{ flex: 1 }}>
                {cell}
              </View>
            ))}
          </View>
        ))
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
          {cells.map((cell) => (
            <View
              key={cell.key}
              style={{ minWidth: sizes.touchTarget, maxWidth: "100%" }}
            >
              {cell}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function Stepper({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  decreaseLabel,
  increaseLabel,
  error,
  hint,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  error?: string;
  hint?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text size="lead" weight="semibold">
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Button
          label={decreaseLabel}
          variant="outline"
          size="icon"
          icon={<Minus size={sizes.iconAction} color={colors.ink} />}
          disabled={value - step < min}
          onPress={() => onChange(value - step)}
        />
        <Text
          size="title"
          weight="semibold"
          accessibilityLiveRegion="polite"
          style={{ minWidth: 96, textAlign: "center" }}
        >
          {`${value} ${unit}`}
        </Text>
        <Button
          label={increaseLabel}
          variant="outline"
          size="icon"
          icon={<Plus size={sizes.iconAction} color={colors.ink} />}
          disabled={value + step > max}
          onPress={() => onChange(value + step)}
        />
      </View>
      {hint ? (
        <Text size="meta" tone="muted">
          {hint}
        </Text>
      ) : null}
      <FieldError message={error} />
    </View>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return (
    <Text size="meta" weight="medium" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}
