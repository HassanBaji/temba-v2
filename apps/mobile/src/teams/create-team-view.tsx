import { spacing } from "@repo/design-tokens";
import type { Sport } from "@repo/domain/sport";
import {
  teamSportChoices,
  type TeamRosterDraftView,
} from "@repo/domain/team-roster-draft";
import { Plus, X } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { TileChoices } from "../auth/onboarding-choices";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
import { ScreenHeader } from "../primitives/screen-header";
import { Section } from "../primitives/section";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useColors } from "../theme/theme-provider";

export type CreateTeamViewProps = {
  name: string;
  sport: Sport;
  onSportChange: (sport: Sport) => void;
  /** Set when the Team is created from a Group: the sport is the Group's. */
  tagNote: string | null;
  onNameChange: (name: string) => void;
  nameError: string | null;
  formError: string | null;
  roster: TeamRosterDraftView;
  onAddMore: () => void;
  onRemoveRow: (key: string) => void;
  pending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

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
  const notOnTemba = row.detail != null;
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: spacing.surface,
      }}
    >
      <Avatar name={row.name} size="lg" />
      <View
        accessible
        accessibilityLabel={[row.name, row.status, row.detail]
          .filter(Boolean)
          .join(m.group.metaSeparator)}
        style={{ flex: 1, minWidth: 0, gap: 2 }}
      >
        <Text weight="semibold" numberOfLines={1}>
          {row.name}
        </Text>
        <Text size="meta" tone="muted" numberOfLines={1}>
          {row.status}
        </Text>
        {notOnTemba ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <NotOnTembaMark />
            <Text size="meta" tone="muted" ltr>
              {row.detail}
            </Text>
          </View>
        ) : null}
      </View>
      {row.removeLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={row.removeLabel}
          disabled={disabled}
          onPress={onRemove}
          hitSlop={12}
        >
          <X size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function CreateTeamView(props: CreateTeamViewProps) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const { roster } = props;
  return (
    <View style={{ gap: spacing.section }}>
      <View style={{ gap: spacing.compact }}>
        <View style={{ gap: 4 }}>
          <ScreenHeader
            nav="close"
            fallback="/profile"
            title={m.team.createLabel}
          />
          <Text size="meta" tone="muted">
            {m.team.createDescription}
          </Text>
        </View>
        {props.formError ? (
          <Text size="meta" weight="medium" accessibilityRole="alert">
            {props.formError}
          </Text>
        ) : null}
        <View style={{ gap: 6 }}>
          <TextField
            label={m.team.nameLabel}
            value={props.name}
            onChangeText={props.onNameChange}
            error={props.nameError ?? undefined}
            maxLength={255}
            editable={!props.pending}
            returnKeyType="done"
          />
          <Text size="meta" tone="muted">
            {m.team.nameHint}
          </Text>
        </View>
        {props.tagNote ? (
          <Text size="meta">{props.tagNote}</Text>
        ) : (
          <TileChoices
            label={m.team.sportLabel}
            choices={teamSportChoices(locale)}
            value={props.sport}
            onSelect={props.onSportChange}
            disabled={props.pending}
          />
        )}
        {roster.helper ? (
          <Text size="meta" tone="muted">
            {roster.helper}
          </Text>
        ) : null}
      </View>

      <Section title={m.team.roster.title}>
        <View style={{ gap: 8 }}>
          <Text size="meta" tone="muted" accessibilityLiveRegion="polite">
            {roster.countLine}
          </Text>
          <Surface padded={false} style={{ overflow: "hidden" }}>
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
            {roster.addMore ? (
              <>
                <Hairline />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={[
                    roster.addMore.title,
                    roster.addMore.detail,
                  ].join(m.group.metaSeparator)}
                  disabled={props.pending}
                  onPress={props.onAddMore}
                  style={{
                    minHeight: 56,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: spacing.surface,
                  }}
                >
                  <Plus size={20} color={colors.ink} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text weight="semibold">{roster.addMore.title}</Text>
                    <Text size="meta" tone="muted">
                      {roster.addMore.detail}
                    </Text>
                  </View>
                </Pressable>
              </>
            ) : null}
          </Surface>
          {roster.fullLine ? (
            <Text size="meta" tone="muted">
              {roster.fullLine}
            </Text>
          ) : null}
          {roster.footer ? (
            <Text size="meta" tone="muted">
              {roster.footer}
            </Text>
          ) : null}
        </View>
      </Section>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={m.team.createLabel}
          pending={props.pending}
          onPress={props.onSubmit}
        />
        <Button
          label={m.common.cancel}
          variant="outline"
          disabled={props.pending}
          onPress={props.onCancel}
        />
      </View>
    </View>
  );
}
