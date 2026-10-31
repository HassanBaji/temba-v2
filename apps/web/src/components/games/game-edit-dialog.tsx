"use client";

import * as React from "react";

import { GameLevelBandSelect } from "~/components/games/game-level-band-select";
import { GameWindowFields } from "~/components/games/game-window-fields";
import { PricePerPlayerAmountInput } from "~/components/games/price-per-player-amount-input";
import { StepperField } from "~/components/games/stepper-field";
import { RoundCountField } from "~/components/games/round-count-field";
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
import { EDIT_GAME_ACTION } from "@repo/domain/game-copy";
import { GAME_CUSTOM_NAME_MAX_LENGTH } from "@repo/domain/game-custom-name";
import {
  LEVEL_RANGE_FIELD_DESCRIPTION,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";
import { PRICE_PER_PLAYER_FIELD_DESCRIPTION } from "@repo/domain/price-per-player";
import { ONE_DAY_OVERRUN_MESSAGE } from "@repo/domain/tournament-sizing";

type EditFormError = {
  message: string;
  data?: { zodError?: unknown } | null;
};

export type GameEditRounds = {
  poolSizes: readonly number[];
  roundCount: number | null;
  onRoundCountChange: (roundCount: number | null) => void;
  overruns: boolean;
  error: EditFormError | null;
  summaryRef: React.RefObject<HTMLDivElement | null>;
  pending: boolean;
  onSave: () => void;
};

export type GameEditCustomName = {
  value: string;
  onChange: (value: string) => void;
  error: EditFormError | null;
  pending: boolean;
  onSave: () => void;
};

export type GameEditPlayersAllowed = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  error: EditFormError | null;
  pending: boolean;
  onSave: () => void;
};

