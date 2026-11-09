import { radii, typeScale } from "@repo/design-tokens";
import { initials } from "@repo/domain/initials";
import type { Sport } from "@repo/domain/sport";
import {
  teamSportChoices,
  type TeamRosterDraftView,
} from "@repo/domain/team-roster-draft";
import { Camera, Phone, Plus, Search, Users, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { isLayoutRtl } from "../i18n/rtl";
import { CachedImage } from "../primitives/cached-image";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { inputDirectionStyle } from "../primitives/text-direction";
import { inputType } from "../primitives/text-field";
import { useColors } from "../theme/theme-provider";
import {
  CreateTeamCard,
  CreateTeamSection,
  CreateTeamSeatStrip,
  CreateTeamTile,
} from "./create-team-parts";

export type CreateTeamSource = "phone" | "temba";

export type CreateTeamViewProps = {
  name: string;
  onNameChange: (name: string) => void;
  nameError: string | null;
  imageUri: string | null;
  imageError: string | null;
  onPickImage: () => void;
  onClearImage: () => void;
  sport: Sport;
  onSportChange: (sport: Sport) => void;
  roster: TeamRosterDraftView;
  /** By phone or On Temba, open above the Roster; null shows Add more instead. */
  adder: { source: CreateTeamSource; body: React.ReactNode } | null;
  onSourceChange: (source: CreateTeamSource) => void;
  onFromGroup: () => void;
  onAddMore: () => void;
  onRemoveRow: (key: string) => void;
  pending: boolean;
};

const CREST = 52;

const CAMERA_BADGE = 22;

/** The crest picks the Team image: the picked image, else the initials, else a hatched "not yet". */
function CrestPicker(props: {
  name: string;
  imageUri: string | null;
  onPick: () => void;
  onClear: () => void;
  pending: boolean;
}) {
  const all = useMessages();
  const m = all.team.image;
  const colors = useColors();
  const crest = props.name.trim() ? initials(props.name) : null;
  const filled = Boolean(props.imageUri) || crest != null;
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props.imageUri ? m.change : m.add}
        disabled={props.pending}
        onPress={props.onPick}
        style={({ pressed }) => ({
          opacity: props.pending ? 0.5 : pressed ? 0.7 : 1,
        })}
      >
        <SurfaceToneContext.Provider value={filled ? "ink" : "paper"}>
          <View
            style={{
              width: CREST,
              height: CREST,
              borderRadius: radii.card,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: filled ? colors.control : colors.paper,
            }}
          >
            {props.imageUri ? (
              <CachedImage
                uri={props.imageUri}
                style={{ width: CREST, height: CREST }}
                contentFit="cover"
              />
            ) : crest ? (
              <Text
                size="lead"
                weight="bold"
                width="expanded"
                style={{ color: colors.onControl }}
              >
                {crest}
              </Text>
            ) : (
              <Hatch radius={radii.card} />
            )}
          </View>
        </SurfaceToneContext.Provider>
        {props.imageUri ? null : (
          <View
            style={{
              position: "absolute",
              end: -6,
              bottom: -6,
              width: CAMERA_BADGE,
              height: CAMERA_BADGE,
              borderRadius: CAMERA_BADGE / 2,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.paper,
              borderWidth: hairline,
              borderColor: colors.rule,
            }}
          >
            <Camera size={12} color={colors.ink} />
          </View>
        )}
      </Pressable>
      {props.imageUri ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={m.remove}
          disabled={props.pending}
          onPress={props.onClear}
          hitSlop={8}
        >
          <Text size="eyebrow" tone="muted">
            {all.common.remove}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function NameField(props: {
  name: string;
  onNameChange: (name: string) => void;
  error: string | null;
  imageUri: string | null;
  imageError: string | null;
  onPickImage: () => void;
  onClearImage: () => void;
  pending: boolean;
}) {
  const m = useMessages().team.create;
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const message = props.error ?? props.imageError;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <CrestPicker
          name={props.name}
          imageUri={props.imageUri}
          onPick={props.onPickImage}
          onClear={props.onClearImage}
          pending={props.pending}
        />
        <TextInput
          accessibilityLabel={m.nameLabel}
          value={props.name}
          onChangeText={props.onNameChange}
          maxLength={255}
          editable={!props.pending}
          returnKeyType="done"
          placeholder={m.namePlaceholder}
          placeholderTextColor={colors.muted}
          selectionColor={colors.ink}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            height: CREST,
            paddingHorizontal: 16,
            borderRadius: radii.lg,
            borderWidth: props.error ? 2 : hairline,
            borderColor: props.error || focused ? colors.ink : colors.rule,
            color: colors.ink,
            ...inputType(typeScale.lead.size, "normal"),
            ...inputDirectionStyle(isLayoutRtl(), false),
          }}
        />
      </View>
      {message ? (
        <Text size="meta" weight="medium" accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
    </View>
  );
}

function SportCards({
  sport,
  onChange,
  disabled,
}: {
  sport: Sport;
  onChange: (sport: Sport) => void;
  disabled: boolean;
}) {
  const locale = useLocale();
  const all = useMessages();
  const m = all.team.create;
  const colors = useColors();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={m.sportTitle}
      style={{ flexDirection: "row", gap: 8 }}
    >
      {teamSportChoices(locale).map((choice) => {
        const selected = choice.value === sport;
        return (
          <SurfaceToneContext.Provider
            key={choice.value}
            value={selected ? "ink" : "paper"}
          >
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              accessibilityLabel={[choice.name, choice.detail].join(
                all.common.listSeparator,
              )}
              disabled={disabled}
              onPress={() => onChange(choice.value)}
              style={{
                flex: 1,
                height: 60,
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                borderRadius: radii.lg,
                borderWidth: hairline,
                borderColor: selected ? colors.controlEdge : colors.rule,
                backgroundColor: selected ? colors.control : colors.paper,
              }}
            >
              <Text
                weight="semibold"
                style={selected ? { color: colors.onControl } : undefined}
              >
                {choice.name}
              </Text>
              <Text
                size="eyebrow"
                tone="muted"
                style={selected ? { color: colors.dim } : undefined}
              >
                {choice.detail}
              </Text>
            </Pressable>
          </SurfaceToneContext.Provider>
        );
      })}
    </View>
  );
}

