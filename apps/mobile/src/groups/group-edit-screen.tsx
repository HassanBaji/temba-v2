import { clubGroupSportChoice } from "@repo/domain/community-sports";
import type { GroupHomeData } from "@repo/domain/group-data";
import { GROUP_DELETED_TOAST } from "@repo/domain/group-admin";
import {
  GROUP_EDIT_COPY,
  groupEditCanSave,
  groupEditChanges,
  groupSeasonCount,
  type GroupEditFields,
} from "@repo/domain/group-settings";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { SPORTS } from "@repo/domain/sport";
import { useRouter } from "expo-router";
import { useState } from "react";

import { splitTrpcFormError } from "../lib/form-error";
import { apiOrigin } from "../lib/api-origin-runtime";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { DeleteGroupSheet } from "./delete-group-sheet";
import {
  GROUP_EDIT_FORBIDDEN_COPY,
  GROUP_EDIT_NOT_FOUND_COPY,
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
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const initial = groupEditInitialFields(data);
  const [draft, setDraft] = useState<GroupEditFields>(initial);
  const [nameError, setNameError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const admin = useGroupAdmin(groupId, data);
  const inviteLink = useGroupInviteLink(groupId, data.canManageInviteLinks);
  const context = data.communityId ? "club" : "loose";
  const community = api.communities.byId.useQuery(
    { id: data.communityId ?? "" },
    { enabled: Boolean(data.communityId) && data.canChangeSport },
  );
  const sports =
    context === "club"
      ? clubGroupSportChoice(community.data?.sports ?? []).sports
      : SPORTS;

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
      data.communityId
        ? utils.communities.byId.invalidate({ id: data.communityId })
        : Promise.resolve(),
    ]);

  const save = api.groups.edit.useMutation({
    onSuccess: async () => {
      toast.show(GROUP_EDIT_COPY.savedToast);
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
      toast.show(GROUP_DELETED_TOAST);
      await Promise.all([refreshGroup(), utils.communities.mine.invalidate()]);
      router.replace("/groups");
    },
    onError: (error) => toast.show(error.message),
  });

  const transfer = useGroupTransfer(groupId, data.name, leaveToGroups);
  const canSave = groupEditCanSave(initial, draft) && !save.isPending;

  return (
    <Screen
      footer={
        <GroupEditFooter
          canSave={canSave}
          saving={save.isPending}
          footer={groupEditSaveFooter(groupEditChanges(initial, draft) != null)}
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
        context={context}
        subtitle={groupEditSubtitle(data)}
        draft={draft}
        onChange={setDraft}
        nameError={nameError}
        sports={sports}
        canChangeSport={data.canChangeSport}
        pendingJoinRequestCount={data.pendingJoinRequestCount}
        imageUri={groupHomeHeader(data, apiOrigin).imageUri}
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
  const group = api.groups.byId.useQuery({ id: groupId });
  const header = <ScreenHeader nav="back" fallback="/groups" />;

  if (isNotFoundError(group.error)) {
    return (
      <Screen>
        {header}
        <Notice {...GROUP_EDIT_NOT_FOUND_COPY} />
      </Screen>
    );
  }
  if (group.error && !group.data) {
    return (
      <Screen>
        {header}
        <Notice
          alert
          title="Group could not be loaded"
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
        <Notice {...GROUP_EDIT_FORBIDDEN_COPY} />
      </Screen>
    );
  }
  return <GroupEditForm groupId={groupId} data={group.data} />;
}
