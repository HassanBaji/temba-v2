import type { GroupHomeData } from "@repo/domain/group-data";
import {
  groupEditCanSave,
  groupEditChanges,
  groupSeasonCount,
  type GroupEditFields,
} from "@repo/domain/group-settings";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { SPORTS } from "@repo/domain/sport";
import { useRouter } from "expo-router";
import { useState } from "react";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { apiOrigin } from "../lib/api-origin-runtime";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { DeleteGroupSheet } from "./delete-group-sheet";
import {
  groupEditInitialFields,
  groupEditSaveFooter,
  groupEditSubtitle,
} from "./group-edit-model";
import { GroupEditFooter, GroupEditView } from "./group-edit-view";
import { groupHomeHeader } from "./group-home-model";
import { Notice } from "./notice";
import { TransferOwnershipSheet } from "./transfer-ownership-sheet";
import { useGroupAdmin } from "./use-group-admin";
import { useGroupInviteLink } from "./use-group-invite-link";
import { useGroupTransfer } from "./use-group-transfer";

function GroupEditForm({
  groupId,
  data,
}: {
  groupId: string;
  data: GroupHomeData;
}) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const initial = groupEditInitialFields(data);
  const [draft, setDraft] = useState<GroupEditFields>(initial);
  const [nameError, setNameError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const admin = useGroupAdmin(groupId, data);
  const inviteLink = useGroupInviteLink(groupId, data.canManageInviteLinks);

  const leaveToGroups = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/groups");
    }
  };

  const refreshGroup = () =>
    Promise.all([
      utils.groups.byId.invalidate({ id: groupId }),
      utils.groups.mine.invalidate(),
      utils.groups.listPublic.invalidate(),
      utils.users.home.invalidate(),
    ]);

  const save = api.groups.edit.useMutation({
    onSuccess: async () => {
      toast.show(m.group.settings.edit.savedToast);
      await refreshGroup();
      leaveToGroups();
    },
    onError: (error) => {
      const split = splitTrpcFormError(error);
      setNameError(split.fieldErrors.name ?? null);
      toast.show(
        split.globalMessage ?? split.fieldErrors.name ?? error.message,
      );
    },
  });

  const remove = api.groups.delete.useMutation({
    onSuccess: async () => {
      setDeleteOpen(false);
      toast.show(m.group.admin.deletedToast);
      await refreshGroup();
      router.replace("/groups");
    },
    onError: (error) => toast.show(error.message),
  });

  const transfer = useGroupTransfer(groupId, data.name, leaveToGroups);
  const dirty = groupEditChanges(initial, draft) != null;
  const canSave = groupEditCanSave(initial, draft) && !save.isPending;

  return (
    <Screen
      footer={
        <GroupEditFooter
          canSave={canSave}
          saving={save.isPending}
          footer={groupEditSaveFooter(dirty, locale)}
          onSave={() => {
            const changes = groupEditChanges(initial, draft);
            if (!changes) {
              return;
            }
            setNameError(null);
            save.mutate({ groupId, ...changes });
          }}
        />
      }
    >
      <GroupEditView
        subtitle={groupEditSubtitle(data, locale)}
        draft={draft}
        onChange={setDraft}
        nameError={nameError}
        sports={SPORTS}
        canChangeSport={data.canChangeSport}
        pendingJoinRequestCount={data.pendingJoinRequestCount}
        imageUri={groupHomeHeader(data, apiOrigin, locale).imageUri}
        imagePending={admin.imagePending}
        onChangeImage={() => void admin.changeImage()}
        onRemoveImage={admin.clearImage}
        inviteLink={
          data.canManageInviteLinks
            ? {
                url: inviteLink.url,
                loading: inviteLink.loading,
                copyPending: inviteLink.copyPending,
                createPending: inviteLink.createPending,
                resetPending: inviteLink.resetPending,
                onCopy: () => void inviteLink.copy(),
                onCreate: inviteLink.create,
                onReset: inviteLink.reset,
              }
            : null
        }
        canTransferOwnership={data.canTransferOwnership}
        canDelete={data.canDelete}
        onTransferOwnership={() => transfer.setOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        dirty={dirty}
        onDiscard={() => {
          setDraft(initial);
          setNameError(null);
        }}
        saving={save.isPending}
      />
      <DeleteGroupSheet
        visible={deleteOpen}
        name={data.name}
        gameCount={data.totalGamesPlayed}
        memberCount={data.standing.memberCount}
        seasonCount={groupSeasonCount(data.createdAt)}
        pending={remove.isPending}
        onDelete={() => remove.mutate({ groupId })}
        onClose={() => setDeleteOpen(false)}
      />
      <TransferOwnershipSheet
        visible={transfer.open}
        groupName={data.name}
        members={data.standing.leaderboard}
        apiOrigin={apiOrigin}
        pending={transfer.pending}
        onTransfer={transfer.transfer}
        onClose={() => transfer.setOpen(false)}
      />
    </Screen>
  );
}

export function GroupEditScreen({ groupId }: { groupId: string }) {
  const m = useMessages();
  const group = api.groups.byId.useQuery({ id: groupId });
  const header = <ScreenHeader nav="back" fallback="/groups" />;

  if (isNotFoundError(group.error)) {
    return (
      <Screen>
        {header}
        <Notice {...m.mobileGroup.edit.notFound} />
      </Screen>
    );
  }
  if (group.error && !group.data) {
    return (
      <Screen>
        {header}
        <Notice
          alert
          title={m.mobileGroup.loadFailed.group}
          description={group.error.message}
          onRetry={() => void group.refetch()}
        />
      </Screen>
    );
  }
  if (!group.data) {
    return (
      <Screen>
        {header}
        <Skeleton height={80} radius={16} />
        <Skeleton height={240} radius={16} />
      </Screen>
    );
  }
  if (!group.data.canEdit) {
    return (
      <Screen>
        {header}
        <Notice {...m.mobileGroup.edit.forbidden} />
      </Screen>
    );
  }
  return <GroupEditForm groupId={groupId} data={group.data} />;
}
