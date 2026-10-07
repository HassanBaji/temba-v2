"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import { notificationHref } from "~/lib/notification-href";
import {
  formatNotificationTime,
  notificationCopy,
  type NotificationTitlePart,
} from "@repo/domain/notification-copy";
import { api } from "~/trpc/react";

const PAGE_SIZE = 20;

function NotificationTitle({ parts }: { parts: NotificationTitlePart[] }) {
  return (
    <>
      {parts.map((part, index) => (
        <span key={index} className={part.strong ? undefined : "font-normal"}>
          {part.text}
        </span>
      ))}
    </>
  );
}

export default function NotificationsPage() {
  const notifications = api.notifications.list.useInfiniteQuery(
    { limit: PAGE_SIZE },
    { getNextPageParam: (page) => page.nextCursor ?? undefined },
  );

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

  return (
    <DashboardShell title="Notifications">
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

      {rows.length > 0 ? (
        <RowList>
          {rows.map(({ item, copy, href }) => (
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
              title={<NotificationTitle parts={copy.title} />}
              meta={formatNotificationTime(item.createdAt)}
            >
              <Link href={href} />
            </ListRow>
          ))}
        </RowList>
      ) : null}

      {notifications.hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            pending={notifications.isFetchingNextPage}
            pendingLabel="Loading…"
            onClick={() => void notifications.fetchNextPage()}
          >
            Show more
          </Button>
        </div>
      ) : null}
    </DashboardShell>
  );
}
