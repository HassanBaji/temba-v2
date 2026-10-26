"use client";

import {
  joinActionLabel,
  keeperNote,
  keeperSub,
  keepersIn,
  seatSummary,
  type BoardPlayer,
} from "@repo/domain/football-board";
import {
  FOOTBALL_POSITION_CHOICES,
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
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${title}, ${note}`}
      disabled={locked}
      onClick={onSelect}
      className={cn(
        "focus-visible:ring-ring/50 relative flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border outline-none focus-visible:ring-[3px]",
        selected
          ? "bg-ink text-paper border-ink"
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
  players: readonly BoardPlayer[];
  viewer: { role: FootballRole | null; position: FootballPosition | null };
  price: string | null;
  teamsLine: string;
  pending: boolean;
  error: string | null;
  onSubmit: (role: FootballRole, position: FootballPosition) => void;
}) {
  const others = players.filter((player) => !player.isViewer);
  const keeperLocked =
    keeperSeatsLeft(keepersIn(others)) === 0 && viewer.role !== "keeper";
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
        <ResponsiveDialogHeader className="px-[22px] pb-0 pt-[22px] text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
          <ResponsiveDialogTitle className="text-h2 tracking-[-0.02em]">
            {mode === "join" ? "Join this game" : "How you play"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-meta">
            {subtitle}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-[22px] py-5">
          <div className="space-y-2.5">
            <Label left="Join as" right={keeperSeatsLine(keepersIn(others))} />
            <div role="radiogroup" aria-label="Join as" className="flex gap-2">
              <Choice
                title="Player"
                note="outfield"
                selected={chosenRole === "outfield"}
                onSelect={() => setRole("outfield")}
              />
              <Choice
                title="Keeper"
                note={keeperSub(others)}
                selected={chosenRole === "keeper"}
                locked={keeperLocked}
                onSelect={() => setRole("keeper")}
              />
            </div>
            <p className="text-muted-foreground text-meta">
              {keeperNote(others)}
            </p>
          </div>
          {chosenRole === "outfield" ? (
            <div className="space-y-2.5">
              <Label
                left="Preferred position"
                right="a preference, not a promise"
              />
              <div
                role="radiogroup"
                aria-label="Preferred position"
                className="flex gap-2"
              >
                {FOOTBALL_POSITION_CHOICES.map((choice) => (
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
                {positionCountsLine(others)}
              </p>
            </div>
          ) : null}
          <FootballInfoRows
            rows={[
              { label: "Your seat", value: seatSummary(chosenRole, position) },
              ...(price ? [{ label: "Pitch cost", value: price }] : []),
              { label: "Teams", value: teamsLine },
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
              ? joinActionLabel(chosenRole, position, price)
              : "Save"}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
