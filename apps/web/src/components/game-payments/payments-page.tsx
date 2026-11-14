"use client";

import { formatGameStart } from "@repo/domain/format-game-start";
import {
  formatPaymentFigure,
  paymentRowActions,
  paymentRowSubline,
  type PaymentMark,
} from "@repo/domain/game-payments";
import { initials } from "@repo/domain/initials";
import { formatNotificationTime } from "@repo/domain/notification-copy";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { BellIcon, XIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { PageTitle } from "~/components/layout/page-title";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { useNow } from "~/hooks/use-now";
import { gameHomeHref } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  NotReceivedDialog,
  type NotReceivedTarget,
} from "./not-received-dialog";
import { PaymentBox, PaymentSectionHead } from "./payment-card";
import { PaymentMarkIcon } from "./payment-mark";
import {
  useGamePayments,
  usePaymentActions,
  type TrackedGamePayments,
} from "./use-game-payments";

export type ManageRow = NonNullable<TrackedGamePayments["manage"]>[number];

function Frame({
  gameId,
  children,
}: {
  gameId: string;
  children: React.ReactNode;
}) {
  const m = useMessages();
  const title = m.gamePayments.organizer.title;
  return (
    <DashboardShell title={title} hidePageHeader hideMobileTopBar>
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[22px] pb-6">
        <header className="mt-6 flex items-center gap-3 lg:mt-2">
          <BackButton
            href={gameHomeHref(gameId)}
            label={m.webTournament.backToGame}
          />
          <PageTitle className="text-ink">{title}</PageTitle>
        </header>
        {children}
      </div>
    </DashboardShell>
  );
}

function ProgressBar({ tally }: { tally: TrackedGamePayments["tally"] }) {
  const segments: { mark: PaymentMark; count: number }[] = [
    { mark: "paid", count: tally.paid },
    { mark: "claimed", count: tally.claimed },
    { mark: "due", count: tally.due },
  ];
  return (
    <div
      aria-hidden="true"
      className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
    >
      {segments
        .filter((segment) => segment.count > 0)
        .map((segment) => (
          <span
            key={segment.mark}
            style={{ flexGrow: segment.count }}
            className={cn(
              "relative min-w-0 basis-0 overflow-hidden",
              segment.mark === "paid" && "bg-ink",
              segment.mark === "claimed" &&
                "bg-paper border-ink border-[1.5px]",
              segment.mark === "due" && "border-rule border",
            )}
          >
            {segment.mark === "due" ? (
              <Hatch className="absolute inset-0" />
            ) : null}
          </span>
        ))}
    </div>
  );
}

function TallyItem({ mark, label }: { mark: PaymentMark; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <PaymentMarkIcon mark={mark} size="xs" />
      {label}
    </li>
  );
}

function Summary({
  payments,
  startLine,
}: {
  payments: TrackedGamePayments;
  startLine: string | null;
}) {
  const locale = useLocale();
  const m = useMessages();
  const copy = m.gamePayments;
  const { tally } = payments;
  const price = formatPricePerPlayerFils(payments.priceFils, locale) ?? "";
  return (
    <section className="border-rule bg-wash rounded-xl border px-5 py-[18px]">
      <div className="text-eyebrow text-muted-foreground flex justify-between gap-3">
        <span>{startLine}</span>
        <span>{copy.member.each(price)}</span>
      </div>
      <p className="mt-2.5 flex items-baseline gap-2">
        <span className="font-expanded text-display tabular-nums">
          {formatPaymentFigure(tally.collectedFils)}
        </span>
        <span className="text-muted-foreground">
          {copy.organizer.collectedOf(
            m.createGame.price.currency,
            formatPaymentFigure(tally.expectedFils),
          )}
        </span>
      </p>
      <div className="mt-3.5">
        <ProgressBar tally={tally} />
      </div>
      <ul className="text-eyebrow text-muted-foreground mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5">
        <TallyItem mark="paid" label={copy.organizer.confirmed(tally.paid)} />
        <TallyItem
          mark="claimed"
          label={copy.organizer.claimed(tally.claimed)}
        />
        <TallyItem mark="due" label={copy.organizer.due(tally.due)} />
        {tally.free > 0 ? (
          <TallyItem mark="free" label={copy.organizer.free(tally.free)} />
        ) : null}
      </ul>
    </section>
  );
}

