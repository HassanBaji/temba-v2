"use client";

import { Bell, Flag, History, Inbox } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { useInviteInboxCount } from "~/hooks/use-invite-inbox-count";
import { notificationHref } from "~/lib/notification-href";
import {
  invitesWaitingLabel,
  notificationCopy,
  notificationMeta,
  type NotificationTitlePart,
} from "@repo/domain/notification-copy";
import { api } from "~/trpc/react";

const PAGE_SIZE = 20;

function titlePartWeight(strong: boolean, unread: boolean) {
  if (!strong) {
    return "font-normal";
  }
  return unread ? undefined : "font-medium";
}

function NotificationTitle({
  parts,
  unread,
}: {
  parts: NotificationTitlePart[];
  unread: boolean;
}) {
  return (
    <>
      {parts.map((part, index) => (
        <span key={index} className={titlePartWeight(part.strong, unread)}>
          {part.text}
        </span>
      ))}
    </>
  );
}

function NotificationLeading({
  type,
  actor,
}: {
  type: string;
  actor: { name: string; image: string | null } | null;
}) {
  const m = useMessages();
  if (type === "game_finished") {
    return (
      <span className="border-rule text-ink flex size-10 items-center justify-center rounded-full border">
        <Flag aria-hidden="true" className="size-5" />
      </span>
    );
  }
  if (type === "history_linked") {
    return (
      <span className="border-rule text-ink flex size-10 items-center justify-center rounded-full border">
        <History aria-hidden="true" className="size-5" />
      </span>
    );
  }
  return (
    <UserAvatar
      name={actor?.name ?? m.common.someone}
      image={actor?.image}
      size="lg"
    />
  );
}

function UnreadDot() {
  const m = useMessages();
  return (
    <span className="flex items-center">
      <span aria-hidden="true" className="bg-ink size-2 rounded-full" />
      <span className="sr-only">{m.webDashboard.notifications.unread}</span>
    </span>
  );
}

function LoadMoreSentinel({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  const m = useMessages();
  const ref = React.useRef<HTMLDivElement>(null);
  const onLoadMoreRef = React.useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  React.useEffect(() => {
    const node = ref.current;
    if (!node || !hasNextPage || isFetchingNextPage) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onLoadMoreRef.current();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage]);

  if (!hasNextPage) {
    return null;
  }

  return (
    <div ref={ref} className="mt-4 flex justify-center">
      <Button
        variant="outline"
        pending={isFetchingNextPage}
        pendingLabel={m.common.loading}
        onClick={onLoadMore}
      >
        {m.common.showMore}
      </Button>
    </div>
  );
}

export default function NotificationsPage() {
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const inviteCount = useInviteInboxCount();
  const notifications = api.notifications.list.useInfiniteQuery(
    { limit: PAGE_SIZE },
    { getNextPageParam: (page) => page.nextCursor ?? undefined },
  );

  async function refreshNotifications() {
    await Promise.all([
      utils.notifications.list.invalidate(),
      utils.notifications.unreadCount.invalidate(),
    ]);
  }

  const markRead = api.notifications.markRead.useMutation({
    onSettled: refreshNotifications,
  });
  const markAllRead = api.notifications.markAllRead.useMutation({
    onSettled: refreshNotifications,
  });

  const rows = React.useMemo(
    () =>
      (notifications.data?.pages ?? []).flatMap((page) =>
        page.items.flatMap((item) => {
          const copy = notificationCopy(item, locale);
          const href = notificationHref(item);
          return copy && href ? [{ item, copy, href }] : [];
        }),
      ),
    [notifications.data, locale],
  );
  const newestLoadedAt = notifications.data?.pages[0]?.items[0]?.createdAt;
  const hasUnread = rows.some(({ item }) => item.readAt === null);

  return (
    <DashboardShell title={m.common.notifications}>
      {inviteCount > 0 ? (
        <RowList className="mb-4">
          <ListRow
            asChild
            leading={
              <span className="border-rule text-ink flex size-10 items-center justify-center rounded-full border">
                <Inbox aria-hidden="true" className="size-5" />
              </span>
            }
            title={invitesWaitingLabel(inviteCount, locale)}
          >
            <Link href="/dashboard/invites" />
          </ListRow>
        </RowList>
      ) : null}

      {notifications.isLoading ? <ListPageSkeleton rows={4} /> : null}

      {notifications.error ? (
        <ErrorState
          title={m.webDashboard.notifications.errorTitle}
          message={notifications.error.message}
          onRetry={() => void notifications.refetch()}
        />
      ) : null}

      {!notifications.isLoading && !notifications.error && rows.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={m.webDashboard.notifications.empty.title}
          description={m.webDashboard.notifications.empty.description}
        />
      ) : null}

      {hasUnread && newestLoadedAt ? (
        <div className="mb-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            pending={markAllRead.isPending}
            pendingLabel={m.webDashboard.notifications.marking}
            onClick={() => markAllRead.mutate({ upTo: newestLoadedAt })}
          >
            {m.webDashboard.notifications.markAllRead}
          </Button>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <RowList>
          {rows.map(({ item, copy, href }) => {
            const unread = item.readAt === null;
            return (
              <ListRow
                key={item.id}
                asChild
                leading={
                  <NotificationLeading type={item.type} actor={item.actor} />
                }
                title={<NotificationTitle parts={copy.title} unread={unread} />}
                subtitle={copy.subline}
                meta={notificationMeta(item, locale)}
                trailing={unread ? <UnreadDot /> : null}
              >
                <Link
                  href={href}
                  onClick={() => {
                    if (unread) {
                      markRead.mutate({ ids: [item.id] });
                    }
                  }}
                />
              </ListRow>
            );
          })}
        </RowList>
      ) : null}

      <LoadMoreSentinel
        hasNextPage={notifications.hasNextPage}
        isFetchingNextPage={notifications.isFetchingNextPage}
        onLoadMore={() => void notifications.fetchNextPage()}
      />
    </DashboardShell>
  );
}
