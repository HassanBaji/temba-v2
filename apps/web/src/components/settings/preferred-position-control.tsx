"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";

import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { Skeleton } from "~/components/ui/skeleton";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import {
  isPreferredPosition,
  PREFERRED_POSITION_CHOICES,
  preferredPositionNote,
  type PreferredPosition,
} from "@repo/domain/preferred-position";
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

  return (
    <div className="px-5 pb-5 pt-[18px]">
      <div className="flex items-start justify-between gap-3.5">
        <div className="min-w-0">
          <h3 id={TITLE_ID} className="text-ink text-lead font-semibold">
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
        <RovingRadioGroup
          aria-labelledby={TITLE_ID}
          aria-describedby={NOTE_ID}
          aria-disabled={disabled || undefined}
          className="bg-wash mt-4 grid grid-cols-3 gap-1.5 rounded-lg p-[5px]"
        >
          {PREFERRED_POSITION_CHOICES.map((option) => {
            const isSelected = selected === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-disabled={disabled || undefined}
                className={cn(
                  "focus-visible:ring-ring/50 text-body min-h-11 w-full rounded-sm outline-none focus-visible:ring-[3px] aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
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
        </RovingRadioGroup>
      )}

      {state.isLoading ? null : (
        <p id={NOTE_ID} className="text-muted-foreground text-eyebrow mt-2.5">
          {preferredPositionNote(selected)}
        </p>
      )}
    </div>
  );
}
