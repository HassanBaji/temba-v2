"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import { notificationHref } from "~/lib/notification-hrefs";
import { notificationCopy } from "@repo/domain/notification-copy";
import { api } from "~/trpc/react";

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const notifications = api.notifications.list.useInfiniteQuery(
    { limit: PAGE_SIZE },
    { getNextPageParam: (page) => page.nextCursor ?? undefined },
  );
  const items = notifications.data?.pages.flatMap((page) => page.items) ?? [];
  const now = new Date();

  return (
    <DashboardShell
      title="Notifications"
      description="What happened on the Groups you run."
    >
      {notifications.isLoading ? <ListPageSkeleton rows={4} /> : null}

      {notifications.error ? (
        <ErrorState
          title="Notifications could not be loaded"
          message={notifications.error.message}
          onRetry={() => void notifications.refetch()}
        />
      ) : null}

      {!notifications.isLoading &&
      !notifications.error &&
      items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing yet"
          description="When someone joins a Group you run, it shows up here."
        />
      ) : null}

      {items.length > 0 ? (
        <RowList>
          {items.map((item) => {
            const copy = notificationCopy(item, now);
            if (!copy) {
              return null;
            }
            const href = notificationHref(item);
            return (
              <ListRow
                key={item.id}
                asChild={href != null}
                leading={
                  <UserAvatar
                    name={item.actor?.name ?? "Someone"}
                    image={item.actor?.image}
                    size="lg"
                  />
                }
                title={copy.title.map((part, index) => (
                  <span
                    key={index}
                    className={part.strong ? "font-semibold" : "font-normal"}
                  >
                    {part.text}
                  </span>
                ))}
                meta={copy.meta}
              >
                {href ? <Link href={href} /> : undefined}
              </ListRow>
            );
          })}
        </RowList>
      ) : null}

      {notifications.hasNextPage ? (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            disabled={notifications.isFetchingNextPage}
            onClick={() => void notifications.fetchNextPage()}
          >
            {notifications.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </DashboardShell>
  );
}
