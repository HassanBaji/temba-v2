"use client";

import {
  ArrowRightLeftIcon,
  CopyIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { use, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { SheetMenu, SheetMenuRow } from "~/components/common/sheet-menu";
import { DashboardShell } from "~/components/dashboard-shell";
import { DeleteGroupSheet } from "~/components/groups/delete-group-sheet";
import {
  FormBlock,
  GroupNameField,
  GroupPhotoTile,
  LockedSportCard,
  SportSegment,
  ToggleCard,
  VisibilityCards,
} from "~/components/groups/group-form-parts";
import { TransferOwnershipSheet } from "~/components/groups/transfer-ownership-sheet";
import { PageTitle } from "~/components/layout/page-title";
import { Button } from "~/components/ui/button";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { clubGroupSportChoice } from "@repo/domain/community-sports";
import {
  ENTITY_IMAGE_ACCEPT,
  entityImageFileError,
  entityImageUploadInput,
} from "@repo/domain/entity-image-file";
import {
  GROUP_DELETED_TOAST,
  GROUP_IMAGE_REMOVED_TOAST,
  GROUP_IMAGE_SAVED_TOAST,
} from "@repo/domain/group-admin";
import {
  GROUP_EDIT_COPY,
  GROUP_JOINING_COPY,
  GROUP_LINK_COPIED_TOAST,
  GROUP_LINK_RESET_TOAST,
  groupEditCanSave,
  groupEditChanges,
  groupEditMetaLine,
  groupJoiningFooter,
  groupJoiningToggleHelp,
  groupOwnershipTransferredToast,
  groupSeasonCount,
  type GroupEditFields,
} from "@repo/domain/group-settings";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { isSport, SPORTS, sportLabel } from "@repo/domain/sport";
import {
  fieldErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { api, type RouterOutputs } from "~/trpc/react";

type GroupData = RouterOutputs["groups"]["byId"];

const IDS = {
  name: "group-edit-name",
  sport: "group-edit-sport",
  visibility: "group-edit-visibility",
  approval: "group-edit-requires-approval",
};

function groupHref(groupId: string) {
  return `/dashboard/groups/${groupId}`;
}

function initialFields(data: GroupData): GroupEditFields {
  return {
    name: data.name ?? "",
    sport: isSport(data.sport) ? data.sport : null,
    visibility: data.type === "private" ? "private" : "public",
    requiresApproval: data.requiresApproval,
  };
}

function EditGroupFrame({
  groupId,
  subtitle,
  action,
  children,
}: {
  groupId: string;
  subtitle: string | null;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      title={GROUP_EDIT_COPY.title}
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[26px] pb-6">
        <header className="mt-6 flex flex-col gap-[18px] lg:mt-2">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <BackButton
              variant="boxed"
              href={groupHref(groupId)}
              label="Back to the Group"
            />
            {action}
          </div>
          <div className="flex flex-col gap-1.5">
            <PageTitle variant="hero" className="text-ink text-[30px]">
              {GROUP_EDIT_COPY.title}
            </PageTitle>
            {subtitle ? (
              <p className="text-body text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </header>
        {children}
      </div>
    </DashboardShell>
  );
}

function InviteLinkCard({
  groupId,
  enabled,
}: {
  groupId: string;
  enabled: boolean;
}) {
  const utils = api.useUtils();
  const link = api.groups.getInviteLink.useQuery({ groupId }, { enabled });
  const create = api.groups.createInviteLink.useMutation({
    onSuccess: () => utils.groups.getInviteLink.invalidate({ groupId }),
    onError: (error) => toast.error(error.message),
  });
  const reset = api.groups.resetInviteLink.useMutation({
    onSuccess: async () => {
      await utils.groups.getInviteLink.invalidate({ groupId });
      toast.success(GROUP_LINK_RESET_TOAST);
    },
    onError: (error) => toast.error(error.message),
  });
  const url = link.data ? (link.data.shortUrl ?? link.data.inviteUrl) : null;

  async function copy() {
    if (!url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(GROUP_LINK_COPIED_TOAST);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="border-rule flex flex-col overflow-hidden rounded-[12px] border">
      <div className="flex min-h-[56px] items-center gap-3 py-2.5 ps-[18px] pe-2.5">
        <span
          className={
            url
              ? "text-meta min-w-0 flex-1 truncate font-mono"
              : "text-meta text-muted-foreground min-w-0 flex-1 truncate"
          }
        >
          {link.isPending && enabled
            ? "…"
            : (url ?? GROUP_EDIT_COPY.inviteLinkNone)}
        </span>
        {url ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copy()}
          >
            <CopyIcon aria-hidden="true" />
            {GROUP_EDIT_COPY.inviteLinkCopy}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            pending={create.isPending}
            disabled={link.isPending}
            onClick={() => create.mutate({ groupId })}
          >
            {GROUP_EDIT_COPY.inviteLinkCreate}
          </Button>
        )}
      </div>
      {url ? (
        <button
          type="button"
          disabled={reset.isPending}
          aria-busy={reset.isPending || undefined}
          onClick={() => reset.mutate({ groupId })}
          className="border-rule hover:bg-wash focus-visible:ring-ring/50 flex min-h-12 items-center gap-3 border-t px-[18px] text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset disabled:opacity-50"
        >
          <span className="text-meta text-muted-foreground flex-1">
            {GROUP_EDIT_COPY.inviteLinkReset}
          </span>
          <RefreshCwIcon aria-hidden="true" className="size-4 shrink-0" />
        </button>
      ) : null}
    </div>
  );
}

/** Design "Group create and edit flow" 03. */
function EditGroupForm({
  groupId,
  data,
}: {
  groupId: string;
  data: GroupData;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const initial = initialFields(data);
  const [draft, setDraft] = useState<GroupEditFields>(initial);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const context = data.communityId ? "club" : "loose";
  const community = api.communities.byId.useQuery(
    { id: data.communityId ?? "" },
    { enabled: Boolean(data.communityId) && data.canChangeSport },
  );
  const sports =
    context === "club"
      ? clubGroupSportChoice(community.data?.sports ?? []).sports
      : SPORTS;

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
      toast.success(GROUP_EDIT_COPY.savedToast);
      await refreshGroup();
      router.push(groupHref(groupId));
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const remove = api.groups.delete.useMutation({
    onSuccess: async (result) => {
      setDeleteOpen(false);
      toast.success(GROUP_DELETED_TOAST);
      await Promise.all([refreshGroup(), utils.communities.mine.invalidate()]);
      router.push(
        result.communityId
          ? `/dashboard/communities/${result.communityId}`
          : "/dashboard/groups",
      );
    },
    onError: (error) => toast.error(error.message),
  });

  const transfer = api.groups.transferOwnership.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const uploadImage = api.groups.uploadImage.useMutation({
    onSuccess: async () => {
      toast.success(GROUP_IMAGE_SAVED_TOAST);
      await refreshGroup();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const clearImage = api.groups.clearImage.useMutation({
    onSuccess: async () => {
      toast.success(GROUP_IMAGE_REMOVED_TOAST);
      await refreshGroup();
    },
    onError: (error) => toast.error(error.message),
  });

  function onChangeImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploadImage.isPending) {
      return;
    }
    const pickedError = entityImageFileError(file);
    if (pickedError) {
      toast.error(pickedError);
      return;
    }
    void entityImageUploadInput(file)
      .then((input) =>
        uploadImage.mutateAsync({
          groupId,
          contentType: input.contentType,
          dataBase64: input.dataBase64,
        }),
      )
      .catch(() => undefined);
  }

  const set = (patch: Partial<GroupEditFields>) =>
    setDraft((current) => ({ ...current, ...patch }));
  const dirty = groupEditChanges(initial, draft) != null;
  const canSave = groupEditCanSave(initial, draft) && !save.isPending;
  const disabled = save.isPending;
  const imagePending = uploadImage.isPending || clearImage.isPending;
  const showOwnership = data.canTransferOwnership || data.canDelete;
  const nameError = fieldErrorMessage(save.error, "name");

  return (
    <EditGroupFrame
      groupId={groupId}
      subtitle={groupEditMetaLine({
        name: data.name,
        sportLabel: sportLabel(data.sport),
        memberCount: data.standing.memberCount,
      })}
      action={
        dirty ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setDraft(initial);
              save.reset();
            }}
            className="text-body text-muted-foreground hover:text-ink inline-flex min-h-11 items-center px-1.5"
          >
            {GROUP_EDIT_COPY.discard}
          </button>
        ) : null
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const changes = groupEditChanges(initial, draft);
          if (!changes || save.isPending) {
            return;
          }
          save.mutate({ groupId, ...changes });
        }}
        className="flex flex-col gap-[26px]"
      >
        <div className="flex items-start gap-3.5">
          <div className="flex flex-col items-center gap-1.5">
            <GroupPhotoTile
              imageUrl={data.imageUrl}
              name={draft.name || "Group"}
              label={GROUP_EDIT_COPY.photoChange}
              empty="initials"
              pending={imagePending}
              disabled={disabled || !data.canManageImage}
              onPick={() => imageInputRef.current?.click()}
            />
            {data.imageUrl && data.canManageImage ? (
              <button
                type="button"
                disabled={imagePending || disabled}
                onClick={() => clearImage.mutate({ groupId })}
                className="text-eyebrow text-muted-foreground hover:text-ink min-h-6"
              >
                Remove
              </button>
            ) : null}
            <input
              ref={imageInputRef}
              type="file"
              accept={ENTITY_IMAGE_ACCEPT}
              className="hidden"
              tabIndex={-1}
              disabled={imagePending}
              onChange={onChangeImageFile}
            />
          </div>
          <GroupNameField
            id={IDS.name}
            label={GROUP_EDIT_COPY.nameLabel}
            value={draft.name}
            onChange={(name) => set({ name })}
            help={GROUP_EDIT_COPY.nameHelp}
            error={nameError}
            disabled={disabled}
          />
        </div>

        <FormBlock
          label={GROUP_EDIT_COPY.sportLabel}
          labelId={`${IDS.sport}-label`}
        >
          {data.canChangeSport && draft.sport ? (
            <div className="flex flex-col gap-1.5">
              <SportSegment
                labelledBy={`${IDS.sport}-label`}
                sports={sports}
                value={draft.sport}
                onSelect={(sport) => set({ sport })}
                disabled={disabled}
              />
              <p className="text-eyebrow text-muted-foreground">
                {GROUP_EDIT_COPY.sportOpen}
              </p>
            </div>
          ) : (
            <LockedSportCard
              sport={draft.sport}
              help={GROUP_EDIT_COPY.sportLocked}
            />
          )}
        </FormBlock>

        <FormBlock
          label={GROUP_EDIT_COPY.visibilityLabel}
          labelId={`${IDS.visibility}-label`}
        >
          <VisibilityCards
            labelledBy={`${IDS.visibility}-label`}
            context={context}
            value={draft.visibility}
            onSelect={(visibility) => set({ visibility })}
            disabled={disabled}
          />
        </FormBlock>

        {draft.visibility === "public" ? (
          <FormBlock label={GROUP_JOINING_COPY.label}>
            <ToggleCard
              id={IDS.approval}
              title={GROUP_JOINING_COPY.toggle}
              help={groupJoiningToggleHelp(data.pendingJoinRequestCount)}
              footer={groupJoiningFooter({
                visibility: draft.visibility,
                requiresApproval: draft.requiresApproval,
              })}
              checked={draft.requiresApproval}
              onCheckedChange={(requiresApproval) => set({ requiresApproval })}
              disabled={disabled}
            />
          </FormBlock>
        ) : null}

        {data.canManageInviteLinks ? (
          <FormBlock label={GROUP_EDIT_COPY.inviteLinkLabel}>
            <InviteLinkCard groupId={groupId} enabled />
          </FormBlock>
        ) : null}

        {showOwnership ? (
          <FormBlock label={GROUP_EDIT_COPY.ownershipLabel}>
            <SheetMenu>
              {data.canTransferOwnership ? (
                <SheetMenuRow
                  label={GROUP_EDIT_COPY.transferTitle}
                  hint={GROUP_EDIT_COPY.transferHint}
                  icon={ArrowRightLeftIcon}
                  trailing="chevron"
                  disabled={disabled}
                  onSelect={() => setTransferOpen(true)}
                />
              ) : null}
              {data.canDelete ? (
                <SheetMenuRow
                  label={GROUP_EDIT_COPY.deleteTitle}
                  hint={GROUP_EDIT_COPY.deleteHint}
                  trailing={Trash2Icon}
                  tone="danger"
                  disabled={disabled}
                  onSelect={() => setDeleteOpen(true)}
                />
              ) : null}
            </SheetMenu>
          </FormBlock>
        ) : null}

        <div className="border-rule flex flex-col items-center gap-2.5 border-t pt-3.5">
          <Button
            type="submit"
            size="lg"
            pending={save.isPending}
            pendingLabel="Saving…"
            disabled={!canSave}
            className="w-full font-semibold"
          >
            {GROUP_EDIT_COPY.save}
          </Button>
          <p className="text-eyebrow text-muted-foreground" aria-live="polite">
            {dirty
              ? GROUP_EDIT_COPY.unsavedChanges
              : GROUP_EDIT_COPY.nothingChanged}
          </p>
        </div>
      </form>

      <DeleteGroupSheet
        open={deleteOpen}
        name={data.name}
        gameCount={data.totalGamesPlayed}
        memberCount={data.standing.memberCount}
        seasonCount={groupSeasonCount(data.createdAt)}
        pending={remove.isPending}
        onDelete={() => remove.mutate({ groupId })}
        onOpenChange={setDeleteOpen}
      />
      <TransferOwnershipSheet
        open={transferOpen}
        groupName={data.name}
        members={data.standing.leaderboard}
        pending={transfer.isPending}
        onTransfer={(member) =>
          transfer.mutate(
            { groupId, userId: member.userId },
            {
              onSuccess: () => {
                setTransferOpen(false);
                toast.success(
                  groupOwnershipTransferredToast(member.name, data.name),
                );
                void refreshGroup().then(() => router.push(groupHref(groupId)));
              },
            },
          )
        }
        onOpenChange={setTransferOpen}
      />
    </EditGroupFrame>
  );
}

export default function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const group = api.groups.byId.useQuery({ id });

  if (isNotFoundError(group.error)) {
    notFound();
  }

  if (group.isLoading) {
    return (
      <EditGroupFrame groupId={id} subtitle={null}>
        <div aria-busy="true" className="flex flex-col gap-5">
          <Skeleton className="h-20 w-full rounded-[16px]" />
          <Skeleton className="h-14 w-full rounded-[12px]" />
          <Skeleton className="h-32 w-full rounded-[16px]" />
        </div>
      </EditGroupFrame>
    );
  }

  if (!group.data) {
    return (
      <EditGroupFrame groupId={id} subtitle={null}>
        <ErrorState
          title="Group could not be loaded"
          message={group.error?.message}
          onRetry={() => {
            void group.refetch();
          }}
        />
      </EditGroupFrame>
    );
  }

  if (!group.data.canEdit) {
    return (
      <EditGroupFrame groupId={id} subtitle={group.data.name}>
        <ErrorState
          title="Only the owner can edit this Group"
          message="Ask the Group owner to change its settings."
          onRetry={() => {
            void group.refetch();
          }}
        />
      </EditGroupFrame>
    );
  }

  return <EditGroupForm groupId={id} data={group.data} />;
}
