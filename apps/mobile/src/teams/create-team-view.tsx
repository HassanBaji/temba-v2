import { spacing } from "@repo/design-tokens";
import {
  TEAM_CREATE_DESCRIPTION,
  TEAM_CREATE_LABEL,
  TEAM_NAME_HINT,
  TEAM_NAME_LABEL,
} from "@repo/domain/teams";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";

export type CreateTeamViewProps = {
  name: string;
  onNameChange: (name: string) => void;
  nameError: string | null;
  formError: string | null;
  pending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

export function CreateTeamView(props: CreateTeamViewProps) {
  return (
    <View style={{ gap: spacing.compact }}>
      <View style={{ gap: 4 }}>
        <Text size="h1" weight="bold" accessibilityRole="header">
          {TEAM_CREATE_LABEL}
        </Text>
        <Text size="meta" tone="muted">
          {TEAM_CREATE_DESCRIPTION}
        </Text>
      </View>
      {props.formError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {props.formError}
        </Text>
      ) : null}
      <View style={{ gap: 6 }}>
        <TextField
          label={TEAM_NAME_LABEL}
          value={props.name}
          onChangeText={props.onNameChange}
          error={props.nameError ?? undefined}
          maxLength={255}
          editable={!props.pending}
          returnKeyType="done"
          onSubmitEditing={props.onSubmit}
        />
        <Text size="meta" tone="muted">
          {TEAM_NAME_HINT}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={TEAM_CREATE_LABEL}
          pending={props.pending}
          onPress={props.onSubmit}
        />
        <Button
          label="Cancel"
          variant="outline"
          disabled={props.pending}
          onPress={props.onCancel}
        />
      </View>
    </View>
  );
}