function SectionSaveButton({
  pending,
  section,
}: {
  pending: boolean;
  section: string;
}) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save"}
      <span className="sr-only"> {section}</span>
    </Button>
  );
}

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
  rounds,
  playersAllowed,
  customName,
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
  levelMin: LevelBandSelectValue;
  onLevelMinChange: (value: LevelBandSelectValue) => void;
  levelMax: LevelBandSelectValue;
  onLevelMaxChange: (value: LevelBandSelectValue) => void;
  levelMinError: string | undefined;
  levelMaxError: string | undefined;
  levelError: { message: string; data?: { zodError?: unknown } | null } | null;
  levelSummaryRef: React.RefObject<HTMLDivElement | null>;
  levelPending: boolean;
  onSaveLevelRange: () => void;
  rounds: GameEditRounds | null;
  playersAllowed?: GameEditPlayersAllowed;
  customName?: GameEditCustomName;
}) {
  const nameError = customName
    ? fieldErrorMessage(customName.error, "customName")
    : undefined;
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent restoreFocusRef={restoreFocusRef}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{EDIT_GAME_ACTION}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {playersAllowed
              ? "Venue cannot change. Update the window, optional price per player, and players allowed. Each section saves on its own."
              : "Venue cannot change. Update the window, optional price per player, and optional Level range. Each section saves on its own."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-8 px-4 pb-4 md:px-0 md:pb-0">
          {customName ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (customName.pending) {
                  return;
                }
                customName.onSave();
              }}
            >
              <FormErrorSummary
                message={globalFormErrorMessage(customName.error)}
              />
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="edit-custom-name">Name</FieldLabel>
                  <Input
                    id="edit-custom-name"
                    value={customName.value}
                    maxLength={GAME_CUSTOM_NAME_MAX_LENGTH}
                    onChange={(event) =>
                      customName.onChange(event.target.value)
                    }
                    aria-invalid={nameError ? true : undefined}
                    aria-describedby={
                      nameError
                        ? "edit-custom-name-error"
                        : "edit-custom-name-copy"
                    }
                  />
                  <FieldDescription id="edit-custom-name-copy">
                    Optional. Shown on the Game and at the top of the invite
                    message. Leave empty to use the day and time.
                  </FieldDescription>
                  <FieldError id="edit-custom-name-error">
                    {nameError}
                  </FieldError>
                </Field>
              </FieldGroup>
              <SectionSaveButton pending={customName.pending} section="name" />
            </form>
          ) : null}
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
            <SectionSaveButton pending={windowPending} section="window" />
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
                    fieldErrorMessage(priceError, "pricePerPlayerFils")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    pricePerPlayerError ||
                    fieldErrorMessage(priceError, "pricePerPlayerFils")
                      ? "edit-price-per-player-error"
                      : "edit-price-per-player-copy"
                  }
                />
                <FieldDescription id="edit-price-per-player-copy">
                  {PRICE_PER_PLAYER_FIELD_DESCRIPTION}
                </FieldDescription>
                <FieldError id="edit-price-per-player-error">
                  {pricePerPlayerError ??
                    fieldErrorMessage(priceError, "pricePerPlayerFils")}
                </FieldError>
              </Field>
            </FieldGroup>
            <SectionSaveButton
              pending={pricePending}
              section="price per player"
            />
          </form>
          {playersAllowed ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (playersAllowed.pending) {
                  return;
                }
                playersAllowed.onSave();
              }}
            >
              <FormErrorSummary
                message={globalFormErrorMessage(playersAllowed.error)}
              />
              <StepperField
                id="edit-players-allowed"
                label="Players allowed"
                value={playersAllowed.value}
                unit="players"
                min={playersAllowed.min}
                max={playersAllowed.max}
                step={1}
                onChange={playersAllowed.onChange}
                decreaseLabel="Fewer players"
                increaseLabel="More players"
                error={fieldErrorMessage(
                  playersAllowed.error,
                  "playersAllowed",
                )}
              />
              <SectionSaveButton
                pending={playersAllowed.pending}
                section="players allowed"
              />
            </form>
          ) : null}
          {playersAllowed ? null : (
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
                  <FieldLabel htmlFor="edit-level-min">
                    Minimum Level
                  </FieldLabel>
                  <GameLevelBandSelect
                    id="edit-level-min"
                    value={levelMin}
                    onValueChange={onLevelMinChange}
                    invalid={
                      levelMinError ||
                      fieldErrorMessage(levelError, "levelMinTenths")
                        ? true
                        : undefined
                    }
                    describedBy={
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
                  <FieldLabel htmlFor="edit-level-max">
                    Maximum Level
                  </FieldLabel>
                  <GameLevelBandSelect
                    id="edit-level-max"
                    value={levelMax}
                    onValueChange={onLevelMaxChange}
                    invalid={
                      levelMaxError ||
                      fieldErrorMessage(levelError, "levelMaxTenths")
                        ? true
                        : undefined
                    }
                    describedBy={
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
              <SectionSaveButton pending={levelPending} section="Level range" />
            </form>
          )}
          {rounds ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (rounds.pending) {
                  return;
                }
                rounds.onSave();
              }}
            >
              <FormErrorSummary
                ref={rounds.summaryRef}
                message={globalFormErrorMessage(rounds.error)}
              />
              <RoundCountField
                id="edit-round-count"
                poolSizes={rounds.poolSizes}
                roundCount={rounds.roundCount}
                onRoundCount={rounds.onRoundCountChange}
                error={fieldErrorMessage(rounds.error, "roundCount")}
              />
              {rounds.overruns ? (
                <p className="text-muted-foreground text-meta leading-relaxed">
                  {ONE_DAY_OVERRUN_MESSAGE}
                </p>
              ) : null}
              <SectionSaveButton pending={rounds.pending} section="rounds" />
            </form>
          ) : null}
          {format === "friendly_game" && !playersAllowed ? (
            <p className="text-muted-foreground text-body">
              Friendly game caps stay 4 players / 2 Teams.
            </p>
          ) : null}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
