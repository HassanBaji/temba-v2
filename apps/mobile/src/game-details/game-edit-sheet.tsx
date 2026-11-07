import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import { isLevelBoundDisabled } from "@repo/domain/create-game-flow";
import { GAME_CUSTOM_NAME_MAX_LENGTH } from "@repo/domain/game-custom-name";
import {
  asideLabel,
  footballFormatNote,
  footballSideSizeStep,
  joinedCountLabel,
  playersAllowedForSideSize,
  playersCapWaitNote,
  venueLockedLine,
  windowDurationLabel,
  type GameEditSections,
} from "@repo/domain/game-edit-form";
import {
  gameSeasonChoices,
  seasonLinkActionLabel,
  seasonLinkRowNote,
  seasonLinkedNote,
  seasonPickerSubtitle,
  seasonsOpenForDay,
} from "@repo/domain/game-season-link";
import { footballPlayersAllowedBounds } from "@repo/domain/game-shape";
import {
  formatDayLabel,
  formatTimeSlotLabel,
  gameEditWindowChoices,
} from "@repo/domain/game-window";
import {
  formatSeasonRange,
  type GroupSeasonData,
} from "@repo/domain/group-season";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import { LEVEL_BAND_SELECT_NONE } from "@repo/domain/level-range";
import { mvpModeCopy } from "@repo/domain/marks";
import {
  Check,
  ChevronRight,
  Lock,
  Minus,
  Plus,
  Trophy,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { ChipGrid, FieldError, StepperButton } from "../create-game/chips";
import { MvpModeChoices } from "../create-game/mvp-mode-field";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { Button } from "../primitives/button";
import { ChoiceCard } from "../primitives/choice-card";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Sheet } from "../primitives/sheet";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import type { GameEditController } from "./use-game-edit";

export type GameEditContext = {
  venueName: string | null;
  courtName: string | null;
  groupName: string | null;
  joined: number;
  seasons: readonly GroupSeasonData[];
  canChangeSeason: boolean;
};

const SECTION_GAP = 12;

function SectionHead({
  title,
  meta,
  tag = false,
  action,
}: {
  title: string;
  meta?: string | null;
  tag?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text size="title" width="expanded" accessibilityRole="header">
        {title}
      </Text>
      {action ??
        (meta ? (
          <Text
            size={tag ? "eyebrow" : "meta"}
            weight={tag ? "semibold" : "regular"}
            tone={tag ? "default" : "muted"}
          >
            {tag ? meta.toUpperCase() : meta}
          </Text>
        ) : null)}
    </View>
  );
}

function Hint({ children }: { children: string }) {
  return (
    <Text size="meta" tone="muted">
      {children}
    </Text>
  );
}

