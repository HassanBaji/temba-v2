"use client";

import { Check, ChevronRight, Lock, Minus, Plus, Trophy } from "lucide-react";
import * as React from "react";

import { GameLevelBandSelect } from "~/components/games/game-level-band-select";
import { GameWindowFields } from "~/components/games/game-window-fields";
import { RoundCountField } from "~/components/games/round-count-field";
import type { GameEditController } from "~/components/games/use-game-edit";
import { useLocale, useMessages } from "~/components/locale-provider";
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
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { GAME_CUSTOM_NAME_MAX_LENGTH } from "@repo/domain/game-custom-name";
import {
  asideLabel,
  footballFormatNote,
  footballSideSizeStep,
  joinedCountLabel,
  playersAllowedForSideSize,
  playersCapWaitNote,
  venueLockedLine,
  windowDurationLabel,
  type GameEditSections,
} from "@repo/domain/game-edit-form";
import {
  SEASON_BADGE,
  gameSeasonChoices,
  seasonLinkActionLabel,
  seasonLinkRowNote,
  seasonLinkedNote,
  seasonPickerSubtitle,
  seasonsOpenForDay,
  type GameSeasonChoice,
} from "@repo/domain/game-season-link";
import { footballPlayersAllowedBounds } from "@repo/domain/game-shape";
import {
  formatSeasonRange,
  type GroupSeasonData,
  type GroupSeasonStatus,
} from "@repo/domain/group-season";

export type GameEditContext = {
  venueName: string | null;
  courtName: string | null;
  groupName: string | null;
  joined: number;
  seasons: readonly GroupSeasonData[];
  canChangeSeason: boolean;
  rounds: { poolSizes: readonly number[]; overruns: boolean } | null;
};

function SectionHead({
  title,
  meta,
  metaTone = "muted",
  action,
}: {
  title: string;
  meta?: string | null;
  metaTone?: "muted" | "tag";
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="font-expanded text-title">{title}</h3>
      {action ??
        (meta ? (
          <span
            className={cn(
              metaTone === "tag"
                ? "text-ink text-eyebrow font-semibold uppercase tracking-[0.08em]"
                : "text-muted-foreground text-meta",
            )}
          >
            {meta}
          </span>
        ) : null)}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-meta leading-relaxed">
      {children}
    </p>
  );
}

