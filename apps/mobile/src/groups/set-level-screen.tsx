import { sizes } from "@repo/design-tokens";
import { OVR_MAX, OVR_MIN, type LevelFace } from "@repo/domain/football-ovr";
import {
  clampLevelTenths,
  clampOvrInput,
  LEVEL_OVERRIDE_NOTE_MAX,
  LEVEL_OVERRIDE_REASONS,
  LEVEL_SLIDER_TICKS,
  levelOverrideReasonLabel,
  levelSliderLabel,
  levelSliderReadout,
  OVR_SLIDER_TICKS,
  ovrSliderLabel,
  ovrSliderReadout,
  type LevelOverrideReason,
} from "@repo/domain/level-slider";
import type { Locale } from "@repo/i18n/locale";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { useRouter } from "expo-router";
import { Minus, Plus } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { ChipGrid, FieldError } from "../create-game/chips";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { MountFill } from "../primitives/mount-fill";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Slider } from "../primitives/slider";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { Notice } from "./notice";
import { firstName } from "./group-home-model";
import { groupPath } from "./groups-model";
import {
  savedLevelPath,
  setLevelConfirmLabel,
  setLevelUnchanged,
  setLevelView,
  type SetLevelView,
} from "./set-level-model";

/** How each face of the picker reads, steps and marks (ADR-0069). */
const FACES = {
  level: {
    min: LEVEL_TENTHS_MIN,
    max: LEVEL_TENTHS_MAX,
    clamp: clampLevelTenths,
    label: levelSliderLabel,
    readout: (value: number, current: number, locale: Locale) =>
      levelSliderReadout({ tenths: value, currentTenths: current, locale }),
    ticks: {
      startLabel: LEVEL_SLIDER_TICKS.startLabel,
      endLabel: LEVEL_SLIDER_TICKS.endLabel,
      edges: LEVEL_SLIDER_TICKS.edgesTenths,
      marks: LEVEL_SLIDER_TICKS.letters.map((letter) => ({
        value: letter.centreTenths,
        label: letter.label,
      })),
    },
  },
  ovr: {
    min: OVR_MIN,
    max: OVR_MAX,
    clamp: clampOvrInput,
    label: ovrSliderLabel,
    readout: (value: number, current: number, locale: Locale) =>
      ovrSliderReadout({ ovr: value, currentOvr: current, locale }),
    ticks: {
      startLabel: OVR_SLIDER_TICKS.startLabel,
      endLabel: OVR_SLIDER_TICKS.endLabel,
      edges: OVR_SLIDER_TICKS.edges,
      marks: OVR_SLIDER_TICKS.letters.map((letter) => ({
        value: letter.centre,
        label: letter.label,
      })),
    },
  },
} satisfies Record<LevelFace, unknown>;

/**
 * The readout, slider and stepper of a Level override, shared by the Level
 * setter and a Verifier's calibration. `face` "ovr" picks a football Level in
 * whole OVR; `value` is in the face's unit.
 */
export function LevelPicker({
  face = "level",
  value,
  onValue,
  currentValue,
  wasLabel,
  markerLabel,
  disabled = false,
}: {
  face?: LevelFace;
  value: number;
  onValue: (value: number) => void;
  currentValue: number;
  wasLabel: string;
  /** Names the slider marker at `currentValue`; null draws none. */
  markerLabel?: string | null;
  disabled?: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const copy = m.mobileGroup.setLevel;
  const scale = FACES[face];
  const readout = scale.readout(value, currentValue, locale);

  function step(delta: number) {
    onValue(scale.clamp(value + delta));
  }

  return (
    <>
      <Surface tone="ink" radius="card" style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text size="meta" weight="semibold">
            {copy.newLevel}
          </Text>
          <Text size="meta" tone="muted">
            {wasLabel}
          </Text>
        </View>
        <View
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={copy.readout(
            readout.displayBand,
            readout.levelLabel,
            readout.deltaLabel,
          )}
          style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}
        >
          <Text size="hero" width="expanded" weight="bold" ltr>
            {readout.displayBand}
          </Text>
          <Text size="h1" width="expanded" weight="bold">
            {readout.levelLabel}
          </Text>
          <Text style={{ marginStart: "auto" }}>{readout.deltaLabel}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text size="meta">
            {readout.toNext
              ? copy.toNext(readout.toNext.distanceLabel, readout.toNext.label)
              : copy.topOfScale}
          </Text>
          <Text size="meta">
            {copy.throughRung(readout.percentThroughRung, readout.rung.label)}
          </Text>
        </View>
        <MountFill percent={readout.percentThroughRung} />
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", justifyContent: "space-between" }}
        >
          <Text size="meta" tone="muted">
            {readout.rung.lowerLabel}
          </Text>
          <Text size="meta" tone="muted">
            {readout.rung.upperLabel}
          </Text>
        </View>
      </Surface>

      <Slider
        min={scale.min}
        max={scale.max}
        value={value}
        onValueChange={(next) => onValue(scale.clamp(next))}
        label={m.common.level}
        valueText={scale.label(value)}
        startLabel={scale.ticks.startLabel}
        endLabel={scale.ticks.endLabel}
        edges={scale.ticks.edges}
        marks={scale.ticks.marks}
        marker={
          markerLabel === null
            ? undefined
            : {
                value: currentValue,
                label: markerLabel ?? copy.nowMarker(scale.label(currentValue)),
              }
        }
        disabled={disabled}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <Button
          label={face === "ovr" ? copy.decreaseOvr : copy.decrease}
          variant="outline"
          size="icon"
          icon={<Minus size={sizes.iconAction} color={colors.ink} />}
          disabled={value <= scale.min}
          onPress={() => step(-1)}
        />
        <Text
          size="lead"
          width="expanded"
          style={{ minWidth: 56, textAlign: "center" }}
        >
          {readout.levelLabel}
        </Text>
        <Button
          label={face === "ovr" ? copy.increaseOvr : copy.increase}
          variant="outline"
          size="icon"
          icon={<Plus size={sizes.iconAction} color={colors.ink} />}
          disabled={value >= scale.max}
          onPress={() => step(1)}
        />
        <Button
          label={copy.reset}
          variant="outline"
          disabled={value === currentValue}
          onPress={() => onValue(currentValue)}
        />
      </View>
    </>
  );
}

