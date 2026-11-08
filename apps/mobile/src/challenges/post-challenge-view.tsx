import { spacing } from "@repo/design-tokens";
import type { ChallengeCardView } from "@repo/domain/challenge-card";
import {
  CHALLENGE_MAX_SLOTS,
  CHALLENGE_MAX_VENUES,
  CHALLENGE_NOTE_MAX,
  challengeFormatOptions,
  challengeNoteCount,
  challengeSlotDayOptions,
  challengeSlotTimeOptions,
  challengeTimingOptions,
  challengeWeekdayOptions,
  type ChallengeDraft,
  type ChallengeDraftField,
  type ChallengeTiming,
  type ChallengeWeekday,
} from "@repo/domain/challenge-form";
import { isLevelBoundDisabled } from "@repo/domain/create-game-flow";
import { formatGameStart } from "@repo/domain/format-game-start";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import {
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";
import { X } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { ChipGrid, FieldError } from "../create-game/chips";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useColors } from "../theme/theme-provider";
import { ChallengeLines, ChallengeSeats } from "./challenge-card";
import { CHALLENGES_PATH, type PostableTeam } from "./challenges-model";

type Venue = { id: string; name: string };

export type PostChallengeFormProps = {
  now: Date;
  teams: PostableTeam[];
  team: PostableTeam | null;
  venues: Venue[];
  draft: ChallengeDraft;
  errors: Partial<Record<ChallengeDraftField, string>>;
  formError: string | null;
  slotDay: string;
  slotMinutes: number;
  onSlotDay: (day: string) => void;
  onSlotMinutes: (minutes: number) => void;
  onAddSlot: () => void;
  onRemoveSlot: (slot: Date) => void;
  onTeam: (teamId: string) => void;
  onSideSize: (sideSize: number) => void;
  onToggleVenue: (venueId: string) => void;
  onToggleDay: (day: ChallengeWeekday) => void;
  onToggleTiming: (timing: ChallengeTiming) => void;
  onLevel: (bound: "min" | "max", value: LevelBandSelectValue) => void;
  onNote: (note: string) => void;
  onReview: () => void;
};

function Field({
  title,
  hint,
  error,
  children,
}: {
  title: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text size="lead" weight="semibold">
        {title}
      </Text>
      {hint ? (
        <Text size="meta" tone="muted">
          {hint}
        </Text>
      ) : null}
      {children}
      <FieldError message={error} />
    </View>
  );
}

function LevelBound({
  bound,
  value,
  other,
  onChange,
}: {
  bound: "min" | "max";
  value: LevelBandSelectValue;
  other: LevelBandSelectValue;
  onChange: (value: LevelBandSelectValue) => void;
}) {
  const m = useMessages().challenge.post;
  return (
    <View style={{ gap: 6 }}>
      <Text size="meta" tone="muted">
        {bound === "min" ? m.levelMin : m.levelMax}
      </Text>
      <ChipGrid
        label={bound === "min" ? m.levelMin : m.levelMax}
        columns={5}
        dense
        chips={ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => ({
          value: band,
          label: band,
          ltr: true,
          accessibilityLabel:
            bound === "min" ? m.levelMinA11y(band) : m.levelMaxA11y(band),
          disabled: isLevelBoundDisabled(bound, band, other),
        }))}
        isSelected={(band) => band === value}
        onSelect={(band) =>
          onChange(band === value ? LEVEL_BAND_SELECT_NONE : band)
        }
      />
    </View>
  );
}

