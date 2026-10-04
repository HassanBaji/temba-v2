"use client";

import * as React from "react";

import {
  dayInputValueFromPickerDate,
  pickerDateFromInstant,
} from "~/components/games/calendar-day";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { Calendar } from "~/components/ui/calendar";
import { FieldError } from "~/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import {
  createDayChipLabel,
  createFlowDayOptions,
  dayChipValue,
} from "@repo/domain/create-game-flow";
import {
  earliestGameWindowDay,
  formatDayLabel,
  parseDateInputValue,
} from "@repo/domain/game-window";
import { zonedParts } from "@repo/domain/product-timezone";
import { cn } from "~/lib/utils";

export function DayField({
  now,
  day,
  dayError,
  onSelectDay,
}: {
  now: Date;
  day: string;
  dayError?: string;
  onSelectDay: (day: string) => void;
}) {
  const [dayOpen, setDayOpen] = React.useState(false);
  const [displayedMonth, setDisplayedMonth] = React.useState(() =>
    pickerDateFromInstant(
      parseDateInputValue(day) ?? earliestGameWindowDay(now),
    ),
  );

  const dayOptions = createFlowDayOptions(now);
  const selectedInstant = parseDateInputValue(day);
  const selectedDay = selectedInstant
    ? pickerDateFromInstant(selectedInstant)
    : undefined;
  const earliestDay = pickerDateFromInstant(earliestGameWindowDay(now));
  const calendarMonth =
    displayedMonth.getTime() < earliestDay.getTime()
      ? earliestDay
      : displayedMonth;
  const dayInChips = dayOptions.some((option) => dayChipValue(option) === day);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="game-window-day-label" className="font-expanded text-title">
          Day
        </h2>
        <Popover open={dayOpen} onOpenChange={setDayOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground focus-visible:ring-ring/50 text-body inline-flex min-h-11 items-center gap-1.5 outline-none focus-visible:ring-[3px]"
              aria-pressed={!dayInChips}
            >
              {dayInChips
                ? "Later date"
                : (formatDayLabel(day) ?? "Later date")}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDay}
              month={calendarMonth}
              startMonth={earliestDay}
              disabled={{ before: earliestDay }}
              onMonthChange={setDisplayedMonth}
              onSelect={(next) => {
                if (!next) {
                  return;
                }
                onSelectDay(dayInputValueFromPickerDate(next));
                setDayOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <RovingRadioGroup
        id="game-window-day"
        aria-labelledby="game-window-day-label"
        aria-invalid={dayError ? true : undefined}
        aria-describedby={dayError ? "game-window-day-error" : undefined}
        tabIndex={-1}
        className="grid grid-cols-5 gap-1.5 outline-none"
      >
        {dayOptions.map((option) => {
          const value = dayChipValue(option);
          const label = createDayChipLabel(option, now);
          return (
            <ChoiceChip
              key={value}
              role="radio"
              selected={day === value}
              className="h-auto flex-col gap-0.5 px-1 py-1.5"
              onClick={() => {
                onSelectDay(value);
              }}
            >
              <span
                className={cn(
                  "text-[11px]",
                  day === value ? "text-dim" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              <span className="text-base tabular-nums">
                {zonedParts(option).day}
              </span>
            </ChoiceChip>
          );
        })}
      </RovingRadioGroup>
      <FieldError id="game-window-day-error">{dayError}</FieldError>
    </section>
  );
}
