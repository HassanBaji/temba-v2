import { radii, sizes } from "@repo/design-tokens";
import type { ChallengeCardView } from "@repo/domain/challenge-card";
import {
  CHALLENGE_MAX_SLOTS,
  CHALLENGE_NOTE_MAX,
  challengeDaysHint,
  challengeFormatHelp,
  challengeFormatOptions,
  challengeLevelChip,
  challengeLevelChips,
  challengeLevelHint,
  challengeLevelSelected,
  challengeNoteCount,
  challengeRosterHint,
  challengeSlotLabel,
  challengeTeamChoice,
  challengeTimingOptions,
  challengeVenueChoice,
  challengeWeekdayOptions,
  type ChallengeDraft,
  type ChallengeDraftField,
  type ChallengeNudgeView,
  type ChallengeTiming,
  type ChallengeWeekday,
} from "@repo/domain/challenge-form";
import type { AssignableDisplayLevelBand } from "@repo/domain/level-bands";
import { Plus, Send, X } from "lucide-react-native";
import { Pressable, Switch, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useColors } from "../theme/theme-provider";
import { ChallengeCardPreview } from "./challenge-card";
import type { PostableTeam } from "./challenges-model";
import {
  PostChallengeChip,
  PostChallengeGrid,
  PostChallengeHeader,
  PostChallengeSection,
  PostChallengeTeamCard,
} from "./post-challenge-parts";

type Venue = { id: string; name: string; city: string };

const SLOT_HEIGHT = 40;

export type PostChallengeFormProps = {
  now: Date;
  teams: PostableTeam[];
  team: PostableTeam | null;
  venues: Venue[];
  draft: ChallengeDraft;
  errors: Partial<Record<ChallengeDraftField, string>>;
  formError: string | null;
  onTeam: (teamId: string) => void;
  onSideSize: (sideSize: number) => void;
  onToggleVenue: (venueId: string) => void;
  onAnyVenue: () => void;
  onToggleDay: (day: ChallengeWeekday) => void;
  onToggleTiming: (timing: ChallengeTiming) => void;
  onAddSlot: () => void;
  onRemoveSlot: (slot: Date) => void;
  onLevel: (band: AssignableDisplayLevelBand) => void;
  onNote: (note: string) => void;
};

