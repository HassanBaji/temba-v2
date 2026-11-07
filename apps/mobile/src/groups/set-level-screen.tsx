import { sizes } from "@repo/design-tokens";
import {
  clampLevelTenths,
  LEVEL_OVERRIDE_REASONS,
  LEVEL_SLIDER_TICKS,
  levelOverrideReasonLabel,
  levelSliderLabel,
  levelSliderReadout,
  type LevelOverrideReason,
} from "@repo/domain/level-slider";
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
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { Notice } from "./notice";
import { groupPath } from "./groups-model";
import {
  savedLevelPath,
  setLevelConfirmLabel,
  setLevelUnchanged,
  setLevelView,
  type SetLevelView,
} from "./set-level-model";

const SLIDER_MARKS = LEVEL_SLIDER_TICKS.letters.map((letter) => ({
  value: letter.centreTenths,
  label: letter.label,
}));

/**
 * The readout, slider and stepper of a Level override, shared by the Level
 * setter and the Group Level override.
 */
export function LevelPicker({
  tenths,
  onTenths,
  currentTenths,
  wasLabel,
  markerLabel,
  disabled = false,
}: {
  tenths: number;
  onTenths: (tenths: number) => void;
  currentTenths: number;
  wasLabel: string;
  /** Names the slider marker at `currentTenths`; null draws none. */
  markerLabel?: string | null;
  disabled?: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const copy = m.mobileGroup.setLevel;
  const readout = levelSliderReadout({ tenths, currentTenths, locale });

  function step(delta: number) {
    onTenths(clampLevelTenths(tenths + delta));
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
            {(readout.rung.lowerTenths / 10).toFixed(1)}
          </Text>
          <Text size="meta" tone="muted">
            {(readout.rung.upperTenths / 10).toFixed(1)}
          </Text>
        </View>
      </Surface>

      <Slider
        min={LEVEL_TENTHS_MIN}
        max={LEVEL_TENTHS_MAX}
        value={tenths}
        onValueChange={onTenths}
        label={m.common.level}
        valueText={levelSliderLabel(tenths)}
        startLabel={LEVEL_SLIDER_TICKS.startLabel}
        endLabel={LEVEL_SLIDER_TICKS.endLabel}
        edges={LEVEL_SLIDER_TICKS.edgesTenths}
        marks={SLIDER_MARKS}
        marker={
          markerLabel === null
            ? undefined
            : {
                value: currentTenths,
                label:
                  markerLabel ??
                  copy.nowMarker(levelSliderLabel(currentTenths)),
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
          label={copy.decrease}
          variant="outline"
          size="icon"
          icon={<Minus size={sizes.iconAction} color={colors.ink} />}
          disabled={tenths <= LEVEL_TENTHS_MIN}
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
          label={copy.increase}
          variant="outline"
          size="icon"
          icon={<Plus size={sizes.iconAction} color={colors.ink} />}
          disabled={tenths >= LEVEL_TENTHS_MAX}
          onPress={() => step(1)}
        />
        <Button
          label={copy.reset}
          variant="outline"
          disabled={tenths === currentTenths}
          onPress={() => onTenths(currentTenths)}
        />
      </View>
    </>
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
  const reasonChips = LEVEL_OVERRIDE_REASONS.map((value) => ({
    value,
    label: levelOverrideReasonLabel(value, locale),
  }));
  const router = useRouter();
  const utils = api.useUtils();
  const [tenths, setTenths] = useState(view.currentTenths);
  const [reason, setReason] = useState<LevelOverrideReason | null>(null);

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
            label={setLevelConfirmLabel(tenths, locale)}
            size="lg"
            disabled={setLevelUnchanged(view, tenths)}
            pending={setLevel.isPending}
            onPress={() =>
              setLevel.mutate({
                groupId,
                userId: view.userId,
                levelTenths: tenths,
                reason: reason ?? undefined,
              })
            }
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
        tenths={tenths}
        onTenths={setTenths}
        currentTenths={view.currentTenths}
        wasLabel={view.wasLabel}
        disabled={setLevel.isPending}
      />

      <View style={{ gap: 8 }}>
        <Text weight="semibold">{copy.reason}</Text>
        <ChipGrid
          label={copy.reason}
          chips={reasonChips.map((chip) => ({
            ...chip,
            disabled: setLevel.isPending,
          }))}
          isSelected={(value) => reason === value}
          onSelect={(value) => setReason(reason === value ? null : value)}
        />
      </View>

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