function SourceTab({
  icon: Icon,
  label,
  selected,
  onPress,
}: {
  icon: typeof Phone;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <SurfaceToneContext.Provider value={selected ? "ink" : "paper"}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        hitSlop={3}
        style={{
          flex: 1,
          minWidth: 0,
          height: 38,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          borderRadius: 9,
          backgroundColor: selected ? colors.control : colors.paper,
          borderWidth: selected ? 0 : hairline,
          borderColor: colors.rule,
        }}
      >
        <Icon size={14} color={selected ? colors.onControl : colors.ink} />
        <Text
          size="meta"
          weight={selected ? "semibold" : "regular"}
          numberOfLines={1}
          style={selected ? { color: colors.onControl } : undefined}
        >
          {label}
        </Text>
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

function RosterRow({
  row,
  onRemove,
  disabled,
}: {
  row: TeamRosterDraftView["rows"][number];
  onRemove: () => void;
  disabled: boolean;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 11,
      }}
    >
      <CreateTeamTile tone={row.tile} initials={row.initials} />
      <View
        accessible
        accessibilityLabel={[row.name, row.meta, row.status, row.statusDetail]
          .filter(Boolean)
          .join(m.common.listSeparator)}
        style={{ flex: 1, minWidth: 0, flexDirection: "row", gap: 12 }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold" numberOfLines={1}>
            {row.name}
          </Text>
          {row.meta ? (
            <Text size="eyebrow" tone="muted">
              {row.meta}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text size="eyebrow" tone="muted">
            {row.status}
          </Text>
          {row.statusDetail ? (
            <Text size="eyebrow" tone="muted">
              {row.statusDetail}
            </Text>
          ) : null}
        </View>
      </View>
      {row.removeLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={row.removeLabel}
          disabled={disabled}
          onPress={onRemove}
          hitSlop={12}
        >
          <X size={16} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** New team: Name, Sport, then the Roster with its seat strip and how to add. */
export function CreateTeamView(props: CreateTeamViewProps) {
  const m = useMessages();
  const c = m.team.create;
  const colors = useColors();
  const { roster } = props;
  return (
    <View style={{ gap: 26 }}>
      <CreateTeamSection title={c.nameTitle}>
        <NameField
          name={props.name}
          onNameChange={props.onNameChange}
          error={props.nameError}
          imageUri={props.imageUri}
          imageError={props.imageError}
          onPickImage={props.onPickImage}
          onClearImage={props.onClearImage}
          pending={props.pending}
        />
      </CreateTeamSection>

      <CreateTeamSection title={c.sportTitle} aside={c.sportHint}>
        <SportCards
          sport={props.sport}
          onChange={props.onSportChange}
          disabled={props.pending}
        />
      </CreateTeamSection>

      <CreateTeamSection title={c.rosterTitle} aside={roster.countLine}>
        <CreateTeamSeatStrip roster={roster} legend={props.adder == null} />

        {props.adder ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            <View
              accessibilityLabel={c.sources.label}
              style={{ flexDirection: "row", gap: 6 }}
            >
              <SourceTab
                icon={Phone}
                label={c.sources.phone}
                selected={props.adder.source === "phone"}
                onPress={() => props.onSourceChange("phone")}
              />
              <SourceTab
                icon={Search}
                label={c.sources.temba}
                selected={props.adder.source === "temba"}
                onPress={() => props.onSourceChange("temba")}
              />
              <SourceTab
                icon={Users}
                label={c.sources.group}
                selected={false}
                onPress={props.onFromGroup}
              />
            </View>
            {props.adder.body}
          </View>
        ) : null}

        <CreateTeamCard style={{ marginTop: 14 }}>
          {roster.rows.map((row, index) => (
            <View key={row.key}>
              {index > 0 ? <Hairline /> : null}
              <RosterRow
                row={row}
                onRemove={() => props.onRemoveRow(row.key)}
                disabled={props.pending}
              />
            </View>
          ))}
          {roster.addMore && props.adder == null ? (
            <>
              <Hairline />
              <Pressable
                accessibilityRole="button"
                disabled={props.pending}
                onPress={props.onAddMore}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 11,
                }}
              >
                <CreateTeamTile tone="added">
                  <Plus size={16} color={colors.muted} />
                </CreateTeamTile>
                <Text tone="muted" style={{ flex: 1 }}>
                  {roster.addMore}
                </Text>
              </Pressable>
            </>
          ) : null}
        </CreateTeamCard>
        {roster.fullLine ? (
          <Text size="eyebrow" tone="muted" style={{ marginTop: 10 }}>
            {roster.fullLine}
          </Text>
        ) : null}
        {roster.footnote ? (
          <Text size="eyebrow" tone="muted" style={{ marginTop: 10 }}>
            {roster.footnote}
          </Text>
        ) : null}
      </CreateTeamSection>
    </View>
  );
}
