"use client";

import { ArrowLeftRight } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import {
  isPreferredPosition,
  PREFERRED_POSITION_CHOICES,
  preferredPositionNote,
  type PreferredPosition,
} from "~/lib/preferred-position";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const TITLE_ID = "preferred-position-title";
const NOTE_ID = "preferred-position-note";

function storedPosition(
  value: string | null | undefined,
): PreferredPosition | null {
  return isPreferredPosition(value) ? value : null;
}

export function PreferredPositionControl() {
  const utils = api.useUtils();
  const state = api.users.onboardingState.useQuery();
  const buttonRefs = useRef<
    Partial<Record<PreferredPosition, HTMLButtonElement | null>>
  >({});
  const [optimistic, setOptimistic] = useState<PreferredPosition | null>();

  const setPreferredPosition = api.users.setPreferredPosition.useMutation({
    onMutate: ({ preferredPosition }) => {
      setOptimistic(preferredPosition);
    },
    onSuccess: async () => {
      await utils.users.onboardingState.invalidate();
      setOptimistic(undefined);
    },
    onError: (error) => {
      setOptimistic(undefined);
      toastGlobalFormError(error);
    },
  });

  const stored = storedPosition(state.data?.preferredPosition);
  const selected = optimistic !== undefined ? optimistic : stored;
  const canEdit = state.data != null && !state.data.provisioning;
  const disabled = !canEdit || setPreferredPosition.isPending;

  function save(next: PreferredPosition) {
    if (disabled || next === selected) {
      return;
    }
    setPreferredPosition.mutate({ preferredPosition: next });
  }

  function onRadioGroupKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) {
      return;
    }
    const values = PREFERRED_POSITION_CHOICES.map((choice) => choice.value);
    const currentIndex = selected ? values.indexOf(selected) : -1;
    let nextIndex = currentIndex;

    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = values.length - 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = currentIndex <= 0 ? values.length - 1 : currentIndex - 1;
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex =
        currentIndex === -1 || currentIndex >= values.length - 1
          ? 0
          : currentIndex + 1;
    } else {
      return;
    }

    event.preventDefault();
    const next = values[nextIndex];
    if (!next) {
      return;
    }
    save(next);
    buttonRefs.current[next]?.focus();
  }

  return (
    <div className="px-5 pb-5 pt-[18px]">
      <div className="flex items-start justify-between gap-3.5">
        <div className="min-w-0">
          <h3 id={TITLE_ID} className="text-ink text-base font-semibold">
            Preferred Position
          </h3>
          <p className="text-muted-foreground text-meta mt-[3px] leading-[1.45]">
            Your default side when you pick a Game seat
          </p>
        </div>
        <ArrowLeftRight
          aria-hidden="true"
          className="text-muted-foreground mt-0.5 size-5 shrink-0"
          strokeWidth={2}
        />
      </div>

      {state.isLoading ? (
        <Skeleton className="mt-4 h-[54px] w-full rounded-lg" />
      ) : (
        <div
          role="radiogroup"
          aria-labelledby={TITLE_ID}
          aria-describedby={NOTE_ID}
          aria-disabled={disabled || undefined}
          onKeyDown={onRadioGroupKeyDown}
          className="bg-wash mt-4 grid grid-cols-3 gap-1.5 rounded-lg p-[5px]"
        >
          {PREFERRED_POSITION_CHOICES.map((option, index) => {
            const isSelected = selected === option.value;
            const tabIndex =
              isSelected || (selected == null && index === 0) ? 0 : -1;

            return (
              <button
                key={option.value}
                ref={(node) => {
                  buttonRefs.current[option.value] = node;
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={tabIndex}
                disabled={disabled}
                className={cn(
                  "focus-visible:ring-ring/50 min-h-11 w-full rounded-[9px] text-sm outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
                  isSelected
                    ? "bg-ink text-paper font-semibold"
                    : "text-muted-foreground hover:text-ink bg-transparent",
                )}
                onClick={() => {
                  save(option.value);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      {state.isLoading ? null : (
        <p id={NOTE_ID} className="text-muted-foreground mt-2.5 text-xs">
          {preferredPositionNote(selected)}
        </p>
      )}
    </div>
  );
}
