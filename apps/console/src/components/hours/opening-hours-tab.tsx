"use client";

import * as React from "react";
import { toast } from "sonner";

import { RowList } from "~/components/common/row-list";
import { Section } from "~/components/layout/section";
import { Button } from "~/components/ui/button";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";

import { NativeSelect } from "./native-select";
import {
  type HoursWindow,
  WEEKDAY_NAMES,
  WEEKDAY_ORDER,
  formatMinutes,
  nextWindowAfter,
  timeOptions,
  windowsProblem,
} from "./opening-hours-model";

type Drafts = Record<number, HoursWindow[]>;

export function OpeningHoursTab({ venueId }: { venueId: string }) {
  const utils = api.useUtils();
  const venue = api.venues.managedById.useQuery({ venueId });
  const [drafts, setDrafts] = React.useState<Drafts>({});
  const [hydratedAt, setHydratedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!venue.data || venue.dataUpdatedAt === hydratedAt) {
      return;
    }
    const next: Drafts = {};
    for (const weekday of WEEKDAY_ORDER) {
      next[weekday] = venue.data.openingHours
        .filter((window) => window.weekday === weekday)
        .map(({ opensAtMinutes, closesAtMinutes }) => ({
          opensAtMinutes,
          closesAtMinutes,
        }));
    }
    setDrafts(next);
    setHydratedAt(venue.dataUpdatedAt);
  }, [venue.data, venue.dataUpdatedAt, hydratedAt]);

  const setOpeningHours = api.venues.setOpeningHours.useMutation({
    onError: (error) => toastGlobalFormError(error),
  });

  const slotMinutes = venue.data?.slotMinutes ?? 30;
  const options = React.useMemo(() => timeOptions(slotMinutes), [slotMinutes]);
  const [savingWeekday, setSavingWeekday] = React.useState<number | null>(null);

  function updateWindow(
    weekday: number,
    index: number,
    patch: Partial<HoursWindow>,
  ) {
    setDrafts((current) => ({
      ...current,
      [weekday]: (current[weekday] ?? []).map((window, i) =>
        i === index ? { ...window, ...patch } : window,
      ),
    }));
  }

  async function saveDay(weekday: number) {
    setSavingWeekday(weekday);
    try {
      await setOpeningHours.mutateAsync({
        venueId,
        weekday,
        windows: drafts[weekday] ?? [],
      });
      toast.success(`${WEEKDAY_NAMES[weekday]} saved`);
      await utils.venues.managedById.invalidate({ venueId });
    } catch {
      // the mutation's onError already reported it
    } finally {
      setSavingWeekday(null);
    }
  }

  async function copyToAllDays(source: number) {
    const windows = drafts[source] ?? [];
    setSavingWeekday(source);
    try {
      for (const weekday of WEEKDAY_ORDER) {
        await setOpeningHours.mutateAsync({ venueId, weekday, windows });
      }
      toast.success(`${WEEKDAY_NAMES[source]} hours copied to every day`);
      await utils.venues.managedById.invalidate({ venueId });
    } catch {
      // the mutation's onError already reported it
    } finally {
      setSavingWeekday(null);
    }
  }

  return (
    <Section
      title="Opening hours"
      description={`Add one or more windows per day. A day with no windows is closed. Times follow the ${slotMinutes}-minute Booking grid and may run to 06:00 the next day.`}
    >
      <RowList>
        {WEEKDAY_ORDER.map((weekday) => {
          const windows = drafts[weekday] ?? [];
          const problem = windowsProblem(windows, slotMinutes);
          const busy = savingWeekday !== null;
          const name = WEEKDAY_NAMES[weekday];
          return (
            <li key={weekday} className="space-y-3 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-body font-semibold">{name}</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || !venue.data}
                    onClick={() =>
                      setDrafts((current) => ({
                        ...current,
                        [weekday]: [
                          ...windows,
                          nextWindowAfter(windows, slotMinutes),
                        ],
                      }))
                    }
                  >
                    Add window
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || Boolean(problem) || !venue.data}
                    aria-label={`Copy ${name} to all days`}
                    onClick={() => void copyToAllDays(weekday)}
                  >
                    Copy to all days
                  </Button>
                  <Button
                    type="button"
                    disabled={busy || Boolean(problem) || !venue.data}
                    pending={savingWeekday === weekday}
                    pendingLabel="Saving…"
                    aria-label={`Save ${name}`}
                    onClick={() => void saveDay(weekday)}
                  >
                    Save
                  </Button>
                </div>
              </div>
              {windows.length === 0 ? (
                <p className="text-body text-muted-foreground">Closed</p>
              ) : (
                <ul className="space-y-2">
                  {windows.map((window, index) => (
                    <li key={index} className="flex flex-wrap items-center gap-2">
                      <NativeSelect
                        aria-label={`${name} window ${index + 1} opens`}
                        value={window.opensAtMinutes}
                        onChange={(event) =>
                          updateWindow(weekday, index, {
                            opensAtMinutes: Number(event.target.value),
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
                        aria-label={`${name} window ${index + 1} closes`}
                        value={window.closesAtMinutes}
                        onChange={(event) =>
                          updateWindow(weekday, index, {
                            closesAtMinutes: Number(event.target.value),
                          })
                        }
                      >
                        {options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        aria-label={`Remove ${name} window ${index + 1} (${formatMinutes(window.opensAtMinutes)} to ${formatMinutes(window.closesAtMinutes)})`}
                        onClick={() =>
                          setDrafts((current) => ({
                            ...current,
                            [weekday]: windows.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {problem ? (
                <p role="alert" className="text-body text-destructive">
                  {problem}
                </p>
              ) : null}
            </li>
          );
        })}
      </RowList>
    </Section>
  );
}
