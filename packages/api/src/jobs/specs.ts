import type { JobSpec } from "./job-sink";

export const JOB = {
  createCharge: "payment.create-charge",
  pollCharge: "payment.poll-charge",
  processWebhook: "payment.process-webhook",
  expireHold: "booking.expire-hold",
  refund: "payment.refund",
  confirmed: "booking.confirmed",
  notification: "notification.booking",
  notificationEmail: "notification.email",
  reconcile: "booking:reconcile",
  settleMvp: "marks.settle-mvp",
  challengeExpire: "challenge.expire",
  proposalExpire: "proposal.expire",
  challengeSquadDue: "challenge.squad-due",
  scoreStands: "match.score-stands",
} as const;

export const MAX_ATTEMPTS = {
  createCharge: 5,
  pollCharge: 3,
  processWebhook: 10,
  expireHold: 3,
  refund: 8,
  confirmed: 5,
  notification: 5,
  notificationEmail: 5,
  settleMvp: 5,
  challengeExpire: 5,
  proposalExpire: 5,
  challengeSquadDue: 5,
  scoreStands: 5,
} as const;

export const POLL_INTERVAL_SECONDS = { first: 45, second: 90, steady: 120 };

export function expireHoldKey(bookingId: string) {
  return `booking:expire:${bookingId}`;
}

export function settleMvpJobKey(gameId: string) {
  return `mvp:settle:${gameId}`;
}

/** Settles a Game's MVP when its Marks window closes; enqueued at `closesAt`. */
export function settleMvpJob(gameId: string): JobSpec {
  return {
    name: JOB.settleMvp,
    key: settleMvpJobKey(gameId),
    payload: { gameId },
    maxAttempts: MAX_ATTEMPTS.settleMvp,
    mode: "replace",
  };
}

export function challengeExpireJobKey(challengeId: string) {
  return `challenge:expire:${challengeId}`;
}

/** Expires a Challenge nobody proposed on; enqueued at its `expires_at`. */
export function challengeExpireJob(challengeId: string): JobSpec {
  return {
    name: JOB.challengeExpire,
    key: challengeExpireJobKey(challengeId),
    payload: { challengeId },
    maxAttempts: MAX_ATTEMPTS.challengeExpire,
    mode: "replace",
  };
}

export function proposalExpireJobKey(proposalId: string) {
  return `proposal:expire:${proposalId}`;
}

/** Expires a Proposal nobody decided; enqueued at its `expires_at`, moved by a change. */
export function proposalExpireJob(proposalId: string): JobSpec {
  return {
    name: JOB.proposalExpire,
    key: proposalExpireJobKey(proposalId),
    payload: { proposalId },
    maxAttempts: MAX_ATTEMPTS.proposalExpire,
    mode: "replace",
  };
}

export function challengeSquadDueJobKey(gameId: string) {
  return `challenge:squad-due:${gameId}`;
}

/** Reminds who acts for a short side to name the squad; enqueued at kick-off minus 24 hours. */
export function challengeSquadDueJob(gameId: string): JobSpec {
  return {
    name: JOB.challengeSquadDue,
    key: challengeSquadDueJobKey(gameId),
    payload: { gameId },
    maxAttempts: MAX_ATTEMPTS.challengeSquadDue,
    mode: "replace",
  };
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
  | "expired_after_capture"
  | "captured_after_failure";

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

export function notificationEmailJob(notificationId: string): JobSpec {
  return {
    name: JOB.notificationEmail,
    key: `notification:email:${notificationId}`,
    payload: { notificationId },
    maxAttempts: MAX_ATTEMPTS.notificationEmail,
    mode: "unsafe_dedupe",
  };
}

export function scoreStandsJobKey(matchId: string) {
  return `match:score-stands:${matchId}`;
}

/** Completes a tournament Match whose entered score nobody answered; enqueued at entry plus ten minutes. */
export function scoreStandsJob(matchId: string): JobSpec {
  return {
    name: JOB.scoreStands,
    key: scoreStandsJobKey(matchId),
    payload: { matchId },
    maxAttempts: MAX_ATTEMPTS.scoreStands,
    mode: "replace",
  };
}