/** The required reason and the optional note of a Level override (ADR-0073). */
export function LevelReasonFields({
  name,
  reason,
  onReason,
  note,
  onNote,
  disabled,
}: {
  name: string;
  reason: LevelOverrideReason | null;
  onReason: (reason: LevelOverrideReason | null) => void;
  note: string;
  onNote: (note: string) => void;
  disabled: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.mobileGroup.setLevel;
  const why = copy.why(firstName(name));
  return (
    <View style={{ gap: 8 }}>
      <Text weight="semibold">{why}</Text>
      <ChipGrid
        label={why}
        chips={LEVEL_OVERRIDE_REASONS.map((value) => ({
          value,
          label: levelOverrideReasonLabel(value, locale),
          disabled,
        }))}
        isSelected={(value) => reason === value}
        onSelect={(value) => onReason(reason === value ? null : value)}
      />
      <TextField
        accessibilityLabel={copy.noteLabel}
        placeholder={copy.notePlaceholder}
        value={note}
        onChangeText={onNote}
        maxLength={LEVEL_OVERRIDE_NOTE_MAX}
        editable={!disabled}
      />
    </View>
  );
}

function SetLevelForm({
  groupId,
  view,
}: {
  groupId: string;
  view: SetLevelView;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.mobileGroup.setLevel;
  const router = useRouter();
  const utils = api.useUtils();
  const [tenths, setTenths] = useState(view.currentTenths);
  const [reason, setReason] = useState<LevelOverrideReason | null>(null);
  const [note, setNote] = useState("");
  const unchanged = setLevelUnchanged(view, tenths);

  const setLevel = api.ratings.setLevel.useMutation({
    onSuccess: async () => {
      await utils.groups.byId.invalidate({ id: groupId });
      router.dismissTo(
        savedLevelPath(groupId, {
          name: view.name,
          levelLabel: levelSliderLabel(tenths),
          reason,
        }),
      );
    },
  });

  const error = setLevel.error
    ? splitTrpcFormError(setLevel.error).globalMessage
    : null;

  return (
    <Screen
      footer={
        <View style={{ flex: 1, gap: 10 }}>
          <Text>{view.note}</Text>
          <Button
            label={
              reason === null && !unchanged
                ? copy.pickReason
                : setLevelConfirmLabel(tenths, locale)
            }
            size="lg"
            disabled={unchanged || reason === null}
            pending={setLevel.isPending}
            onPress={() => {
              if (!reason) {
                return;
              }
              setLevel.mutate({
                groupId,
                userId: view.userId,
                levelTenths: tenths,
                reason,
                note: note.trim() || undefined,
              });
            }}
          />
        </View>
      }
    >
      <ScreenHeader
        nav="back"
        fallback={groupPath(groupId)}
        title={copy.title(view.name)}
      />
      <LevelPicker
        value={tenths}
        onValue={setTenths}
        currentValue={view.currentTenths}
        wasLabel={view.wasLabel}
        disabled={setLevel.isPending}
      />

      <LevelReasonFields
        name={view.name}
        reason={reason}
        onReason={setReason}
        note={note}
        onNote={setNote}
        disabled={setLevel.isPending}
      />

      <FieldError message={error ?? undefined} />
    </Screen>
  );
}

export function SetLevelScreen({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const group = api.groups.byId.useQuery({ id: groupId });
  const header = <ScreenHeader nav="back" fallback={groupPath(groupId)} />;

  if (isNotFoundError(group.error)) {
    return (
      <Screen>
        {header}
        <Notice {...m.mobileGroup.setLevel.notFound} />
      </Screen>
    );
  }

  if (group.error && !group.data) {
    return (
      <Screen>
        {header}
        <Notice
          alert
          title={m.mobileGroup.loadFailed.level}
          description={group.error.message}
          onRetry={() => void group.refetch()}
        />
      </Screen>
    );
  }

  if (!group.data) {
    return (
      <Screen>
        {header}
        <Skeleton height={160} radius={16} />
        <Skeleton height={120} radius={16} />
      </Screen>
    );
  }

  const entry = group.data.viewerCanSetLevel
    ? group.data.standing.leaderboard.find(
        (candidate) => candidate.userId === userId && !candidate.isViewer,
      )
    : undefined;

  if (!entry) {
    return (
      <Screen>
        {header}
        <Notice {...m.mobileGroup.setLevel.notFound} />
      </Screen>
    );
  }

  return <SetLevelForm groupId={groupId} view={setLevelView(entry, locale)} />;
}
