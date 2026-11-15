import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  KEEPERS_PER_GAME,
  footballBibName,
  type FootballBib,
  type FootballPosition,
  type FootballRole,
} from "./football-lineup";
import { formatGameSideLabel } from "./game-side-label";
import { formatNotificationTime } from "./notification-copy";
import { formatPricePerPlayerFils } from "./price-per-player";

export const GAME_PAYMENT_STATUSES = [
  "claimed",
  "paid",
  "not_received",
] as const;

export type GamePaymentStatus = (typeof GAME_PAYMENT_STATUSES)[number];

export const GAME_PAYMENT_RETURN_REASONS = [
  "nothing_arrived",
  "wrong_amount",
  "sent_elsewhere",
] as const;

export type GamePaymentReturnReason =
  (typeof GAME_PAYMENT_RETURN_REASONS)[number];

export const GAME_PAYMENT_NOTE_MAX_LENGTH = 200;

/**
 * Hatched for not yet, a ring for says paid, solid for paid, dashed for a
 * player who owes nothing. A claim never counts as paid on its own.
 */
export type PaymentMark = "paid" | "claimed" | "due" | "free";

type TrackedGame = {
  trackPayments: boolean;
  pricePerPlayerFils: number | null;
};

/** Tracking holds only while the Game has a price above zero. */
export function gamePaymentsTracked(game: TrackedGame) {
  return game.trackPayments && (game.pricePerPlayerFils ?? 0) > 0;
}

export function paymentMark(
  status: GamePaymentStatus | null,
  free: boolean,
): PaymentMark {
  if (free) {
    return "free";
  }
  if (status === "paid") {
    return "paid";
  }
  if (status === "claimed") {
    return "claimed";
  }
  return "due";
}

/** Counts only: what every player may see of the Game's payments. */
export type PaymentTally = {
  paid: number;
  claimed: number;
  due: number;
  free: number;
  payers: number;
};

export const PADEL_FRIENDLY_GAME_PLAYERS = 4;

/** How many owe once every seat is taken; football keepers drop out when free. */
export function payersWhenFull(args: {
  playersAllowed: number;
  keepersPlayFree: boolean;
}) {
  const keepers = args.keepersPlayFree ? KEEPERS_PER_GAME : 0;
  return Math.max(0, args.playersAllowed - keepers);
}

/** What an Organizer acts on for one row of the payments list. */
export type PaymentRowAction = "confirm" | "mark_paid" | "undo";

/**
 * A player who now plays free keeps any payment already recorded, so the
 * Organizer can still take it back or send the claim back.
 */
export function paymentRowActions(
  mark: PaymentMark,
  status: GamePaymentStatus | null = null,
): {
  primary: PaymentRowAction | null;
  canSendBack: boolean;
} {
  switch (mark) {
    case "claimed":
      return { primary: "confirm", canSendBack: true };
    case "due":
      return { primary: "mark_paid", canSendBack: false };
    case "paid":
      return { primary: "undo", canSendBack: false };
    case "free":
      return {
        primary: status === "paid" ? "undo" : null,
        canSendBack: status === "claimed",
      };
  }
}

export function paymentRowActionLabel(
  action: PaymentRowAction,
  locale: Locale,
) {
  const m = messagesFor(locale).gamePayments.organizer;
  switch (action) {
    case "confirm":
      return m.confirm;
    case "mark_paid":
      return m.markPaid;
    case "undo":
      return m.undo;
  }
}

export type ViewerPayment = {
  status: GamePaymentStatus | null;
  free: boolean;
  claimedAt: Date | string | null;
  paidAt: Date | string | null;
  returnedAt: Date | string | null;
  returnReason: GamePaymentReturnReason | null;
  returnNote: string | null;
};

/** The viewer's own Payment card, by state. */
export type ViewerPaymentCard =
  | { kind: "free"; title: string; hint: string; note: string }
  | { kind: "due"; title: string; hint: string; note: string }
  | { kind: "returned"; title: string; hint: string; note: string }
  | { kind: "claimed"; title: string; hint: string }
  | { kind: "paid"; title: string; hint: string };

export function paymentReturnMessage(
  reason: GamePaymentReturnReason | null,
  note: string | null,
  locale: Locale,
) {
  const trimmed = note?.trim();
  if (trimmed) {
    return trimmed;
  }
  return reason
    ? messagesFor(locale).gamePayments.notReceivedSheet.reasons[reason]
    : null;
}

export function viewerPaymentCard(
  payment: ViewerPayment,
  priceFils: number,
  locale: Locale,
  now: Date = new Date(),
): ViewerPaymentCard {
  const m = messagesFor(locale).gamePayments.member;
  const price = formatPricePerPlayerFils(priceFils, locale) ?? "";
  const when = (at: Date | string | null) =>
    at ? formatNotificationTime(at, locale, now) : "";
  if (payment.free) {
    return {
      kind: "free",
      title: m.freeTitle,
      hint: m.freeHint,
      note: m.freeNote(price),
    };
  }
  if (payment.status === "paid") {
    return {
      kind: "paid",
      title: m.paidTitle,
      hint: m.paidHint(when(payment.paidAt)),
    };
  }
  if (payment.status === "claimed") {
    return {
      kind: "claimed",
      title: m.claimedTitle,
      hint: m.claimedHint(when(payment.claimedAt)),
    };
  }
  if (payment.status === "not_received") {
    const message = paymentReturnMessage(
      payment.returnReason,
      payment.returnNote,
      locale,
    );
    return {
      kind: "returned",
      title: m.returnedTitle,
      hint: m.returnedHint,
      note: message
        ? m.returnedNote(message, when(payment.returnedAt))
        : m.noMoneyNote,
    };
  }
  return {
    kind: "due",
    title: m.dueTitle,
    hint: m.dueHint,
    note: m.noMoneyNote,
  };
}

