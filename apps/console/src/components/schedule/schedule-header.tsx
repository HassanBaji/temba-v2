"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { useMessages } from "~/components/locale-provider";

export function DateStepper({
  label,
  hint,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onToday,
}: {
  label: string;
  hint?: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const m = useMessages().consoleSchedule;
  return (
    <div className="border-rule rounded-control flex h-10 shrink-0 items-center overflow-hidden border">
      <button
        type="button"
        onClick={onPrevious}
        aria-label={previousLabel}
        className="hover:bg-wash flex size-10 items-center justify-center transition-colors"
      >
        <ChevronLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
      </button>
      <button
        type="button"
        onClick={onToday}
        title={m.goToToday}
        className="border-rule hover:bg-wash flex h-10 items-center whitespace-nowrap border-x px-4 text-[15px] font-semibold transition-colors"
      >
        {label}
        {hint ? (
          <span className="text-muted-foreground ms-2 text-xs font-normal">
            {hint}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label={nextLabel}
        className="hover:bg-wash flex size-10 items-center justify-center transition-colors"
      >
        <ChevronRight aria-hidden="true" className="size-4 rtl:rotate-180" />
      </button>
    </div>
  );
}

export function ScheduleLegend() {
  const m = useMessages().consoleSchedule.legend;
  return (
    <ul
      aria-label={m.label}
      className="text-muted-foreground ms-auto flex shrink-0 items-center gap-[18px] text-xs"
    >
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="bg-ink size-3 rounded-[3px]" />
        {m.app}
      </li>
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="border-ink size-3 rounded-[3px] border"
        />
        {m.manual}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="hatch size-3 rounded-[3px]" />
        {m.closed}
      </li>
    </ul>
  );
}
