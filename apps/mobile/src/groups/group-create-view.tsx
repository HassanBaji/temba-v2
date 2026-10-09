import { spacing } from "@repo/design-tokens";
import { ENTITY_IMAGE_HELP } from "@repo/domain/entity-image-file";
import {
  GROUP_CREATE_CLUB_DESCRIPTION,
  GROUP_CREATE_COPY,
  GROUP_CREATE_LOOSE_DESCRIPTION,
  type GroupCreateContext,
  type GroupCreateType,
} from "@repo/domain/group-create";
import { GROUP_REQUIRE_APPROVAL_LABEL } from "@repo/domain/group-admin";
import { View } from "react-native";

import { ChoiceRow } from "../lib/choice-row";
import { ToggleRow } from "../lib/toggle-row";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { ScreenHeader } from "../primitives/screen-header";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";

export type GroupCreateViewProps = {
  context: GroupCreateContext;
  name: string;
  onNameChange: (name: string) => void;
  nameError: string | null;
  formError: string | null;
  type: GroupCreateType;
  onTypeChange: (type: GroupCreateType) => void;
  requiresApproval: boolean;
  onRequiresApprovalChange: (next: boolean) => void;
  imageUri: string | null;
  imageError: string | null;
  onPickImage: () => void;
  onClearImage: () => void;
  pending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

export function GroupCreateView(props: GroupCreateViewProps) {
  const copy = GROUP_CREATE_COPY[props.context];
  const choices = [
    { value: "public" as const, label: copy.publicLabel },
    { value: "private" as const, label: copy.privateLabel },
  ];

  return (
    <View style={{ gap: spacing.compact }}>
      <View style={{ gap: 4 }}>
        <ScreenHeader nav="close" fallback="/groups" title={copy.submit} />
        <Text size="meta" tone="muted">
          {props.context === "club"
            ? GROUP_CREATE_CLUB_DESCRIPTION
            : GROUP_CREATE_LOOSE_DESCRIPTION}
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
          choices={choices}
          value={props.type}
          onSelect={props.onTypeChange}
          disabled={props.pending}
        />
        <Text size="meta" tone="muted">
          {props.type === "private" ? copy.privateHelp : copy.publicHelp}
        </Text>
      </View>
      {props.type === "public" ? (
        <ToggleRow
          label={GROUP_REQUIRE_APPROVAL_LABEL}
          help={copy.approvalHelp}
          value={props.requiresApproval}
          onChange={props.onRequiresApprovalChange}
          disabled={props.pending}
        />
      ) : null}
      <View style={{ gap: 6 }}>
        <Text weight="medium">Image</Text>
        {props.imageUri ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar
              name="Selected Group image"
              uri={props.imageUri}
              size="xl"
            />
            <Button
              label="Clear"
              variant="outline"
              disabled={props.pending}
              onPress={props.onClearImage}
            />
          </View>
        ) : null}
        <View style={{ flexDirection: "row" }}>
          <Button
            label={props.imageUri ? "Choose another image" : "Add image"}
            variant="outline"
            disabled={props.pending}
            onPress={props.onPickImage}
          />
        </View>
        {props.imageError ? (
          <Text size="meta" weight="medium" accessibilityRole="alert">
            {props.imageError}
          </Text>
        ) : (
          <Text size="meta" tone="muted">
            {ENTITY_IMAGE_HELP}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={copy.submit}
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
