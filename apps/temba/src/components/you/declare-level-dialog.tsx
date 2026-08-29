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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";
import { LEVEL_BANDS, type SelfDeclareChoice } from "~/server/ratings/level";

const FIELD_IDS = { choice: "declare-level-choice" };

const UNKNOWN_CHOICE = "unknown" as const;

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
  const [choice, setChoice] = React.useState<SelfDeclareChoice | "">("");
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
    onDeclare(choice);
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
              <FieldLabel htmlFor="declare-level-choice">Level band</FieldLabel>
              <Select
                value={choice}
                onValueChange={(value) => setChoice(value as SelfDeclareChoice)}
              >
                <SelectTrigger
                  id="declare-level-choice"
                  className="w-full"
                  aria-invalid={choiceError ? true : undefined}
                  aria-describedby={
                    choiceError ? "declare-level-choice-error" : undefined
                  }
                >
                  <SelectValue placeholder="Choose a Level band" />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_BANDS.map((band) => (
                    <SelectItem key={band} value={band}>
                      {band}
                    </SelectItem>
                  ))}
                  <SelectItem value={UNKNOWN_CHOICE}>I don’t know</SelectItem>
                </SelectContent>
              </Select>
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