function CompactStepper({
  id,
  label,
  display,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
}: {
  id: string;
  label: string;
  display: string;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  const buttonClass =
    "text-ink hover:bg-wash focus-visible:ring-ring/50 flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px] disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      className="border-rule flex h-14 items-center rounded-lg border px-1"
    >
      <button
        type="button"
        aria-label={decreaseLabel}
        disabled={!canDecrease}
        onClick={onDecrease}
        className={buttonClass}
      >
        <Minus aria-hidden="true" className="size-4" strokeWidth={2} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col items-center leading-none">
        <span
          id={`${id}-label`}
          className="text-muted-foreground text-[11px] tracking-[0.02em]"
        >
          {label}
        </span>
        <span
          aria-live="polite"
          aria-atomic="true"
          className="font-expanded text-lead mt-0.5 tabular-nums"
        >
          {display}
        </span>
      </div>
      <button
        type="button"
        aria-label={increaseLabel}
        disabled={!canIncrease}
        onClick={onIncrease}
        className={buttonClass}
      >
        <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function SeasonBadge({
  label,
  active,
}: {
  label: string | null;
  active: boolean;
}) {
  const m = useMessages();
  if (!label) {
    return null;
  }
  const status = (Object.keys(SEASON_BADGE) as GroupSeasonStatus[]).find(
    (key) => SEASON_BADGE[key] === label,
  );
  return (
    <span
      className={cn(
        "shrink-0 rounded-[4px] px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.06em]",
        active
          ? "bg-ink text-paper"
          : "border-rule text-muted-foreground border",
      )}
    >
      {status ? m.createGame.season.badge[status] : label}
    </span>
  );
}

function SeasonPicker({
  choices,
  picked,
  onPick,
  groupName,
  day,
  onCancel,
  onConfirm,
}: {
  choices: readonly GameSeasonChoice[];
  picked: string | null;
  onPick: (id: string | null) => void;
  groupName: string;
  day: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const chosen = choices.find((choice) => choice.id === picked) ?? choices[0]!;
  return (
    <>
      <ResponsiveDialogHeader className="text-start">
        <div className="flex items-start justify-between gap-3">
          <ResponsiveDialogTitle className="font-expanded text-h2">
            {m.createGame.season.linkRowTitle}
          </ResponsiveDialogTitle>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {m.common.back}
          </Button>
        </div>
        <ResponsiveDialogDescription>
          {seasonPickerSubtitle(groupName, day, locale)}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>
      <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4 md:px-0 md:pb-0">
        <div
          role="radiogroup"
          aria-label={m.webGame.edit.stepLabel.season}
          className="border-rule divide-rule divide-y overflow-hidden rounded-lg border"
        >
          {choices.map((choice) => {
            const selected = choice.id === picked;
            return (
              <button
                key={choice.id ?? "none"}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!choice.selectable}
                onClick={() => onPick(choice.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-3.5 py-3 text-start outline-none",
                  "focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-inset",
                  selected ? "bg-wash" : "bg-paper",
                  !choice.selectable && "opacity-45",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-[18px] shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-ink bg-ink" : "border-input-border",
                  )}
                >
                  {selected ? (
                    <span className="bg-paper block size-1.5 rounded-full" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-body font-semibold">
                      {choice.name}
                    </span>
                    <SeasonBadge
                      label={choice.badge}
                      active={choice.badge === "ACTIVE"}
                    />
                  </span>
                  <span className="text-muted-foreground text-meta block">
                    {choice.note}
                  </span>
                </span>
                <span className="text-muted-foreground text-meta shrink-0">
                  {choice.dates}
                </span>
              </button>
            );
          })}
        </div>
        <div className="border-rule flex items-start gap-2 rounded-lg border px-3.5 py-3">
          <Lock
            aria-hidden="true"
            className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
          />
          <Hint>{m.createGame.season.pickerLockNote}</Hint>
        </div>
      </div>
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-0 md:pb-0">
        <Button type="button" size="lg" className="w-full" onClick={onConfirm}>
          <Trophy aria-hidden="true" />
          {seasonLinkActionLabel(chosen, locale)}
        </Button>
      </div>
    </>
  );
}

function SeasonSection({
  edit,
  context,
  onOpenPicker,
}: {
  edit: GameEditController;
  context: GameEditContext;
  onOpenPicker: () => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const { draft, seasonFix, now } = edit;
  const linked =
    context.seasons.find((season) => season.id === draft.seasonId) ?? null;
  const groupName = context.groupName ?? m.webGame.edit.thisGroup;
  const locked = !context.canChangeSeason;

  if (seasonFix) {
    return (
      <section className="space-y-3">
        <SectionHead
          title={m.webGame.edit.stepLabel.season}
          meta={m.createGame.season.needsFixTag}
          metaTone="tag"
        />
        <div className="border-ink overflow-hidden rounded-lg border">
          <div className="hatch relative px-4 pb-3 pt-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-expanded text-h2 text-muted-foreground line-through decoration-2">
                {seasonFix.season.name.toUpperCase()}
              </span>
              <span className="text-muted-foreground text-meta">
                {seasonFix.endsLine}
              </span>
            </div>
            <p className="bg-paper text-body mt-2 rounded-md px-2.5 py-2">
              {seasonFix.line}
            </p>
          </div>
          <div className="border-ink grid grid-cols-2 border-t">
            {seasonFix.replacement ? (
              <Button
                type="button"
                className="h-12 rounded-none"
                onClick={() =>
                  edit.update({ seasonId: seasonFix.replacement!.id })
                }
              >
                {seasonFix.moveLabel}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-12 rounded-none",
                seasonFix.replacement ? "border-ink border-s" : "col-span-2",
              )}
              onClick={() => edit.update({ seasonId: null })}
            >
              {m.createGame.season.unlink}
            </Button>
          </div>
        </div>
        <Hint>{seasonFix.keepLine}</Hint>
      </section>
    );
  }

  if (linked) {
    return (
      <section className="space-y-3">
        <SectionHead
          title={m.webGame.edit.stepLabel.season}
          action={
            locked ? null : (
              <button
                type="button"
                onClick={onOpenPicker}
                className="text-meta text-ink underline underline-offset-4"
              >
                {m.createGame.season.change}
              </button>
            )
          }
        />
        <div className="bg-ink text-paper rounded-lg px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-expanded text-h2">
              {linked.name.toUpperCase()}
            </span>
            <span className="text-dim text-meta">
              {formatSeasonRange(linked, locale)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-dim text-meta">{groupName}</span>
            <span className="text-meta flex items-center gap-1 font-medium">
              <Check aria-hidden="true" className="size-3.5" />
              {m.createGame.season.countsLine}
            </span>
          </div>
        </div>
        <Hint>
          {locked
            ? m.createGame.season.lockedNote
            : seasonLinkedNote(linked, locale)}
        </Hint>
      </section>
    );
  }

  const openCount = draft.day
    ? seasonsOpenForDay(context.seasons, draft.day, now).length
    : 0;
  return (
    <section className="space-y-3">
      <SectionHead
        title={m.webGame.edit.stepLabel.season}
        meta={m.common.optional}
      />
      <button
        type="button"
        onClick={onOpenPicker}
        disabled={locked || !draft.day}
        className="border-input-border hover:bg-wash focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-lg border border-dashed px-3.5 py-3 text-start outline-none focus-visible:ring-[3px] disabled:opacity-50"
      >
        <span className="border-rule flex size-9 shrink-0 items-center justify-center rounded-md border">
          <Trophy aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-body block font-semibold">
            {m.createGame.season.linkRowTitle}
          </span>
          <span className="text-muted-foreground text-meta block">
            {draft.day
              ? seasonLinkRowNote(groupName, openCount, draft.day, locale)
              : m.webGame.edit.pickDayFirst}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0 rtl:-scale-x-100"
        />
      </button>
      <Hint>
        {locked
          ? m.createGame.season.lockedNote
          : m.createGame.season.sectionFriendlyNote}
      </Hint>
    </section>
  );
}

export function GameEditDialog({
  open,
  onOpenChange,
  restoreFocusRef,
  edit,
  sections,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
  edit: GameEditController;
  sections: GameEditSections;
  context: GameEditContext;
}) {
  const locale = useLocale();
  const m = useMessages();
  const [view, setView] = React.useState<"form" | "season">("form");
  const [picked, setPicked] = React.useState<string | null>(null);
  const { draft, update, error, pending } = edit;

  React.useEffect(() => {
    if (!open) {
      setView("form");
    }
  }, [open]);

  const errorFor = (field: string) =>
    error?.field === field ? error.message : undefined;
  const duration = windowDurationLabel(
    draft.day,
    draft.startTime,
    draft.finishTime,
    locale,
  );
  const sideSize = draft.sideSize;
  const capBounds = footballPlayersAllowedBounds(sideSize ?? 5);
  const players = draft.playersAllowed ?? capBounds.min;
  const showSeason = sections.season && context.seasons.length > 0;

  function openPicker() {
    setPicked(draft.seasonId);
    setView("season");
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        restoreFocusRef={restoreFocusRef}
        showCloseButton={false}
        className="md:max-h-[calc(100dvh-4rem)] md:grid-rows-[auto_minmax(0,1fr)_auto]"
      >
        {view === "season" && context.groupName != null ? (
          <SeasonPicker
            choices={gameSeasonChoices(
              context.seasons,
              draft.day,
              edit.now,
              locale,
            )}
            picked={picked}
            onPick={setPicked}
            groupName={context.groupName}
            day={draft.day}
            onCancel={() => setView("form")}
            onConfirm={() => {
              update({ seasonId: picked });
              setView("form");
            }}
          />
        ) : (
          <>
            <ResponsiveDialogHeader className="text-start">
              <div className="flex items-start justify-between gap-3">
                <ResponsiveDialogTitle className="font-expanded text-h2">
                  {m.createGame.edit.title}
                </ResponsiveDialogTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  {m.common.cancel}
                </Button>
              </div>
              <ResponsiveDialogDescription className="flex items-center gap-1.5">
                <Lock aria-hidden="true" className="size-3.5 shrink-0" />
                {venueLockedLine(context.venueName, context.courtName, locale)}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <form
              id="game-edit-form"
              className="min-h-0 space-y-7 overflow-y-auto overscroll-contain px-4 pb-4 md:px-0 md:pb-0"
              onSubmit={(event) => {
                event.preventDefault();
                void edit.save();
              }}
            >
              {error && error.field == null ? (
                <p role="alert" className="text-body font-medium">
                  {error.message}
                </p>
              ) : null}
              {sections.name ? (
                <section className="space-y-3">
                  <SectionHead
                    title={m.webGame.edit.stepLabel.name}
                    meta={m.common.optional}
                  />
                  <Field>
                    <FieldLabel htmlFor="edit-custom-name" className="sr-only">
                      {m.webGame.edit.stepLabel.name}
                    </FieldLabel>
                    <Input
                      id="edit-custom-name"
                      value={draft.customName}
                      maxLength={GAME_CUSTOM_NAME_MAX_LENGTH}
                      onChange={(event) =>
                        update({ customName: event.target.value })
                      }
                      aria-invalid={errorFor("name") ? true : undefined}
                      aria-describedby="edit-custom-name-copy"
                    />
                    <FieldDescription id="edit-custom-name-copy">
                      {m.createGame.edit.nameHint}
                    </FieldDescription>
                    <FieldError id="edit-custom-name-error">
                      {errorFor("name")}
                    </FieldError>
                  </Field>
                </section>
              ) : null}
              <section className="space-y-3">
                <SectionHead
                  title={m.webGame.edit.stepLabel.window}
                  meta={duration}
                />
                <GameWindowFields
                  dayId="edit-window-day"
                  startId="edit-window-start"
                  finishId="edit-window-finish"
                  day={draft.day}
                  startTime={draft.startTime}
                  finishTime={draft.finishTime}
                  onDayChange={(day) => update({ day })}
                  onStartTimeChange={(startTime) => update({ startTime })}
                  onFinishTimeChange={(finishTime) => update({ finishTime })}
                  startError={errorFor("window")}
                  description={m.createGame.edit.whenHint}
                />
              </section>
              <section className="space-y-3">
                <SectionHead
                  title={
                    sections.caps
                      ? m.webGame.edit.playersAndPrice
                      : m.webGame.edit.stepLabel.price
                  }
                  meta={
                    sections.caps
                      ? joinedCountLabel(context.joined, locale)
                      : null
                  }
                />
                {sections.caps && sideSize != null ? (
                  <div className="grid grid-cols-2 gap-2">
                    <CompactStepper
                      id="edit-players-allowed"
                      label={m.webGame.edit.stepLabel.caps}
                      display={String(players)}
                      canDecrease={players - 1 >= capBounds.min}
                      canIncrease={players + 1 <= capBounds.max}
                      onDecrease={() => update({ playersAllowed: players - 1 })}
                      onIncrease={() => update({ playersAllowed: players + 1 })}
                      decreaseLabel={m.webGame.edit.fewerPlayers}
                      increaseLabel={m.webGame.edit.morePlayers}
                    />
                    <CompactStepper
                      id="edit-side-size"
                      label={m.webGame.edit.aside}
                      display={asideLabel(sideSize)}
                      canDecrease={footballSideSizeStep(sideSize, -1) != null}
                      canIncrease={footballSideSizeStep(sideSize, 1) != null}
                      onDecrease={() => {
                        const next = footballSideSizeStep(sideSize, -1);
                        if (next) {
                          update({ sideSize: next });
                        }
                      }}
                      onIncrease={() => {
                        const next = footballSideSizeStep(sideSize, 1);
                        if (next) {
                          update({
                            sideSize: next,
                            playersAllowed: playersAllowedForSideSize(
                              players,
                              next,
                            ),
                          });
                        }
                      }}
                      decreaseLabel={m.webGame.edit.smallerSide}
                      increaseLabel={m.webGame.edit.biggerSide}
                    />
                  </div>
                ) : null}
                <Field>
                  <div className="border-rule focus-within:border-ink flex h-14 items-center rounded-lg border px-3.5">
                    <div className="flex min-w-0 flex-1 flex-col leading-none">
                      <FieldLabel
                        htmlFor="edit-price-per-player"
                        className="text-muted-foreground text-[11px] font-normal tracking-[0.02em]"
                      >
                        {m.webGame.edit.pricePerPlayer}
                      </FieldLabel>
                      <Input
                        id="edit-price-per-player"
                        type="number"
                        step="0.001"
                        min="0"
                        inputMode="decimal"
                        value={draft.price}
                        onChange={(event) =>
                          update({ price: event.target.value })
                        }
                        aria-invalid={errorFor("price") ? true : undefined}
                        aria-describedby={
                          errorFor("price")
                            ? "edit-price-per-player-error"
                            : "edit-price-per-player-copy"
                        }
                        className="text-lead h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      />
                    </div>
                    <span
                      aria-hidden="true"
                      className="text-muted-foreground text-meta shrink-0"
                    >
                      {m.createGame.price.currency}
                    </span>
                  </div>
                  <FieldError id="edit-price-per-player-error">
                    {errorFor("price") ?? errorFor("caps")}
                  </FieldError>
                </Field>
                <div id="edit-price-per-player-copy" className="space-y-1">
                  {sections.caps && sideSize != null ? (
                    <>
                      <Hint>
                        {footballFormatNote(sideSize, players, locale)}
                      </Hint>
                      <Hint>
                        {playersCapWaitNote(players, context.joined, locale)}
                      </Hint>
                      <Hint>{m.createGame.edit.playersAndPriceHint}</Hint>
                    </>
                  ) : (
                    <Hint>{m.webGame.edit.priceHint}</Hint>
                  )}
                </div>
              </section>
              {sections.level ? (
                <section className="space-y-3">
                  <SectionHead
                    title={m.webGame.edit.stepLabel.level}
                    meta={m.common.optional}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="edit-level-min">
                        {m.webGame.edit.minimumLevel}
                      </FieldLabel>
                      <GameLevelBandSelect
                        id="edit-level-min"
                        value={draft.levelMin}
                        onValueChange={(levelMin) => update({ levelMin })}
                        invalid={errorFor("level") ? true : undefined}
                        describedBy="edit-level-range-copy"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-level-max">
                        {m.webGame.edit.maximumLevel}
                      </FieldLabel>
                      <GameLevelBandSelect
                        id="edit-level-max"
                        value={draft.levelMax}
                        onValueChange={(levelMax) => update({ levelMax })}
                        invalid={errorFor("level") ? true : undefined}
                        describedBy="edit-level-range-copy"
                      />
                    </Field>
                  </div>
                  <FieldDescription id="edit-level-range-copy">
                    {m.level.rangeFieldDescription}
                  </FieldDescription>
                  <FieldError id="edit-level-error">
                    {errorFor("level")}
                  </FieldError>
                </section>
              ) : null}
              {sections.rounds && context.rounds ? (
                <section className="space-y-3">
                  <SectionHead title={m.webGame.edit.stepLabel.rounds} />
                  <RoundCountField
                    id="edit-round-count"
                    poolSizes={context.rounds.poolSizes}
                    roundCount={draft.roundCount}
                    onRoundCount={(roundCount) => update({ roundCount })}
                    error={errorFor("rounds")}
                  />
                  {context.rounds.overruns ? (
                    <Hint>{m.tournament.sizing.oneDayOverrun}</Hint>
                  ) : null}
                </section>
              ) : null}
              {showSeason ? (
                <SeasonSection
                  edit={edit}
                  context={context}
                  onOpenPicker={openPicker}
                />
              ) : null}
              {errorFor("season") ? (
                <FieldError id="edit-season-error">
                  {errorFor("season")}
                </FieldError>
              ) : null}
            </form>
            <div className="border-rule flex items-center justify-between gap-4 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:px-0 md:pb-0">
              <div className="min-w-0">
                <div className="text-muted-foreground text-eyebrow">
                  {m.createGame.edit.changes}
                </div>
                <div
                  aria-live="polite"
                  className="text-body font-semibold leading-snug"
                >
                  {edit.note}
                </div>
              </div>
              <Button
                type="submit"
                form="game-edit-form"
                size="lg"
                disabled={!edit.canSave}
                pending={pending}
                pendingLabel={m.common.saving}
                className="shrink-0"
              >
                {m.createGame.edit.saveChanges}
              </Button>
            </div>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