/** 3a: Team, Format, Venues, Days, Timings or exact slots, Level wanted, a line. */
export function PostChallengeForm(props: PostChallengeFormProps) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const copy = m.challenge.post;
  const { draft, team } = props;
  const venuesFull = draft.venueIds.length >= CHALLENGE_MAX_VENUES;
  const slotsFull = draft.exactSlots.length >= CHALLENGE_MAX_SLOTS;
  return (
    <View style={{ gap: spacing.section }}>
      <View style={{ gap: 4 }}>
        <ScreenHeader
          nav="close"
          fallback={CHALLENGES_PATH}
          title={copy.title}
        />
        <Text size="meta" tone="muted">
          {copy.description}
        </Text>
      </View>
      {props.formError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {props.formError}
        </Text>
      ) : null}

      <Field title={copy.team} error={props.errors.team}>
        <ChipGrid
          label={copy.team}
          chips={props.teams.map((option) => ({
            value: option.id,
            label: option.displayName,
          }))}
          isSelected={(id) => id === draft.teamId}
          onSelect={props.onTeam}
        />
      </Field>

      {team?.sport === "football" ? (
        <Field
          title={copy.format}
          hint={copy.formatHelp}
          error={props.errors.format}
        >
          <ChipGrid
            label={copy.format}
            columns={3}
            chips={challengeFormatOptions(team.rosterCount, locale)}
            isSelected={(side) => side === draft.sideSize}
            onSelect={props.onSideSize}
          />
        </Field>
      ) : null}

      {team ? (
        <Field
          title={copy.venues}
          hint={copy.venuesHint(CHALLENGE_MAX_VENUES)}
          error={props.errors.venues}
        >
          <ChipGrid
            label={copy.venues}
            multiple
            check
            chips={props.venues.map((venue) => ({
              value: venue.id,
              label: venue.name,
              disabled: venuesFull && !draft.venueIds.includes(venue.id),
            }))}
            isSelected={(id) => draft.venueIds.includes(id)}
            onSelect={props.onToggleVenue}
          />
        </Field>
      ) : null}

      <Field title={copy.days} hint={copy.daysHint}>
        <ChipGrid
          label={copy.days}
          multiple
          columns={4}
          dense
          chips={challengeWeekdayOptions(locale)}
          isSelected={(day) => draft.days.includes(day)}
          onSelect={props.onToggleDay}
        />
      </Field>

      <Field title={copy.timings} hint={copy.timingsHint}>
        <ChipGrid
          label={copy.timings}
          multiple
          columns={3}
          chips={challengeTimingOptions(locale)}
          isSelected={(timing) => draft.timings.includes(timing)}
          onSelect={props.onToggleTiming}
        />
        <Text size="meta" tone="muted">
          {challengeTimingOptions(locale)
            .map((timing) => copy.timingLine(timing.label, timing.detail))
            .join(m.group.metaSeparator)}
        </Text>
      </Field>

      <Field
        title={copy.slots}
        hint={copy.slotsHint(CHALLENGE_MAX_SLOTS)}
        error={props.errors.slots}
      >
        {draft.exactSlots.map((slot) => {
          const label = formatGameStart(slot, locale);
          return (
            <View
              key={slot.toISOString()}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text style={{ flex: 1 }}>{label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.removeSlot(label)}
                onPress={() => props.onRemoveSlot(slot)}
                hitSlop={12}
              >
                <X size={20} color={colors.muted} />
              </Pressable>
            </View>
          );
        })}
        {slotsFull ? null : (
          <View style={{ gap: 8 }}>
            <Text size="meta" tone="muted">
              {copy.slotDay}
            </Text>
            <ChipGrid
              label={copy.slotDay}
              columns={4}
              dense
              chips={challengeSlotDayOptions(props.now, locale)}
              isSelected={(day) => day === props.slotDay}
              onSelect={props.onSlotDay}
            />
            <Text size="meta" tone="muted">
              {copy.slotTime}
            </Text>
            <ChipGrid
              label={copy.slotTime}
              columns={4}
              dense
              chips={challengeSlotTimeOptions(locale)}
              isSelected={(minutes) => minutes === props.slotMinutes}
              onSelect={props.onSlotMinutes}
            />
            <View style={{ flexDirection: "row" }}>
              <Button
                label={copy.addSlot}
                variant="outline"
                onPress={props.onAddSlot}
              />
            </View>
          </View>
        )}
      </Field>

      <Field
        title={copy.level}
        hint={copy.levelHint}
        error={props.errors.level}
      >
        <LevelBound
          bound="min"
          value={draft.levelMin}
          other={draft.levelMax}
          onChange={(value) => props.onLevel("min", value)}
        />
        <LevelBound
          bound="max"
          value={draft.levelMax}
          other={draft.levelMin}
          onChange={(value) => props.onLevel("max", value)}
        />
      </Field>

      <Field title={copy.note} error={props.errors.note}>
        <TextField
          value={draft.note}
          onChangeText={props.onNote}
          placeholder={copy.notePlaceholder}
          maxLength={CHALLENGE_NOTE_MAX}
          multiline
        />
        <Text size="meta" tone="muted">
          {challengeNoteCount(draft.note, locale)}
        </Text>
      </Field>

      <Button label={copy.review} size="lg" onPress={props.onReview} />
    </View>
  );
}

/** 3b: the card as it will appear, then what posting means. */
export function PostChallengeReview({
  card,
  lines,
  formError,
  pending,
  onBack,
  onSubmit,
}: {
  card: ChallengeCardView;
  lines: { key: string; text: string }[];
  formError: string | null;
  pending: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const m = useMessages().challenge;
  return (
    <View style={{ gap: spacing.section }}>
      <ScreenHeader
        nav="back"
        fallback={CHALLENGES_PATH}
        onNav={onBack}
        title={m.review.title}
      />
      <View style={{ gap: 8 }}>
        <Text size="meta" tone="muted" mono uppercase>
          {m.review.cardTitle}
        </Text>
        <Surface style={{ gap: spacing.compact }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text size="lead" weight="semibold" style={{ flex: 1 }}>
              {card.title}
            </Text>
            <Text size="meta" tone="muted">
              {card.proposalsLine}
            </Text>
          </View>
          <ChallengeSeats card={card} />
          <ChallengeLines card={card} />
          {card.note ? <Text size="meta">{card.note}</Text> : null}
        </Surface>
      </View>
      <View style={{ gap: 8 }}>
        {lines.map((line) => (
          <Text key={line.key}>{line.text}</Text>
        ))}
      </View>
      {formError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button label={m.post.back} variant="outline" onPress={onBack} />
        <Button label={m.post.submit} pending={pending} onPress={onSubmit} />
      </View>
    </View>
  );
}