function PlayerRow({
  row,
  pending,
  onPrimary,
  onSendBack,
}: {
  row: ManageRow;
  pending: boolean;
  onPrimary: () => void;
  onSendBack: () => void;
}) {
  const locale = useLocale();
  const now = useNow();
  const copy = useMessages().gamePayments.organizer;
  const actions = paymentRowActions(row.mark);
  const name = row.isViewer ? copy.you : row.name;
  const primaryLabel =
    actions.primary === "confirm"
      ? copy.confirm
      : actions.primary === "mark_paid"
        ? copy.markPaid
        : copy.undo;
  return (
    <li className="border-rule flex items-center gap-[11px] border-t py-[11px] pe-3.5 ps-4 first:border-t-0">
      <span
        aria-hidden="true"
        className={cn(
          "text-eyebrow flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border font-semibold",
          row.isViewer
            ? "border-ink bg-ink text-paper"
            : row.mark === "free"
              ? "border-muted-foreground bg-paper text-ink border-dashed"
              : "border-rule bg-paper text-ink",
        )}
      >
        {initials(row.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{name}</span>
        <span
          className={cn(
            "text-eyebrow block truncate",
            row.mark === "claimed" ? "text-ink" : "text-muted-foreground",
          )}
        >
          {paymentRowSubline(row, locale, now)}
        </span>
      </span>
      {actions.canSendBack ? (
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={`${copy.notReceived}, ${name}`}
          disabled={pending}
          onClick={onSendBack}
        >
          <XIcon />
        </Button>
      ) : null}
      {actions.primary ? (
        <Button
          type="button"
          size="sm"
          variant={actions.primary === "confirm" ? "default" : "outline"}
          aria-label={`${primaryLabel}, ${name}`}
          disabled={pending}
          onClick={onPrimary}
        >
          {primaryLabel}
        </Button>
      ) : null}
    </li>
  );
}

/** The list itself, fed by `GamePaymentsPage` (design Payments 2a). */
export function PaymentsManageView({
  payments,
  startLine,
  pending,
  confirmAllPending,
  remindPending,
  onPrimary,
  onSendBack,
  onConfirmAll,
  onRemind,
}: {
  payments: TrackedGamePayments;
  startLine: string | null;
  pending: boolean;
  confirmAllPending: boolean;
  remindPending: boolean;
  onPrimary: (row: ManageRow) => void;
  onSendBack: (row: ManageRow) => void;
  onConfirmAll: () => void;
  onRemind: () => void;
}) {
  const copy = useMessages().gamePayments.organizer;
  const { tally } = payments;
  const rows = payments.manage ?? [];
  return (
    <>
      <Summary payments={payments} startLine={startLine} />
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="border-ink"
          disabled={tally.claimed === 0 || pending}
          aria-busy={confirmAllPending}
          onClick={onConfirmAll}
        >
          {tally.claimed > 0
            ? copy.confirmAll(tally.claimed)
            : copy.nothingToConfirm}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={tally.due === 0 || pending}
          aria-busy={remindPending}
          onClick={onRemind}
        >
          <BellIcon aria-hidden="true" />
          {tally.due > 0 ? copy.remind(tally.due) : copy.everyonePaid}
        </Button>
      </div>
      <section
        aria-labelledby="payments-players"
        className="flex flex-col gap-2.5"
      >
        <PaymentSectionHead
          id="payments-players"
          title={copy.players}
          meta={String(rows.length)}
        />
        <PaymentBox>
          <ul>
            {rows.map((row) => (
              <PlayerRow
                key={row.userId}
                row={row}
                pending={pending}
                onPrimary={() => onPrimary(row)}
                onSendBack={() => onSendBack(row)}
              />
            ))}
          </ul>
        </PaymentBox>
        <p className="text-eyebrow text-muted-foreground">{copy.footnote}</p>
      </section>
    </>
  );
}

/** The Organizer's or a Group admin's payments list (design Payments 2a). */
export function GamePaymentsPage({ gameId }: { gameId: string }) {
  const locale = useLocale();
  const now = useNow();
  const m = useMessages();
  const copy = m.gamePayments.organizer;
  const game = api.games.byId.useQuery({ id: gameId });
  const query = useGamePayments(gameId, true);
  const actions = usePaymentActions(gameId);
  const [sendBack, setSendBack] = React.useState<NotReceivedTarget | null>(
    null,
  );

  const data = query.data;
  if (query.error) {
    return (
      <Frame gameId={gameId}>
        <ErrorState
          title={copy.loadFailed}
          error={query.error}
          onRetry={() => {
            void query.refetch();
          }}
        />
      </Frame>
    );
  }
  if (!data) {
    return (
      <Frame gameId={gameId}>
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </Frame>
    );
  }
  if (!data.tracked || !data.manage) {
    return (
      <Frame gameId={gameId}>
        <p className="text-muted-foreground">
          {m.gamePayments.errors.notTracked}
        </p>
      </Frame>
    );
  }

  const price = formatPricePerPlayerFils(data.priceFils, locale) ?? "";
  const windowStart = game.data?.windowStart;
  const startLine = windowStart ? formatGameStart(windowStart, locale) : null;
  const onPrimary = (row: ManageRow) => {
    const action = paymentRowActions(row.mark).primary;
    if (action === "undo") {
      actions.undo.mutate({ gameId, userId: row.userId });
      return;
    }
    if (action) {
      actions.markPaid.mutate(
        { gameId, userId: row.userId },
        {
          onSuccess: () => {
            toast.success(
              action === "confirm"
                ? copy.toast.confirmed
                : copy.toast.markedPaid,
            );
          },
        },
      );
    }
  };

  return (
    <Frame gameId={gameId}>
      <PaymentsManageView
        payments={data}
        startLine={startLine}
        pending={actions.pending}
        confirmAllPending={actions.confirmAll.isPending}
        remindPending={actions.remind.isPending}
        onPrimary={onPrimary}
        onConfirmAll={() => actions.confirmAll.mutate({ gameId })}
        onRemind={() => actions.remind.mutate({ gameId })}
        onSendBack={(row) =>
          setSendBack({
            userId: row.userId,
            name: row.name,
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
      <NotReceivedDialog
        target={sendBack}
        pending={actions.markNotReceived.isPending}
        onClose={() => setSendBack(null)}
        onSubmit={({ reason, note }) => {
          if (!sendBack) {
            return;
          }
          const trimmed = note.trim();
          actions.markNotReceived.mutate(
            {
              gameId,
              userId: sendBack.userId,
              reason,
              note: trimmed === "" ? null : trimmed,
            },
            { onSuccess: () => setSendBack(null) },
          );
        }}
      />
    </Frame>
  );
}
