"use client";

import * as React from "react";
import { toast } from "sonner";

import { Section } from "~/components/layout/section";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import { PRICE_PER_PLAYER_CURRENCY } from "@repo/domain/price-per-player";

import { NativeSelect } from "./native-select";
import {
  WEEKDAY_NAMES,
  WEEKDAY_ORDER,
  timeOptions,
} from "./opening-hours-model";
import {
  type PricingRuleDraft,
  draftProblem,
  draftsFromRules,
  draftsToInput,
  nextRuleDraft,
  withBaseRate,
} from "./pricing-model";

export function PricingTab({ venueId }: { venueId: string }) {
  const utils = api.useUtils();
  const venue = api.venues.managedById.useQuery({ venueId });
  const [drafts, setDrafts] = React.useState<PricingRuleDraft[]>([]);
  const [hydratedAt, setHydratedAt] = React.useState<number | null>(null);
  const [baseRate, setBaseRate] = React.useState("");

  React.useEffect(() => {
    if (!venue.data || venue.dataUpdatedAt === hydratedAt) {
      return;
    }
    setDrafts(draftsFromRules(venue.data.pricingRules));
    setHydratedAt(venue.dataUpdatedAt);
  }, [venue.data, venue.dataUpdatedAt, hydratedAt]);

  const setPricingRules = api.venues.setPricingRules.useMutation({
    onSuccess: async () => {
      toast.success("Pricing rules saved");
      await utils.venues.managedById.invalidate({ venueId });
    },
    onError: (error) => toastGlobalFormError(error),
  });

  const slotMinutes = venue.data?.slotMinutes ?? 30;
  const courts = venue.data?.courts ?? [];
  const options = React.useMemo(() => timeOptions(slotMinutes), [slotMinutes]);
  const busy = setPricingRules.isPending;

  function save(next: PricingRuleDraft[]) {
    const input = draftsToInput(next);
    if (!input.ok) {
      toast.error(input.message);
      return;
    }
    setPricingRules.mutate({ venueId, rules: input.rules });
  }

  function update(key: string, patch: Partial<PricingRuleDraft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, ...patch } : draft,
      ),
    );
  }

  function toggleWeekday(draft: PricingRuleDraft, weekday: number) {
    update(draft.key, {
      weekdays: draft.weekdays.includes(weekday)
        ? draft.weekdays.filter((day) => day !== weekday)
        : [...draft.weekdays, weekday],
    });
  }

  function applyBaseRate() {
    const next = withBaseRate(drafts, baseRate);
    const input = draftsToInput(next);
    if (!input.ok) {
      toast.error(input.message);
      return;
    }
    setDrafts(next);
    setPricingRules.mutate({ venueId, rules: input.rules });
  }

  const problem = drafts.map(draftProblem).find(Boolean) ?? null;

  return (
    <Section
      title="Pricing"
      description={`Hourly rates in ${PRICE_PER_PLAYER_CURRENCY}. A Booking is priced minute by minute from the rule covering each minute; a Court rule beats a Venue-wide rule, and a time with no rule cannot be booked. Rules for the same Courts must not overlap. A window may run to 06:00 the next day and prices on the weekday it opened.`}
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="text-body block font-medium">Base rate</span>
          <Input
            inputMode="decimal"
            placeholder="0.000"
            aria-label={`Base hourly rate in ${PRICE_PER_PLAYER_CURRENCY}`}
            value={baseRate}
            onChange={(event) => setBaseRate(event.target.value)}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !venue.data}
          onClick={applyBaseRate}
        >
          Use as base rate for all days
        </Button>
      </div>

      {drafts.length === 0 ? (
        <p className="text-body text-muted-foreground">
          No Pricing rules yet. Without a rule nothing can be booked.
        </p>
      ) : (
        <ul className="divide-border divide-y rounded-md border">
          {drafts.map((draft, index) => {
            const rowProblem = draftProblem(draft);
            const label = `Rule ${index + 1}`;
            return (
              <li key={draft.key} className="space-y-3 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <NativeSelect
                    aria-label={`${label} applies to`}
                    value={draft.courtId ?? ""}
                    onChange={(event) =>
                      update(draft.key, {
                        courtId: event.target.value || null,
                      })
                    }
                  >
                    <option value="">All Courts</option>
                    {courts.map((court) => (
                      <option key={court.id} value={court.id}>
                        {court.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    aria-label={`${label} starts`}
                    value={draft.startMinutes}
                    onChange={(event) =>
                      update(draft.key, {
                        startMinutes: Number(event.target.value),
                      })
                    }
                  >
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                  <span className="text-muted-foreground">to</span>
                  <NativeSelect
                    aria-label={`${label} ends`}
                    value={draft.endMinutes}
                    onChange={(event) =>
                      update(draft.key, {
                        endMinutes: Number(event.target.value),
                      })
                    }
                  >
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                  <Input
                    className="w-28"
                    inputMode="decimal"
                    placeholder="0.000"
                    aria-label={`${label} hourly rate in ${PRICE_PER_PLAYER_CURRENCY}`}
                    value={draft.rate}
                    onChange={(event) =>
                      update(draft.key, { rate: event.target.value })
                    }
                  />
                  <Input
                    className="w-36"
                    maxLength={60}
                    placeholder="Label (Peak)"
                    aria-label={`${label} label`}
                    value={draft.label}
                    onChange={(event) =>
                      update(draft.key, { label: event.target.value })
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    aria-label={`Remove ${label}`}
                    onClick={() =>
                      setDrafts((current) =>
                        current.filter((item) => item.key !== draft.key),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
                <div
                  role="group"
                  aria-label={`${label} weekdays`}
                  className="flex flex-wrap gap-3"
                >
                  {WEEKDAY_ORDER.map((weekday) => (
                    <label
                      key={weekday}
                      className="text-body flex items-center gap-1.5"
                    >
                      <input
                        type="checkbox"
                        checked={draft.weekdays.includes(weekday)}
                        onChange={() => toggleWeekday(draft, weekday)}
                      />
                      {WEEKDAY_NAMES[weekday].slice(0, 3)}
                    </label>
                  ))}
                </div>
                {rowProblem ? (
                  <p role="alert" className="text-body text-destructive">
                    {rowProblem}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy || !venue.data}
          onClick={() =>
            setDrafts((current) => [
              ...current,
              nextRuleDraft(null, slotMinutes),
            ])
          }
        >
          Add rule
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || courts.length === 0}
          onClick={() =>
            setDrafts((current) => [
              ...current,
              nextRuleDraft(courts[0]?.id ?? null, slotMinutes),
            ])
          }
        >
          Add Court override
        </Button>
        <Button
          type="button"
          disabled={busy || Boolean(problem) || !venue.data}
          pending={busy}
          pendingLabel="Saving…"
          onClick={() => save(drafts)}
        >
          Save pricing
        </Button>
      </div>
    </Section>
  );
}