function SlotChips({
  now,
  slots,
  onAdd,
  onRemove,
}: {
  now: Date;
  slots: Date[];
  onAdd: () => void;
  onRemove: (slot: Date) => void;
}) {
  const copy = useMessages().challenge.post;
  const locale = useLocale();
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {slots.map((slot) => {
        const label = challengeSlotLabel(slot, now, locale);
        return (
          <Pressable
            key={slot.toISOString()}
            accessibilityRole="button"
            accessibilityLabel={copy.removeSlot(label)}
            onPress={() => onRemove(slot)}
            style={({ pressed }) => ({
              height: SLOT_HEIGHT,
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: radii.md,
              borderWidth: hairline,
              borderColor: colors.ink,
              backgroundColor: pressed ? colors.wash : colors.paper,
            })}
          >
            <Text size="meta" weight="semibold">
              {label}
            </Text>
            <X size={sizes.iconRow - 2} color={colors.muted} />
          </Pressable>
        );
      })}
      {slots.length < CHALLENGE_MAX_SLOTS ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAdd}
          style={({ pressed }) => ({
            height: SLOT_HEIGHT,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderRadius: radii.md,
            borderWidth: hairline,
            borderStyle: "dashed",
            borderColor: colors.inputBorder,
            backgroundColor: pressed ? colors.wash : colors.paper,
          })}
        >
          <Plus size={sizes.iconRow - 2} color={colors.muted} />
          <Text size="meta" tone="muted">
            {copy.addSlot}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** 3a: Team, Format, Preferred venues, Days, Timings, Level wanted, a line. */
export function PostChallengeForm(props: PostChallengeFormProps) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.challenge.post;
  const { draft, team } = props;
  const venueChoice = challengeVenueChoice(
    props.venues,
    draft.venueIds,
    locale,
  );
  const levelRange = { levelMin: draft.levelMin, levelMax: draft.levelMax };
  return (
    <>
      <PostChallengeHeader title={copy.title} />
      {props.formError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {props.formError}
        </Text>
      ) : null}

      <PostChallengeSection
        title={copy.team}
        hint={copy.teamHint}
        error={props.errors.team}
      >
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={copy.team}
          style={{ gap: 8 }}
        >
          {Array.from(
            { length: Math.ceil(props.teams.length / 2) },
            (_, row) => (
              <View key={row} style={{ flexDirection: "row", gap: 8 }}>
                {props.teams.slice(row * 2, row * 2 + 2).map((option) => {
                  const choice = challengeTeamChoice(option, locale);
                  return (
                    <PostChallengeTeamCard
                      key={choice.value}
                      title={choice.title}
                      detail={choice.detail}
                      accessibilityLabel={choice.accessibilityLabel}
                      selected={choice.value === draft.teamId}
                      onPress={() => props.onTeam(option.id)}
                    />
                  );
                })}
                {props.teams.length % 2 === 1 &&
                row === Math.floor(props.teams.length / 2) ? (
                  <View style={{ flex: 1 }} />
                ) : null}
              </View>
            ),
          )}
        </View>
      </PostChallengeSection>

      {team?.sport === "football" ? (
        <PostChallengeSection
          title={copy.format}
          hint={challengeRosterHint(team.rosterCount, locale)}
          error={props.errors.format}
        >
          <View style={{ gap: 8 }}>
            <PostChallengeGrid label={copy.format} columns={3}>
              {challengeFormatOptions(team.rosterCount, locale).map(
                (option) => (
                  <PostChallengeChip
                    key={option.value}
                    label={option.label}
                    accessibilityLabel={option.accessibilityLabel}
                    selected={option.value === draft.sideSize}
                    disabled={option.disabled}
                    onPress={() => props.onSideSize(option.value)}
                  />
                ),
              )}
            </PostChallengeGrid>
            <Text size="eyebrow" tone="muted">
              {challengeFormatHelp(team, draft.sideSize, locale)}
            </Text>
          </View>
        </PostChallengeSection>
      ) : null}

      {team ? (
        <PostChallengeSection
          title={copy.venues}
          hint={venueChoice.hint}
          error={props.errors.venues}
        >
          <PostChallengeGrid label={copy.venues} columns={2} multiple>
            {[
              ...venueChoice.chips.map((chip) => (
                <PostChallengeChip
                  key={chip.value}
                  multiple
                  label={chip.label}
                  selected={draft.venueIds.includes(chip.value)}
                  disabled={chip.disabled}
                  onPress={() => props.onToggleVenue(chip.value)}
                />
              )),
              <PostChallengeChip
                key="anywhere"
                multiple
                label={venueChoice.anywhere.label}
                selected={venueChoice.anywhere.selected}
                onPress={props.onAnyVenue}
              />,
            ]}
          </PostChallengeGrid>
        </PostChallengeSection>
      ) : null}

      <PostChallengeSection
        title={copy.days}
        hint={challengeDaysHint(draft.days, locale)}
      >
        <PostChallengeGrid label={copy.days} columns={7} multiple>
          {challengeWeekdayOptions(locale).map((day) => (
            <PostChallengeChip
              key={day.value}
              multiple
              label={day.label}
              accessibilityLabel={day.accessibilityLabel}
              selected={draft.days.includes(day.value)}
              onPress={() => props.onToggleDay(day.value)}
            />
          ))}
        </PostChallengeGrid>
      </PostChallengeSection>

      <PostChallengeSection
        title={copy.timings}
        hint={copy.timingsHint}
        error={props.errors.slots}
      >
        <View style={{ gap: 8 }}>
          <PostChallengeGrid label={copy.timings} columns={3} multiple>
            {challengeTimingOptions(locale).map((timing) => (
              <PostChallengeChip
                key={timing.value}
                multiple
                label={timing.label}
                accessibilityLabel={timing.accessibilityLabel}
                selected={draft.timings.includes(timing.value)}
                onPress={() => props.onToggleTiming(timing.value)}
              />
            ))}
          </PostChallengeGrid>
          <SlotChips
            now={props.now}
            slots={draft.exactSlots}
            onAdd={props.onAddSlot}
            onRemove={props.onRemoveSlot}
          />
        </View>
      </PostChallengeSection>

      <PostChallengeSection
        title={copy.level}
        hint={challengeLevelHint(levelRange, locale, team?.sport)}
        error={props.errors.level}
      >
        <PostChallengeGrid
          label={copy.level}
          columns={team?.sport === "football" ? 3 : 6}
          multiple
        >
          {challengeLevelChips(team?.teamLevel?.tenths ?? null, levelRange).map(
            (band) => {
              const chip = challengeLevelChip(band, team?.sport, locale);
              return (
                <PostChallengeChip
                  key={band}
                  multiple
                  ltr
                  label={chip.label}
                  accessibilityLabel={chip.accessibilityLabel}
                  selected={challengeLevelSelected(levelRange, band)}
                  onPress={() => props.onLevel(band)}
                />
              );
            },
          )}
        </PostChallengeGrid>
      </PostChallengeSection>

      <PostChallengeSection title={copy.note} error={props.errors.note}>
        <View style={{ gap: 6 }}>
          <TextField
            accessibilityLabel={copy.note}
            value={draft.note}
            onChangeText={props.onNote}
            maxLength={CHALLENGE_NOTE_MAX}
            multiline
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text size="eyebrow" tone="muted">
              {copy.noteShown}
            </Text>
            <Text size="eyebrow" tone="muted">
              {challengeNoteCount(draft.note, locale)}
            </Text>
          </View>
        </View>
      </PostChallengeSection>
    </>
  );
}

