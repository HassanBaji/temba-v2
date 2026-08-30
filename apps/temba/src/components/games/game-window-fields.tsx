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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  earliestGameWindowDay,
  formatDateInputValue,
  formatDayLabel,
  formatTimeSlotLabel,
  parseDateInputValue,
  upcomingGameWindowTimeSlots,
} from "~/lib/game-window";
import { cn } from "~/lib/utils";

function TimeSlotSelect({
  id,
  value,
  onChange,
  error,
  slots,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  slots: readonly string[];
}) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      <Select
        value={slots.includes(value) ? value : undefined}
        onValueChange={onChange}
      >
        <SelectTrigger
          ref={triggerRef}
          id={id}
          className="w-full"
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <SelectValue placeholder="Pick a time" />
        </SelectTrigger>
        <SelectContent position="popper">
          {slots.map((slot) => (
            <SelectItem key={slot} value={slot}>
              {formatTimeSlotLabel(slot)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        type="text"
        value={value}
        required
        readOnly
        tabIndex={-1}
        className="sr-only"
        aria-hidden="true"
        onInvalid={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      />
    </>
  );
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
  const now = new Date();
  const earliestDay = React.useMemo(() => earliestGameWindowDay(), []);
  const startSlots = upcomingGameWindowTimeSlots(day, now);
  const finishSlots = startTime
    ? startSlots.filter((slot) => slot >= startTime)
    : startSlots;
  const [displayedMonth, setDisplayedMonth] = React.useState(
    () => parseDateInputValue(day) ?? earliestDay,
  );
  const calendarMonth =
    displayedMonth.getTime() < earliestDay.getTime()
      ? earliestDay
      : displayedMonth;

  React.useEffect(() => {
    const next = parseDateInputValue(day);
    if (next) {
      setDisplayedMonth(next);
    }
  }, [day]);

  React.useEffect(() => {
    const slots = upcomingGameWindowTimeSlots(day);
    if (startTime && !slots.includes(startTime)) {
      onStartTimeChange("");
    }
    const nextFinishSlots =
      startTime && slots.includes(startTime)
        ? slots.filter((slot) => slot >= startTime)
        : slots;
    if (finishTime && !nextFinishSlots.includes(finishTime)) {
      onFinishTimeChange("");
    }
  }, [day, finishTime, onFinishTimeChange, onStartTimeChange, startTime]);

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
              month={calendarMonth}
              startMonth={earliestDay}
              disabled={{ before: earliestDay }}
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
          <TimeSlotSelect
            id={startId}
            value={startTime}
            onChange={(next) => {
              onStartTimeChange(next);
              if (finishTime && finishTime < next) {
                onFinishTimeChange("");
              }
            }}
            error={startError}
            slots={startSlots}
          />
          <FieldError id={`${startId}-error`}>{startError}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor={finishId}>Finish time</FieldLabel>
          <TimeSlotSelect
            id={finishId}
            value={finishTime}
            onChange={onFinishTimeChange}
            error={finishError}
            slots={finishSlots}
          />
          <FieldError id={`${finishId}-error`}>{finishError}</FieldError>
        </Field>
      </div>
      <FieldDescription id={`${dayId}-description`}>
        Day, start time, and finish time are required. Pick today or a later
        day. Times are in 30-minute intervals; for today, only upcoming times
        are listed.
      </FieldDescription>
    </div>
  );
}
