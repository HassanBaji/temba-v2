import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type RefundPolicy = {
  tiers: readonly { hoursBefore: number; refundPercent: number }[];
  lateRefundPercent: number;
  customerCancelUntilMinutes: number;
};

export type CancellationRefund = {
  percent: number;
  refundDueFils: number;
  cancellationChargeFils: number;
  tierIndex: number | null;
};

export type RefundStep = {
  currentPercent: number;
  deadline: Date;
  nextPercent: number;
};

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

function hoursUntil(startsAt: Date, now: Date) {
  return (startsAt.getTime() - now.getTime()) / MS_PER_HOUR;
}

function tierIndexAt(policy: RefundPolicy, startsAt: Date, now: Date) {
  const hours = hoursUntil(startsAt, now);
  const index = policy.tiers.findIndex((tier) => hours >= tier.hoursBefore);
  return index === -1 ? null : index;
}

function percentOfTier(policy: RefundPolicy, index: number | null) {
  if (index === null) {
    return policy.lateRefundPercent;
  }
  return policy.tiers[index]?.refundPercent ?? policy.lateRefundPercent;
}

export function refundPercentAt(
  policy: RefundPolicy,
  startsAt: Date,
  now: Date,
): number {
  return percentOfTier(policy, tierIndexAt(policy, startsAt, now));
}

export function refundForCancellation(args: {
  policy: RefundPolicy;
  startsAt: Date;
  now: Date;
  priceFils: number;
  paidFils: number;
}): CancellationRefund {
  const tierIndex = tierIndexAt(args.policy, args.startsAt, args.now);
  const percent = percentOfTier(args.policy, tierIndex);
  return {
    percent,
    refundDueFils: Math.round((args.paidFils * percent) / 100),
    cancellationChargeFils:
      args.priceFils - Math.round((args.priceFils * percent) / 100),
    tierIndex,
  };
}

export function customerMayCancelAt(
  policy: RefundPolicy,
  startsAt: Date,
  now: Date,
): boolean {
  const minutes = (startsAt.getTime() - now.getTime()) / MS_PER_MINUTE;
  return minutes >= policy.customerCancelUntilMinutes;
}

function refundLabel(percent: number, locale: Locale) {
  const m = messagesFor(locale).booking.refund;
  if (percent >= 100) {
    return m.full;
  }
  if (percent <= 0) {
    return m.none;
  }
  return m.percent(percent);
}

function describeMinutes(minutes: number, locale: Locale) {
  const m = messagesFor(locale).booking.policy;
  if (minutes % 60 === 0) {
    return m.hours(minutes / 60);
  }
  return m.minutes(minutes);
}

export function describeCancellationPolicy(
  policy: RefundPolicy,
  locale: Locale,
): string[] {
  const m = messagesFor(locale).booking.policy;
  const lines: string[] = [];

  if (policy.tiers.length === 0) {
    lines.push(
      policy.lateRefundPercent >= 100
        ? m.freeAnyTime
        : m.refundOnCancellation(refundLabel(policy.lateRefundPercent, locale)),
    );
  } else {
    for (const tier of policy.tiers) {
      lines.push(
        m.refundUntilHoursBefore(
          refundLabel(tier.refundPercent, locale),
          tier.hoursBefore,
        ),
      );
    }
    lines.push(
      m.refundAfterThat(refundLabel(policy.lateRefundPercent, locale)),
    );
  }

  if (policy.customerCancelUntilMinutes > 0) {
    lines.push(
      m.cancelInAppUntil(
        describeMinutes(policy.customerCancelUntilMinutes, locale),
      ),
    );
  }

  return lines;
}

export function nextRefundStep(
  policy: RefundPolicy,
  startsAt: Date,
  now: Date,
): RefundStep | null {
  const currentIndex = tierIndexAt(policy, startsAt, now);
  const currentPercent = percentOfTier(policy, currentIndex);
  const firstLater = currentIndex ?? policy.tiers.length;

  for (let index = firstLater; index < policy.tiers.length; index += 1) {
    const tier = policy.tiers[index];
    if (!tier) {
      break;
    }
    const nextPercent =
      index + 1 < policy.tiers.length
        ? percentOfTier(policy, index + 1)
        : policy.lateRefundPercent;
    if (nextPercent !== currentPercent) {
      return {
        currentPercent,
        deadline: new Date(startsAt.getTime() - tier.hoursBefore * MS_PER_HOUR),
        nextPercent,
      };
    }
  }

  return null;
}
