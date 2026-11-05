import { colors, sizes, spacing } from "@repo/design-tokens";
import type { GroupCreateContext } from "@repo/domain/group-create";
import {
  groupJoiningToggleHelp,
  type GroupEditFields,
} from "@repo/domain/group-settings";
import type { Sport } from "@repo/domain/sport";
import { ArrowRightLeft, Copy, RefreshCw, Trash2 } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
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
  const m = useMessages();
  const edit = m.group.settings.edit;
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingStart: 18,
          paddingEnd: 10,
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
          {link.loading ? "…" : (link.url ?? edit.inviteLinkNone)}
        </Text>
        {link.url ? (
          <Button
            label={m.common.copy}
            variant="outline"
            size="sm"
            icon={<Copy size={sizes.iconRow} color={colors.ink} />}
            pending={link.copyPending}
            onPress={link.onCopy}
          />
        ) : (
          <Button
            label={edit.inviteLinkCreate}
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
            accessibilityLabel={edit.inviteLinkReset}
            accessibilityState={{ busy: link.resetPending }}
            disabled={link.resetPending}
            onPress={link.onReset}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 18,
              minHeight: 48,
              backgroundColor: pressed ? colors.wash : colors.paper,
              opacity: link.resetPending ? 0.5 : 1,
            })}
          >
            <Text size="meta" tone="muted" style={{ flex: 1 }}>
              {edit.inviteLinkReset}
            </Text>
            <RefreshCw size={sizes.iconRow} color={colors.ink} />
          </Pressable>
        </>
      ) : null}
    </Surface>
  );
}

export function GroupEditView(props: GroupEditViewProps) {
  const m = useMessages();
  const locale = useLocale();
  const edit = m.group.settings.edit;
  const joining = m.group.settings.joining;
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
        title={edit.title}
        actions={
          props.dirty ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={edit.discard}
              disabled={disabled}
              onPress={props.onDiscard}
              hitSlop={10}
              style={({ pressed }) => ({
                paddingHorizontal: 6,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text tone="muted">{edit.discard}</Text>
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
              name={draft.name || m.mobileGroup.photoFallbackName}
              label={edit.photoChange}
              empty="initials"
              disabled={props.imagePending || disabled}
              onPress={props.onChangeImage}
            />
            {props.imageUri ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={edit.photoRemove}
                disabled={props.imagePending || disabled}
                onPress={props.onRemoveImage}
                hitSlop={8}
              >
                <Text size="eyebrow" tone="muted">
                  {m.common.remove}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <GroupNameField
            label={edit.nameLabel}
            value={draft.name}
            onChangeText={(name) => set({ name })}
            help={edit.nameHelp}
            error={props.nameError}
            disabled={disabled}
          />
        </View>

        <FormBlock label={edit.sportLabel}>
          {props.canChangeSport && draft.sport ? (
            <View style={{ gap: 6 }}>
              <SportSegment
                sports={props.sports}
                value={draft.sport}
                onSelect={(sport) => set({ sport })}
                disabled={disabled}
              />
              <Text size="eyebrow" tone="muted">
                {edit.sportOpen}
              </Text>
            </View>
          ) : (
            <LockedSportCard sport={draft.sport} help={edit.sportLocked} />
          )}
        </FormBlock>

        <FormBlock label={edit.visibilityLabel}>
          <VisibilityCards
            context={props.context}
            value={draft.visibility}
            onSelect={(visibility) => set({ visibility })}
            disabled={disabled}
          />
        </FormBlock>

        {draft.visibility === "public" ? (
          <FormBlock label={joining.label}>
            <ToggleCard
              title={joining.toggle}
              help={groupJoiningToggleHelp({
                requiresApproval: draft.requiresApproval,
                pendingRequestCount: props.pendingJoinRequestCount,
                locale,
              })}
              value={draft.requiresApproval}
              onChange={(requiresApproval) => set({ requiresApproval })}
              disabled={disabled}
            />
          </FormBlock>
        ) : null}

        {props.inviteLink ? (
          <FormBlock label={edit.inviteLinkLabel}>
            <InviteLinkCard link={props.inviteLink} />
          </FormBlock>
        ) : null}

        {showOwnership ? (
          <FormBlock label={edit.ownershipLabel}>
            <SheetMenu>
              {[
                props.canTransferOwnership ? (
                  <SheetMenuRow
                    key="transfer"
                    label={edit.transferTitle}
                    hint={edit.transferHint}
                    icon={ArrowRightLeft}
                    trailing="chevron"
                    disabled={disabled}
                    onPress={props.onTransferOwnership}
                  />
                ) : null,
                props.canDelete ? (
                  <SheetMenuRow
                    key="delete"
                    label={edit.deleteTitle}
                    hint={edit.deleteHint}
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
  const m = useMessages();
  return (
    <View style={{ flex: 1, gap: 8, alignItems: "center" }}>
      <View style={{ alignSelf: "stretch" }}>
        <Button
          label={m.group.settings.edit.save}
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
