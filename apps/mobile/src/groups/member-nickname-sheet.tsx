import { radii, sizes } from "@repo/design-tokens";
import {
  MEMBER_NICKNAME_MAX_LENGTH,
  MEMBER_NICKNAME_VISIBILITIES,
  type MemberNicknameVisibility,
} from "@repo/domain/member-nickname";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { FieldError } from "../create-game/chips";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { NicknameName } from "../primitives/nickname-name";
import {
  memberNicknameSheetView,
  type MemberNicknameTarget,
} from "./member-nickname-model";

function VisibilityOption({
  visibility,
  selected,
  onPress,
}: {
  visibility: MemberNicknameVisibility;
  selected: boolean;
  onPress: () => void;
}) {
  const m = useMessages();
  const colors = useColors();
  const copy = m.mobileGroup.nickname.visibility[visibility];
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={m.mobileGroup.form.radio(
        copy.title,
        copy.description,
      )}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: sizes.touchTarget,
        gap: 4,
        padding: 12,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: selected ? colors.ink : colors.rule,
        backgroundColor: selected || pressed ? colors.wash : colors.paper,
      })}
    >
      <Text size="meta" weight="semibold">
        {copy.title}
      </Text>
      <Text size="eyebrow" tone="muted">
        {copy.description}
      </Text>
    </Pressable>
  );
}

/** "Name in this Group" (design "Group names" 1c): a Group approver names a member. */
export function MemberNicknameSheet({
  groupId,
  groupName,
  member,
  onClose,
}: {
  groupId: string;
  groupName: string;
  member: MemberNicknameTarget | null;
  onClose: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const [draft, setDraft] = useState("");
  const [visibility, setVisibility] =
    useState<MemberNicknameVisibility>("approvers");

  useEffect(() => {
    if (member) {
      setDraft(member.nickname?.name ?? "");
      setVisibility(member.nickname?.visibility ?? "approvers");
    }
  }, [member]);

  const save = api.groups.setMemberNickname.useMutation({
    onSuccess: async (result) => {
      toast.show(
        result.nickname
          ? m.mobileGroup.nickname.savedToast(result.nickname.name)
          : m.mobileGroup.nickname.clearedToast(member?.name ?? ""),
      );
      await Promise.all([
        utils.groups.byId.invalidate({ id: groupId }),
        utils.groups.seasonStanding.invalidate({ groupId }),
        utils.games.listGroupMembersToAdd.invalidate(),
        utils.games.byId.invalidate(),
        utils.games.footballBoard.invalidate(),
      ]);
      onClose();
    },
  });

  function close() {
    save.reset();
    onClose();
  }

  const view = member
    ? memberNicknameSheetView({ member, draft, visibility, groupName }, locale)
    : null;

  return (
    <Sheet
      visible={member != null}
      onClose={close}
      title={m.mobileGroup.nickname.title}
      subtitle={view?.subtitle}
      closeButton
      tall
      keyboardShouldPersistTaps="handled"
      footer={
        member && view ? (
          <View style={{ gap: 8 }}>
            <FieldError message={save.error?.message} />
            <Button
              label={view.saveLabel}
              size="lg"
              pending={save.isPending && view.nickname != null}
              disabled={!view.canSave || save.isPending}
              onPress={() =>
                save.mutate({
                  groupId,
                  userId: member.userId,
                  nickname: view.nickname,
                  visibility,
                })
              }
            />
            {view.canClear ? (
              <Button
                label={m.mobileGroup.nickname.clear}
                size="lg"
                variant="outline"
                disabled={save.isPending}
                onPress={() =>
                  save.mutate({
                    groupId,
                    userId: member.userId,
                    nickname: null,
                    visibility,
                  })
                }
              />
            ) : null}
          </View>
        ) : undefined
      }
    >
      {member && view ? (
        <View style={{ gap: 18 }}>
          <View style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <Text size="meta" tone="muted">
                {m.mobileGroup.nickname.fieldLabel}
              </Text>
              <Text
                size="eyebrow"
                tone="muted"
                mono
                accessibilityLabel={view.counterSpoken}
              >
                {view.counter}
              </Text>
            </View>
            <TextField
              accessibilityLabel={m.mobileGroup.nickname.fieldLabel}
              value={draft}
              placeholder={m.mobileGroup.nickname.placeholder}
              maxLength={MEMBER_NICKNAME_MAX_LENGTH}
              autoCapitalize="words"
              autoComplete="off"
              autoCorrect={false}
              editable={!save.isPending}
              onChangeText={setDraft}
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text size="meta" tone="muted">
              {m.mobileGroup.nickname.previewLabel}
            </Text>
            <Surface
              radius="card"
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Avatar name={member.name} uri={member.imageUri} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <NicknameName
                  name={view.preview.main}
                  isNickname={view.preview.isNickname}
                />
                <Text size="eyebrow" tone="muted" numberOfLines={1}>
                  {view.preview.sub}
                </Text>
              </View>
            </Surface>
          </View>

          <View style={{ gap: 8 }}>
            <Text size="meta" tone="muted">
              {m.mobileGroup.nickname.whoSees}
            </Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={m.mobileGroup.nickname.whoSees}
              style={{ flexDirection: "row", gap: 8 }}
            >
              {MEMBER_NICKNAME_VISIBILITIES.map((option) => (
                <VisibilityOption
                  key={option}
                  visibility={option}
                  selected={visibility === option}
                  onPress={() => setVisibility(option)}
                />
              ))}
            </View>
            <Text size="eyebrow" tone="muted" accessibilityLiveRegion="polite">
              {view.note}
            </Text>
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}
