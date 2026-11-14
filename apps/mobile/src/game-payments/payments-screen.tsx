import { radii } from "@repo/design-tokens";
import { formatGameStart } from "@repo/domain/format-game-start";
import {
  formatPaymentFigure,
  paymentRowActions,
  paymentRowSubline,
  type PaymentMark,
} from "@repo/domain/game-payments";
import { formatNotificationTime } from "@repo/domain/notification-copy";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { useLocalSearchParams } from "expo-router";
import { Bell, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { gamePath } from "../games/games-model";
import { useNow } from "../games/use-now";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { InitialsTile } from "../primitives/initials-tile";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { NotReceivedSheet, type NotReceivedTarget } from "./not-received-sheet";
import { PaymentBox, PaymentSectionHead } from "./payment-card";
import { PaymentMarkIcon } from "./payment-mark";
import {
  useGamePayments,
  usePaymentActions,
  type TrackedGamePayments,
} from "./use-game-payments";

const BAR_HEIGHT = 10;
const ROW_BUTTON = 36;

type ManageRow = NonNullable<TrackedGamePayments["manage"]>[number];

function ProgressBar({ tally }: { tally: TrackedGamePayments["tally"] }) {
  const colors = useColors();
  const segments: { mark: PaymentMark; count: number }[] = [
    { mark: "paid", count: tally.paid },
    { mark: "claimed", count: tally.claimed },
    { mark: "due", count: tally.due },
  ];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: "row",
        height: BAR_HEIGHT,
        gap: 2,
        borderRadius: BAR_HEIGHT / 2,
        overflow: "hidden",
      }}
    >
      {segments
        .filter((segment) => segment.count > 0)
        .map((segment) => (
          <View
            key={segment.mark}
            style={{
              flex: segment.count,
              minWidth: 0,
              backgroundColor:
                segment.mark === "paid" ? colors.control : colors.paper,
              borderWidth: segment.mark === "claimed" ? 1.5 : 0,
              borderColor: colors.ink,
            }}
          >
            {segment.mark === "due" ? <Hatch radius={0} /> : null}
          </View>
        ))}
    </View>
  );
}

