"use client";

import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { cn } from "~/lib/utils";

export function StepperField({
  id,
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
  decreaseLabel,
  increaseLabel,
  error,
  description,
}: {
  id: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  error?: string;
  description?: ReactNode;
}) {
  const canDecrease = value - step >= min;
  const canIncrease = value + step <= max;

  function stepBy(delta: number) {
    const next = value + delta;
    if (next < min || next > max) {
      return;
    }
    onChange(next);
  }

  return (
    <Field>
      <FieldLabel
        id={`${id}-label`}
        htmlFor={id}
        className="text-muted-foreground text-[13px] font-normal"
      >
        {label}
      </FieldLabel>
      <div
        id={id}
        tabIndex={-1}
        role="group"
        aria-labelledby={`${id}-label`}
        className="border-rule flex h-14 min-h-14 items-center overflow-hidden rounded-[12px] border outline-none"
      >
        <button
          type="button"
          aria-label={decreaseLabel}
          disabled={!canDecrease}
          onClick={() => {
            stepBy(-step);
          }}
          className={cn(
            "border-rule text-ink hover:bg-wash flex size-14 min-h-11 min-w-11 shrink-0 items-center justify-center border-r",
            "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
            "disabled:text-muted-foreground disabled:opacity-40 disabled:hover:bg-transparent",
          )}
        >
          <Minus aria-hidden="true" className="size-[17px]" strokeWidth={2} />
        </button>
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-[7px]">
          <span className="font-expanded text-[22px] tabular-nums tracking-[-0.03em]">
            {value}
          </span>
          <span className="text-muted-foreground text-[13px]">{unit}</span>
        </div>
        <button
          type="button"
          aria-label={increaseLabel}
          disabled={!canIncrease}
          onClick={() => {
            stepBy(step);
          }}
          className={cn(
            "border-rule text-ink hover:bg-wash flex size-14 min-h-11 min-w-11 shrink-0 items-center justify-center border-l",
            "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
            "disabled:text-muted-foreground disabled:opacity-40 disabled:hover:bg-transparent",
          )}
        >
          <Plus aria-hidden="true" className="size-[17px]" strokeWidth={2} />
        </button>
      </div>
      {description}
      <FieldError>{error}</FieldError>
    </Field>
  );
}