function ValueStepper({
  label,
  display,
  accessibilityValue,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
}: {
  label: string;
  display: string;
  accessibilityValue: string;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const m = useMessages();
  return (
    <View
      style={{
        flex: 1,
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 6,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.inputBorder,
      }}
    >
      <StepperButton
        label={decreaseLabel}
        icon={Minus}
        size={36}
        disabled={!canDecrease}
        onPress={onDecrease}
      />
      <View
        accessible
        accessibilityLabel={m.mobileGameDetails.figure(
          label,
          accessibilityValue,
        )}
        accessibilityLiveRegion="polite"
        style={{ flex: 1, alignItems: "center" }}
      >
        <Text size="eyebrow" tone="muted">
          {label}
        </Text>
        <Text size="lead" width="expanded">
          {display}
        </Text>
      </View>
      <StepperButton
        label={increaseLabel}
        icon={Plus}
        size={36}
        disabled={!canIncrease}
        onPress={onIncrease}
      />
    </View>
  );
}

function MvpSection({
  mvp,
  onPick,
  error,
}: {
  mvp: NonNullable<GameEditController["mvp"]>;
  onPick: GameEditController["pickMvpMode"];
  error: string | undefined;
}) {
  const copy = useMessages().createGame.mvp;
  const locale = useLocale();
  const picked = mvpModeCopy(mvp.picked, locale);
  if (!mvp.editable) {
    return (
      <View style={{ gap: SECTION_GAP }}>
        <SectionHead title={copy.title} />
        <Surface style={{ gap: 2 }}>
          <Text weight="semibold">{picked.label}</Text>
          <Text size="meta" tone="muted">
            {picked.description}
          </Text>
        </Surface>
        <Hint>{copy.lockedNote}</Hint>
      </View>
    );
  }
  return (
    <View style={{ gap: SECTION_GAP }}>
      <SectionHead title={copy.title} meta={copy.decidedAfterGame} />
      <MvpModeChoices mode={mvp.picked} onSelect={onPick} />
      <FieldError message={error} />
      <Hint>{picked.help}</Hint>
    </View>
  );
}

function SeasonPicker({
  edit,
  context,
  onBack,
}: {
  edit: GameEditController;
  context: GameEditContext;
  onBack: () => void;
}) {
  const m = useMessages();
  const copy = m.mobileGameDetails.edit;
  const locale = useLocale();
  const [picked, setPicked] = useState<string | null>(edit.draft.seasonId);
  const choices = gameSeasonChoices(
    context.seasons,
    edit.draft.day,
    edit.now,
    locale,
  );
  const chosen = choices.find((choice) => choice.id === picked) ?? choices[0]!;
  return (
    <View style={{ gap: spacing.compact }}>
      <Text size="meta" tone="muted">
        {seasonPickerSubtitle(
          context.groupName ?? copy.thisGroup,
          edit.draft.day,
          locale,
        )}
      </Text>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        {choices.map((choice, index) => (
          <View key={choice.id ?? "none"}>
            {index > 0 ? (
              <View
                style={{ height: hairline, backgroundColor: colors.rule }}
              />
            ) : null}
            <ChoiceCard
              variant="row"
              role="radio"
              selected={choice.id === picked}
              disabled={!choice.selectable}
              title={
                choice.badge
                  ? copy.nameWithBadge(choice.name, choice.badge)
                  : choice.name
              }
              description={copy.noteWithDates(choice.note, choice.dates)}
              onPress={() => setPicked(choice.id)}
            />
          </View>
        ))}
      </Surface>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          padding: 14,
          borderRadius: radii.lg,
          borderWidth: hairline,
          borderColor: colors.rule,
        }}
      >
        <Lock size={sizes.iconRow} color={colors.muted} />
        <View style={{ flex: 1 }}>
          <Hint>{m.createGame.season.pickerLockNote}</Hint>
        </View>
      </View>
      <Button
        label={seasonLinkActionLabel(chosen, locale)}
        size="lg"
        icon={<Trophy size={sizes.iconRow} color={colors.paper} />}
        onPress={() => {
          edit.update({ seasonId: picked });
          onBack();
        }}
      />
    </View>
  );
}

