import type { JobSpec } from "./job-sink";

export const JOB = {
  createCharge: "payment.create-charge",
  pollCharge: "payment.poll-charge",
  processWebhook: "payment.process-webhook",
  expireHold: "booking.expire-hold",
  refund: "payment.refund",
  confirmed: "booking.confirmed",
  notification: "notification.booking",
  reconcile: "booking.reconcile",
} as const;

export const MAX_ATTEMPTS = {
  createCharge: 5,
  pollCharge: 3,
  processWebhook: 10,
  expireHold: 3,
  refund: 8,
  confirmed: 5,
  notification: 5,
} as const;

export const POLL_INTERVAL_SECONDS = { first: 45, second: 90, steady: 120 };

export function expireHoldKey(bookingId: string) {
  return `booking:expire:${bookingId}`;
}

export function createChargeJob(paymentId: string): JobSpec {
  return {
    name: JOB.createCharge,
    key: `payment:create:${paymentId}`,
    payload: { paymentId },
    maxAttempts: MAX_ATTEMPTS.createCharge,
    mode: "unsafe_dedupe",
  };
}

export function pollChargeJob(paymentId: string, round: number): JobSpec {
  return {
    name: JOB.pollCharge,
    key: `payment:poll:${paymentId}`,
    payload: { paymentId, round },
    maxAttempts: MAX_ATTEMPTS.pollCharge,
    mode: "replace",
  };
}

export function processWebhookJob(
  deliveryId: string,
  deliveryKey: string,
): JobSpec {
  return {
    name: JOB.processWebhook,
    key: `payment:webhook:${deliveryKey}`,
    payload: { deliveryId },
    maxAttempts: MAX_ATTEMPTS.processWebhook,
    mode: "unsafe_dedupe",
  };
}

export function expireHoldJob(bookingId: string): JobSpec {
  return {
    name: JOB.expireHold,
    key: expireHoldKey(bookingId),
    payload: { bookingId },
    maxAttempts: MAX_ATTEMPTS.expireHold,
    mode: "preserve_run_at",
  };
}

export type RefundReason =
  | "customer_cancel"
  | "venue_cancel"
  | "manager"
  | "expired_after_capture";

export type RefundPayload = {
  paymentId: string;
  amountFils: number;
  reason: RefundReason;
  requestedByUserId?: string;
  refundKey: string;
};

export function refundJob(payload: RefundPayload): JobSpec {
  return {
    name: JOB.refund,
    key: `payment:refund:${payload.refundKey}`,
    payload,
    maxAttempts: MAX_ATTEMPTS.refund,
    mode: "unsafe_dedupe",
  };
}

export function bookingConfirmedJob(bookingId: string): JobSpec {
  return {
    name: JOB.confirmed,
    key: `booking:confirmed:${bookingId}`,
    payload: { bookingId },
    maxAttempts: MAX_ATTEMPTS.confirmed,
    mode: "unsafe_dedupe",
  };
}

export function bookingNotificationJob(args: {
  type: "booking_created" | "booking_refund_recorded";
  bookingId: string;
  dedupe: string;
  actorUserId?: string;
  amountFils?: number;
}): JobSpec {
  return {
    name: JOB.notification,
    key: `notification:${args.type}:${args.bookingId}:${args.dedupe}`,
    payload: {
      type: args.type,
      bookingId: args.bookingId,
      actorUserId: args.actorUserId,
      amountFils: args.amountFils,
    },
    maxAttempts: MAX_ATTEMPTS.notification,
    mode: "unsafe_dedupe",
  };
}