function Summary({
  payments,
  startLine,
}: {
  payments: TrackedGamePayments;
  startLine: string | null;
}) {
  const colors = useColors();
  const locale = useLocale();
  const m = useMessages();
  const copy = m.gamePayments;
  const { tally } = payments;
  const price = formatPricePerPlayerFils(payments.priceFils, locale) ?? "";
  return (
    <View
      style={{
        backgroundColor: colors.wash,
        borderWidth: hairline,
        borderColor: colors.rule,
        borderRadius: radii.surface,
        paddingHorizontal: 20,
        paddingVertical: 18,
        gap: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="eyebrow" tone="muted" style={{ flexShrink: 1 }}>
          {startLine ?? ""}
        </Text>
        <Text size="eyebrow" tone="muted">
          {copy.member.each(price)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text size="display" width="expanded" weight="bold">
          {formatPaymentFigure(tally.collectedFils)}
        </Text>
        <Text tone="muted">
          {copy.organizer.collectedOf(
            m.createGame.price.currency,
            formatPaymentFigure(tally.expectedFils),
          )}
        </Text>
      </View>
      <ProgressBar tally={tally} />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          columnGap: 14,
          rowGap: 6,
        }}
      >
        <TallyItem mark="paid" label={copy.organizer.confirmed(tally.paid)} />
        <TallyItem
          mark="claimed"
          label={copy.organizer.claimed(tally.claimed)}
        />
        <TallyItem mark="due" label={copy.organizer.due(tally.due)} />
        {tally.free > 0 ? (
          <TallyItem mark="free" label={copy.organizer.free(tally.free)} />
        ) : null}
      </View>
    </View>
  );
}

function TallyItem({ mark, label }: { mark: PaymentMark; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <PaymentMarkIcon mark={mark} size={12} />
      <Text size="eyebrow" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function PlayerRow({
  row,
  first,
  pending,
  onPrimary,
  onSendBack,
}: {
  row: ManageRow;
  first: boolean;
  pending: boolean;
  onPrimary: () => void;
  onSendBack: () => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const now = useNow();
  const copy = useMessages().gamePayments.organizer;
  const actions = paymentRowActions(row.mark);
  const name = row.isViewer ? copy.you : row.name;
  const subline = paymentRowSubline(row, locale, now);
  const primaryLabel =
    actions.primary === "confirm"
      ? copy.confirm
      : actions.primary === "mark_paid"
        ? copy.markPaid
        : copy.undo;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 11,
        paddingStart: 16,
        paddingEnd: 14,
        paddingVertical: 11,
        borderTopWidth: first ? 0 : hairline,
        borderTopColor: colors.rule,
      }}
    >
      <InitialsTile
        name={row.name}
        uri={row.image}
        size="md"
        tone={row.isViewer ? "control" : "inverse"}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold" numberOfLines={1}>
          {name}
        </Text>
        <Text
          size="eyebrow"
          tone={row.mark === "claimed" ? "default" : "muted"}
          numberOfLines={1}
        >
          {subline}
        </Text>
      </View>
      {actions.canSendBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${copy.notReceived}, ${name}`}
          disabled={pending}
          onPress={onSendBack}
          style={{
            width: ROW_BUTTON,
            height: ROW_BUTTON,
            borderRadius: radii.md,
            borderWidth: hairline,
            borderColor: colors.rule,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={15} color={colors.ink} />
        </Pressable>
      ) : null}
      {actions.primary ? (
        <Button
          label={primaryLabel}
          accessibilityLabel={`${primaryLabel}, ${name}`}
          size="sm"
          variant={actions.primary === "confirm" ? "default" : "outline"}
          disabled={pending}
          onPress={onPrimary}
        />
      ) : null}
    </View>
  );
}

/** The Organizer's or a Group admin's payments list (design Payments 2a). */
export function GamePaymentsScreen({ gameId }: { gameId: string }) {
  const locale = useLocale();
  const now = useNow();
  const m = useMessages();
  const colors = useColors();
  const copy = m.gamePayments.organizer;
  const game = api.games.byId.useQuery({ id: gameId });
  const query = useGamePayments(gameId, true);
  const actions = usePaymentActions(gameId);
  const [sendBack, setSendBack] = useState<NotReceivedTarget | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const header = (
    <ScreenHeader nav="back" fallback={gamePath(gameId)} title={copy.title} />
  );

  const data = query.data;
  if (!data || !data.tracked || !data.manage) {
    return (
      <Screen>
        {header}
        {query.error ? (
          <Notice
            alert
            title={copy.loadFailed}
            description={query.error.message}
            onRetry={() => void query.refetch()}
          />
        ) : data ? (
          <Notice title={m.gamePayments.errors.notTracked} />
        ) : (
          <>
            <Skeleton height={180} radius={16} />
            <Skeleton height={360} radius={16} />
          </>
        )}
      </Screen>
    );
  }

  const price = formatPricePerPlayerFils(data.priceFils, locale) ?? "";
  const startLine = game.data?.windowStart
    ? formatGameStart(game.data.windowStart, locale)
    : null;
  const { tally } = data;

  const onPrimary = (row: ManageRow) => {
    const action = paymentRowActions(row.mark).primary;
    if (action === "undo") {
      actions.undo.mutate({ gameId, userId: row.userId });
    } else if (action) {
      actions.markPaid.mutate(
        { gameId, userId: row.userId },
        {
          onSuccess: () =>
            actions.toast(
              action === "confirm"
                ? copy.toast.confirmed
                : copy.toast.markedPaid,
            ),
        },
      );
    }
  };

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        try {
          await query.refetch();
        } finally {
          setRefreshing(false);
        }
      }}
    >
      {header}
      <Summary payments={data} startLine={startLine} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={
              tally.claimed > 0
                ? copy.confirmAll(tally.claimed)
                : copy.nothingToConfirm
            }
            variant="outline"
            disabled={tally.claimed === 0 || actions.pending}
            pending={actions.confirmAll.isPending}
            onPress={() => actions.confirmAll.mutate({ gameId })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={tally.due > 0 ? copy.remind(tally.due) : copy.everyonePaid}
            variant="outline"
            icon={<Bell size={14} color={colors.ink} />}
            disabled={tally.due === 0 || actions.pending}
            pending={actions.remind.isPending}
            onPress={() => actions.remind.mutate({ gameId })}
          />
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <PaymentSectionHead
          title={copy.players}
          meta={String(data.manage.length)}
        />
        <PaymentBox>
          {data.manage.map((row, index) => (
            <PlayerRow
              key={row.userId}
              row={row}
              first={index === 0}
              pending={actions.pending}
              onPrimary={() => onPrimary(row)}
              onSendBack={() =>
                setSendBack({
                  userId: row.userId,
                  name: row.name,
                  image: row.image,
                  price,
                  claimedLine: m.gamePayments.notReceivedSheet.claimedAgo(
                    row.name,
                    row.claimedAt
                      ? formatNotificationTime(row.claimedAt, locale, now)
                      : "",
                  ),
                })
              }
            />
          ))}
        </PaymentBox>
        <Text size="eyebrow" tone="muted">
          {copy.footnote}
        </Text>
      </View>
      <NotReceivedSheet
        target={sendBack}
        pending={actions.markNotReceived.isPending}
        onClose={() => setSendBack(null)}
        onSubmit={({ reason, note }) => {
          if (!sendBack) {
            return;
          }
          actions.markNotReceived.mutate(
            {
              gameId,
              userId: sendBack.userId,
              reason,
              note: note.trim() || null,
            },
            { onSuccess: () => setSendBack(null) },
          );
        }}
      />
    </Screen>
  );
}

export function GamePaymentsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GamePaymentsScreen gameId={id} />;
}
