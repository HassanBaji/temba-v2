"use client";

import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  ConsoleCard,
  ConsoleCardHeader,
} from "~/components/console/console-card";
import { useManagedVenue } from "~/components/console/managed-venue-context";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { useLocale, useMessages } from "~/components/locale-provider";

import {
  controlClass,
  inkButtonClass,
  linkButtonClass,
  outlineButtonClass,
} from "./classes";
import { toastMutationError } from "./mutation-error";
import { NativeSelect } from "./native-select";
import { sportLabel } from "@repo/domain/sport";
import {
  ALL_WEEKDAYS,
  type PricingRuleDraft,
  describeWeekdays,
  draftProblem,
  draftsAreEqual,
  draftsFromRules,
  draftsToInput,
  formatTimeWindow,
  nextRuleDraft,
  rateTimeOptions,
  withBaseRate,
} from "./pricing-model";

const rowGrid = "grid grid-cols-[1.3fr_1fr_1fr_1fr_32px] items-center gap-2.5";

export function RateCard() {
  const messages = useMessages();
  const { consoleCourts, consoleShell, common } = messages;
  const m = consoleCourts.rates;
  const CURRENCY = messages.createGame.price.currency;
  const locale = useLocale();
  const venue = useManagedVenue();
  const utils = api.useUtils();
  const saved = React.useMemo(
    () => draftsFromRules(venue.pricingRules),
    [venue.pricingRules],
  );
  const [drafts, setDrafts] = React.useState<PricingRuleDraft[]>(saved);
  const [expandedKey, setExpandedKey] = React.useState<string | null>(null);
  const [baseRate, setBaseRate] = React.useState("");

  React.useEffect(() => {
    setDrafts(saved);
  }, [saved]);

  const setPricingRules = api.venues.setPricingRules.useMutation({
    onSuccess: async () => {
      toast.success(m.savedToast);
      setExpandedKey(null);
      await utils.venues.managedById.invalidate({ venueId: venue.id });
    },
    onError: toastMutationError,
  });

  const options = React.useMemo(
    () => rateTimeOptions(venue.slotMinutes, locale),
    [venue.slotMinutes, locale],
  );
  const busy = setPricingRules.isPending;
  const dirty = !draftsAreEqual(drafts, saved);
  const problem =
    drafts.map((draft) => draftProblem(draft, locale)).find(Boolean) ?? null;

  function save(next: PricingRuleDraft[]) {
    const input = draftsToInput(next, locale);
    if (!input.ok) {
      toast.error(input.message);
      return;
    }
    setPricingRules.mutate({ venueId: venue.id, rules: input.rules });
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

  function addBand() {
    const draft = nextRuleDraft(null, venue.slotMinutes);
    setDrafts((current) => [...current, draft]);
    setExpandedKey(draft.key);
  }

  function removeBand(key: string) {
    setDrafts((current) => current.filter((draft) => draft.key !== key));
    setExpandedKey((current) => (current === key ? null : current));
  }

  function applyBaseRate() {
    const next = withBaseRate(drafts, baseRate, m.baseRateName);
    const input = draftsToInput(next, locale);
    if (!input.ok) {
      toast.error(input.message);
      return;
    }
    setDrafts(next);
    setPricingRules.mutate({ venueId: venue.id, rules: input.rules });
  }

  function courtLabel(courtId: string | null) {
    return courtId
      ? (venue.courts.find((court) => court.id === courtId)?.name ??
          consoleCourts.court)
      : consoleCourts.allCourts;
  }

  return (
    <ConsoleCard className="flex flex-col overflow-hidden">
      <ConsoleCardHeader
        title={m.title}
        action={
          <button
            type="button"
            className={linkButtonClass}
            disabled={busy}
            onClick={addBand}
          >
            {m.addBand}
          </button>
        }
      />

      {drafts.length === 0 ? (
        <div className="flex flex-col gap-3 px-5 py-6">
          <p className="text-meta">{m.emptyTitle}</p>
          <p className="text-muted-foreground text-meta">
            {m.emptyDescription}
          </p>
          <div className="flex items-center gap-2">
            <Input
              className={cn(controlClass, "w-32")}
              inputMode="decimal"
              placeholder="0.000"
              aria-label={m.baseRateLabel(CURRENCY)}
              value={baseRate}
              onChange={(event) => setBaseRate(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className={outlineButtonClass}
              disabled={busy || baseRate.trim() === ""}
              onClick={applyBaseRate}
            >
              {m.useAsBase}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              rowGrid,
              "eyebrow-mono border-border border-b px-5 py-2.5",
            )}
            aria-hidden="true"
          >
            <span>{m.columns.band}</span>
            <span>{m.columns.courts}</span>
            <span>{m.columns.rate(CURRENCY)}</span>
            <span>{m.columns.days}</span>
            <span />
          </div>
          <ul className="divide-border divide-y">
            {drafts.map((draft, index) => {
              const rowProblem = draftProblem(draft, locale);
              const expanded = expandedKey === draft.key;
              const name = draft.label.trim() || m.bandFallback(index + 1);
              const editorId = `band-editor-${draft.key}`;
              return (
                <li key={draft.key} className="px-5 py-3.5">
                  <div className={rowGrid}>
                    <button
                      type="button"
                      className="rounded-xs text-meta -mx-1 px-1 text-start outline-none focus-visible:ring-2"
                      aria-expanded={expanded}
                      aria-controls={editorId}
                      onClick={() =>
                        setExpandedKey(expanded ? null : draft.key)
                      }
                    >
                      <span className="block truncate">{name}</span>
                      <span className="text-muted-foreground block">
                        {formatTimeWindow(
                          draft.startMinutes,
                          draft.endMinutes,
                          locale,
                        )}
                      </span>
                    </button>
                    <span className="text-meta truncate">
                      {courtLabel(draft.courtId)}
                    </span>
                    <Input
                      className={cn(
                        controlClass,
                        rowProblem && !expanded && "border-destructive",
                      )}
                      inputMode="decimal"
                      placeholder="0.000"
                      aria-label={m.rateLabel(name, CURRENCY)}
                      value={draft.rate}
                      onChange={(event) =>
                        update(draft.key, { rate: event.target.value })
                      }
                    />
                    <span className="text-muted-foreground text-meta">
                      {describeWeekdays(draft.weekdays, locale)}
                    </span>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={m.bandActions(name)}
                          className="text-muted-foreground hover:bg-wash hover:text-ink rounded-block"
                        >
                          <MoreHorizontal
                            aria-hidden="true"
                            className="size-4"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="rounded-block border-border min-w-40 shadow-none"
                      >
                        <DropdownMenuItem
                          className="text-meta cursor-pointer"
                          onSelect={() =>
                            setExpandedKey(expanded ? null : draft.key)
                          }
                        >
                          {expanded ? m.doneEditing : m.editBand}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          className="text-meta cursor-pointer"
                          onSelect={() => removeBand(draft.key)}
                        >
                          {m.removeBand}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {expanded ? (
                    <div
                      id={editorId}
                      className="border-border mt-3.5 grid grid-cols-2 gap-3 border-t pt-3.5"
                    >
                      <label className="flex flex-col gap-1.5">
                        <span className="text-muted-foreground text-eyebrow">
                          {m.bandName}
                        </span>
                        <Input
                          className={controlClass}
                          maxLength={60}
                          placeholder={m.bandNamePlaceholder}
                          value={draft.label}
                          onChange={(event) =>
                            update(draft.key, { label: event.target.value })
                          }
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-muted-foreground text-eyebrow">
                          {m.courts}
                        </span>
                        <NativeSelect
                          value={draft.courtId ?? ""}
                          onChange={(event) =>
                            update(draft.key, {
                              courtId: event.target.value || null,
                            })
                          }
                        >
                          <option value="">{consoleCourts.allCourts}</option>
                          {venue.courts.map((court) => (
                            <option key={court.id} value={court.id}>
                              {m.courtAndSport(
                                court.name,
                                sportLabel(court.sport, locale) ?? "",
                              )}
                            </option>
                          ))}
                        </NativeSelect>
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-muted-foreground text-eyebrow">
                          {m.from}
                        </span>
                        <NativeSelect
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
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-muted-foreground text-eyebrow">
                          {m.to}
                        </span>
                        <NativeSelect
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
                      </label>
                      <div
                        role="group"
                        aria-label={m.daysOf(name)}
                        className="col-span-2 flex flex-wrap items-center gap-1.5"
                      >
                        {ALL_WEEKDAYS.map((weekday) => {
                          const on = draft.weekdays.includes(weekday);
                          return (
                            <button
                              key={weekday}
                              type="button"
                              aria-pressed={on}
                              className={cn(
                                "rounded-xs text-meta border px-2 py-[3px] transition-colors",
                                on
                                  ? "bg-ink text-paper border-ink"
                                  : "border-border text-muted-foreground hover:bg-wash",
                              )}
                              onClick={() => toggleWeekday(draft, weekday)}
                            >
                              {consoleShell.weekdaysShort[weekday]}
                            </button>
                          );
                        })}
                      </div>
                      {rowProblem ? (
                        <p
                          role="alert"
                          className="text-destructive text-meta col-span-2"
                        >
                          {rowProblem}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <footer className="border-border mt-auto flex items-center justify-between gap-4 border-t px-5 py-3.5">
        <p className="text-muted-foreground text-eyebrow">
          {m.footer(CURRENCY)}
        </p>
        {drafts.length > 0 || dirty ? (
          <Button
            type="button"
            className={cn(
              inkButtonClass,
              "text-meta h-[38px] min-h-[38px] shrink-0",
            )}
            disabled={!dirty || Boolean(problem) || busy}
            pending={busy}
            pendingLabel={common.saving}
            onClick={() => save(drafts)}
          >
            {m.save}
          </Button>
        ) : null}
      </footer>
    </ConsoleCard>
  );
}
