import { colors, sizes } from "@repo/design-tokens";
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
import { splitTrpcFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { MountFill } from "../primitives/mount-fill";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Slider } from "../primitives/slider";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import { Notice } from "./notice";
import { groupPath } from "./groups-model";
import {
  SET_LEVEL_NOT_FOUND_COPY,
  savedLevelPath,
  setLevelConfirmLabel,
  setLevelUnchanged,
  setLevelView,
  type SetLevelView,
} from "./set-level-model";

const REASON_CHIPS = LEVEL_OVERRIDE_REASONS.map((value) => ({
  value,
  label: levelOverrideReasonLabel(value),
}));

const SLIDER_MARKS = LEVEL_SLIDER_TICKS.letters.map((letter) => ({
  value: letter.centreTenths,
  label: letter.label,
}));

function SetLevelForm({
  groupId,
  view,
}: {
  groupId: string;
  view: SetLevelView;
}) {
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

  const readout = levelSliderReadout({
    tenths,
    currentTenths: view.currentTenths,
  });
  const error = setLevel.error
    ? splitTrpcFormError(setLevel.error).globalMessage
    : null;

  function step(delta: number) {
    setTenths((value) => clampLevelTenths(value + delta));
  }

  return (
    <Screen
      footer={
        <View style={{ flex: 1, gap: 10 }}>
          <Text>{view.note}</Text>
          <Button
            label={setLevelConfirmLabel(tenths)}
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
        title={`Set Level for ${view.name}`}
      />
      <Surface tone="ink" radius="card" style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text size="meta" weight="semibold">
            New Level
          </Text>
          <Text size="meta" tone="muted">
            {view.wasLabel}
          </Text>
        </View>
        <View
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={`New Level ${readout.displayBand} ${readout.levelLabel}, ${readout.deltaLabel}`}
          style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}
        >
          <Text size="hero" width="expanded" weight="bold">
            {readout.displayBand}
          </Text>
          <Text size="h1" width="expanded" weight="bold">
            {readout.levelLabel}
          </Text>
          <Text style={{ marginLeft: "auto" }}>{readout.deltaLabel}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text size="meta">
            {readout.toNext
              ? `${readout.toNext.distanceLabel} to ${readout.toNext.label}`
              : "Top of the scale"}
          </Text>
          <Text size="meta">
            {`${readout.percentThroughRung}% through ${readout.rung.label}`}
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
        onValueChange={setTenths}
        label="Level"
        valueText={levelSliderLabel(tenths)}
        startLabel={LEVEL_SLIDER_TICKS.startLabel}
        endLabel={LEVEL_SLIDER_TICKS.endLabel}
        edges={LEVEL_SLIDER_TICKS.edgesTenths}
        marks={SLIDER_MARKS}
        marker={{
          value: view.currentTenths,
          label: `Now ${levelSliderLabel(view.currentTenths)}`,
        }}
        disabled={setLevel.isPending}
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
          label="Decrease Level by 0.1"
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
          label="Increase Level by 0.1"
          variant="outline"
          size="icon"
          icon={<Plus size={sizes.iconAction} color={colors.ink} />}
          disabled={tenths >= LEVEL_TENTHS_MAX}
          onPress={() => step(1)}
        />
        <Button
          label="Reset"
          variant="outline"
          disabled={tenths === view.currentTenths}
          onPress={() => setTenths(view.currentTenths)}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Text weight="semibold">Reason</Text>
        <ChipGrid
          label="Reason"
          chips={REASON_CHIPS.map((chip) => ({
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
  const group = api.groups.byId.useQuery({ id: groupId });
  const header = <ScreenHeader nav="back" fallback={groupPath(groupId)} />;

  if (isNotFoundError(group.error)) {
    return (
      <Screen>
        {header}
        <Notice {...SET_LEVEL_NOT_FOUND_COPY} />
      </Screen>
    );
  }

  if (group.error && !group.data) {
    return (
      <Screen>
        {header}
        <Notice
          alert
          title="Level could not be loaded"
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
        <Notice {...SET_LEVEL_NOT_FOUND_COPY} />
      </Screen>
    );
  }

  return <SetLevelForm groupId={groupId} view={setLevelView(entry)} />;
}
