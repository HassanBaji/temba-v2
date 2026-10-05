import { colors, sizes } from "@repo/design-tokens";
import { Minus, Plus } from "lucide-react-native";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Text } from "../primitives/text";

export type Chip<T extends string | number> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export function ChipRow<T extends string | number>({
  label,
  chips,
  isSelected,
  onSelect,
  columns,
}: {
  label: string;
  chips: readonly Chip<T>[];
  isSelected: (value: T) => boolean;
  onSelect: (value: T) => void;
  columns?: number;
}) {
  const basis = columns ? `${Math.floor(100 / columns) - 2}%` : undefined;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
    >
      {chips.map((chip) => (
        <View
          key={String(chip.value)}
          style={
            basis
              ? { width: basis as `${number}%`, flexGrow: 1 }
              : { minWidth: 64 }
          }
        >
          <Button
            label={chip.label}
            size="sm"
            variant={isSelected(chip.value) ? "default" : "outline"}
            selected={isSelected(chip.value)}
            disabled={chip.disabled}
            onPress={() => onSelect(chip.value)}
          />
        </View>
      ))}
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
