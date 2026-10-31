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
import { CardChoice } from "~/components/onboarding/onboarding-choices";
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
  FOOTBALL_SELF_PLACEMENT_CHOICES,
  FOOTBALL_SELF_PLACEMENTS,
  selfDeclareChoiceFromFootballPlacement,
  type FootballSelfPlacement,
} from "@repo/domain/football-self-placement";
import {
  selfDeclareChoiceFromDisplay,
  type SelfDeclareChoice,
} from "@repo/domain/level-bands";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";

const FIELD_IDS = { choice: "declare-level-choice" };

type Choice = LevelChoiceValue | FootballSelfPlacement | "";

function isFootballPlacement(choice: Choice): choice is FootballSelfPlacement {
  return (FOOTBALL_SELF_PLACEMENTS as readonly string[]).includes(choice);
}

function choiceToDeclare(
  sport: Sport,
  choice: Choice,
): SelfDeclareChoice | null {
  if (choice === "") {
    return null;
  }
  if (isFootballPlacement(choice)) {
    return sport === "football"
      ? selfDeclareChoiceFromFootballPlacement(choice)
      : null;
  }
  return sport === "football" ? null : selfDeclareChoiceFromDisplay(choice);
}

export function DeclareLevelDialog({
  open,
  onOpenChange,
  sport = DEFAULT_SPORT,
  pending,
  error,
  onDeclare,
  restoreFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sport?: Sport;
  pending: boolean;
  error?: {
    message: string;
    data?: { zodError?: unknown } | null;
  } | null;
  onDeclare: (choice: SelfDeclareChoice) => void;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [choice, setChoice] = React.useState<Choice>("");
  const choiceError = fieldErrorMessage(error, "choice");
  const declared = choiceToDeclare(sport, choice);

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
    if (pending || declared == null) {
      return;
    }
    onDeclare(declared);
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
              {sport === "football"
                ? "Place yourself on the football ladder once. Pick how you play; it balances teams until football results are rated."
                : "Place yourself on the padel ladder once. Pick a Level band, or I don’t know if you are unsure."}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 px-4 pb-4 md:px-0 md:pb-0">
            <FormErrorSummary
              ref={summaryRef}
              message={globalFormErrorMessage(error)}
            />
            <Field>
              <FieldLabel id="declare-level-choice-label">
                {sport === "football" ? "How you play" : "Level band"}
              </FieldLabel>
              {sport === "football" ? (
                <div
                  id={FIELD_IDS.choice}
                  role="radiogroup"
                  aria-labelledby="declare-level-choice-label"
                  aria-invalid={choiceError ? true : undefined}
                  aria-describedby={
                    choiceError ? "declare-level-choice-error" : undefined
                  }
                  className="flex flex-col gap-2"
                >
                  {FOOTBALL_SELF_PLACEMENT_CHOICES.map((entry) => (
                    <CardChoice
                      key={entry.value}
                      role="radio"
                      selected={choice === entry.value}
                      title={entry.label}
                      description={entry.description}
                      onSelect={() => {
                        if (!pending) {
                          setChoice(entry.value);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <LevelChoiceGrid
                  id={FIELD_IDS.choice}
                  labelledBy="declare-level-choice-label"
                  describedBy={
                    choiceError ? "declare-level-choice-error" : undefined
                  }
                  invalid={Boolean(choiceError)}
                  value={isFootballPlacement(choice) ? "" : choice}
                  onSelect={setChoice}
                  disabled={pending}
                />
              )}
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
              disabled={pending || declared == null}
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
