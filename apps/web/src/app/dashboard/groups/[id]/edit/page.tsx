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
import { useLocale, useMessages } from "~/components/locale-provider";
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
import {
  ENTITY_IMAGE_ACCEPT,
  entityImageFileError,
  entityImageUploadInput,
} from "@repo/domain/entity-image-file";
import {
  groupEditCanSave,
  groupEditChanges,
  groupEditMetaLine,
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
  const m = useMessages();
  return (
    <DashboardShell
      title={m.group.settings.edit.title}
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[26px] pb-6">
        <header className="mt-6 flex flex-col gap-[18px] lg:mt-2">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <BackButton
              variant="boxed"
              href={groupHref(groupId)}
              label={m.webDashboard.backToGroup}
            />
            {action}
          </div>
          <div className="flex flex-col gap-1.5">
            <PageTitle variant="hero" className="text-ink text-[30px]">
              {m.group.settings.edit.title}
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
  const m = useMessages();
  const utils = api.useUtils();
  const link = api.groups.getInviteLink.useQuery({ groupId }, { enabled });
  const create = api.groups.createInviteLink.useMutation({
    onSuccess: () => utils.groups.getInviteLink.invalidate({ groupId }),
    onError: (error) => toast.error(error.message),
  });
  const reset = api.groups.resetInviteLink.useMutation({
    onSuccess: async () => {
      await utils.groups.getInviteLink.invalidate({ groupId });
      toast.success(m.group.settings.linkResetToast);
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
      toast.success(m.group.settings.linkCopiedToast);
    } catch {
      toast.error(m.invite.inbox.linkCopyFailedToast);
    }
  }

  return (
    <div className="border-rule flex flex-col overflow-hidden rounded-[12px] border">
      <div className="flex min-h-[56px] items-center gap-3 py-2.5 pe-2.5 ps-[18px]">
        <span
          className={
            url
              ? "text-meta min-w-0 flex-1 truncate font-mono"
              : "text-meta text-muted-foreground min-w-0 flex-1 truncate"
          }
        >
          {link.isPending && enabled
            ? "…"
            : (url ?? m.group.settings.edit.inviteLinkNone)}
        </span>
        {url ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copy()}
          >
            <CopyIcon aria-hidden="true" />
            {m.common.copy}
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
            {m.group.settings.edit.inviteLinkCreate}
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
            {m.group.settings.edit.inviteLinkReset}
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
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const initial = initialFields(data);
  const [draft, setDraft] = useState<GroupEditFields>(initial);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const refreshGroup = () =>
    Promise.all([
      utils.groups.byId.invalidate({ id: groupId }),
      utils.groups.mine.invalidate(),
      utils.groups.listPublic.invalidate(),
      utils.users.home.invalidate(),
    ]);

  const save = api.groups.edit.useMutation({
    onSuccess: async () => {
      toast.success(m.group.settings.edit.savedToast);
      await refreshGroup();
      router.push(groupHref(groupId));
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const remove = api.groups.delete.useMutation({
    onSuccess: async () => {
      setDeleteOpen(false);
      toast.success(m.group.admin.deletedToast);
      await refreshGroup();
      router.push("/dashboard/groups");
    },
    onError: (error) => toast.error(error.message),
  });

  const transfer = api.groups.transferOwnership.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const uploadImage = api.groups.uploadImage.useMutation({
    onSuccess: async () => {
      toast.success(m.group.admin.imageSavedToast);
      await refreshGroup();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const clearImage = api.groups.clearImage.useMutation({
    onSuccess: async () => {
      toast.success(m.group.admin.imageRemovedToast);
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
    const pickedError = entityImageFileError(file, locale);
    if (pickedError) {
      toast.error(pickedError);
      return;
    }
    void entityImageUploadInput(file, locale)
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
        sportLabel: sportLabel(data.sport, locale),
        memberCount: data.standing.memberCount,
        locale,
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
            {m.group.settings.edit.discard}
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
              name={draft.name || m.invite.kind.group}
              label={m.group.settings.edit.photoChange}
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
                {m.common.remove}
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
            label={m.group.settings.edit.nameLabel}
            value={draft.name}
            onChange={(name) => set({ name })}
            help={m.group.settings.edit.nameHelp}
            error={nameError}
            disabled={disabled}
          />
        </div>

        <FormBlock
          label={m.group.settings.edit.sportLabel}
          labelId={`${IDS.sport}-label`}
        >
          {data.canChangeSport && draft.sport ? (
            <div className="flex flex-col gap-1.5">
              <SportSegment
                labelledBy={`${IDS.sport}-label`}
                sports={SPORTS}
                value={draft.sport}
                onSelect={(sport) => set({ sport })}
                disabled={disabled}
              />
              <p className="text-eyebrow text-muted-foreground">
                {m.group.settings.edit.sportOpen}
              </p>
            </div>
          ) : (
            <LockedSportCard
              sport={draft.sport}
              help={m.group.settings.edit.sportLocked}
            />
          )}
        </FormBlock>

        <FormBlock
          label={m.group.settings.edit.visibilityLabel}
          labelId={`${IDS.visibility}-label`}
        >
          <VisibilityCards
            labelledBy={`${IDS.visibility}-label`}
            value={draft.visibility}
            onSelect={(visibility) => set({ visibility })}
            disabled={disabled}
          />
        </FormBlock>

        {draft.visibility === "public" ? (
          <FormBlock label={m.group.settings.joining.label}>
            <ToggleCard
              id={IDS.approval}
              title={m.group.settings.joining.toggle}
              help={groupJoiningToggleHelp({
                requiresApproval: draft.requiresApproval,
                pendingRequestCount: data.pendingJoinRequestCount,
                locale,
              })}
              checked={draft.requiresApproval}
              onCheckedChange={(requiresApproval) => set({ requiresApproval })}
              disabled={disabled}
            />
          </FormBlock>
        ) : null}

        {data.canManageInviteLinks ? (
          <FormBlock label={m.group.settings.edit.inviteLinkLabel}>
            <InviteLinkCard groupId={groupId} enabled />
          </FormBlock>
        ) : null}

        {showOwnership ? (
          <FormBlock label={m.group.settings.edit.ownershipLabel}>
            <SheetMenu>
              {data.canTransferOwnership ? (
                <SheetMenuRow
                  label={m.group.settings.edit.transferTitle}
                  hint={m.group.settings.edit.transferHint}
                  icon={ArrowRightLeftIcon}
                  trailing="chevron"
                  disabled={disabled}
                  onSelect={() => setTransferOpen(true)}
                />
              ) : null}
              {data.canDelete ? (
                <SheetMenuRow
                  label={m.group.settings.edit.deleteTitle}
                  hint={m.group.settings.edit.deleteHint}
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
            pendingLabel={m.common.saving}
            disabled={!canSave}
            className="w-full font-semibold"
          >
            {m.group.settings.edit.save}
          </Button>
          <p className="text-eyebrow text-muted-foreground" aria-live="polite">
            {dirty
              ? m.group.settings.edit.unsavedChanges
              : m.group.settings.edit.nothingChanged}
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
                  groupOwnershipTransferredToast(
                    member.name,
                    data.name,
                    locale,
                  ),
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
  const m = useMessages();
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
          title={m.webDashboard.group.errorTitle}
          error={group.error}
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
          refusal="forbidden"
          title={m.webDashboard.group.edit.ownerOnly.title}
          message={m.webDashboard.group.edit.ownerOnly.message}
          backHref={groupHref(id)}
          backLabel={m.webDashboard.backToGroup}
          onRetry={() => {
            void group.refetch();
          }}
        />
      </EditGroupFrame>
    );
  }

  return <EditGroupForm groupId={id} data={group.data} />;
}
