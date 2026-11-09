"use client";

import * as React from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import {
  challengeSlotDayOptions,
  challengeSlotInstant,
  challengeSlotTimeOptions,
} from "@repo/domain/challenge-form";

import { ChallengePostChip } from "./challenge-post-parts";

const DEFAULT_SLOT_MINUTES = 19 * 60;

/** "Add slot": a day in the next two weeks and a start on the half hour. */
export function ChallengePostSlotDialog({
  open,
  onOpenChange,
  now,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  now: Date;
  onAdd: (slot: Date) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.challenge.post;
  const days = challengeSlotDayOptions(now, locale);
  const [day, setDay] = React.useState(() => days[1]?.value ?? "");
  const [minutes, setMinutes] = React.useState(DEFAULT_SLOT_MINUTES);
  const timeId = React.useId();

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{copy.slotTitle}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-4 pb-4 md:px-0 md:pb-0">
          <div className="space-y-2">
            <p className="text-meta text-muted-foreground">{copy.slotDay}</p>
            <div
              role="radiogroup"
              aria-label={copy.slotDay}
              className="grid grid-cols-4 gap-1.5"
            >
              {days.map((option) => (
                <ChallengePostChip
                  key={option.value}
                  label={option.label}
                  aria-label={option.accessibilityLabel}
                  selected={option.value === day}
                  onClick={() => setDay(option.value)}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor={timeId} className="text-meta text-muted-foreground">
              {copy.slotTime}
            </label>
            <select
              id={timeId}
              className="border-input bg-background text-body h-11 w-full rounded-md border px-3"
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            >
              {challengeSlotTimeOptions(locale).map((time) => (
                <option key={time.value} value={time.value}>
                  {time.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose asChild>
            <Button type="button" variant="outline">
              {m.common.cancel}
            </Button>
          </ResponsiveDialogClose>
          <Button
            type="button"
            onClick={() => {
              onAdd(challengeSlotInstant(day, minutes));
              onOpenChange(false);
            }}
          >
            {copy.addSlot}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
