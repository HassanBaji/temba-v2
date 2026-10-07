"use client";

import { Bell, Inbox } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import { useInviteInboxCount } from "~/hooks/use-invite-inbox-count";
import { notificationHref } from "~/lib/notification-href";
import {
  formatNotificationTime,
  invitesWaitingLabel,
  notificationCopy,
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

function UnreadDot() {
  return (
    <span className="flex items-center">
      <span aria-hidden="true" className="bg-ink size-2 rounded-full" />
      <span className="sr-only">Unread</span>
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
        pendingLabel="Loading…"
        onClick={onLoadMore}
      >
        Show more
      </Button>
    </div>
  );
}

export default function NotificationsPage() {
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
          const copy = notificationCopy(item);
          const href = notificationHref(item);
          return copy && href ? [{ item, copy, href }] : [];
        }),
      ),
    [notifications.data],
  );
  const newestLoadedAt = notifications.data?.pages[0]?.items[0]?.createdAt;
  const hasUnread = rows.some(({ item }) => item.readAt === null);

  return (
    <DashboardShell title="Notifications">
      {inviteCount > 0 ? (
        <RowList className="mb-4">
          <ListRow
            asChild
            leading={
              <span className="border-rule text-ink flex size-10 items-center justify-center rounded-full border">
                <Inbox aria-hidden="true" className="size-5" />
              </span>
            }
            title={invitesWaitingLabel(inviteCount)}
          >
            <Link href="/dashboard/invites" />
          </ListRow>
        </RowList>
      ) : null}

      {notifications.isLoading ? <ListPageSkeleton rows={4} /> : null}

      {notifications.error ? (
        <ErrorState
          title="Notifications could not be loaded"
          message={notifications.error.message}
          onRetry={() => void notifications.refetch()}
        />
      ) : null}

      {!notifications.isLoading && !notifications.error && rows.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="When someone joins a Group you run, it shows up here."
        />
      ) : null}

      {hasUnread && newestLoadedAt ? (
        <div className="mb-2 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            pending={markAllRead.isPending}
            pendingLabel="Marking…"
            onClick={() => markAllRead.mutate({ upTo: newestLoadedAt })}
          >
            Mark all as read
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
                  <UserAvatar
                    name={item.actor?.name ?? "Someone"}
                    image={item.actor?.image}
                    size="lg"
                  />
                }
                title={<NotificationTitle parts={copy.title} unread={unread} />}
                meta={formatNotificationTime(item.createdAt)}
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
