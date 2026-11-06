import { radii, sizes } from "@repo/design-tokens";
import { Check, ChevronDown, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { SheetMenu, SheetMenuRow } from "../primitives/sheet-menu";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

/** A select field: shows the choice, opens a sheet listing the options. */
export function PickerField<T extends string>({
  label,
  labelHint,
  placeholder,
  icon: Icon,
  options,
  value,
  noneLabel,
  disabled = false,
  onSelect,
}: {
  label: string;
  /** A muted word after the label, such as "(optional)". */
  labelHint?: string;
  placeholder: string;
  icon?: LucideIcon;
  options: { value: T; label: string }[];
  value: T | null;
  /** Offers clearing the choice when given. */
  noneLabel?: string;
  disabled?: boolean;
  onSelect: (value: T | null) => void;
}) {
  const m = useMessages();
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const chosen = options.find((option) => option.value === value) ?? null;

  const pick = (next: T | null) => {
    setOpen(false);
    onSelect(next);
  };

  return (
    <View style={{ gap: 8 }}>
      <Text size="meta" tone="muted">
        {labelHint ? `${label} ${labelHint}` : label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.mobileYou.pickFromList(
          chosen ? `${label}, ${chosen.label}` : label,
        )}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          minHeight: 52,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 14,
          borderRadius: radii.lg,
          borderWidth: hairline,
          borderColor: colors.inputBorder,
          backgroundColor: pressed ? colors.wash : colors.paper,
          opacity: disabled ? 0.5 : 1,
        })}
      >
        {Icon ? <Icon size={sizes.iconRow} color={colors.ink} /> : null}
        <Text
          tone={chosen ? "default" : "muted"}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {chosen?.label ?? placeholder}
        </Text>
        <ChevronDown size={sizes.iconRow} color={colors.muted} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} tall>
        <SheetMenu>
          {[
            ...(noneLabel
              ? [
                  <SheetMenuRow
                    key="none"
                    label={noneLabel}
                    trailing={value === null ? Check : undefined}
                    onPress={() => pick(null)}
                  />,
                ]
              : []),
            ...options.map((option) => (
              <SheetMenuRow
                key={option.value}
                label={option.label}
                trailing={option.value === value ? Check : undefined}
                onPress={() => pick(option.value)}
              />
            )),
          ]}
        </SheetMenu>
      </Sheet>
    </View>
  );
}
