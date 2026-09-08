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
import {
  LevelChoiceGrid,
  type LevelChoiceValue,
} from "~/components/temba/level-choice-grid";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";
import {
  selfDeclareChoiceFromDisplay,
  type SelfDeclareChoice,
} from "~/lib/level-bands";

const FIELD_IDS = { choice: "declare-level-choice" };

export function DeclareLevelDialog({
  open,
  onOpenChange,
  pending,
  error,
  onDeclare,
  restoreFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error?: {
    message: string;
    data?: { zodError?: unknown } | null;
  } | null;
  onDeclare: (choice: SelfDeclareChoice) => void;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [choice, setChoice] = React.useState<LevelChoiceValue | "">("");
  const choiceError = fieldErrorMessage(error, "choice");

  React.useEffect(() => {
    if (!open) {
      setChoice("");
    }
  }, [open]);

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
    onDeclare(selfDeclareChoiceFromDisplay(choice));
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
            <ResponsiveDialogTitle>Declare your Level</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Place yourself on the padel ladder once. Pick a Level band, or I
              don’t know if you are unsure.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 px-4 pb-4 md:px-0 md:pb-0">
            <FormErrorSummary
              ref={summaryRef}
              message={globalFormErrorMessage(error)}
            />
            <Field>
              <FieldLabel id="declare-level-choice-label">
                Level band
              </FieldLabel>
              <LevelChoiceGrid
                id={FIELD_IDS.choice}
                labelledBy="declare-level-choice-label"
                describedBy={
                  choiceError ? "declare-level-choice-error" : undefined
                }
                invalid={Boolean(choiceError)}
                value={choice}
                onSelect={setChoice}
                disabled={pending}
              />
              <FieldError id="declare-level-choice-error">
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
              {pending ? "Saving…" : "Save Level"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
