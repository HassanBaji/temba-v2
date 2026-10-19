import { z } from "zod";

export const MAX_CANCELLATION_TIERS = 5;
export const MAX_CUSTOMER_CANCEL_UNTIL_MINUTES = 1440;

const percent = z
  .number()
  .int("Percent must be a whole number")
  .min(0, "Percent must be between 0 and 100")
  .max(100, "Percent must be between 0 and 100");

export const cancellationTierSchema = z.object({
  hoursBefore: z
    .number()
    .int("Hours must be a whole number")
    .min(1, "Hours must be at least 1")
    .max(24 * 90, "Hours must be at most 2160"),
  refundPercent: percent,
});

export const cancellationPolicySchema = z
  .object({
    tiers: z
      .array(cancellationTierSchema)
      .max(MAX_CANCELLATION_TIERS, "Use at most 5 tiers"),
    lateRefundPercent: percent,
    customerCancelUntilMinutes: z
      .number()
      .int("Minutes must be a whole number")
      .min(0, "Customer cancel limit must be between 0 and 1440")
      .max(
        MAX_CUSTOMER_CANCEL_UNTIL_MINUTES,
        "Customer cancel limit must be between 0 and 1440",
      ),
  })
  .superRefine((policy, ctx) => {
    for (let index = 1; index < policy.tiers.length; index += 1) {
      const previous = policy.tiers[index - 1]!;
      const current = policy.tiers[index]!;
      if (current.hoursBefore >= previous.hoursBefore) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tiers", index, "hoursBefore"],
          message: "Tiers must run from the most hours before to the fewest",
        });
      }
      if (current.refundPercent > previous.refundPercent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tiers", index, "refundPercent"],
          message: "A later tier cannot refund more than an earlier one",
        });
      }
    }
  });

export type CancellationPolicy = z.infer<typeof cancellationPolicySchema>;
export type CancellationTier = CancellationPolicy["tiers"][number];

export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  tiers: [{ hoursBefore: 24, refundPercent: 100 }],
  lateRefundPercent: 0,
  customerCancelUntilMinutes: 0,
};

export const CANCELLATION_POLICY_PRESETS = [
  {
    key: "full-24h",
    label: "Full refund until 24 h",
    policy: DEFAULT_CANCELLATION_POLICY,
  },
  {
    key: "tiered-48-12",
    label: "Tiered 48/12",
    policy: {
      tiers: [
        { hoursBefore: 48, refundPercent: 100 },
        { hoursBefore: 12, refundPercent: 50 },
      ],
      lateRefundPercent: 0,
      customerCancelUntilMinutes: 0,
    },
  },
  {
    key: "always-free",
    label: "Always free",
    policy: {
      tiers: [],
      lateRefundPercent: 100,
      customerCancelUntilMinutes: 0,
    },
  },
] as const satisfies readonly {
  key: string;
  label: string;
  policy: CancellationPolicy;
}[];
