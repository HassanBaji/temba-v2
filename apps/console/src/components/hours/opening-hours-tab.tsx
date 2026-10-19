"use client";

import { X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  ConsoleCard,
  ConsoleCardHeader,
} from "~/components/console/console-card";
import { useManagedVenue } from "~/components/console/managed-venue-context";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

import { inkButtonClass, linkButtonClass } from "./classes";
import { toastMutationError } from "./mutation-error";
import { NativeSelect } from "./native-select";
import {
  type HoursWindow,
  WEEKDAY_NAMES,
  WEEKDAY_ORDER,
  formatMinutes,
  formatOpenHours,
  hoursAreEqual,
  nextWindowAfter,
  timeOptions,
  windowsProblem,
} from "./opening-hours-model";

type Drafts = Record<number, HoursWindow[]>;

const rowGrid = "grid grid-cols-[90px_1fr_1fr_80px] items-center gap-3";

function draftsFromHours(
  hours: { weekday: number; opensAtMinutes: number; closesAtMinutes: number }[],
): Drafts {
  const drafts: Drafts = {};
  for (const weekday of WEEKDAY_ORDER) {
    drafts[weekday] = hours
      .filter((window) => window.weekday === weekday)
      .map(({ opensAtMinutes, closesAtMinutes }) => ({
        opensAtMinutes,
        closesAtMinutes,
      }));
  }
  return drafts;
}

export function WeeklyHoursCard() {
  const venue = useManagedVenue();
  const utils = api.useUtils();
  const saved = React.useMemo(
    () => draftsFromHours(venue.openingHours),
    [venue.openingHours],
  );
  const [drafts, setDrafts] = React.useState<Drafts>(saved);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setDrafts(saved);
  }, [saved]);

  const setOpeningHours = api.venues.setOpeningHours.useMutation({
    onError: toastMutationError,
  });

  const slotMinutes = venue.slotMinutes;
  const options = React.useMemo(() => timeOptions(slotMinutes), [slotMinutes]);
  const changedWeekdays = WEEKDAY_ORDER.filter(
    (weekday) => !hoursAreEqual(drafts[weekday] ?? [], saved[weekday] ?? []),
  );
  const problems = Object.fromEntries(
    WEEKDAY_ORDER.map((weekday) => [
      weekday,
      windowsProblem(drafts[weekday] ?? [], slotMinutes),
    ]),
  ) as Record<number, string | null>;
  const hasProblem = Object.values(problems).some(Boolean);

  function setWindows(weekday: number, windows: HoursWindow[]) {
    setDrafts((current) => ({ ...current, [weekday]: windows }));
  }

  function updateWindow(
    weekday: number,
    index: number,
    patch: Partial<HoursWindow>,
  ) {
    setWindows(
      weekday,
      (drafts[weekday] ?? []).map((window, i) =>
        i === index ? { ...window, ...patch } : window,
      ),
    );
  }

  async function saveAll() {
    setSaving(true);
    try {
      for (const weekday of changedWeekdays) {
        await setOpeningHours.mutateAsync({
          venueId: venue.id,
          weekday,
          windows: drafts[weekday] ?? [],
        });
      }
      toast.success("Hours saved");
      await utils.venues.managedById.invalidate({ venueId: venue.id });
    } catch {
      // the mutation's onError already reported it
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConsoleCard className="flex flex-col overflow-hidden">
      <ConsoleCardHeader title="Weekly hours" />
      <ul className="divide-border divide-y">
        {WEEKDAY_ORDER.map((weekday) => {
          const windows = drafts[weekday] ?? [];
          const name = WEEKDAY_NAMES[weekday];
          const problem = problems[weekday];
          return (
            <li key={weekday} className="px-5 py-3">
              {windows.length === 0 ? (
                <div className={rowGrid}>
                  <span className="text-meta">{name}</span>
                  <span className="text-muted-foreground text-meta col-span-2 flex items-center gap-3">
                    Closed
                    <button
                      type="button"
                      className={linkButtonClass}
                      disabled={saving}
                      onClick={() =>
                        setWindows(weekday, [
                          nextWindowAfter(windows, slotMinutes),
                        ])
                      }
                    >
                      Add window
                    </button>
                  </span>
                  <span className="text-muted-foreground text-meta text-right">
                    —
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {windows.map((window, index) => (
                    <div key={index} className={rowGrid}>
                      <span className="text-meta">
                        {index === 0 ? name : ""}
                      </span>
                      <NativeSelect
                        aria-label={`${name} window ${index + 1} opens`}
                        disabled={saving}
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
                      <span className="flex items-center gap-1.5">
                        <NativeSelect
                          aria-label={`${name} window ${index + 1} closes`}
                          disabled={saving}
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
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:bg-wash hover:text-ink rounded-block -mr-2 shrink-0"
                          disabled={saving}
                          aria-label={`Remove ${name} window ${index + 1} (${formatMinutes(window.opensAtMinutes)} to ${formatMinutes(window.closesAtMinutes)})`}
                          onClick={() =>
                            setWindows(
                              weekday,
                              windows.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <X aria-hidden="true" className="size-3.5" />
                        </Button>
                      </span>
                      <span className="text-muted-foreground text-meta text-right">
                        {index === 0 ? formatOpenHours(windows) : ""}
                      </span>
                    </div>
                  ))}
                  <div className={cn(rowGrid, "text-eyebrow")}>
                    <span />
                    <span className="col-span-2 flex items-center gap-3">
                      <button
                        type="button"
                        className={linkButtonClass}
                        disabled={saving}
                        onClick={() =>
                          setWindows(weekday, [
                            ...windows,
                            nextWindowAfter(windows, slotMinutes),
                          ])
                        }
                      >
                        Add window
                      </button>
                      <button
                        type="button"
                        className={linkButtonClass}
                        disabled={saving || Boolean(problem)}
                        aria-label={`Copy ${name} to every day`}
                        onClick={() =>
                          setDrafts((current) =>
                            Object.fromEntries(
                              WEEKDAY_ORDER.map((day) => [
                                day,
                                day === weekday
                                  ? (current[day] ?? [])
                                  : windows.map((window) => ({ ...window })),
                              ]),
                            ),
                          )
                        }
                      >
                        Copy to every day
                      </button>
                    </span>
                    <span />
                  </div>
                </div>
              )}
              {problem ? (
                <p role="alert" className="text-destructive text-meta mt-2">
                  {problem}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <footer className="border-border mt-auto flex items-center justify-between gap-4 border-t px-5 py-3.5">
        <p className="text-muted-foreground text-eyebrow">
          Changes apply to new bookings only.
        </p>
        <Button
          type="button"
          className={cn(inkButtonClass, "text-meta h-[38px] min-h-[38px]")}
          disabled={changedWeekdays.length === 0 || hasProblem || saving}
          pending={saving}
          pendingLabel="Saving…"
          onClick={() => void saveAll()}
        >
          Save hours
        </Button>
      </footer>
    </ConsoleCard>
  );
}