export type PaymentRowInput = {
  mark: PaymentMark;
  status: GamePaymentStatus | null;
  claimedAt: Date | string | null;
  /** Who made it paid; null unless the payment is paid. */
  paidBy?: { isViewer: boolean; name: string | null } | null;
};

/** The line under a name in the Organizer's payments list. */
export function paymentRowSubline(
  row: PaymentRowInput,
  locale: Locale,
  now: Date = new Date(),
) {
  const m = messagesFor(locale).gamePayments.organizer;
  switch (row.mark) {
    case "free":
      if (row.status === "paid") {
        return m.rowFreePaid;
      }
      return row.status === "claimed" ? m.rowFreeClaimed : m.rowFree;
    case "paid":
      if (row.paidBy?.isViewer) {
        return m.rowPaidByYou;
      }
      return row.paidBy?.name
        ? m.rowPaidBy(messagesFor(locale).common.isolate(row.paidBy.name))
        : m.rowPaid;
    case "claimed":
      return m.rowClaimed(
        row.claimedAt ? formatNotificationTime(row.claimedAt, locale, now) : "",
      );
    case "due":
      return row.status === "not_received" ? m.rowReturned : m.rowDue;
  }
}

export type PaymentReminders = {
  /** Players not paid, other than the viewer, not yet reminded today. */
  toRemind: number;
  remindedToday: number;
};

/** The Organizer's two shortcuts: confirm every claim, remind who has not paid. */
export function paymentShortcuts(
  tally: PaymentTally,
  reminders: PaymentReminders,
  locale: Locale,
) {
  const m = messagesFor(locale).gamePayments.organizer;
  return {
    confirmAll: {
      label:
        tally.claimed > 0 ? m.confirmAll(tally.claimed) : m.nothingToConfirm,
      enabled: tally.claimed > 0,
    },
    remind: {
      label:
        reminders.toRemind > 0
          ? m.remind(reminders.toRemind)
          : reminders.remindedToday > 0
            ? m.reminded
            : tally.due > 0
              ? m.nobodyToRemind
              : m.everyonePaid,
      enabled: reminders.toRemind > 0,
    },
  };
}

export type PaymentLineupPlayer = {
  userId: string;
  name: string;
  image: string | null;
  isViewer: boolean;
  mark: PaymentMark;
  sideIndex: number | null;
  role: FootballRole | null;
  position: FootballPosition | null;
};

export type PaymentLineupGroup = {
  key: string;
  title: string;
  paidLine: string;
  rows: (PaymentLineupPlayer & { displayName: string; subline: string })[];
};

function lineupSubline(player: PaymentLineupPlayer, locale: Locale) {
  const m = messagesFor(locale).gamePayments;
  if (player.mark === "free") {
    return m.lineup.keeperFree;
  }
  const spot =
    player.role === "keeper"
      ? m.lineup.keeper
      : player.position
        ? messagesFor(locale).football.lineup.positions[player.position]
        : null;
  return spot
    ? m.lineup.positionAndMark(spot, m.mark[player.mark])
    : m.mark[player.mark];
}

/**
 * What everyone sees on the Game: each side's players with their mark and
 * how many of the side have paid. Players on no side share one group.
 */
export function paymentLineupGroups(
  args: {
    format: string;
    players: readonly PaymentLineupPlayer[];
    sides: readonly { sideIndex: number; bib: FootballBib | null }[];
  },
  locale: Locale,
): PaymentLineupGroup[] {
  const m = messagesFor(locale);
  const group = (
    key: string,
    title: string,
    players: PaymentLineupPlayer[],
  ): PaymentLineupGroup => {
    const payers = players.filter((player) => player.mark !== "free");
    return {
      key,
      title,
      paidLine: m.gamePayments.lineup.paidCount(
        payers.filter((player) => player.mark === "paid").length,
        payers.length,
      ),
      rows: players.map((player) => ({
        ...player,
        displayName: player.isViewer ? m.common.you : player.name,
        subline: lineupSubline(player, locale),
      })),
    };
  };
  const sided = [...args.sides]
    .sort((a, b) => a.sideIndex - b.sideIndex)
    .map((side) => {
      const players = args.players.filter(
        (player) => player.sideIndex === side.sideIndex,
      );
      const football = players.some((player) => player.role != null);
      return group(
        `side-${side.sideIndex}`,
        football && (side.sideIndex === 1 || side.sideIndex === 2)
          ? footballBibName(side.bib, side.sideIndex, locale)
          : formatGameSideLabel(args.format, side.sideIndex, locale),
        players,
      );
    })
    .filter((item) => item.rows.length > 0);
  const sideIndexes = new Set(args.sides.map((side) => side.sideIndex));
  const unsided = args.players.filter(
    (player) => player.sideIndex == null || !sideIndexes.has(player.sideIndex),
  );
  return unsided.length > 0
    ? [...sided, group("unsided", m.gamePayments.lineup.players, unsided)]
    : sided;
}

/** The create step's summary: what the Organizer collects once it is full. */
export function createPaymentSummary(
  args: {
    priceFils: number;
    playersAllowed: number;
    football: boolean;
    keepersPlayFree: boolean;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).gamePayments.create;
  const keepersFree = args.football && args.keepersPlayFree;
  const payers = payersWhenFull({
    playersAllowed: args.playersAllowed,
    keepersPlayFree: keepersFree,
  });
  const price = formatPricePerPlayerFils(args.priceFils, locale) ?? "";
  return {
    totalFils: payers * args.priceFils,
    note: !args.football
      ? m.summary(payers, price)
      : keepersFree
        ? m.summaryKeepersFree(payers, price)
        : m.summaryKeepersPay(payers, price),
  };
}
