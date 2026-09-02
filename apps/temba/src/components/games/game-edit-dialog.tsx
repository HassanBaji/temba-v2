"use client";

import * as React from "react";

import { GameWindowFields } from "~/components/games/game-window-fields";
import { PricePerPlayerAmountInput } from "~/components/games/price-per-player-amount-input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  fieldErrorMessage,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";
import { LEVEL_RANGE_FIELD_DESCRIPTION } from "~/lib/level-range";
import { PRICE_PER_PLAYER_FIELD_DESCRIPTION } from "~/lib/price-per-player";

export function GameEditDialog({
  open,
  onOpenChange,
  restoreFocusRef,
  format,
  windowDay,
  windowStartTime,
  windowFinishTime,
  onDayChange,
  onStartTimeChange,
  onFinishTimeChange,
  windowError,
  windowPending,
  onSaveWindow,
  pricePerPlayer,
  onPricePerPlayerChange,
  pricePerPlayerError,
  priceError,
  priceSummaryRef,
  pricePending,
  onSavePrice,
  levelMin,
  onLevelMinChange,
  levelMax,
  onLevelMaxChange,
  levelMinError,
  levelMaxError,
  levelError,
  levelSummaryRef,
  levelPending,
  onSaveLevelRange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
  format: string;
  windowDay: string;
  windowStartTime: string;
  windowFinishTime: string;
  onDayChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onFinishTimeChange: (value: string) => void;
  windowError: { message: string; data?: { zodError?: unknown } | null } | null;
  windowPending: boolean;
  onSaveWindow: () => void;
  pricePerPlayer: string;
  onPricePerPlayerChange: (value: string) => void;
  pricePerPlayerError: string | undefined;
  priceError: { message: string; data?: { zodError?: unknown } | null } | null;
  priceSummaryRef: React.RefObject<HTMLDivElement | null>;
  pricePending: boolean;
  onSavePrice: () => void;
  levelMin: string;
  onLevelMinChange: (value: string) => void;
  levelMax: string;
  onLevelMaxChange: (value: string) => void;
  levelMinError: string | undefined;
  levelMaxError: string | undefined;
  levelError: { message: string; data?: { zodError?: unknown } | null } | null;
  levelSummaryRef: React.RefObject<HTMLDivElement | null>;
  levelPending: boolean;
  onSaveLevelRange: () => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent restoreFocusRef={restoreFocusRef}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Edit Game</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Venue cannot change. Update the window, optional price per player,
            and optional Level range.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-8 px-4 pb-4 md:px-0 md:pb-0">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (windowPending) {
                return;
              }
              onSaveWindow();
            }}
          >
            <FormErrorSummary message={globalFormErrorMessage(windowError)} />
            <GameWindowFields
              dayId="edit-window-day"
              startId="edit-window-start"
              finishId="edit-window-finish"
              day={windowDay}
              startTime={windowStartTime}
              finishTime={windowFinishTime}
              onDayChange={onDayChange}
              onStartTimeChange={onStartTimeChange}
              onFinishTimeChange={onFinishTimeChange}
              startError={fieldErrorMessage(windowError, "windowStart")}
              finishError={fieldErrorMessage(windowError, "windowEnd")}
            />
            <Button type="submit" disabled={windowPending}>
              {windowPending ? "Saving…" : "Save window"}
            </Button>
          </form>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (pricePending) {
                return;
              }
              onSavePrice();
            }}
          >
            <FormErrorSummary
              ref={priceSummaryRef}
              message={globalFormErrorMessage(priceError)}
            />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-price-per-player">
                  Price per player
                </FieldLabel>
                <PricePerPlayerAmountInput
                  id="edit-price-per-player"
                  type="number"
                  step="0.01"
                  min="0"
                  value={pricePerPlayer}
                  onChange={(event) =>
                    onPricePerPlayerChange(event.target.value)
                  }
                  aria-invalid={
                    pricePerPlayerError ||
                    fieldErrorMessage(priceError, "pricePerPlayerCents")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    pricePerPlayerError ||
                    fieldErrorMessage(priceError, "pricePerPlayerCents")
                      ? "edit-price-per-player-error"
                      : "edit-price-per-player-copy"
                  }
                />
                <FieldDescription id="edit-price-per-player-copy">
                  {PRICE_PER_PLAYER_FIELD_DESCRIPTION}
                </FieldDescription>
                <FieldError id="edit-price-per-player-error">
                  {pricePerPlayerError ??
                    fieldErrorMessage(priceError, "pricePerPlayerCents")}
                </FieldError>
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={pricePending}>
              {pricePending ? "Saving…" : "Save price per player"}
            </Button>
          </form>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (levelPending) {
                return;
              }
              onSaveLevelRange();
            }}
          >
            <FormErrorSummary
              ref={levelSummaryRef}
              message={globalFormErrorMessage(levelError)}
            />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-level-min">Minimum Level</FieldLabel>
                <Input
                  id="edit-level-min"
                  type="number"
                  step="0.1"
                  min="0"
                  max="7"
                  value={levelMin}
                  onChange={(event) => onLevelMinChange(event.target.value)}
                  aria-invalid={
                    levelMinError ||
                    fieldErrorMessage(levelError, "levelMinTenths")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    levelMinError ||
                    fieldErrorMessage(levelError, "levelMinTenths")
                      ? "edit-level-min-error"
                      : "edit-level-range-copy"
                  }
                />
                <FieldError id="edit-level-min-error">
                  {levelMinError ??
                    fieldErrorMessage(levelError, "levelMinTenths")}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-level-max">Maximum Level</FieldLabel>
                <Input
                  id="edit-level-max"
                  type="number"
                  step="0.1"
                  min="0"
                  max="7"
                  value={levelMax}
                  onChange={(event) => onLevelMaxChange(event.target.value)}
                  aria-invalid={
                    levelMaxError ||
                    fieldErrorMessage(levelError, "levelMaxTenths")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    levelMaxError ||
                    fieldErrorMessage(levelError, "levelMaxTenths")
                      ? "edit-level-max-error"
                      : "edit-level-range-copy"
                  }
                />
                <FieldDescription id="edit-level-range-copy">
                  {LEVEL_RANGE_FIELD_DESCRIPTION}
                </FieldDescription>
                <FieldError id="edit-level-max-error">
                  {levelMaxError ??
                    fieldErrorMessage(levelError, "levelMaxTenths")}
                </FieldError>
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={levelPending}>
              {levelPending ? "Saving…" : "Save Level range"}
            </Button>
          </form>
          {format === "friendly_game" ? (
            <p className="text-muted-foreground text-sm">
              Friendly game caps stay 4 players / 2 Teams.
            </p>
          ) : null}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
