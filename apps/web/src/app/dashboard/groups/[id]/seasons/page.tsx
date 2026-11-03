"use client";

import { ChevronRight, Lock, Plus } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { PageTitle } from "~/components/layout/page-title";
import { Button } from "~/components/ui/button";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import {
  SEASON_POINTS,
  closeSeasonActionLabel,
  closeSeasonBody,
  closeSeasonTitle,
  formatSeasonRange,
  seasonClosedToast,
  seasonCloseEndsLine,
  seasonStatusLabel,
  type GroupSeasonStatus,
} from "@repo/domain/group-season";
import { groupNewSeasonHref } from "~/lib/dashboard-paths";
import { cardFrame } from "~/lib/page-layout";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type Season = RouterOutputs["groups"]["listSeasons"]["seasons"][number];

function SeasonsFrame({
  groupId,
  groupName,
  children,
}: {
  groupId: string;
  groupName: string | null;
  children: React.ReactNode;
}) {
  const m = useMessages();
  return (
    <DashboardShell
      title={m.webDashboard.seasons.title}
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 pb-6">
        <header className="mt-6 flex items-center gap-3 lg:mt-2">
          <BackButton
            href={`/dashboard/groups/${groupId}`}
            label={m.webDashboard.backToGroup}
          />
          <div className="min-w-0">
            <PageTitle className="text-ink">
              {m.webDashboard.seasons.title}
            </PageTitle>
            {groupName ? (
              <p className="text-meta text-muted-foreground truncate">
                {groupName}
              </p>
            ) : null}
          </div>
        </header>
        {children}
      </div>
    </DashboardShell>
  );
}

function StatusTag({ status }: { status: GroupSeasonStatus }) {
  const locale = useLocale();
  return (
    <span
      className={cn(
        "shrink-0 rounded-[4px] px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.06em]",
        status === "active"
          ? "bg-ink text-paper"
          : status === "upcoming"
            ? "border-ink text-ink border"
            : "border-rule text-muted-foreground border",
      )}
    >
      {seasonStatusLabel(status, locale)}
    </span>
  );
}

function SeasonRow({ season }: { season: Season }) {
  const locale = useLocale();
  return (
    <li className="border-rule flex items-center gap-3 border-t px-[18px] py-3.5 first:border-t-0">
      <span className="min-w-0 flex-1">
        <span className="text-body block truncate font-semibold">
          {season.name}
        </span>
        <span className="text-meta text-muted-foreground block tabular-nums">
          {formatSeasonRange(season, locale)}
        </span>
      </span>
      <StatusTag status={season.status} />
      <ChevronRight
        aria-hidden="true"
        className="text-muted-foreground size-[18px] shrink-0 rtl:-scale-x-100"
      />
    </li>
  );
}

