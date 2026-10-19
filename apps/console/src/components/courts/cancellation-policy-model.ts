import type { RefundPolicy } from "@repo/domain/booking-refund";

export type PolicyLine = { label: string; value: string };

function refundLabel(percent: number) {
  if (percent >= 100) {
    return "Full refund";
  }
  if (percent <= 0) {
    return "No refund";
  }
  return `${percent}% refund`;
}

export function describeMinutesShort(minutes: number) {
  if (minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  return `${minutes} min`;
}

/** The design's tier lines: `More than 24h before`, `6 to 24h before`, `Under 6h`. */
export function cancellationPolicyLines(policy: RefundPolicy): PolicyLine[] {
  const lines: PolicyLine[] = [];
  const tiers = policy.tiers;
  if (tiers.length === 0) {
    lines.push({
      label: "Any time",
      value: refundLabel(policy.lateRefundPercent),
    });
  } else {
    tiers.forEach((tier, index) => {
      const previous = tiers[index - 1];
      lines.push({
        label: previous
          ? `${tier.hoursBefore} to ${previous.hoursBefore}h before`
          : `More than ${tier.hoursBefore}h before`,
        value: refundLabel(tier.refundPercent),
      });
    });
    const last = tiers[tiers.length - 1]!;
    lines.push({
      label: `Under ${last.hoursBefore}h`,
      value: refundLabel(policy.lateRefundPercent),
    });
  }
  if (policy.customerCancelUntilMinutes > 0) {
    lines.push({
      label: "Cancel in the app",
      value: `Until ${describeMinutesShort(policy.customerCancelUntilMinutes)} before`,
    });
  }
  return lines;
}
