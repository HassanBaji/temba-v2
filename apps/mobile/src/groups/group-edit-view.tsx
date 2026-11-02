import { colors, sizes, spacing } from "@repo/design-tokens";
import type { GroupCreateContext } from "@repo/domain/group-create";
import {
  GROUP_EDIT_COPY,
  GROUP_JOINING_COPY,
  groupJoiningFooter,
  groupJoiningToggleHelp,
  type GroupEditFields,
} from "@repo/domain/group-settings";
import type { Sport } from "@repo/domain/sport";
import { ArrowRightLeft, Copy, RefreshCw, Trash2 } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { ScreenHeader } from "../primitives/screen-header";
import { SheetMenu, SheetMenuRow } from "../primitives/sheet-menu";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import {
  FORM_GAP,
  FormBlock,
  GroupNameField,
  LockedSportCard,
  PhotoTile,
  SportSegment,
  ToggleCard,
  VisibilityCards,
} from "./group-form-parts";

export type GroupEditViewProps = {
  context: GroupCreateContext;
  subtitle: string;
  draft: GroupEditFields;
  onChange: (next: GroupEditFields) => void;
  nameError: string | null;
  sports: readonly Sport[];
  canChangeSport: boolean;
  pendingJoinRequestCount: number;
  imageUri: string | null;
  imagePending: boolean;
  onChangeImage: () => void;
  onRemoveImage: () => void;
  inviteLink: {
    url: string | null;
    loading: boolean;
    copyPending: boolean;
    resetPending: boolean;
    createPending: boolean;
    onCopy: () => void;
    onCreate: () => void;
    onReset: () => void;
  } | null;
  canTransferOwnership: boolean;
  canDelete: boolean;
  onTransferOwnership: () => void;
  onDelete: () => void;
  /** Whether the draft differs from the Group as loaded. */
  dirty: boolean;
  onDiscard: () => void;
  saving: boolean;
};

function InviteLinkCard({
  link,
}: {
  link: NonNullable<GroupEditViewProps["inviteLink"]>;
}) {
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingLeft: 18,
          paddingRight: 10,
          paddingVertical: 10,
          minHeight: 56,
        }}
      >
        <Text
          mono
          size="meta"
          numberOfLines={1}
          tone={link.url ? "default" : "muted"}
          style={{ flex: 1, minWidth: 0 }}
        >
          {link.loading ? "…" : (link.url ?? GROUP_EDIT_COPY.inviteLinkNone)}
        </Text>
        {link.url ? (
          <Button
            label={GROUP_EDIT_COPY.inviteLinkCopy}
            variant="outline"
            size="sm"
            icon={<Copy size={sizes.iconRow} color={colors.ink} />}
            pending={link.copyPending}
            onPress={link.onCopy}
          />
        ) : (
          <Button
            label={GROUP_EDIT_COPY.inviteLinkCreate}
            variant="outline"
            size="sm"
            pending={link.createPending}
            disabled={link.loading}
            onPress={link.onCreate}
          />
        )}
      </View>
      {link.url ? (
        <>
          <Hairline />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={GROUP_EDIT_COPY.inviteLinkReset}
            accessibilityState={{ busy: link.resetPending }}
            disabled={link.resetPending}
            onPress={link.onReset}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingLeft: 18,
              paddingRight: 18,
              minHeight: 48,
              backgroundColor: pressed ? colors.wash : colors.paper,
              opacity: link.resetPending ? 0.5 : 1,
            })}
          >
            <Text size="meta" tone="muted" style={{ flex: 1 }}>
              {GROUP_EDIT_COPY.inviteLinkReset}
            </Text>
            <RefreshCw size={sizes.iconRow} color={colors.ink} />
          </Pressable>
        </>
      ) : null}
    </Surface>
  );
}

