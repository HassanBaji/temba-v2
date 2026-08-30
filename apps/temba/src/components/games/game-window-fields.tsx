"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { Calendar } from "~/components/ui/calendar";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { formatDateInputValue, parseDateInputValue } from "~/lib/game-window";
import { cn } from "~/lib/utils";

function formatDayLabel(day: string) {
  const date = parseDateInputValue(day);
  if (!date) {
    return null;
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function GameWindowFields({
  dayId,
  startId,
  finishId,
  day,
  startTime,
  finishTime,
  onDayChange,
  onStartTimeChange,
  onFinishTimeChange,
  startError,
  finishError,
}: {
  dayId: string;
  startId: string;
  finishId: string;
  day: string;
  startTime: string;
  finishTime: string;
  onDayChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onFinishTimeChange: (value: string) => void;
  startError?: string;
  finishError?: string;
}) {
  const [dayOpen, setDayOpen] = React.useState(false);
  const dayButtonRef = React.useRef<HTMLButtonElement>(null);
  const selectedDay = parseDateInputValue(day);
  const dayLabel = formatDayLabel(day);
  const [displayedMonth, setDisplayedMonth] = React.useState(
    () => parseDateInputValue(day) ?? new Date(),
  );

  React.useEffect(() => {
    const next = parseDateInputValue(day);
    if (next) {
      setDisplayedMonth(next);
    }
  }, [day]);

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={dayId}>Day</FieldLabel>
        <Popover open={dayOpen} onOpenChange={setDayOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={dayButtonRef}
              id={dayId}
              type="button"
              variant="outline"
              className={cn(
                "h-11 min-h-11 w-full justify-start font-normal",
                !dayLabel && "text-muted-foreground",
              )}
              aria-required="true"
              aria-expanded={dayOpen}
              aria-haspopup="dialog"
              aria-describedby={`${dayId}-description`}
            >
              <CalendarIcon />
              {dayLabel ?? "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDay}
              month={displayedMonth}
              onMonthChange={setDisplayedMonth}
              onSelect={(next) => {
                if (!next) {
                  return;
                }
                onDayChange(formatDateInputValue(next));
                setDayOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        <input
          type="text"
          value={day}
          required
          readOnly
          tabIndex={-1}
          className="sr-only"
          aria-hidden="true"
          onInvalid={(event) => {
            event.preventDefault();
            setDayOpen(true);
            dayButtonRef.current?.focus();
          }}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={startId}>Start time</FieldLabel>
          <Input
            id={startId}
            type="time"
            step={60}
            value={startTime}
            onChange={(event) => onStartTimeChange(event.target.value)}
            required
            aria-invalid={startError ? true : undefined}
            aria-describedby={startError ? `${startId}-error` : undefined}
          />
          <FieldError id={`${startId}-error`}>{startError}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor={finishId}>Finish time</FieldLabel>
          <Input
            id={finishId}
            type="time"
            step={60}
            min={startTime || undefined}
            value={finishTime}
            onChange={(event) => onFinishTimeChange(event.target.value)}
            required
            aria-invalid={finishError ? true : undefined}
            aria-describedby={finishError ? `${finishId}-error` : undefined}
          />
          <FieldError id={`${finishId}-error`}>{finishError}</FieldError>
        </Field>
      </div>
      <FieldDescription id={`${dayId}-description`}>
        Day, start time, and finish time are required. Both times are on the
        selected day.
      </FieldDescription>
    </div>
  );
}
