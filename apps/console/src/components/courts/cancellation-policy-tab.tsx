"use client";

import * as React from "react";
import { toast } from "sonner";

import { useManagedVenue } from "~/components/console/managed-venue-context";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { describeCancellationPolicy } from "@repo/domain/booking-refund";
import {
  CANCELLATION_POLICY_PRESETS,
  MAX_CANCELLATION_TIERS,
  cancellationPolicySchema,
  type CancellationPolicy,
} from "@repo/validators/cancellation-policy";

import { cancellationPolicyLines } from "./cancellation-policy-model";
import {
  controlClass,
  dialogClass,
  inkButtonClass,
  linkButtonClass,
  outlineButtonClass,
} from "./classes";
import { toastMutationError } from "./mutation-error";

function numberValue(value: string) {
  return value === "" ? Number.NaN : Number(value);
}

function numberInput(value: number) {
  return Number.isNaN(value) ? "" : value;
}

function CancellationPolicyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const venue = useManagedVenue();
  const utils = api.useUtils();
  const [policy, setPolicy] = React.useState<CancellationPolicy>(
    venue.cancellationPolicy,
  );

  React.useEffect(() => {
    if (open) {
      setPolicy(venue.cancellationPolicy);
    }
  }, [open, venue.cancellationPolicy]);

  const update = api.venues.updateCancellationPolicy.useMutation({
    onSuccess: async () => {
      toast.success("Cancellation policy saved");
      onOpenChange(false);
      await utils.venues.managedById.invalidate({ venueId: venue.id });
    },
    onError: toastMutationError,
  });

  const parsed = cancellationPolicySchema.safeParse(policy);
  const problem = parsed.success
    ? null
    : (parsed.error.issues[0]?.message ?? null);

  function setTier(
    index: number,
    patch: Partial<CancellationPolicy["tiers"][number]>,
  ) {
    setPolicy((current) => ({
      ...current,
      tiers: current.tiers.map((tier, i) =>
        i === index ? { ...tier, ...patch } : tier,
      ),
    }));
  }

  function addTier() {
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
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (update.isPending ? null : onOpenChange(next))}
    >
      <DialogContent className={cn(dialogClass, "sm:max-w-lg")}>
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            if (!problem && !update.isPending) {
              update.mutate({ venueId: venue.id, policy });
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Cancellation policy</DialogTitle>
            <DialogDescription>
              How much of a Booking is refunded, by how long before it starts.
              Applies to Bookings made from now on.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {CANCELLATION_POLICY_PRESETS.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                variant="outline"
                className={cn(outlineButtonClass, "h-9 min-h-9 px-3")}
                onClick={() =>
                  setPolicy({
                    ...preset.policy,
                    tiers: [...preset.policy.tiers],
                  })
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            {policy.tiers.length > 0 ? (
              <div className="eyebrow-mono grid grid-cols-[1fr_1fr_auto] gap-2">
                <span>Hours before start</span>
                <span>Refund %</span>
                <span className="w-16" />
              </div>
            ) : null}
            {policy.tiers.map((tier, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
              >
                <Input
                  className={controlClass}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  aria-label={`Tier ${index + 1} hours before start`}
                  value={numberInput(tier.hoursBefore)}
                  onChange={(event) =>
                    setTier(index, {
                      hoursBefore: numberValue(event.target.value),
                    })
                  }
                />
                <Input
                  className={controlClass}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  aria-label={`Tier ${index + 1} refund percent`}
                  value={numberInput(tier.refundPercent)}
                  onChange={(event) =>
                    setTier(index, {
                      refundPercent: numberValue(event.target.value),
                    })
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  className={cn(outlineButtonClass, "h-9 min-h-9 w-16 px-0")}
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
            <button
              type="button"
              className={cn(linkButtonClass, "self-start")}
              disabled={policy.tiers.length >= MAX_CANCELLATION_TIERS}
              onClick={addTier}
            >
              Add tier
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="late-refund-percent" className="text-meta">
                Refund % after the last tier
              </Label>
              <Input
                id="late-refund-percent"
                className={controlClass}
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={numberInput(policy.lateRefundPercent)}
                onChange={(event) =>
                  setPolicy({
                    ...policy,
                    lateRefundPercent: numberValue(event.target.value),
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customer-cancel-until" className="text-meta">
                In-app cancel until (min before)
              </Label>
              <Input
                id="customer-cancel-until"
                className={controlClass}
                type="number"
                inputMode="numeric"
                min={0}
                max={1440}
                value={numberInput(policy.customerCancelUntilMinutes)}
                onChange={(event) =>
                  setPolicy({
                    ...policy,
                    customerCancelUntilMinutes: numberValue(event.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="border-border rounded-block border px-3.5 py-3">
            <p className="eyebrow-mono mb-1.5">What players see</p>
            {parsed.success ? (
              <ul className="text-meta flex flex-col gap-0.5">
                {describeCancellationPolicy(parsed.data).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p role="alert" className="text-destructive text-meta">
                {problem}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClass}
              disabled={update.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={inkButtonClass}
              disabled={Boolean(problem)}
              pending={update.isPending}
              pendingLabel="Saving…"
            >
              Save policy
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CancellationPolicyCard() {
  const venue = useManagedVenue();
  const [editing, setEditing] = React.useState(false);
  const lines = cancellationPolicyLines(venue.cancellationPolicy);

  return (
    <section className="border-border rounded-card flex flex-1 flex-col gap-3 border px-5 py-[18px]">
      <h2 className="text-body font-semibold">Cancellation policy</h2>
      <p className="text-muted-foreground text-eyebrow">
        Shown to every player before they pay.
      </p>
      {lines.map((line) => (
        <div
          key={line.label}
          className="text-meta flex items-center justify-between gap-4"
        >
          <span className="text-muted-foreground">{line.label}</span>
          <span className="text-right">{line.value}</span>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className={cn(outlineButtonClass, "mt-auto w-full")}
        onClick={() => setEditing(true)}
      >
        Edit policy
      </Button>
      <CancellationPolicyDialog open={editing} onOpenChange={setEditing} />
    </section>
  );
}
