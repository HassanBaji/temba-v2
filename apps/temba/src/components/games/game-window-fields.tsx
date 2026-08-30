import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";

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
  dayError,
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
  dayError?: string;
  startError?: string;
  finishError?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={dayId}>Day</FieldLabel>
        <Input
          id={dayId}
          type="date"
          value={day}
          onChange={(event) => onDayChange(event.target.value)}
          required
          aria-invalid={dayError ? true : undefined}
          aria-describedby={
            dayError ? `${dayId}-error` : `${dayId}-description`
          }
        />
        <FieldError id={`${dayId}-error`}>{dayError}</FieldError>
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
