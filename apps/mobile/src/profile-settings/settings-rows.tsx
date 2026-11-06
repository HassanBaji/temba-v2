import { radii, sizes } from "@repo/design-tokens";
import { ChevronRight } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, Switch, View, type ColorValue } from "react-native";

import { mirrorInRtl } from "../i18n/rtl";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

const ROW_PADDING = { paddingHorizontal: 16, paddingVertical: 14 } as const;

export type RowIcon = ComponentType<{ size: number; color: ColorValue }>;

/** An eyebrow label over a bordered list of rows. */
export function SettingsGroup({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  const rows = (Array.isArray(children) ? children : [children]).filter(
    Boolean,
  );
  return (
    <View style={{ gap: 10 }}>
      {label ? (
        <Text
          size="eyebrow"
          tone="muted"
          mono
          uppercase
          accessibilityRole="header"
        >
          {label}
        </Text>
      ) : null}
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        {rows.map((row, index) => (
          <View key={index}>
            {index > 0 ? <Hairline /> : null}
            {row}
          </View>
        ))}
      </Surface>
    </View>
  );
}

/** A count in an ink disc, for things waiting on the User. */
export function CountBadge({ count }: { count: number }) {
  const colors = useColors();
  return (
    <SurfaceToneContext.Provider value="ink">
      <View
        style={{
          minWidth: 22,
          height: 22,
          paddingHorizontal: 6,
          borderRadius: 11,
          backgroundColor: colors.control,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text size="eyebrow" weight="semibold">
          {count}
        </Text>
      </View>
    </SurfaceToneContext.Provider>
  );
}

/** A boxed mono word such as VERIFY. */
export function TagBox({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: radii.slot - 1,
        borderWidth: hairline,
        borderColor: colors.ink,
      }}
    >
      <Text size="eyebrow" mono uppercase>
        {label}
      </Text>
    </View>
  );
}

export function SettingsRow({
  icon: Icon,
  leading,
  title,
  sub,
  trailing,
  chevron = true,
  accessibilityLabel,
  onPress,
}: {
  icon?: RowIcon;
  leading?: React.ReactNode;
  title: string;
  sub?: string | null;
  trailing?: React.ReactNode;
  chevron?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
}) {
  const colors = useColors();
  const content = (
    <>
      {leading ??
        (Icon ? <Icon size={sizes.iconAction} color={colors.ink} /> : null)}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold" numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text size="eyebrow" tone="muted" numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {trailing}
      {onPress && chevron ? (
        <ChevronRight
          size={sizes.iconRow}
          color={colors.muted}
          style={mirrorInRtl}
        />
      ) : null}
    </>
  );
  const rowStyle = {
    ...ROW_PADDING,
    minHeight: sizes.touchTarget,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
  };
  if (!onPress) {
    return (
      <View
        accessible
        accessibilityLabel={
          accessibilityLabel ?? [title, sub].filter(Boolean).join(". ")
        }
        style={rowStyle}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? [title, sub].filter(Boolean).join(". ")
      }
      onPress={onPress}
      style={({ pressed }) => ({
        ...rowStyle,
        backgroundColor: pressed ? colors.wash : colors.paper,
      })}
    >
      {content}
    </Pressable>
  );
}

export function SwitchRow({
  icon: Icon,
  title,
  sub,
  value,
  disabled = false,
  onChange,
}: {
  icon?: RowIcon;
  title: string;
  sub?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        ...ROW_PADDING,
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      {Icon ? <Icon size={sizes.iconAction} color={colors.ink} /> : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold">{title}</Text>
        {sub ? (
          <Text size="eyebrow" tone="muted">
            {sub}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.rule, true: colors.ink }}
        thumbColor={value ? colors.paper : colors.onControl}
        ios_backgroundColor={colors.rule}
      />
    </View>
  );
}

/** Full-width segments on a wash track: the selected one is ink. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  disabled = false,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string; sub?: string }[];
  value: T | null;
  disabled?: boolean;
  onSelect: (value: T) => void;
}) {
  const colors = useColors();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        padding: 4,
        gap: 4,
        borderRadius: radii.lg,
        backgroundColor: colors.wash,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <SurfaceToneContext.Provider
            key={option.value}
            value={selected ? "ink" : "paper"}
          >
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={
                option.sub ? `${option.label}, ${option.sub}` : option.label
              }
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => onSelect(option.value)}
              style={{
                flex: 1,
                minHeight: sizes.touchTarget - 4,
                paddingVertical: 6,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.md,
                backgroundColor: selected ? colors.control : undefined,
              }}
            >
              <Text
                size="meta"
                weight="semibold"
                tone={selected ? "default" : "muted"}
              >
                {option.label}
              </Text>
              {option.sub ? (
                <Text size="eyebrow" tone="muted">
                  {option.sub}
                </Text>
              ) : null}
            </Pressable>
          </SurfaceToneContext.Provider>
        );
      })}
    </View>
  );
}
