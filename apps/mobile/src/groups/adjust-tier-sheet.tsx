import { radii } from "@repo/design-tokens";
import type { LevelOverrideReason } from "@repo/domain/level-slider";
import {
  tierAdjustSheet,
  type TierAdjustMember,
  type TierAdjustSheet as TierAdjustSheetView,
} from "@repo/domain/tier-adjust";
import { useState } from "react";
import { View } from "react-native";

import { ChipGrid, FieldError } from "../create-game/chips";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { TierFish } from "./tier-fish";

const DIMMED_FISH = 0.18;
const NOTE_MAX = 140;

function PointsPanel({
  view,
  disabled,
  onDelta,
}: {
  view: TierAdjustSheetView;
  disabled: boolean;
  onDelta: (delta: number) => void;
}) {
  const m = useMessages();
  const colors = useColors();
  const copy = m.rating.adjust;
  return (
    <View
      style={{
        gap: 14,
        padding: 16,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.rule,
      }}
    >
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${copy.newPoints}. ${view.pointsLabel}, ${view.deltaLabel}`}
          style={{ flex: 1, gap: 2 }}
        >
          <Text size="eyebrow" tone="muted">
            {copy.newPoints}
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
          >
            <Text size="h1" width="expanded" weight="bold">
              {view.pointsLabel}
            </Text>
            <Text size="meta" tone="muted">
              {view.deltaLabel}
            </Text>
          </View>
        </View>
        <View
          accessible
          accessibilityLiveRegion="polite"
          accessibilityLabel={[copy.place, view.placeLabel, view.bandLabel]
            .filter(Boolean)
            .join(". ")}
          style={{ alignItems: "flex-end", gap: 2 }}
        >
          <Text size="eyebrow" tone="muted">
            {copy.place}
          </Text>
          {view.placeLabel ? (
            <Text size="h1" width="expanded" weight="bold">
              {view.placeLabel}
            </Text>
          ) : (
            <View style={{ width: 44, height: 34 }}>
              <Hatch />
            </View>
          )}
          <Text size="meta" tone="muted">
            {view.bandLabel}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {view.steps.map((step) => (
          <View key={step.delta} style={{ flex: 1 }}>
            <Button
              label={step.label}
              accessibilityLabel={step.accessibilityLabel}
              variant="outline"
              disabled={disabled || step.disabled}
              onPress={() => onDelta(view.delta + step.delta)}
            />
          </View>
        ))}
      </View>
      {view.suggestion ? (
        <View style={{ flexDirection: "row" }}>
          <Button
            label={view.suggestion.label}
            size="sm"
            variant="outline"
            disabled={disabled || view.delta === view.suggestion.delta}
            onPress={() => onDelta(view.suggestion?.delta ?? 0)}
          />
        </View>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text size="meta" tone="muted">
          {copy.orJump}
        </Text>
        {view.jumps.map((jump) => (
          <Button
            key={jump.band}
            label={jump.label}
            size="sm"
            variant="outline"
            disabled={disabled}
            onPress={() => onDelta(jump.delta)}
          />
        ))}
        <Button
          label={copy.reset}
          size="sm"
          variant="outline"
          disabled={disabled || view.delta === 0}
          onPress={() => onDelta(0)}
        />
      </View>
    </View>
  );
}

function BandStrip({ view }: { view: TierAdjustSheetView }) {
  const m = useMessages();
  return (
    <View style={{ gap: 10 }}>
      <Text size="meta" tone="muted">
        {m.rating.adjust.tierAfter}
      </Text>
      <View
        style={{ flexDirection: "row", justifyContent: "space-between" }}
        accessible
        accessibilityLabel={`${m.rating.adjust.tierAfter}. ${view.bandLabel ?? ""}`}
      >
        {view.bands.map((band) => (
          <View
            key={band.band}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 4,
              opacity: band.current ? 1 : DIMMED_FISH,
            }}
          >
            <TierFish band={band.band} label={band.label} />
            <Text size="eyebrow">{band.label}</Text>
          </View>
        ))}
      </View>
      <Text size="meta" tone="muted" accessibilityLiveRegion="polite">
        {view.effect}
      </Text>
    </View>
  );
}

function AdjustTierForm({
  groupId,
  groupName,
  members,
  userId,
  imageUri,
  onClose,
}: {
  groupId: string;
  groupName: string;
  members: readonly TierAdjustMember[];
  userId: string;
  imageUri: string | null;
  onClose: () => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const toast = useToast();
  const utils = api.useUtils();
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState<LevelOverrideReason | null>(null);
  const [note, setNote] = useState("");
  const view = tierAdjustSheet({
    members,
    userId,
    delta,
    reason,
    groupName,
    locale,
  });
  const adjust = api.groups.adjustTierPoints.useMutation({
    onSuccess: async () => {
      if (view) {
        toast.show(view.savedToast);
      }
      await utils.groups.byId.invalidate({ id: groupId });
      onClose();
    },
  });
  if (!view) {
    return null;
  }
  const error = adjust.error
    ? splitTrpcFormError(adjust.error).globalMessage
    : null;
  const copy = m.rating.adjust;

  return (
    <Sheet
      visible
      onClose={onClose}
      title={view.title}
      subtitle={view.subtitle}
      closeButton
      tall
      keyboardShouldPersistTaps="handled"
      footer={
        <Button
          label={view.saveLabel}
          size="lg"
          disabled={!view.canSave}
          pending={adjust.isPending}
          onPress={() => {
            if (!reason) {
              return;
            }
            adjust.mutate({
              groupId,
              userId,
              points: view.points,
              reason,
              note: note.trim() || undefined,
            });
          }}
        />
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={view.name} uri={imageUri} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text weight="semibold" numberOfLines={1}>
            {view.name}
          </Text>
          <Text size="meta" tone="muted">
            {view.nowLine}
          </Text>
        </View>
      </View>
      <PointsPanel view={view} disabled={adjust.isPending} onDelta={setDelta} />
      <BandStrip view={view} />
      <View style={{ gap: 8 }}>
        <Text size="meta" tone="muted">
          {view.why}
        </Text>
        <ChipGrid
          label={view.why}
          chips={view.reasons.map((chip) => ({
            value: chip.value,
            label: chip.label,
            disabled: adjust.isPending,
          }))}
          isSelected={(value) => reason === value}
          onSelect={(value) => setReason(reason === value ? null : value)}
        />
        <TextField
          accessibilityLabel={copy.noteLabel}
          placeholder={copy.notePlaceholder}
          value={note}
          onChangeText={setNote}
          maxLength={NOTE_MAX}
          editable={!adjust.isPending}
        />
      </View>
      <FieldError message={error ?? undefined} />
    </Sheet>
  );
}

/**
 * Adjust a member's Tier points (screen 2d): move the points, read the new
 * place and fish live, pick a reason the player will see, then save.
 */
export function AdjustTierSheet({
  groupId,
  groupName,
  members,
  member,
  onClose,
}: {
  groupId: string;
  groupName: string;
  members: readonly TierAdjustMember[];
  member: { userId: string; imageUri: string | null } | null;
  onClose: () => void;
}) {
  if (!member) {
    return null;
  }
  return (
    <AdjustTierForm
      key={member.userId}
      groupId={groupId}
      groupName={groupName}
      members={members}
      userId={member.userId}
      imageUri={member.imageUri}
      onClose={onClose}
    />
  );
}