export function GroupEditView(props: GroupEditViewProps) {
  const { draft } = props;
  const set = (patch: Partial<GroupEditFields>) =>
    props.onChange({ ...draft, ...patch });
  const disabled = props.saving;
  const showOwnership = props.canTransferOwnership || props.canDelete;

  return (
    <View style={{ gap: spacing.section }}>
      <ScreenHeader
        nav="back"
        fallback="/groups"
        title={GROUP_EDIT_COPY.title}
        actions={
          props.dirty ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={GROUP_EDIT_COPY.discard}
              disabled={disabled}
              onPress={props.onDiscard}
              hitSlop={10}
              style={({ pressed }) => ({
                paddingHorizontal: 6,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text tone="muted">{GROUP_EDIT_COPY.discard}</Text>
            </Pressable>
          ) : undefined
        }
      >
        <Text tone="muted" style={{ marginTop: -12 }}>
          {props.subtitle}
        </Text>
      </ScreenHeader>

      <View style={{ gap: FORM_GAP }}>
        <View
          style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}
        >
          <View style={{ gap: 6, alignItems: "center" }}>
            <PhotoTile
              uri={props.imageUri}
              name={draft.name || "Group"}
              label={GROUP_EDIT_COPY.photoChange}
              empty="initials"
              disabled={props.imagePending || disabled}
              onPress={props.onChangeImage}
            />
            {props.imageUri ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={GROUP_EDIT_COPY.photoRemove}
                disabled={props.imagePending || disabled}
                onPress={props.onRemoveImage}
                hitSlop={8}
              >
                <Text size="eyebrow" tone="muted">
                  Remove
                </Text>
              </Pressable>
            ) : null}
          </View>
          <GroupNameField
            label={GROUP_EDIT_COPY.nameLabel}
            value={draft.name}
            onChangeText={(name) => set({ name })}
            help={GROUP_EDIT_COPY.nameHelp}
            error={props.nameError}
            disabled={disabled}
          />
        </View>

        <FormBlock label={GROUP_EDIT_COPY.sportLabel}>
          {props.canChangeSport && draft.sport ? (
            <View style={{ gap: 6 }}>
              <SportSegment
                sports={props.sports}
                value={draft.sport}
                onSelect={(sport) => set({ sport })}
                disabled={disabled}
              />
              <Text size="eyebrow" tone="muted">
                {GROUP_EDIT_COPY.sportOpen}
              </Text>
            </View>
          ) : (
            <LockedSportCard
              sport={draft.sport}
              help={GROUP_EDIT_COPY.sportLocked}
            />
          )}
        </FormBlock>

        <FormBlock label={GROUP_EDIT_COPY.visibilityLabel}>
          <VisibilityCards
            context={props.context}
            value={draft.visibility}
            onSelect={(visibility) => set({ visibility })}
            disabled={disabled}
          />
        </FormBlock>

        {draft.visibility === "public" ? (
          <FormBlock label={GROUP_JOINING_COPY.label}>
            <ToggleCard
              title={GROUP_JOINING_COPY.toggle}
              help={groupJoiningToggleHelp(props.pendingJoinRequestCount)}
              footer={groupJoiningFooter({
                visibility: draft.visibility,
                requiresApproval: draft.requiresApproval,
              })}
              value={draft.requiresApproval}
              onChange={(requiresApproval) => set({ requiresApproval })}
              disabled={disabled}
            />
          </FormBlock>
        ) : null}

        {props.inviteLink ? (
          <FormBlock label={GROUP_EDIT_COPY.inviteLinkLabel}>
            <InviteLinkCard link={props.inviteLink} />
          </FormBlock>
        ) : null}

        {showOwnership ? (
          <FormBlock label={GROUP_EDIT_COPY.ownershipLabel}>
            <SheetMenu>
              {[
                props.canTransferOwnership ? (
                  <SheetMenuRow
                    key="transfer"
                    label={GROUP_EDIT_COPY.transferTitle}
                    hint={GROUP_EDIT_COPY.transferHint}
                    icon={ArrowRightLeft}
                    trailing="chevron"
                    disabled={disabled}
                    onPress={props.onTransferOwnership}
                  />
                ) : null,
                props.canDelete ? (
                  <SheetMenuRow
                    key="delete"
                    label={GROUP_EDIT_COPY.deleteTitle}
                    hint={GROUP_EDIT_COPY.deleteHint}
                    trailing={Trash2}
                    tone="danger"
                    disabled={disabled}
                    onPress={props.onDelete}
                  />
                ) : null,
              ]}
            </SheetMenu>
          </FormBlock>
        ) : null}
      </View>
    </View>
  );
}

export function GroupEditFooter({
  canSave,
  saving,
  footer,
  onSave,
}: {
  canSave: boolean;
  saving: boolean;
  footer: string | null;
  onSave: () => void;
}) {
  return (
    <View style={{ flex: 1, gap: 8, alignItems: "center" }}>
      <View style={{ alignSelf: "stretch" }}>
        <Button
          label={GROUP_EDIT_COPY.save}
          size="lg"
          pending={saving}
          disabled={!canSave}
          onPress={onSave}
        />
      </View>
      {footer ? (
        <Text size="eyebrow" tone="muted">
          {footer}
        </Text>
      ) : null}
    </View>
  );
}
