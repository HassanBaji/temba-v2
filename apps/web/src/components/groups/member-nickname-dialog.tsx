"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { NicknameName } from "~/components/temba/nickname-name";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";
import {
  MEMBER_NICKNAME_MAX_LENGTH,
  MEMBER_NICKNAME_VISIBILITIES,
  type MemberNicknameVisibility,
} from "@repo/domain/member-nickname";
import {
  memberNicknameSheetSubtitle,
  memberNicknameSheetView,
  type MemberNicknameTarget,
} from "@repo/domain/member-nickname-sheet";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

const NAME_ID = "member-nickname-name";
const COUNTER_ID = "member-nickname-counter";
const WHO_SEES_ID = "member-nickname-who-sees";

function NicknameForm({
  groupId,
  groupName,
  member,
  onDone,
}: {
  groupId: string;
  groupName: string;
  member: MemberNicknameTarget;
  onDone: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.group.nickname;
  const utils = api.useUtils();
  const [draft, setDraft] = React.useState(member.nickname?.name ?? "");
  const [visibility, setVisibility] = React.useState<MemberNicknameVisibility>(
    member.nickname?.visibility ?? "approvers",
  );
  const save = api.groups.setMemberNickname.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async (result) => {
      toast.success(
        result.nickname
          ? copy.savedToast(result.nickname.name)
          : copy.clearedToast(member.name),
      );
      await Promise.all([
        utils.groups.byId.invalidate({ id: groupId }),
        utils.groups.seasonStanding.invalidate({ groupId }),
        utils.games.listGroupMembersToAdd.invalidate(),
        utils.games.byId.invalidate(),
        utils.games.footballBoard.invalidate(),
      ]);
      onDone();
    },
  });
  const view = memberNicknameSheetView(
    { member, draft, visibility, groupName },
    locale,
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (view.canSave && !save.isPending) {
          save.mutate({
            groupId,
            userId: member.userId,
            nickname: view.nickname,
            visibility,
          });
        }
      }}
      className="space-y-6 px-4 pb-4 md:px-0 md:pb-0"
    >
      <Field>
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel htmlFor={NAME_ID}>{copy.fieldLabel}</FieldLabel>
          <span
            id={COUNTER_ID}
            aria-label={view.counterSpoken}
            className="text-eyebrow text-muted-foreground font-mono"
          >
            {view.counter}
          </span>
        </div>
        <Input
          id={NAME_ID}
          value={draft}
          placeholder={copy.placeholder}
          maxLength={MEMBER_NICKNAME_MAX_LENGTH}
          autoComplete="off"
          aria-describedby={COUNTER_ID}
          disabled={save.isPending}
          onChange={(event) => setDraft(event.target.value)}
        />
        {save.error ? <FieldError>{save.error.message}</FieldError> : null}
      </Field>

      <section className="space-y-2">
        <p className="text-meta text-muted-foreground">{copy.previewLabel}</p>
        <div className="border-rule rounded-card flex items-center gap-3 border px-4 py-3">
          <UserAvatar
            name={member.name}
            image={member.imageUri}
            className="size-8 shrink-0"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <NicknameName
              name={view.preview.main}
              isNickname={view.preview.isNickname}
              className="text-body font-semibold"
            />
            <span className="text-eyebrow text-muted-foreground truncate">
              {view.preview.sub}
            </span>
          </span>
        </div>
      </section>

      <section className="space-y-2">
        <p id={WHO_SEES_ID} className="text-meta text-muted-foreground">
          {copy.whoSees}
        </p>
        <RovingRadioGroup
          aria-labelledby={WHO_SEES_ID}
          className="grid grid-cols-2 gap-2"
        >
          {MEMBER_NICKNAME_VISIBILITIES.map((option) => {
            const selected = visibility === option;
            const choice = copy.visibility[option];
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={save.isPending}
                onClick={() => setVisibility(option)}
                className={cn(
                  "focus-visible:ring-ring/50 rounded-md border p-3 text-start outline-none focus-visible:ring-[3px]",
                  selected
                    ? "border-ink bg-wash"
                    : "border-rule bg-paper hover:bg-wash",
                )}
              >
                <span className="text-meta block font-semibold">
                  {choice.title}
                </span>
                <span className="text-eyebrow text-muted-foreground mt-1 block">
                  {choice.description}
                </span>
              </button>
            );
          })}
        </RovingRadioGroup>
        <p aria-live="polite" className="text-eyebrow text-muted-foreground">
          {view.note}
        </p>
      </section>

      <div className="space-y-2">
        <Button
          type="submit"
          size="lg"
          className="w-full font-semibold"
          disabled={!view.canSave || save.isPending}
        >
          {save.isPending && view.nickname != null
            ? m.common.saving
            : view.saveLabel}
        </Button>
        {view.canClear ? (
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                groupId,
                userId: member.userId,
                nickname: null,
                visibility,
              })
            }
          >
            {copy.clear}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** "Name in this Group" (design "Group names" 1c): a Group approver names a member. */
export function MemberNicknameDialog({
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
  const subtitle = member
    ? memberNicknameSheetSubtitle(member, groupName, locale)
    : "";
  return (
    <ResponsiveDialog
      open={member != null}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {m.group.nickname.title}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{subtitle}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {member ? (
          <NicknameForm
            key={member.userId}
            groupId={groupId}
            groupName={groupName}
            member={member}
            onDone={onClose}
          />
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
