import { spacing } from "@repo/design-tokens";
import {
  groupCreateCanSubmit,
  groupCreateCopy,
  groupCreateSubmitLabel,
  type GroupCreateContext,
  type GroupCreateType,
} from "@repo/domain/group-create";
import { groupJoiningFooter } from "@repo/domain/group-settings";
import type { Sport } from "@repo/domain/sport";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
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
  onCancel: () => void;
};

/** The form of design "Group create and edit flow" 01; the footer is pinned. */
export function GroupCreateView(props: GroupCreateViewProps) {
  const m = useMessages();
  const locale = useLocale();
  const copy = groupCreateCopy(props.context, locale);
  const screen = m.group.create.screen;
  const joining = m.group.settings.joining;

  return (
    <View style={{ gap: spacing.section }}>
      <ScreenHeader
        nav="back"
        fallback="/groups"
        onNav={props.onCancel}
        title={screen.title}
        actions={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={m.common.cancel}
            disabled={props.pending}
            onPress={props.onCancel}
            hitSlop={10}
            style={({ pressed }) => ({
              paddingHorizontal: 6,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text tone="muted">{m.common.cancel}</Text>
          </Pressable>
        }
      >
        <Text tone="muted" style={{ marginTop: -12 }}>
          {screen.description[props.context]}
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
              name={props.name || m.mobileGroup.photoFallbackName}
              label={
                props.imageUri
                  ? m.group.settings.edit.photoChange
                  : screen.photo
              }
              disabled={props.pending}
              onPress={props.onPickImage}
            />
            {props.imageUri ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={m.group.settings.edit.photoRemove}
                disabled={props.pending}
                onPress={props.onClearImage}
                hitSlop={8}
              >
                <Text size="eyebrow" tone="muted">
                  {m.common.remove}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <GroupNameField
            label={screen.nameLabel}
            value={props.name}
            onChangeText={props.onNameChange}
            placeholder={screen.namePlaceholder}
            help={props.imageError ?? screen.photoHelp}
            error={props.nameError}
            disabled={props.pending}
          />
        </View>

        {props.showSportPicker ? (
          <FormBlock label={screen.sportLabel}>
            <SportSegment
              sports={props.sports}
              value={props.sport}
              onSelect={props.onSportChange}
              disabled={props.pending}
            />
          </FormBlock>
        ) : null}

        <FormBlock label={screen.visibilityLabel}>
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
          <FormBlock label={joining.label}>
            <ToggleCard
              title={joining.toggle}
              help={joining.toggleHelp}
              footer={groupJoiningFooter({
                visibility: props.type,
                requiresApproval: props.requiresApproval,
                locale,
              })}
              value={props.requiresApproval}
              onChange={props.onRequiresApprovalChange}
              disabled={props.pending}
            />
          </FormBlock>
        ) : null}
      </View>
    </View>
  );
}

export function GroupCreateFooter({
  context,
  name,
  pending,
  onSubmit,
}: {
  context: GroupCreateContext;
  name: string;
  pending: boolean;
  onSubmit: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const canSubmit = groupCreateCanSubmit(name) && !pending;
  return (
    <View style={{ flex: 1, gap: 8, alignItems: "center" }}>
      <View style={{ alignSelf: "stretch" }}>
        <Button
          label={groupCreateSubmitLabel(context, name, locale)}
          size="lg"
          pending={pending}
          disabled={!canSubmit}
          onPress={onSubmit}
        />
      </View>
      <Text size="eyebrow" tone="muted">
        {m.group.create.screen.footnote}
      </Text>
    </View>
  );
}
