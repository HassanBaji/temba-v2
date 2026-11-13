"use client";

import { fishSizes } from "@repo/design-tokens/fish";
import { groupDisplayName } from "@repo/domain/group-join";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  tierHistoryScreen,
  type RatingHistoryRow,
  type TierHistoryHeader,
} from "@repo/domain/rating-history";
import { PenLine } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ErrorState } from "~/components/common/error-state";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { TierFish } from "~/components/groups/tier-fish";
import { useLocale, useMessages } from "~/components/locale-provider";
import { PageTitle } from "~/components/layout/page-title";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { groupMembersTabHref } from "~/lib/dashboard-paths";
import { cardFrame } from "~/lib/page-layout";
import { api } from "~/trpc/react";

const PAGE_SIZE = 20;

function Frame({
  groupId,
  groupName,
  children,
}: {
  groupId: string;
  groupName: string | null;
  children: ReactNode;
}) {
  const m = useMessages();
  return (
    <DashboardShell
      title={m.rating.history.title}
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[26px] pb-6">
        <header className="mt-6 flex items-center gap-3 lg:mt-2">
          <BackButton
            href={groupMembersTabHref(groupId)}
            label={m.webDashboard.backToGroup}
          />
          <div className="min-w-0">
            <PageTitle className="text-ink">{m.rating.history.title}</PageTitle>
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

function HeaderCard({
  header,
  image,
}: {
  header: TierHistoryHeader;
  image: string | null;
}) {
  const { width, height } = fishSizes.card;
  return (
    <section className="border-rule rounded-card bg-wash border px-5 py-[18px]">
      <div className="flex items-center gap-3">
        <UserAvatar name={header.name} image={image} className="size-11" />
        <div className="min-w-0 flex-1">
          <p className="font-expanded text-h2 truncate font-bold">
            {header.name}
          </p>
          <p className="text-meta text-muted-foreground">{header.caption}</p>
        </div>
      </div>
      {header.points != null ? (
        <div className="border-rule mt-4 flex items-center gap-4 border-t pt-4">
          {header.band && header.bandLabel ? (
            <TierFish
              band={header.band}
              label={header.bandLabel}
              size="card"
              cutout="var(--color-wash)"
            />
          ) : header.provisional ? (
            <Hatch radius="sm" className="block" style={{ width, height }} />
          ) : null}
          <div className="min-w-0 flex-1">
            {header.standing ? (
              <p className="text-eyebrow text-muted-foreground">
                {header.standing}
              </p>
            ) : null}
            <p className="font-expanded text-[34px] font-bold tabular-nums leading-none">
              {header.points}
            </p>
          </div>
          {header.toNextBand ? (
            <p className="text-eyebrow text-muted-foreground text-end">
              {header.toNextBand}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function HistoryRow({ row }: { row: RatingHistoryRow }) {
  return (
    <li className="border-rule flex items-start gap-3 border-t px-4 py-3 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="text-meta font-semibold">{row.title}</p>
        <p className="text-eyebrow text-muted-foreground">{row.detail}</p>
        {row.byline ? (
          <p className="text-eyebrow text-muted-foreground mt-1 flex items-start gap-[7px]">
            <PenLine aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
            <span>{row.byline}</span>
          </p>
        ) : null}
      </div>
      <span
        className="font-expanded text-body shrink-0 font-bold tabular-nums"
        aria-label={row.deltaSpoken}
      >
        {row.delta}
      </span>
    </li>
  );
}

/**
 * Points and history for one member of a tier Group (screen 2e): their fish,
 * place and points, then what moved them, manual changes with who and why.
 * Without `userId` it is the viewer's own.
 */
export function TierHistoryPage({
  groupId,
  userId,
}: {
  groupId: string;
  userId?: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const history = api.groups.tierHistory.useInfiniteQuery(
    { groupId, userId, limit: PAGE_SIZE },
    { getNextPageParam: (page) => page.nextCursor ?? undefined },
  );
  const first = history.data?.pages[0];

  if (history.isLoading) {
    return (
      <Frame groupId={groupId} groupName={null}>
        <div aria-busy="true" className="flex flex-col gap-5">
          <Skeleton className="rounded-card h-40 w-full" />
          <Skeleton className="rounded-card h-60 w-full" />
        </div>
      </Frame>
    );
  }

  if (isNotFoundError(history.error)) {
    notFound();
  }

  if (!first) {
    return (
      <Frame groupId={groupId} groupName={null}>
        <ErrorState
          title={m.rating.history.loadFailed}
          error={history.error}
          onRetry={() => {
            void history.refetch();
          }}
        />
      </Frame>
    );
  }

  const screen = tierHistoryScreen(
    {
      member: first.member,
      tier: first.tier,
      entries: history.data?.pages.flatMap((page) => page.entries) ?? [],
    },
    first.viewerUserId,
    locale,
  );

  return (
    <Frame
      groupId={groupId}
      groupName={groupDisplayName(first.group.name, locale)}
    >
      <HeaderCard header={screen.header} image={first.member.image} />
      <section aria-labelledby="tier-history-list">
        <div className="flex items-baseline justify-between gap-3 pb-2.5">
          <h2 id="tier-history-list" className="text-h2 font-semibold">
            {screen.listTitle}
          </h2>
          {screen.countLabel ? (
            <p className="text-meta text-muted-foreground">
              {screen.countLabel}
            </p>
          ) : null}
        </div>
        <div className={cardFrame}>
          {screen.emptyText ? (
            <p className="text-meta text-muted-foreground px-4 py-4">
              {screen.emptyText}
            </p>
          ) : (
            <ul>
              {screen.rows.map((row) => (
                <HistoryRow key={row.key} row={row} />
              ))}
            </ul>
          )}
          {history.hasNextPage ? (
            <div className="border-rule flex justify-center border-t p-3">
              <Button
                type="button"
                variant="outline"
                pending={history.isFetchingNextPage}
                onClick={() => {
                  void history.fetchNextPage();
                }}
              >
                {m.common.showMore}
              </Button>
            </div>
          ) : null}
        </div>
      </section>
      <p className="text-eyebrow text-muted-foreground">{screen.footnote}</p>
    </Frame>
  );
}
