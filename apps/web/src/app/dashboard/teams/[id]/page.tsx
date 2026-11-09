"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { use, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "~/components/common/action-menu";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { InviteDoorDialog } from "~/components/invites/invite-door-dialog";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { TeamFormLine } from "~/components/teams/team-form-line";
import { TeamGamesList } from "~/components/teams/team-games-list";
import { TeamRivalsList } from "~/components/teams/team-rivals-list";
import { TeamAddPlayersDialog } from "~/components/teams/team-add-players-dialog";
import {
  TEAMS_HREF,
  TeamDetailHero,
} from "~/components/teams/team-detail-hero";
import { TeamRosterList } from "~/components/teams/team-roster-list";
import { Button } from "~/components/ui/button";
import { YouSection } from "~/components/you/you-section";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { shareLinkWithFeedback } from "~/lib/share-link";
import {
  ENTITY_IMAGE_ACCEPT,
  entityImageFileError,
  entityImageUploadInput,
} from "@repo/domain/entity-image-file";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { isForbiddenError } from "@repo/domain/is-forbidden-error";
import { sportOrDefault } from "@repo/domain/sport";
import { teamDetailView } from "@repo/domain/team-detail";
import {
  teamDissolveConfirm,
  teamLeaveConfirm,
  teamLookupNote,
  teamRemoveImageConfirm,
} from "@repo/domain/teams";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

const MENU_ON_INK =
  "border-dimrule text-on-focus hover:bg-raised hover:text-on-focus size-10 min-h-10 min-w-10 rounded-[10px] border bg-transparent";

