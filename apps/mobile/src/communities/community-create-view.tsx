import { spacing } from "@repo/design-tokens";
import {
  COMMUNITY_CREATE_COPY,
  COMMUNITY_TYPE_LABELS,
  communityTypeHelp,
} from "@repo/domain/community";
import type { CommunityVisibility } from "@repo/domain/community-chrome";
import { View } from "react-native";

import { ChoiceRow } from "../lib/choice-row";
import { Button } from "../primitives/button";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";

export type CommunityCreateViewProps = {
  name: string;
  onNameChange: (name: string) => void;
  nameError: string | null;
  formError: string | null;
  type: CommunityVisibility;
  onTypeChange: (type: CommunityVisibility) => void;
  pending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

const CHOICES = [
  { value: "public" as const, label: COMMUNITY_TYPE_LABELS.public },
  { value: "private" as const, label: COMMUNITY_TYPE_LABELS.private },
];

export function CommunityCreateView(props: CommunityCreateViewProps) {
  return (
    <View style={{ gap: spacing.compact }}>
      <View style={{ gap: 4 }}>
        <Text size="h1" weight="bold" accessibilityRole="header">
          {COMMUNITY_CREATE_COPY.title}
        </Text>
        <Text size="meta" tone="muted">
          {COMMUNITY_CREATE_COPY.description}
        </Text>
      </View>
      {props.formError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {props.formError}
        </Text>
      ) : null}
      <TextField
        label="Name"
        value={props.name}
        onChangeText={props.onNameChange}
        error={props.nameError ?? undefined}
        maxLength={255}
        editable={!props.pending}
        returnKeyType="done"
      />
      <View style={{ gap: 6 }}>
        <Text weight="medium">Type</Text>
        <ChoiceRow
          label="Type"
          choices={CHOICES}
          value={props.type}
          onSelect={props.onTypeChange}
          disabled={props.pending}
        />
        <Text size="meta" tone="muted">
          {communityTypeHelp(props.type)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={COMMUNITY_CREATE_COPY.submit}
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