function SeasonSection({
  edit,
  context,
  onOpenPicker,
}: {
  edit: GameEditController;
  context: GameEditContext;
  onOpenPicker: () => void;
}) {
  const m = useMessages();
  const copy = m.mobileGameDetails.edit;
  const seasonCopy = m.createGame.season;
  const locale = useLocale();
  const { draft, seasonFix, now } = edit;
  const linked =
    context.seasons.find((season) => season.id === draft.seasonId) ?? null;
  const groupName = context.groupName ?? copy.thisGroup;
  const locked = !context.canChangeSeason;

  if (seasonFix) {
    return (
      <View style={{ gap: SECTION_GAP }}>
        <SectionHead title={copy.season} meta={seasonCopy.needsFixTag} tag />
        <View
          style={{
            borderRadius: radii.lg,
            borderWidth: hairline,
            borderColor: colors.ink,
            overflow: "hidden",
          }}
        >
          <View style={{ padding: 14, gap: 8 }}>
            <Hatch radius={0} bordered={false} />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
              }}
            >
              <Text
                size="h2"
                width="expanded"
                tone="muted"
                style={{ textDecorationLine: "line-through" }}
              >
                {seasonFix.season.name.toUpperCase()}
              </Text>
              <Text size="meta" tone="muted">
                {seasonFix.endsLine}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: colors.paper,
                borderRadius: radii.sm,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            >
              <Text>{seasonFix.line}</Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              borderTopWidth: hairline,
              borderColor: colors.ink,
            }}
          >
            {seasonFix.replacement && seasonFix.moveLabel ? (
              <View style={{ flex: 1 }}>
                <Button
                  label={seasonFix.moveLabel}
                  onPress={() =>
                    edit.update({ seasonId: seasonFix.replacement!.id })
                  }
                />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Button
                label={seasonCopy.unlink}
                variant="outline"
                onPress={() => edit.update({ seasonId: null })}
              />
            </View>
          </View>
        </View>
        <Hint>{seasonFix.keepLine}</Hint>
      </View>
    );
  }

  if (linked) {
    return (
      <View style={{ gap: SECTION_GAP }}>
        <SectionHead
          title={copy.season}
          action={
            locked ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.changeSeason}
                hitSlop={12}
                onPress={onOpenPicker}
              >
                <Text size="meta" style={{ textDecorationLine: "underline" }}>
                  {seasonCopy.change}
                </Text>
              </Pressable>
            )
          }
        />
        <Surface tone="ink" radius="lg" style={{ padding: 14, gap: 6 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
            }}
          >
            <Text size="h2" width="expanded">
              {linked.name.toUpperCase()}
            </Text>
            <Text size="meta" tone="muted">
              {formatSeasonRange(linked, locale)}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Text size="meta" tone="muted">
              {groupName}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Check size={sizes.iconRow} color={colors.paper} />
              <Text size="meta" weight="medium">
                {seasonCopy.countsLine}
              </Text>
            </View>
          </View>
        </Surface>
        <Hint>
          {locked ? seasonCopy.lockedNote : seasonLinkedNote(linked, locale)}
        </Hint>
      </View>
    );
  }

  const openCount = draft.day
    ? seasonsOpenForDay(context.seasons, draft.day, now).length
    : 0;
  return (
    <View style={{ gap: SECTION_GAP }}>
      <SectionHead title={copy.season} meta={m.common.optional} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={seasonCopy.linkRowTitle}
        accessibilityState={{ disabled: locked || !draft.day }}
        disabled={locked || !draft.day}
        onPress={onOpenPicker}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderRadius: radii.lg,
          borderWidth: hairline,
          borderStyle: "dashed",
          borderColor: colors.inputBorder,
          backgroundColor: pressed ? colors.wash : colors.paper,
          opacity: locked || !draft.day ? 0.5 : 1,
        })}
      >
        <View
          style={{
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.sm,
            borderWidth: hairline,
            borderColor: colors.rule,
          }}
        >
          <Trophy size={sizes.iconRow} color={colors.ink} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight="semibold">{seasonCopy.linkRowTitle}</Text>
          <Text size="meta" tone="muted">
            {draft.day
              ? seasonLinkRowNote(groupName, openCount, draft.day, locale)
              : copy.pickDayFirst}
          </Text>
        </View>
        <ChevronRight
          size={sizes.iconRow}
          color={colors.muted}
          style={mirrorInRtl}
        />
      </Pressable>
      <Hint>
        {locked ? seasonCopy.lockedNote : seasonCopy.sectionFriendlyNote}
      </Hint>
    </View>
  );
}

