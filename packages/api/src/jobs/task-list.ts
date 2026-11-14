import type { JobHelpers, TaskList } from "graphile-worker";

import { db as defaultDb, type Db } from "@repo/db";

import * as bookingConfirmed from "./handlers/booking.confirmed";
import * as bookingExpireHold from "./handlers/booking.expire-hold";
import * as bookingReconcile from "./handlers/booking.reconcile";
import * as challengeExpire from "./handlers/challenge.expire";
import * as challengeSquadDue from "./handlers/challenge.squad-due";
import * as notificationEmail from "./handlers/notification.email";
import * as kingPlaceAwards from "./handlers/king.place-awards";
import * as marksSettleMvp from "./handlers/marks.settle-mvp";
import * as matchConfirmWindow from "./handlers/match.confirm-window";
import * as matchScoreStands from "./handlers/match.score-stands";
import * as paymentCreateCharge from "./handlers/payment.create-charge";
import * as paymentPollCharge from "./handlers/payment.poll-charge";
import * as paymentProcessWebhook from "./handlers/payment.process-webhook";
import * as paymentRefund from "./handlers/payment.refund";
import * as proposalExpire from "./handlers/proposal.expire";
import * as ratingWindowSettle from "./handlers/rating-window.settle";
import { logJobFailed, type JobHandler } from "./handler";

const handlers: Record<string, JobHandler> = {
  [bookingReconcile.jobName]: bookingReconcile,
  [bookingConfirmed.jobName]: bookingConfirmed,
  [bookingExpireHold.jobName]: bookingExpireHold,
  [challengeExpire.jobName]: challengeExpire,
  [challengeSquadDue.jobName]: challengeSquadDue,
  [notificationEmail.jobName]: notificationEmail,
  [kingPlaceAwards.jobName]: kingPlaceAwards,
  [marksSettleMvp.jobName]: marksSettleMvp,
  [matchConfirmWindow.jobName]: matchConfirmWindow,
  [matchScoreStands.jobName]: matchScoreStands,
  [paymentCreateCharge.jobName]: paymentCreateCharge,
  [paymentPollCharge.jobName]: paymentPollCharge,
  [paymentProcessWebhook.jobName]: paymentProcessWebhook,
  [paymentRefund.jobName]: paymentRefund,
  [proposalExpire.jobName]: proposalExpire,
  [ratingWindowSettle.jobName]: ratingWindowSettle,
};

export const crontab = [bookingReconcile.crontabLine].join("\n");

function jobOf(helpers: JobHelpers) {
  return {
    name: helpers.job.task_identifier,
    key: helpers.job.key,
    attempts: helpers.job.attempts,
  };
}

export function wrapHandler(handler: JobHandler, db: Db) {
  return async (rawPayload: unknown, helpers: JobHelpers): Promise<void> => {
    const parsed = handler.payloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      // Retrying cannot fix a payload that fails its schema, so the job
      // completes after logging instead of throwing.
      logJobFailed(jobOf(helpers), parsed.error, true);
      return;
    }
    try {
      await handler.handle(db, parsed.data, helpers);
    } catch (error) {
      const isFinalAttempt = helpers.job.attempts >= helpers.job.max_attempts;
      if (isFinalAttempt) logJobFailed(jobOf(helpers), error, false);
      throw error;
    }
  };
}

export function createTaskList(db: Db = defaultDb): TaskList {
  return Object.fromEntries(
    Object.entries(handlers).map(([name, handler]) => [
      name,
      wrapHandler(handler, db),
    ]),
  );
}
