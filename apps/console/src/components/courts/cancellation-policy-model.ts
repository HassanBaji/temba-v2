import type { RefundPolicy } from "@repo/domain/booking-refund";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor, type Messages } from "@repo/i18n/messages";

export type PolicyLine = { label: string; value: string };

type PolicyMessages = Messages["consoleCourts"]["policy"];

function refundLabel(percent: number, m: PolicyMessages) {
  if (percent >= 100) {
    return m.fullRefund;
  }
  if (percent <= 0) {
    return m.noRefund;
  }
  return m.percentRefund(percent);
}

export function describeMinutesShort(minutes: number, locale: Locale) {
  const m = messagesFor(locale).consoleCourts.policy;
  if (minutes % 60 === 0) {
    return m.hoursShort(minutes / 60);
  }
  return m.minutesShort(minutes);
}

/** The design's tier lines: `More than 24h before`, `6 to 24h before`, `Under 6h`. */
export function cancellationPolicyLines(
  policy: RefundPolicy,
  locale: Locale,
): PolicyLine[] {
  const m = messagesFor(locale).consoleCourts.policy;
  const lines: PolicyLine[] = [];
  const tiers = policy.tiers;
  if (tiers.length === 0) {
    lines.push({
      label: m.anyTime,
      value: refundLabel(policy.lateRefundPercent, m),
    });
  } else {
    tiers.forEach((tier, index) => {
      const previous = tiers[index - 1];
      lines.push({
        label: previous
          ? m.betweenHours(tier.hoursBefore, previous.hoursBefore)
          : m.moreThanHours(tier.hoursBefore),
        value: refundLabel(tier.refundPercent, m),
      });
    });
    const last = tiers[tiers.length - 1]!;
    lines.push({
      label: m.underHours(last.hoursBefore),
      value: refundLabel(policy.lateRefundPercent, m),
    });
  }
  if (policy.customerCancelUntilMinutes > 0) {
    lines.push({
      label: m.cancelInApp,
      value: m.untilBefore(
        describeMinutesShort(policy.customerCancelUntilMinutes, locale),
      ),
    });
  }
  return lines;
}
