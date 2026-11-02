import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import {
  groupNameCounter,
  GROUP_NAME_MAX_LENGTH,
  GROUP_SPORT_SUBLABELS,
  groupVisibilityCopy,
  type GroupVisibility,
} from "@repo/domain/group-settings";
import { SPORT_LABELS, type Sport } from "@repo/domain/sport";
import { Camera, Lock } from "lucide-react-native";
import { Pressable, Switch, View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { initialsFor } from "../primitives/initials";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";

const PHOTO_TILE = 80;
const RADIO = 22;
const RADIO_DOT = 10;
const SEGMENT_HEIGHT = 56;

/** A labelled block of the Group form: eyebrow label over its control. */
export function FormBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text size="meta" tone="muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

export function PhotoTile({
  uri,
  name,
  label,
  onPress,
  disabled = false,
  empty = "camera",
}: {
  uri: string | null;
  name: string;
  /** Under the camera glyph when there is no photo; over the photo otherwise. */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Without a photo: a dashed camera slot, or the Group's initials on ink. */
  empty?: "camera" | "initials";
}) {
  const filled = Boolean(uri) || empty === "initials";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={uri ? `Change photo` : `Add photo`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: PHOTO_TILE,
        height: PHOTO_TILE,
        borderRadius: radii.card,
        overflow: "hidden",
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      {filled ? (
        <View
          style={{
            width: PHOTO_TILE,
            height: PHOTO_TILE,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.ink,
          }}
        >
          {uri ? (
            <Avatar name={name} uri={uri} size="xl" radius={radii.card} />
          ) : (
            <Text
              size="h2"
              weight="semibold"
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{ color: colors.paper }}
            >
              {initialsFor(name)}
            </Text>
          )}
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              paddingVertical: 4,
              alignItems: "center",
              backgroundColor: uri ? colors.ink : colors.dimrule,
            }}
          >
            <Text
              size="eyebrow"
              weight="medium"
              style={{ color: colors.paper }}
            >
              {label}
            </Text>
          </View>
        </View>
      ) : (
        <View
          style={{
            width: PHOTO_TILE,
            height: PHOTO_TILE,
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            borderRadius: radii.card,
            borderWidth: hairline,
            borderColor: colors.inputBorder,
            borderStyle: "dashed",
            backgroundColor: colors.surfaceRaised,
          }}
        >
          <Camera size={sizes.iconAction} color={colors.muted} />
          <Text size="eyebrow" tone="muted">
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function GroupNameField({
  label,
  value,
  onChangeText,
  placeholder,
  help,
  error,
  disabled = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  help?: string;
  error?: string | null;
  disabled?: boolean;
}) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        error={error ?? undefined}
        maxLength={GROUP_NAME_MAX_LENGTH}
        editable={!disabled}
        autoCapitalize="words"
        returnKeyType="done"
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="eyebrow" tone="muted" style={{ flexShrink: 1 }}>
          {help ?? ""}
        </Text>
        <Text
          size="eyebrow"
          tone="muted"
          mono
          accessibilityLabel={`${value.length} of ${GROUP_NAME_MAX_LENGTH} characters`}
        >
          {groupNameCounter(value)}
        </Text>
      </View>
    </View>
  );
}

/** Two equal cells, the picked one in ink, each with its format under it. */
export function SportSegment({
  sports,
  value,
  onSelect,
  disabled = false,
}: {
  sports: readonly Sport[];
  value: Sport;
  onSelect: (sport: Sport) => void;
  disabled?: boolean;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: "row",
        height: SEGMENT_HEIGHT,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.rule,
        overflow: "hidden",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {sports.map((sport, index) => {
        const selected = sport === value;
        return (
          <Pressable
            key={sport}
            accessibilityRole="radio"
            accessibilityLabel={`${SPORT_LABELS[sport]}, ${GROUP_SPORT_SUBLABELS[sport]}`}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onSelect(sport)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              borderLeftWidth: index > 0 ? hairline : 0,
              borderColor: colors.rule,
              backgroundColor: selected
                ? colors.ink
                : pressed
                  ? colors.wash
                  : colors.paper,
            })}
          >
            <Text
              weight="semibold"
              style={{ color: selected ? colors.paper : colors.ink }}
            >
              {SPORT_LABELS[sport]}
            </Text>
            <Text
              size="eyebrow"
              style={{ color: selected ? colors.dim : colors.muted }}
            >
              {GROUP_SPORT_SUBLABELS[sport]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LockedSportCard({
  sport,
  help,
}: {
  sport: Sport | null;
  help: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`Sport ${sport ? SPORT_LABELS[sport] : "not set"}. ${help}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: colors.wash,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold">{sport ? SPORT_LABELS[sport] : "Not set"}</Text>
        <Text size="eyebrow" tone="muted">
          {help}
        </Text>
      </View>
      <Lock size={sizes.iconRow} color={colors.muted} />
    </View>
  );
}

function RadioMark({ selected }: { selected: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{
        width: RADIO,
        height: RADIO,
        borderRadius: RADIO / 2,
        borderWidth: selected ? 2 : hairline,
        borderColor: selected ? colors.ink : colors.inputBorder,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {selected ? (
        <View
          style={{
            width: RADIO_DOT,
            height: RADIO_DOT,
            borderRadius: RADIO_DOT / 2,
            backgroundColor: colors.ink,
          }}
        />
      ) : null}
    </View>
  );
}

export function RadioRow({
  title,
  description,
  selected,
  onPress,
  disabled = false,
  leading,
}: {
  title: string;
  description?: string | null;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  leading?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={description ? `${title}, ${description}` : title}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 14,
        backgroundColor: pressed ? colors.wash : colors.paper,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold">{title}</Text>
        {description ? (
          <Text size="eyebrow" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <RadioMark selected={selected} />
    </Pressable>
  );
}

export function VisibilityCards({
  context,
  value,
  onSelect,
  disabled = false,
}: {
  context: "loose" | "club";
  value: GroupVisibility;
  onSelect: (value: GroupVisibility) => void;
  disabled?: boolean;
}) {
  const copy = groupVisibilityCopy(context);
  return (
    <Surface
      accessibilityRole="radiogroup"
      padded={false}
      radius="card"
      style={{ overflow: "hidden" }}
    >
      <RadioRow
        title={copy.public.title}
        description={copy.public.description}
        selected={value === "public"}
        disabled={disabled}
        onPress={() => onSelect("public")}
      />
      <Hairline />
      <RadioRow
        title={copy.private.title}
        description={copy.private.description}
        selected={value === "private"}
        disabled={disabled}
        onPress={() => onSelect("private")}
      />
    </Surface>
  );
}

/** The Joining card: a labelled switch with the policy stated under it. */
export function ToggleCard({
  title,
  help,
  footer,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  help: string;
  footer: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          paddingHorizontal: 18,
          paddingVertical: 14,
        }}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text weight="semibold">{title}</Text>
          <Text size="eyebrow" tone="muted">
            {help}
          </Text>
        </View>
        <Switch
          accessibilityLabel={title}
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ true: colors.ink, false: colors.rule }}
          thumbColor={colors.paper}
          ios_backgroundColor={colors.rule}
        />
      </View>
      <Hairline />
      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 12,
          backgroundColor: colors.wash,
        }}
      >
        <Text size="eyebrow" tone="muted">
          {footer}
        </Text>
      </View>
    </Surface>
  );
}

export const FORM_GAP = spacing.compact;
