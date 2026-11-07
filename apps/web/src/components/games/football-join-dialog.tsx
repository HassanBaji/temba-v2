"use client";

import {
  joinActionLabel,
  keeperNote,
  keeperSub,
  keepersIn,
  seatSummary,
  type JoinPlayer,
} from "@repo/domain/football-board";
import {
  footballPositionChoices,
  keeperSeatsLeft,
  keeperSeatsLine,
  positionCountsLine,
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import * as React from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

import { FootballInfoRows } from "./football-info-rows";

function Choice({
  title,
  note,
  selected,
  locked = false,
  onSelect,
}: {
  title: string;
  note: string;
  selected: boolean;
  locked?: boolean;
  onSelect: () => void;
}) {
  const m = useMessages();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={m.webTournament.footballJoin.choiceLabel(title, note)}
      disabled={locked}
      onClick={onSelect}
      className={cn(
        "focus-visible:ring-ring/50 relative flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border outline-none focus-visible:ring-[3px]",
        selected
          ? "bg-control text-on-control border-ink"
          : "bg-paper border-rule hover:bg-wash",
        locked && "text-muted-foreground hover:bg-paper cursor-not-allowed",
      )}
    >
      {locked ? <Hatch radius="lg" className="absolute inset-0" /> : null}
      <span className="text-body relative font-semibold">{title}</span>
      <span
        className={cn(
          "relative text-[12px]",
          selected ? "text-dim" : "text-muted-foreground",
        )}
      >
        {note}
      </span>
    </button>
  );
}

function Label({ left, right }: { left: string; right?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground text-meta">{left}</span>
      {right ? (
        <span className="text-muted-foreground text-[12px]">{right}</span>
      ) : null}
    </div>
  );
}

/**
 * Join as a player or a keeper and name the position you prefer. Keeper is
 * locked once both keeper seats are taken. The same dialog changes your
 * choice after joining.
 */
export function FootballJoinDialog({
  open,
  onOpenChange,
  mode,
  subtitle,
  players,
  viewer,
  price,
  teamsLine,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "join" | "edit";
  subtitle: string;
  players: readonly JoinPlayer[];
  viewer: { role: FootballRole | null; position: FootballPosition | null };
  price: string | null;
  teamsLine: string;
  pending: boolean;
  error: string | null;
  onSubmit: (role: FootballRole, position: FootballPosition) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const others = players.filter((player) => !player.isViewer);
  const alreadyKeeper = mode === "edit" && viewer.role === "keeper";
  const keeperLocked =
    keeperSeatsLeft(keepersIn(others)) === 0 && !alreadyKeeper;
  const [role, setRole] = React.useState<FootballRole>(
    viewer.role ?? "outfield",
  );
  const [position, setPosition] = React.useState<FootballPosition>(
    viewer.position ?? "mid",
  );

  React.useEffect(() => {
    if (open) {
      setRole(viewer.role ?? "outfield");
      setPosition(viewer.position ?? "mid");
    }
  }, [open, viewer.role, viewer.position]);

  const chosenRole = keeperLocked ? "outfield" : role;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]">
        <ResponsiveDialogHeader className="px-[22px] pb-0 pt-[22px] text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
          <ResponsiveDialogTitle className="text-h2 tracking-[-0.02em]">
            {mode === "join"
              ? m.football.details.joinTitle
              : m.webTournament.footballJoin.howYouPlay}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-meta">
            {subtitle}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-[22px] py-5">
          <div className="space-y-2.5">
            <Label
              left={m.webTournament.footballJoin.joinAs}
              right={keeperSeatsLine(keepersIn(others), locale)}
            />
            <div
              role="radiogroup"
              aria-label={m.webTournament.footballJoin.joinAs}
              className="flex gap-2"
            >
              <Choice
                title={m.group.addPlayer.footballRole.player.name}
                note={m.group.addPlayer.footballRole.player.detail}
                selected={chosenRole === "outfield"}
                onSelect={() => setRole("outfield")}
              />
              <Choice
                title={m.group.addPlayer.footballRole.keeper.name}
                note={keeperSub(others, locale)}
                selected={chosenRole === "keeper"}
                locked={keeperLocked}
                onSelect={() => setRole("keeper")}
              />
            </div>
            <p className="text-muted-foreground text-meta">
              {keeperNote(others, locale)}
            </p>
          </div>
          {chosenRole === "outfield" ? (
            <div className="space-y-2.5">
              <Label
                left={m.webTournament.footballJoin.preferredPosition}
                right={m.webTournament.footballJoin.preferenceNotPromise}
              />
              <div
                role="radiogroup"
                aria-label={m.webTournament.footballJoin.preferredPosition}
                className="flex gap-2"
              >
                {footballPositionChoices(locale).map((choice) => (
                  <Choice
                    key={choice.value}
                    title={choice.code}
                    note={choice.label}
                    selected={position === choice.value}
                    onSelect={() => setPosition(choice.value)}
                  />
                ))}
              </div>
              <p className="text-muted-foreground text-meta">
                {positionCountsLine(others, locale)}
              </p>
            </div>
          ) : null}
          <FootballInfoRows
            rows={[
              {
                label: m.webTournament.footballJoin.yourSeat,
                value: seatSummary(chosenRole, position, locale),
              },
              ...(price
                ? [
                    {
                      label: m.webTournament.footballDetails.pitchCost,
                      value: price,
                    },
                  ]
                : []),
              { label: m.game.played.teams, value: teamsLine },
            ]}
          />
        </div>
        <div className="border-rule space-y-2 border-t px-[22px] py-4">
          {error ? (
            <p role="alert" className="text-destructive text-meta">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            className="w-full"
            pending={pending}
            onClick={() => onSubmit(chosenRole, position)}
          >
            {mode === "join"
              ? joinActionLabel(chosenRole, position, price, locale)
              : m.common.save}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
