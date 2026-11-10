import { sizes, spacing } from "@repo/design-tokens";
import { invitesWaitingLabel } from "@repo/domain/notification-copy";
import { useRouter } from "expo-router";
import { ChevronRight, Flag, History, Inbox } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";

import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { apiOrigin } from "../lib/api-origin-runtime";
import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import {
  notificationRows,
  type NotificationRowView,
} from "./notifications-model";
import { useInviteInboxCount } from "./use-invite-inbox-count";

const PAGE_SIZE = 20;
const LEADING = 40;
const DOT = 8;
const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

function IconTile({ icon: Icon }: { icon: typeof Flag }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: LEADING,
        height: LEADING,
        borderRadius: LEADING / 2,
        borderWidth: hairline,
        borderColor: colors.rule,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={sizes.iconAction} color={colors.ink} />
    </View>
  );
}

function Leading({ leading }: { leading: NotificationRowView["leading"] }) {
  const m = useMessages();
  if (leading.kind === "finished") {
    return <IconTile icon={Flag} />;
  }
  if (leading.kind === "history") {
    return <IconTile icon={History} />;
  }
  return (
    <Avatar
      name={leading.name ?? m.common.someone}
      uri={mediaUrl(leading.image, apiOrigin)}
      size="lg"
    />
  );
}

function NotificationRow({
  row,
  onPress,
}: {
  row: NotificationRowView;
  onPress: () => void;
}) {
  const m = useMessages();
  const colors = useColors();
  const label = [
    row.title.map((part) => part.text).join(""),
    row.subline,
    row.meta,
    row.unread ? m.mobileHome.notifications.unread : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Leading leading={row.leading} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={3}>
          {row.title.map((part, index) => (
            <Text
              key={index}
              weight={
                part.strong ? (row.unread ? "semibold" : "medium") : "regular"
              }
            >
              {part.text}
            </Text>
          ))}
        </Text>
        {row.subline ? (
          <Text size="meta" tone="muted" numberOfLines={2}>
            {row.subline}
          </Text>
        ) : null}
        <Text size="meta" tone="muted" numberOfLines={1}>
          {row.meta}
        </Text>
      </View>
      {row.unread ? (
        <View
          style={{
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: colors.ink,
          }}
        />
      ) : null}
    </Pressable>
  );
}

function InvitesRow({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const locale = useLocale();
  const colors = useColors();
  const label = invitesWaitingLabel(count, locale);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <IconTile icon={Inbox} />
      <Text weight="medium" style={{ flex: 1 }} numberOfLines={2}>
        {label}
      </Text>
      <ChevronRight
        size={sizes.iconAction}
        color={colors.muted}
        style={mirrorInRtl}
      />
    </Pressable>
  );
}

/** The Notifications inbox, as web `/dashboard/notifications`. */
export function NotificationsScreen() {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const colors = useColors();
  const utils = api.useUtils();
  const inviteCount = useInviteInboxCount();
  const [refreshing, setRefreshing] = useState(false);

  const notifications = api.notifications.list.useInfiniteQuery(
    { limit: PAGE_SIZE },
    {
      ...REFETCH_ON_FOREGROUND,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    },
  );

  const refreshCounts = useCallback(
    () =>
      Promise.all([
        utils.notifications.list.invalidate(),
        utils.notifications.unreadCount.invalidate(),
      ]),
    [utils],
  );
  const markRead = api.notifications.markRead.useMutation({
    onSettled: refreshCounts,
  });
  const markAllRead = api.notifications.markAllRead.useMutation({
    onSettled: refreshCounts,
  });

  const items = useMemo(
    () => notifications.data?.pages.flatMap((page) => page.items) ?? [],
    [notifications.data],
  );
  const rows = useMemo(() => notificationRows(items, locale), [items, locale]);
  const newestLoadedAt = items[0]?.createdAt;
  const hasUnread = rows.some((row) => row.unread);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([notifications.refetch(), refreshCounts()]);
    } finally {
      setRefreshing(false);
    }
  }, [notifications, refreshCounts]);

  function open(row: NotificationRowView) {
    if (row.unread) {
      markRead.mutate({ ids: [row.id] });
    }
    router.push(row.path);
  }

  const header = (
    <View style={{ gap: spacing.compact, paddingBottom: spacing.compact }}>
      <ScreenHeader
        nav="back"
        fallback="/"
        title={m.common.notifications}
        actions={
          hasUnread && newestLoadedAt ? (
            <Button
              label={m.mobileHome.notifications.markAllRead}
              variant="outline"
              size="sm"
              pending={markAllRead.isPending}
              onPress={() => markAllRead.mutate({ upTo: newestLoadedAt })}
            />
          ) : null
        }
      />
      {inviteCount > 0 ? (
        <InvitesRow
          count={inviteCount}
          onPress={() => router.push("/profile/invites")}
        />
      ) : null}
      {notifications.isLoading ? (
        <View style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} height={56} radius={12} />
          ))}
        </View>
      ) : null}
      {notifications.error && !notifications.data ? (
        <Notice
          alert
          title={m.mobileHome.notifications.loadFailed}
          description={notifications.error.message}
          onRetry={() => void notifications.refetch()}
        />
      ) : null}
      {!notifications.isLoading && !notifications.error && rows.length === 0 ? (
        <Notice {...m.mobileHome.notifications.empty} />
      ) : null}
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => (
          <NotificationRow row={item} onPress={() => open(item)} />
        )}
        ItemSeparatorComponent={Hairline}
        ListHeaderComponent={header}
        ListFooterComponent={
          notifications.isFetchingNextPage ? (
            <Skeleton height={56} radius={12} />
          ) : null
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (notifications.hasNextPage && !notifications.isFetchingNextPage) {
            void notifications.fetchNextPage();
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={colors.muted}
          />
        }
        style={{ flex: 1, marginHorizontal: -spacing.surface }}
        contentContainerStyle={{ paddingHorizontal: spacing.surface }}
      />
    </Screen>
  );
}