/** "Also send it straight to a team you've played?" and the switch; which Team when there are several. */
function NudgeRow({
  nudge,
  onNudge,
}: {
  nudge: ChallengeNudgeView;
  onNudge: (teamId: string | null) => void;
}) {
  const colors = useColors();
  const text = `${nudge.before}${nudge.teamName}${nudge.after}`;
  return (
    <View
      style={{
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: colors.paper,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Send size={18} color={colors.ink} style={mirrorInRtl} />
        <Text size="meta" tone="muted" style={{ flex: 1 }}>
          {nudge.before}
          <Text size="meta" weight="semibold">
            {nudge.teamName}
          </Text>
          {nudge.after}
        </Text>
        <Switch
          accessibilityLabel={text}
          value={nudge.on}
          onValueChange={(on) => onNudge(on ? nudge.firstTeamId : null)}
          trackColor={{ false: colors.rule, true: colors.ink }}
          thumbColor={nudge.on ? colors.paper : colors.onControl}
          ios_backgroundColor={colors.rule}
        />
      </View>
      {nudge.on && nudge.options.length > 1 ? (
        <PostChallengeGrid label={nudge.teamsLabel} columns={2}>
          {nudge.options.map((option) => (
            <PostChallengeChip
              key={option.value}
              label={option.label}
              selected={option.value === nudge.selected}
              onPress={() => onNudge(option.value)}
            />
          ))}
        </PostChallengeGrid>
      ) : null}
    </View>
  );
}

/** 3b: the card as the board will show it, what posting means, and the nudge. */
export function PostChallengeReview({
  card,
  rows,
  nudge,
  onNudge,
  formError,
  onBack,
}: {
  card: ChallengeCardView;
  rows: { key: string; label: string; value: string }[];
  nudge: ChallengeNudgeView | null;
  onNudge: (teamId: string | null) => void;
  formError: string | null;
  onBack: () => void;
}) {
  const m = useMessages().challenge;
  const colors = useColors();
  return (
    <>
      <PostChallengeHeader title={m.review.title} onBack={onBack} />
      <View style={{ gap: 10 }}>
        <Text size="meta" tone="muted">
          {m.review.cardTitle}
        </Text>
        <ChallengeCardPreview card={card} />
      </View>
      <View
        style={{
          borderRadius: radii.card,
          borderWidth: hairline,
          borderColor: colors.rule,
          backgroundColor: colors.paper,
          overflow: "hidden",
        }}
      >
        {rows.map((row, index) => (
          <View
            key={row.key}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 16,
              paddingVertical: 14,
              paddingHorizontal: 18,
              borderTopWidth: index > 0 ? hairline : 0,
              borderTopColor: colors.rule,
            }}
          >
            <Text tone="muted">{row.label}</Text>
            <Text style={{ flex: 1, textAlign: "right" }}>{row.value}</Text>
          </View>
        ))}
      </View>
      {nudge ? <NudgeRow nudge={nudge} onNudge={onNudge} /> : null}
      {formError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}
    </>
  );
}
