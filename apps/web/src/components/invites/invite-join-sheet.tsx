"use client";

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
import { Switch } from "~/components/ui/switch";
import {
  keeperNote,
  keeperSub,
  keepersIn,
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
import {
  gameInviteJoinSheetCopy,
  type InviteJoinSheetInput,
  type InviteSeatPick,
  type SeatSideChoice,
} from "@repo/domain/game-invite-join-sheet";
import { cn } from "~/lib/utils";

export type InviteJoinChoice = {
  seat: InviteSeatPick | null;
  football: { role: FootballRole; position: FootballPosition } | null;
  joinGroup: boolean;
};

function Choice({
  title,
  note,
  selected,
  locked = false,
  onSelect,
}: {
  title: string;
  note?: string;
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
      aria-label={
        note ? m.webTournament.footballJoin.choiceLabel(title, note) : title
      }
      disabled={locked}
      onClick={onSelect}
      className={cn(
        "focus-visible:ring-ring/50 relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border px-2 py-2 text-center outline-none focus-visible:ring-[3px]",
        selected
          ? "bg-control text-on-control border-ink"
          : "bg-paper border-rule hover:bg-wash",
        locked && "text-muted-foreground hover:bg-paper cursor-not-allowed",
      )}
    >
      {locked ? <Hatch radius="lg" className="absolute inset-0" /> : null}
      <span className="text-body relative font-semibold">{title}</span>
      {note ? (
        <span
          className={cn(
            "relative text-[12px]",
            selected ? "text-dim" : "text-muted-foreground",
          )}
        >
          {note}
        </span>
      ) : null}
    </button>
  );
}

function Label({ left, right }: { left: string; right?: string | null }) {
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
 * The one join sheet of a Game link (design 3d, 3f): team and side on padel,
 * role and position on football, the Group as a switch, and a button that
 * names the result.
 */
export function InviteJoinSheet({
  open,
  onOpenChange,
  input,
  football,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input: InviteJoinSheetInput;
  football: {
    players: readonly JoinPlayer[];
    preferred: { role: FootballRole | null; position: FootballPosition | null };
  } | null;
  pending: boolean;
  error: string | null;
  onSubmit: (choice: InviteJoinChoice) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = gameInviteJoinSheetCopy(input);
  const firstOpenTeam =
    copy.teams.find((team) => !team.full)?.sideIndex ?? null;
  const [sideIndex, setSideIndex] = React.useState<number | null>(
    input.picked?.sideIndex ?? firstOpenTeam,
  );
  const [side, setSide] = React.useState<SeatSideChoice>(
    input.picked?.position ?? input.usualSide ?? "either",
  );
  const [joinGroup, setJoinGroup] = React.useState(true);
  const others = football?.players.filter((player) => !player.isViewer) ?? [];
  const keeperLocked = keeperSeatsLeft(keepersIn(others)) === 0;
  const [role, setRole] = React.useState<FootballRole>(
    football?.preferred.role ?? "outfield",
  );
  const [position, setPosition] = React.useState<FootballPosition>(
    football?.preferred.position ?? "mid",
  );

  React.useEffect(() => {
    if (open) {
      setSideIndex(input.picked?.sideIndex ?? firstOpenTeam);
      setSide(input.picked?.position ?? input.usualSide ?? "either");
      setJoinGroup(true);
      setRole(football?.preferred.role ?? "outfield");
      setPosition(football?.preferred.position ?? "mid");
    }
    // Reset when the sheet opens, from the seat that was tapped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, input.picked?.sideIndex, input.picked?.position]);

  const chosenRole = keeperLocked ? "outfield" : role;
  const team =
    copy.teams.find((entry) => entry.sideIndex === sideIndex) ?? null;
  const choice: InviteJoinChoice =
    input.kind === "football"
      ? {
          seat: null,
          football: { role: chosenRole, position },
          joinGroup: copy.groupToggle?.locked ? true : joinGroup,
        }
      : {
          seat: team ? { sideIndex: team.sideIndex, position: side } : null,
          football: null,
          joinGroup: copy.groupToggle?.locked ? true : joinGroup,
        };
  const ready = input.kind === "football" || choice.seat != null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]">
        <ResponsiveDialogHeader className="px-[22px] pb-0 pt-[22px] text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
          <ResponsiveDialogTitle className="text-h2 tracking-[-0.02em]">
            {copy.title}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-meta">
            {copy.lead}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-[22px] py-5">
          {input.kind === "padel" ? (
            <>
              <div className="space-y-2.5">
                <Label left={copy.teamLabel} />
                <div
                  role="radiogroup"
                  aria-label={copy.teamLabel}
                  className="flex gap-2"
                >
                  {copy.teams.map((entry) => (
                    <Choice
                      key={entry.sideIndex}
                      title={entry.label}
                      note={entry.meta}
                      selected={sideIndex === entry.sideIndex}
                      locked={entry.full}
                      onSelect={() => setSideIndex(entry.sideIndex)}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2.5">
                <Label left={copy.sideLabel} right={copy.sideHint} />
                <div
                  role="radiogroup"
                  aria-label={copy.sideLabel}
                  className="flex gap-2"
                >
                  {copy.sideOptions.map((option) => (
                    <Choice
                      key={option.value}
                      title={option.label}
                      selected={side === option.value}
                      onSelect={() => setSide(option.value)}
                    />
                  ))}
                </div>
                {team && copy.sideNote(team, side) ? (
                  <p className="text-muted-foreground text-meta">
                    {copy.sideNote(team, side)}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <>
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
                    {footballPositionChoices(locale).map((option) => (
                      <Choice
                        key={option.value}
                        title={option.code}
                        note={option.label}
                        selected={position === option.value}
                        onSelect={() => setPosition(option.value)}
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-meta">
                    {positionCountsLine(others, locale)}
                  </p>
                </div>
              ) : null}
            </>
          )}
          {copy.groupToggle ? (
            <div className="border-rule space-y-2 rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body font-semibold">
                    {copy.groupToggle.label}
                  </p>
                  <p className="text-muted-foreground text-meta">
                    {copy.groupToggle.policy}
                  </p>
                </div>
                <Switch
                  aria-label={copy.groupToggle.label}
                  checked={copy.groupToggle.locked ? true : joinGroup}
                  disabled={copy.groupToggle.locked || pending}
                  onCheckedChange={setJoinGroup}
                />
              </div>
              <p className="text-muted-foreground text-[12px]">
                {copy.groupToggle.note}
              </p>
            </div>
          ) : null}
          {copy.levelNote ? (
            <p className="text-muted-foreground text-meta">{copy.levelNote}</p>
          ) : null}
          {error ? (
            <p role="alert" className="text-destructive text-meta">
              {error}
            </p>
          ) : null}
        </div>
        <div className="border-rule border-t px-[22px] py-4">
          <Button
            type="button"
            className="min-h-11 w-full"
            disabled={!ready || pending}
            pending={pending}
            onClick={() => onSubmit(choice)}
          >
            {copy.cta(choice)}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