export default function TeamHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [now] = useState(() => new Date());
  const [dissolveOpen, setDissolveOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [removeImageOpen, setRemoveImageOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<{
    userId: string;
    title: string;
    description: string;
    confirmLabel: string;
    toast: string;
  } | null>(null);

  const team = api.teams.byId.useQuery({ id });
  const organized = api.games.listCreateGroups.useQuery(undefined, {
    enabled: addOpen,
  });
  const removeUnclaimed = api.teams.removeUnclaimedPlayer.useMutation({
    meta: OWN_ERROR_UI,
  });

  const dissolve = api.teams.dissolve.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(m.team.toast.dissolved);
      await utils.teams.mine.invalidate();
      router.push(TEAMS_HREF);
    },
  });

  const setGroupTag = api.teams.setGroupTag.useMutation({
    onError: (error) => {
      toast.error(error.message);
    },
  });

  async function changeGroupTag(groupId: string | null, toastMessage: string) {
    await setGroupTag.mutateAsync({ teamId: id, groupId });
    toast.success(toastMessage);
    await Promise.all([
      utils.teams.byId.invalidate({ id }),
      utils.groups.byId.invalidate(),
    ]);
  }

  async function refreshTeamImage() {
    await Promise.all([
      utils.teams.byId.invalidate({ id }),
      utils.teams.mine.invalidate(),
    ]);
  }

  const uploadImage = api.teams.uploadImage.useMutation({
    onSuccess: async () => {
      toast.success(m.team.image.savedToast);
      await refreshTeamImage();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const clearImage = api.teams.clearImage.useMutation({
    onSuccess: async () => {
      toast.success(m.team.image.removedToast);
      await refreshTeamImage();
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
          teamId: id,
          contentType: input.contentType,
          dataBase64: input.dataBase64,
        }),
      )
      .catch(() => undefined);
  }

  const leave = api.teams.leave.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(m.team.toast.left);
      await utils.teams.mine.invalidate();
      router.push(TEAMS_HREF);
    },
  });

  if (isNotFoundError(team.error)) {
    notFound();
  }

  if (team.isLoading) {
    return (
      <DashboardShell title={m.team.fallbackName} hidePageHeader isSubPage>
        <DetailPageSkeleton />
      </DashboardShell>
    );
  }

  if (isForbiddenError(team.error)) {
    return (
      <DashboardShell title={m.team.fallbackName} isSubPage>
        <EmptyState
          icon={Lock}
          title={m.team.forbidden.title}
          description={m.team.forbidden.description}
          action={
            <Button asChild>
              <Link href={TEAMS_HREF}>{m.webDashboard.team.backToTeams}</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  if (team.error || !team.data) {
    return (
      <DashboardShell title={m.team.fallbackName} isSubPage>
        <ErrorState
          title={m.team.teamErrorTitle}
          error={team.error}
          onRetry={() => {
            void team.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  const data = team.data;
  const detail = teamDetailView(data, now, locale);
  const view = detail.home;
  const displayName = view.title;
  const imagePending = uploadImage.isPending || clearImage.isPending;

  const menu = (
    <ActionMenu
      triggerRef={menuTriggerRef}
      label={m.webDashboard.team.actionsLabel}
      triggerClassName={MENU_ON_INK}
    >
      <ActionMenuItem asChild>
        <Link href={TEAMS_HREF}>{m.webDashboard.team.allTeams}</Link>
      </ActionMenuItem>
      {data.groupTag && detail.openGroupLabel ? (
        <ActionMenuItem asChild>
          <Link href={`/dashboard/groups/${data.groupTag.id}`}>
            {detail.openGroupLabel}
          </Link>
        </ActionMenuItem>
      ) : null}
      {data.canInvite ? (
        <ActionMenuItem onSelect={() => setInviteOpen(true)}>
          {view.squad
            ? m.team.squadInviteLabel
            : m.webDashboard.team.invitePartner}
        </ActionMenuItem>
      ) : null}
      {data.canManageImage ? (
        <ActionMenuItem
          disabled={imagePending}
          onSelect={() => imageInputRef.current?.click()}
        >
          {m.team.image.change}
        </ActionMenuItem>
      ) : null}
      {data.canManageImage && data.imageUrl ? (
        <ActionMenuItem
          disabled={imagePending}
          onSelect={() => setRemoveImageOpen(true)}
        >
          {m.team.image.remove}
        </ActionMenuItem>
      ) : null}
      {view.groupTag.options.map((option) => (
        <ActionMenuItem
          key={option.groupId}
          disabled={setGroupTag.isPending}
          onSelect={() =>
            void changeGroupTag(option.groupId, option.toast).catch(
              () => undefined,
            )
          }
        >
          {option.label}
        </ActionMenuItem>
      ))}
      {view.groupTag.remove ? (
        <ActionMenuItem
          disabled={setGroupTag.isPending}
          onSelect={() => {
            const removed = view.groupTag.remove;
            if (removed) {
              void changeGroupTag(null, removed.toast).catch(() => undefined);
            }
          }}
        >
          {view.groupTag.remove.label}
        </ActionMenuItem>
      ) : null}
      {view.canDissolve || view.canLeave ? <ActionMenuSeparator /> : null}
      {view.canLeave ? (
        <ActionMenuItem
          variant="destructive"
          onSelect={() => setLeaveOpen(true)}
        >
          {m.team.leaveLabel}
        </ActionMenuItem>
      ) : null}
      {data.canDissolve ? (
        <ActionMenuItem
          variant="destructive"
          onSelect={() => setDissolveOpen(true)}
        >
          {m.team.dissolveLabel}
        </ActionMenuItem>
      ) : null}
    </ActionMenu>
  );

  return (
    <DashboardShell
      title={displayName}
      width="content"
      hidePageHeader
      hideMobileTopBar
      isSubPage
    >
      <div className="mx-auto mt-6 w-full min-w-0 max-w-[1000px] lg:mt-2">
        <div className="grid gap-[26px] lg:grid-cols-2 lg:items-start">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <TeamDetailHero
              hero={detail.hero}
              postHref={`/dashboard/challenges/new?${new URLSearchParams({ team: id }).toString()}`}
              onInvite={() => setInviteOpen(true)}
              onShare={() => {
                const share = detail.hero.share;
                if (share) {
                  void shareLinkWithFeedback(
                    { text: share.text, url: share.url },
                    share.copied,
                    locale,
                  );
                }
              }}
              menu={menu}
              imagePending={uploadImage.isPending}
            />
            {view.waitingNote ? (
              <p className="text-meta text-muted-foreground">
                {view.waitingCopy}
              </p>
            ) : null}
            <YouSection title={m.team.form.title} meta={detail.form.scope}>
              <TeamFormLine form={detail.form} />
            </YouSection>
            <YouSection
              title={m.team.rivals.title}
              meta={detail.rivals.subtitle}
              note={detail.rivals.footnote ?? detail.rivals.empty?.closest}
            >
              <TeamRivalsList rivals={detail.rivals} teamId={id} />
            </YouSection>
          </div>
          <div className="flex min-w-0 flex-col gap-[26px]">
            <YouSection
              title={detail.members.title}
              meta={detail.members.count}
              note={detail.members.footnote}
            >
              <TeamRosterList
                members={detail.members}
                onOpenSeat={() => {
                  if (detail.members.openSeat?.action === "add") {
                    setAddOpen(true);
                  } else {
                    setInviteOpen(true);
                  }
                }}
                onRemove={(remove) =>
                  setRemoving({
                    userId: remove.userId,
                    ...remove.confirm,
                    toast: remove.toast,
                  })
                }
              />
            </YouSection>
            <YouSection title={m.team.games.title} meta={detail.games.subtitle}>
              <TeamGamesList games={detail.games} />
            </YouSection>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={dissolveOpen}
        onOpenChange={setDissolveOpen}
        {...teamDissolveConfirm(displayName, locale)}
        pending={dissolve.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await dissolve.mutateAsync({ teamId: id });
        }}
      />

      <ConfirmDialog
        open={removeImageOpen}
        onOpenChange={setRemoveImageOpen}
        {...teamRemoveImageConfirm(displayName, locale)}
        pending={clearImage.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await clearImage.mutateAsync({ teamId: id });
        }}
      />

      {data.canManageImage ? (
        <input
          ref={imageInputRef}
          type="file"
          accept={ENTITY_IMAGE_ACCEPT}
          className="hidden"
          tabIndex={-1}
          disabled={imagePending}
          onChange={onChangeImageFile}
        />
      ) : null}

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        {...teamLeaveConfirm(displayName, locale)}
        pending={leave.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await leave.mutateAsync({ teamId: id });
        }}
      />

      <ConfirmDialog
        open={removing != null}
        onOpenChange={(open) => {
          if (!open) {
            setRemoving(null);
          }
        }}
        title={removing?.title ?? ""}
        description={removing?.description ?? ""}
        confirmLabel={removing?.confirmLabel ?? ""}
        pending={removeUnclaimed.isPending}
        onConfirm={async () => {
          if (!removing) {
            return;
          }
          await removeUnclaimed.mutateAsync({
            teamId: id,
            userId: removing.userId,
          });
          toast.success(removing.toast);
          await utils.teams.byId.invalidate({ id });
        }}
      />

      {data.canInvite ? (
        <TeamAddPlayersDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          sport={data.sport}
          spotsLeft={Math.max(0, data.roster.max - data.roster.count)}
          groups={(organized.data ?? []).filter(
            (group) => group.sport === sportOrDefault(data.sport),
          )}
          target={{
            kind: "team",
            teamId: id,
            onChanged: () =>
              Promise.all([
                utils.teams.byId.invalidate({ id }),
                utils.teams.listInAppInvites.invalidate({ teamId: id }),
              ]),
          }}
        />
      ) : null}

      {data.canInvite ? (
        <InviteDoorDialog
          door={{
            kind: "team",
            teamId: id,
            squad: view.squad,
            roster: data.roster,
            canLookup: true,
            canLink: true,
            subtitle: teamLookupNote(view.squad, locale),
          }}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          restoreFocusRef={menuTriggerRef}
        />
      ) : null}
    </DashboardShell>
  );
}