function CloseSeasonDialog({
  season,
  groupId,
  open,
  onOpenChange,
}: {
  season: Season;
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const standing = api.groups.seasonStanding.useQuery(
    { groupId, seasonId: season.id },
    { enabled: open },
  );
  const group = api.groups.byId.useQuery({ id: groupId }, { enabled: open });
  const closeSeason = api.groups.closeSeason.useMutation({
    onSuccess: async (closed) => {
      toast.success(seasonClosedToast(closed, locale));
      onOpenChange(false);
      await Promise.all([
        utils.groups.listSeasons.invalidate({ groupId }),
        utils.groups.byId.invalidate({ id: groupId }),
        utils.groups.seasonStanding.invalidate(),
        utils.groups.mine.invalidate(),
        utils.users.home.invalidate(),
      ]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const leader = standing.data?.rows.find((row) => row.ranked) ?? null;
  const now = new Date();

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent showCloseButton={false}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {closeSeasonTitle(season, locale)}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {closeSeasonBody({
              gamesCounted: standing.data?.gamesCounted ?? 0,
              awaitingScoreCount: group.data?.standing.awaitingScoreCount ?? 0,
              locale,
            })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <dl className={cn(cardFrame, "mx-4 mb-4 md:mx-0 md:mb-0")}>
          {[
            [
              m.webDashboard.seasons.close.ends,
              seasonCloseEndsLine(season, now, locale),
            ],
            [
              m.webDashboard.seasons.close.leader,
              leader
                ? m.webDashboard.seasons.close.leaderValue(
                    leader.name ?? m.community.memberFallback,
                    leader.points,
                  )
                : m.webDashboard.seasons.close.nobodyRanked,
            ],
            [
              m.webDashboard.seasons.close.levels,
              m.webDashboard.seasons.close.unchanged,
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-rule flex items-center justify-between gap-3 border-t px-4 py-2.5 first:border-t-0"
            >
              <dt className="text-meta text-muted-foreground">{label}</dt>
              <dd className="text-meta text-end">{value}</dd>
            </div>
          ))}
        </dl>
        <ResponsiveDialogFooter>
          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            pending={closeSeason.isPending}
            onClick={() => closeSeason.mutate({ seasonId: season.id })}
          >
            <Lock aria-hidden="true" />
            {m.webDashboard.seasons.close.confirm}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full font-semibold"
            disabled={closeSeason.isPending}
            onClick={() => onOpenChange(false)}
          >
            {m.webDashboard.seasons.close.keepOpen}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export default function GroupSeasonsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const m = useMessages();
  const locale = useLocale();
  const seasons = api.groups.listSeasons.useQuery({ groupId: id });
  const [closing, setClosing] = useState(false);

  if (seasons.isLoading) {
    return (
      <SeasonsFrame groupId={id} groupName={null}>
        <div aria-busy="true" className="flex flex-col gap-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="rounded-card h-48 w-full" />
          <Skeleton className="rounded-card h-24 w-full" />
        </div>
      </SeasonsFrame>
    );
  }

  if (!seasons.data) {
    return (
      <SeasonsFrame groupId={id} groupName={null}>
        <ErrorState
          title={m.webDashboard.seasons.errorTitle}
          message={seasons.error?.message}
          onRetry={() => {
            void seasons.refetch();
          }}
        />
      </SeasonsFrame>
    );
  }

  const { groupName, canManage } = seasons.data;
  const active = seasons.data.seasons.find(
    (season) => season.status === "active",
  );

  return (
    <SeasonsFrame groupId={id} groupName={groupName}>
      <p className="text-body text-muted-foreground">
        {m.group.season.settingsIntro}
      </p>

      <section className={cardFrame} aria-label={m.webDashboard.seasons.title}>
        {seasons.data.seasons.length > 0 ? (
          <ul>
            {seasons.data.seasons.map((season) => (
              <SeasonRow key={season.id} season={season} />
            ))}
          </ul>
        ) : (
          <p className="text-meta text-muted-foreground px-[18px] py-4">
            {m.webDashboard.seasons.empty}
          </p>
        )}
        {canManage ? (
          <Link
            href={groupNewSeasonHref(id)}
            className="border-rule text-body hover:bg-wash flex min-h-12 items-center justify-center gap-1.5 border-t font-semibold outline-none focus-visible:underline"
          >
            <Plus aria-hidden="true" className="size-4" />
            {m.webDashboard.seasons.newSeason}
          </Link>
        ) : null}
      </section>

      <section className={cardFrame} aria-label={m.webDashboard.seasons.scoring}>
        <div className="flex items-center justify-between gap-3 px-[18px] py-3.5">
          <span className="min-w-0">
            <span className="text-body block font-semibold">
              {m.webDashboard.seasons.pointsPerGame}
            </span>
            <span className="text-meta text-muted-foreground block">
              {m.webDashboard.seasons.winDrawLoss}
            </span>
          </span>
          <span className="text-meta shrink-0 font-mono tabular-nums">
            {SEASON_POINTS.win} / {SEASON_POINTS.draw} / {SEASON_POINTS.loss}
          </span>
        </div>
      </section>

      {canManage && active ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="text-destructive w-full font-semibold"
            onClick={() => setClosing(true)}
          >
            <Lock aria-hidden="true" />
            {closeSeasonActionLabel(active, locale)}
          </Button>
          <CloseSeasonDialog
            season={active}
            groupId={id}
            open={closing}
            onOpenChange={setClosing}
          />
        </>
      ) : null}
    </SeasonsFrame>
  );
}
