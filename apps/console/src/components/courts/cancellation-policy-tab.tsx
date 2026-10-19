"use client";

import * as React from "react";
import { toast } from "sonner";

import { Section } from "~/components/layout/section";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import { describeCancellationPolicy } from "@repo/domain/booking-refund";
import {
  CANCELLATION_POLICY_PRESETS,
  MAX_CANCELLATION_TIERS,
  cancellationPolicySchema,
  type CancellationPolicy,
} from "@repo/validators/cancellation-policy";

export function CancellationPolicyTab({ venueId }: { venueId: string }) {
  const utils = api.useUtils();
  const venue = api.venues.managedById.useQuery({ venueId });
  const [policy, setPolicy] = React.useState<CancellationPolicy | null>(null);
  const [hydratedAt, setHydratedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!venue.data || venue.dataUpdatedAt === hydratedAt) {
      return;
    }
    setPolicy(venue.data.cancellationPolicy);
    setHydratedAt(venue.dataUpdatedAt);
  }, [venue.data, venue.dataUpdatedAt, hydratedAt]);

  const update = api.venues.updateCancellationPolicy.useMutation({
    onSuccess: async () => {
      toast.success("Cancellation policy saved");
      await utils.venues.managedById.invalidate({ venueId });
    },
    onError: (error) => toastGlobalFormError(error),
  });

  if (!policy) {
    return (
      <Section title="Cancellation policy">
        <p className="text-body text-muted-foreground">Loading…</p>
      </Section>
    );
  }

  const parsed = cancellationPolicySchema.safeParse(policy);
  const problem = parsed.success ? null : (parsed.error.issues[0]?.message ?? null);

  function setTier(index: number, patch: Partial<CancellationPolicy["tiers"][number]>) {
    setPolicy((current) =>
      current
        ? {
            ...current,
            tiers: current.tiers.map((tier, i) =>
              i === index ? { ...tier, ...patch } : tier,
            ),
          }
        : current,
    );
  }

  function numberValue(value: string) {
    return value === "" ? Number.NaN : Number(value);
  }

  return (
    <>
      <Section
        title="Cancellation policy"
        description="How much of a Booking is refunded, by how long before it starts. Changes apply to Bookings made from now on."
      >
        <div className="flex flex-wrap gap-2">
          {CANCELLATION_POLICY_PRESETS.map((preset) => (
            <Button
              key={preset.key}
              type="button"
              variant="outline"
              onClick={() => setPolicy({ ...preset.policy, tiers: [...preset.policy.tiers] })}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {policy.tiers.map((tier, index) => (
            <div key={index} className="flex flex-wrap items-end gap-3">
              <Field>
                <FieldLabel htmlFor={`tier-hours-${index}`}>
                  Tier {index + 1}: hours before start
                </FieldLabel>
                <Input
                  id={`tier-hours-${index}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={Number.isNaN(tier.hoursBefore) ? "" : tier.hoursBefore}
                  onChange={(event) =>
                    setTier(index, { hoursBefore: numberValue(event.target.value) })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`tier-percent-${index}`}>
                  Tier {index + 1}: refund %
                </FieldLabel>
                <Input
                  id={`tier-percent-${index}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={Number.isNaN(tier.refundPercent) ? "" : tier.refundPercent}
                  onChange={(event) =>
                    setTier(index, { refundPercent: numberValue(event.target.value) })
                  }
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                aria-label={`Remove tier ${index + 1}`}
                onClick={() =>
                  setPolicy({
                    ...policy,
                    tiers: policy.tiers.filter((_, i) => i !== index),
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={policy.tiers.length >= MAX_CANCELLATION_TIERS}
            onClick={() => {
              const last = policy.tiers[policy.tiers.length - 1];
              setPolicy({
                ...policy,
                tiers: [
                  ...policy.tiers,
                  {
                    hoursBefore: Math.max((last?.hoursBefore ?? 49) - 12, 1),
                    refundPercent: last ? Math.floor(last.refundPercent / 2) : 100,
                  },
                ],
              });
            }}
          >
            Add tier
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="late-refund-percent">
              Refund % after the last tier
            </FieldLabel>
            <Input
              id="late-refund-percent"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={Number.isNaN(policy.lateRefundPercent) ? "" : policy.lateRefundPercent}
              onChange={(event) =>
                setPolicy({ ...policy, lateRefundPercent: numberValue(event.target.value) })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="customer-cancel-until">
              Customers can cancel in the app until (minutes before start)
            </FieldLabel>
            <Input
              id="customer-cancel-until"
              type="number"
              inputMode="numeric"
              min={0}
              max={1440}
              value={
                Number.isNaN(policy.customerCancelUntilMinutes)
                  ? ""
                  : policy.customerCancelUntilMinutes
              }
              onChange={(event) =>
                setPolicy({
                  ...policy,
                  customerCancelUntilMinutes: numberValue(event.target.value),
                })
              }
            />
          </Field>
        </div>

        {problem ? (
          <p role="alert" className="text-body text-destructive">
            {problem}
          </p>
        ) : null}

        <Button
          type="button"
          className="min-h-11"
          disabled={Boolean(problem) || update.isPending}
          onClick={() => update.mutate({ venueId, policy })}
        >
          {update.isPending ? "Saving…" : "Save"}
        </Button>
      </Section>

      <Section title="What Customers see">
        {parsed.success ? (
          <ul className="text-body list-disc space-y-1 pl-5">
            {describeCancellationPolicy(parsed.data).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-muted-foreground">
            Fix the policy above to see the preview.
          </p>
        )}
      </Section>
    </>
  );
}
