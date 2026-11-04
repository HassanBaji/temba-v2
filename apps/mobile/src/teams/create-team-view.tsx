import { spacing } from "@repo/design-tokens";
import { SPORTS, type Sport } from "@repo/domain/sport";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { SportChoiceRow } from "../lib/sport-choice-row";
import { Button } from "../primitives/button";
import { ScreenHeader } from "../primitives/screen-header";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";

export type CreateTeamViewProps = {
  name: string;
  sport: Sport;
  onSportChange: (sport: Sport) => void;
  onNameChange: (name: string) => void;
  nameError: string | null;
  formError: string | null;
  pending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

export function CreateTeamView(props: CreateTeamViewProps) {
  const m = useMessages();
  return (
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
      <SportChoiceRow
        sports={SPORTS}
        value={props.sport}
        onSelect={props.onSportChange}
        disabled={props.pending}
      />
      <View style={{ gap: 6 }}>
        <TextField
          label={m.team.nameLabel}
          value={props.name}
          onChangeText={props.onNameChange}
          error={props.nameError ?? undefined}
          maxLength={255}
          editable={!props.pending}
          returnKeyType="done"
          onSubmitEditing={props.onSubmit}
        />
        <Text size="meta" tone="muted">
          {m.team.nameHint}
        </Text>
      </View>
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
