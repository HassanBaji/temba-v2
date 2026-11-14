import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { KEEPERS_PER_GAME } from "./football-lineup";
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

/** Whoever holds a keeper spot owes nothing when the Game lets keepers play free. */
export function playsFree(
  game: { keepersPlayFree: boolean },
  player: { footballRole: string | null },
) {
  return game.keepersPlayFree && player.footballRole === "keeper";
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

export type PaymentTally = {
  paid: number;
  claimed: number;
  due: number;
  free: number;
  payers: number;
  collectedFils: number;
  expectedFils: number;
};

export function paymentTally(
  marks: readonly PaymentMark[],
  priceFils: number,
): PaymentTally {
  const count = (mark: PaymentMark) =>
    marks.filter((item) => item === mark).length;
  const paid = count("paid");
  const claimed = count("claimed");
  const due = count("due");
  const payers = paid + claimed + due;
  return {
    paid,
    claimed,
    due,
    free: count("free"),
    payers,
    collectedFils: paid * priceFils,
    expectedFils: payers * priceFils,
  };
}

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

export function paymentRowActions(mark: PaymentMark): {
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
      return { primary: null, canSendBack: false };
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
      return m.rowFree;
    case "paid":
      return m.rowPaid;
    case "claimed":
      return m.rowClaimed(
        row.claimedAt ? formatNotificationTime(row.claimedAt, locale, now) : "",
      );
    case "due":
      return row.status === "not_received" ? m.rowReturned : m.rowDue;
  }
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

/** Major units without the currency, `18.000`, for the large figure. */
export function formatPaymentFigure(fils: number) {
  const whole = Math.trunc(fils / 1000);
  return `${whole}.${String(fils % 1000).padStart(3, "0")}`;
}
