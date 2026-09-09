"use client";

import * as React from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";
import {
  isPreferredPosition,
  PREFERRED_POSITION_CHOICES,
  type PreferredPosition,
} from "~/lib/preferred-position";

const FIELD_IDS = { preferredPosition: "preferred-position-choice" };

/**
 * The You editor for Preferred Position. Unlike the Level declaration this
 * answer is freely re-editable, so the picker opens on the stored answer and
 * saving over it is ordinary — there is no once-only state here.
 */
export function PreferredPositionDialog({
  open,
  onOpenChange,
  current,
  pending,
  error,
  onSave,
  restoreFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: string | null | undefined;
  pending: boolean;
  error?: {
    message: string;
    data?: { zodError?: unknown } | null;
  } | null;
  onSave: (preferredPosition: PreferredPosition) => void;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [choice, setChoice] = React.useState<PreferredPosition | "">(
    isPreferredPosition(current) ? current : "",
  );
  const choiceError = fieldErrorMessage(error, "preferredPosition");

  // Only while closed, so a fresh open starts from the stored answer and a
  // refetch mid-edit never overwrites what the User just picked.
  React.useEffect(() => {
    if (open) {
      return;
    }
    setChoice(isPreferredPosition(current) ? current : "");
  }, [open, current]);

  React.useEffect(() => {
    if (!error) {
      return;
    }
    focusFormFailure(error, FIELD_IDS, summaryRef.current);
  }, [error]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || choice === "") {
      return;
    }
    onSave(choice);
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (pending && !next) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent restoreFocusRef={restoreFocusRef}>
        <form onSubmit={onSubmit} className="contents">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Preferred Position</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              The side you like on a Game team. It only sets a default when you
              pick a seat, and you can change it whenever you like.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 px-4 pb-4 md:px-0 md:pb-0">
            <FormErrorSummary
              ref={summaryRef}
              message={globalFormErrorMessage(error)}
            />
            <Field>
              <FieldLabel id="preferred-position-choice-label">
                Preferred Position
              </FieldLabel>
              <div
                id={FIELD_IDS.preferredPosition}
                role="radiogroup"
                aria-labelledby="preferred-position-choice-label"
                aria-invalid={choiceError ? true : undefined}
                aria-describedby={
                  choiceError ? "preferred-position-choice-error" : undefined
                }
                className="grid grid-cols-3 gap-2"
              >
                {PREFERRED_POSITION_CHOICES.map((option) => {
                  const selected = choice === option.value;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      variant={selected ? "default" : "outline"}
                      className="min-h-11"
                      disabled={pending}
                      onClick={() => {
                        setChoice(option.value);
                      }}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
              <FieldError id="preferred-position-choice-error">
                {choiceError}
              </FieldError>
            </Field>
          </div>

          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={pending}
              >
                Cancel
              </Button>
            </ResponsiveDialogClose>
            <Button
              type="submit"
              className="min-h-11"
              disabled={pending || choice === ""}
              aria-busy={pending}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
