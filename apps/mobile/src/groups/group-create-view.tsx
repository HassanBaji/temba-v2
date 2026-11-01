import { colors, spacing } from "@repo/design-tokens";
import {
  GROUP_CREATE_COPY,
  GROUP_CREATE_SCREEN,
  groupCreateCanSubmit,
  type GroupCreateContext,
  type GroupCreateType,
} from "@repo/domain/group-create";
import {
  GROUP_JOINING_COPY,
  groupJoiningFooter,
} from "@repo/domain/group-settings";
import type { Sport } from "@repo/domain/sport";
import { Pressable, View } from "react-native";

import { Button } from "../primitives/button";
import { ScreenHeader } from "../primitives/screen-header";
import { Text } from "../primitives/text";
import {
  FORM_GAP,
  FormBlock,
  GroupNameField,
  PhotoTile,
  SportSegment,
  ToggleCard,
  VisibilityCards,
} from "./group-form-parts";

export type GroupCreateViewProps = {
  context: GroupCreateContext;
  name: string;
  onNameChange: (name: string) => void;
  nameError: string | null;
  formError: string | null;
  sports: readonly Sport[];
  showSportPicker: boolean;
  sport: Sport;
  onSportChange: (sport: Sport) => void;
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
  const canSubmit = groupCreateCanSubmit(props.name) && !props.pending;

  return (
    <View style={{ gap: spacing.section }}>
      <ScreenHeader
        nav="back"
        fallback="/groups"
        onNav={props.onCancel}
        title={GROUP_CREATE_SCREEN.title}
        actions={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={GROUP_CREATE_SCREEN.cancel}
            disabled={props.pending}
            onPress={props.onCancel}
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text>{GROUP_CREATE_SCREEN.cancel}</Text>
          </Pressable>
        }
      >
        <Text tone="muted" style={{ marginTop: -12 }}>
          {GROUP_CREATE_SCREEN.description[props.context]}
        </Text>
      </ScreenHeader>

      {props.formError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {props.formError}
        </Text>
      ) : null}

      <View style={{ gap: FORM_GAP }}>
        <View
          style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}
        >
          <View style={{ gap: 6, alignItems: "center" }}>
            <PhotoTile
              uri={props.imageUri}
              name={props.name || "Group"}
              label={props.imageUri ? "Change" : GROUP_CREATE_SCREEN.photo}
              disabled={props.pending}
              onPress={props.onPickImage}
            />
            {props.imageUri ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                disabled={props.pending}
                onPress={props.onClearImage}
                hitSlop={8}
              >
                <Text size="eyebrow" tone="muted">
                  Remove
                </Text>
              </Pressable>
            ) : null}
          </View>
          <GroupNameField
            label={GROUP_CREATE_SCREEN.nameLabel}
            value={props.name}
            onChangeText={props.onNameChange}
            placeholder={GROUP_CREATE_SCREEN.namePlaceholder}
            help={props.imageError ?? GROUP_CREATE_SCREEN.photoHelp}
            error={props.nameError}
            disabled={props.pending}
          />
        </View>

        {props.showSportPicker ? (
          <FormBlock label={GROUP_CREATE_SCREEN.sportLabel}>
            <SportSegment
              sports={props.sports}
              value={props.sport}
              onSelect={props.onSportChange}
              disabled={props.pending}
            />
          </FormBlock>
        ) : null}

        <FormBlock label={GROUP_CREATE_SCREEN.visibilityLabel}>
          <VisibilityCards
            context={props.context}
            value={props.type}
            onSelect={props.onTypeChange}
            disabled={props.pending}
          />
          {props.context === "club" ? (
            <Text size="eyebrow" tone="muted">
              {props.type === "private" ? copy.privateHelp : copy.publicHelp}
            </Text>
          ) : null}
        </FormBlock>

        {props.type === "public" ? (
          <FormBlock label={GROUP_JOINING_COPY.label}>
            <ToggleCard
              title={GROUP_JOINING_COPY.toggle}
              help={GROUP_JOINING_COPY.toggleHelp}
              footer={groupJoiningFooter({
                visibility: props.type,
                requiresApproval: props.requiresApproval,
              })}
              value={props.requiresApproval}
              onChange={props.onRequiresApprovalChange}
              disabled={props.pending}
            />
          </FormBlock>
        ) : null}
      </View>

      <View style={{ gap: 10, alignItems: "center" }}>
        <View style={{ alignSelf: "stretch" }}>
          <Button
            label={copy.submit}
            size="lg"
            pending={props.pending}
            disabled={!canSubmit}
            onPress={props.onSubmit}
          />
        </View>
        <Text size="eyebrow" style={{ color: colors.muted }}>
          {GROUP_CREATE_SCREEN.footnote}
        </Text>
      </View>
    </View>
  );
}