export function GameEditSheet({
  visible,
  onClose,
  edit,
  sections,
  context,
}: {
  visible: boolean;
  onClose: () => void;
  edit: GameEditController;
  sections: GameEditSections;
  context: GameEditContext;
}) {
  const m = useMessages();
  const copy = m.mobileGameDetails.edit;
  const editCopy = m.createGame.edit;
  const locale = useLocale();
  const [view, setView] = useState<"form" | "season">("form");
  const { draft, update, error, pending } = edit;

  useEffect(() => {
    if (!visible) {
      setView("form");
    }
  }, [visible]);

  const errorFor = (field: string) =>
    error?.field === field ? error.message : undefined;
  const choices = gameEditWindowChoices(draft, edit.now);
  const duration = windowDurationLabel(
    draft.day,
    draft.startTime,
    draft.finishTime,
    locale,
  );
  const sideSize = draft.sideSize;
  const capBounds = footballPlayersAllowedBounds(sideSize ?? 5);
  const players = draft.playersAllowed ?? capBounds.min;
  const showSeason = sections.season && context.seasons.length > 0;

  const bands = (bound: "min" | "max") => [
    { value: LEVEL_BAND_SELECT_NONE, label: copy.any, disabled: false },
    ...ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => ({
      value: band,
      label: band,
      disabled: isLevelBoundDisabled(
        bound,
        band,
        bound === "min" ? draft.levelMax : draft.levelMin,
      ),
    })),
  ];

  const pickingSeason = view === "season";
  const back = () => setView("form");

  return (
    <Sheet
      visible={visible}
      onClose={pickingSeason ? back : onClose}
      tall
      title={pickingSeason ? m.createGame.season.linkRowTitle : editCopy.title}
      subtitle={
        pickingSeason
          ? null
          : venueLockedLine(context.venueName, context.courtName, locale)
      }
      action={
        <Button
          label={pickingSeason ? m.common.back : m.common.cancel}
          variant="outline"
          size="sm"
          onPress={pickingSeason ? back : onClose}
        />
      }
      keyboardShouldPersistTaps="handled"
      footer={
        pickingSeason ? undefined : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="eyebrow" tone="muted">
                {editCopy.changes}
              </Text>
              <Text weight="semibold" accessibilityLiveRegion="polite">
                {edit.note}
              </Text>
            </View>
            <Button
              label={editCopy.saveChanges}
              size="lg"
              disabled={!edit.canSave}
              pending={pending}
              onPress={() => void edit.save()}
            />
          </View>
        )
      }
    >
      {pickingSeason ? (
        <SeasonPicker edit={edit} context={context} onBack={back} />
      ) : (
        <View style={{ gap: spacing.section }}>
          {error && error.field == null ? (
            <FieldError message={error.message} />
          ) : null}
          {sections.name ? (
            <View style={{ gap: SECTION_GAP }}>
              <SectionHead title={copy.name} meta={m.common.optional} />
              <TextField
                label={copy.gameName}
                value={draft.customName}
                maxLength={GAME_CUSTOM_NAME_MAX_LENGTH}
                onChangeText={(customName) => update({ customName })}
                error={errorFor("name")}
              />
              <Hint>{editCopy.nameHint}</Hint>
            </View>
          ) : null}
          <View style={{ gap: SECTION_GAP }}>
            <SectionHead title={copy.step.window} meta={duration} />
            <Text weight="medium">{copy.day}</Text>
            <ChipGrid
              label={copy.day}
              columns={3}
              chips={choices.days.map((day) => ({
                value: day,
                label: formatDayLabel(day, locale) ?? day,
              }))}
              isSelected={(day) => day === draft.day}
              onSelect={(day) => update({ day })}
            />
            <Text weight="medium">{copy.startTime}</Text>
            <ChipGrid
              label={copy.startTime}
              columns={3}
              chips={choices.startSlots.map((slot) => ({
                value: slot,
                label: formatTimeSlotLabel(slot, locale),
              }))}
              isSelected={(slot) => slot === draft.startTime}
              onSelect={(startTime) => update({ startTime })}
            />
            <Text weight="medium">{copy.finishTime}</Text>
            <ChipGrid
              label={copy.finishTime}
              columns={3}
              chips={choices.finishSlots.map((slot) => ({
                value: slot,
                label: formatTimeSlotLabel(slot, locale),
              }))}
              isSelected={(slot) => slot === draft.finishTime}
              onSelect={(finishTime) => update({ finishTime })}
            />
            <FieldError message={errorFor("window")} />
            <Hint>{editCopy.whenHint}</Hint>
          </View>
          <View style={{ gap: SECTION_GAP }}>
            <SectionHead
              title={sections.caps ? copy.playersAndPrice : copy.price}
              meta={
                sections.caps ? joinedCountLabel(context.joined, locale) : null
              }
            />
            {sections.caps && sideSize != null ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <ValueStepper
                  label={copy.players}
                  display={String(players)}
                  accessibilityValue={copy.playersValue(players)}
                  canDecrease={players - 1 >= capBounds.min}
                  canIncrease={players + 1 <= capBounds.max}
                  onDecrease={() => update({ playersAllowed: players - 1 })}
                  onIncrease={() => update({ playersAllowed: players + 1 })}
                  decreaseLabel={copy.fewerPlayers}
                  increaseLabel={copy.morePlayers}
                />
                <ValueStepper
                  label={copy.aside}
                  display={asideLabel(sideSize)}
                  accessibilityValue={copy.asideValue(sideSize)}
                  canDecrease={footballSideSizeStep(sideSize, -1) != null}
                  canIncrease={footballSideSizeStep(sideSize, 1) != null}
                  onDecrease={() => {
                    const next = footballSideSizeStep(sideSize, -1);
                    if (next) {
                      update({ sideSize: next });
                    }
                  }}
                  onIncrease={() => {
                    const next = footballSideSizeStep(sideSize, 1);
                    if (next) {
                      update({
                        sideSize: next,
                        playersAllowed: playersAllowedForSideSize(
                          players,
                          next,
                        ),
                      });
                    }
                  }}
                  decreaseLabel={copy.smallerSide}
                  increaseLabel={copy.biggerSide}
                />
              </View>
            ) : null}
            <TextField
              label={m.game.partner.pricePerPlayer}
              value={draft.price}
              keyboardType="decimal-pad"
              onChangeText={(price) => update({ price })}
              error={errorFor("price") ?? errorFor("caps")}
              trailing={
                <View style={{ justifyContent: "center" }}>
                  <Text size="meta" tone="muted">
                    {m.createGame.price.currency}
                  </Text>
                </View>
              }
            />
            {sections.caps && sideSize != null ? (
              <>
                <Hint>{footballFormatNote(sideSize, players, locale)}</Hint>
                <Hint>
                  {playersCapWaitNote(players, context.joined, locale)}
                </Hint>
                <Hint>{editCopy.playersAndPriceHint}</Hint>
              </>
            ) : (
              <Hint>{copy.priceNote}</Hint>
            )}
          </View>
          {sections.level ? (
            <View style={{ gap: SECTION_GAP }}>
              <SectionHead title={copy.levelRange} meta={m.common.optional} />
              <Text weight="medium">{copy.minLevel}</Text>
              <ChipGrid
                label={copy.minLevel}
                chips={bands("min")}
                isSelected={(value) => value === draft.levelMin}
                onSelect={(levelMin) => update({ levelMin })}
              />
              <Text weight="medium">{copy.maxLevel}</Text>
              <ChipGrid
                label={copy.maxLevel}
                chips={bands("max")}
                isSelected={(value) => value === draft.levelMax}
                onSelect={(levelMax) => update({ levelMax })}
              />
              <FieldError message={errorFor("level")} />
            </View>
          ) : null}
          {edit.mvp ? (
            <MvpSection
              mvp={edit.mvp}
              onPick={edit.pickMvpMode}
              error={errorFor("mvp")}
            />
          ) : null}
          {showSeason ? (
            <SeasonSection
              edit={edit}
              context={context}
              onOpenPicker={() => setView("season")}
            />
          ) : null}
          <FieldError message={errorFor("season")} />
        </View>
      )}
    </Sheet>
  );
}
