"use client";

import {
  mayBeSideCaptain,
  ovrLabel,
  slotCode,
  type Bibs,
  type BoardPlayer,
  type Side,
  type SideCaptains,
} from "@repo/domain/football-board";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { NicknameName } from "~/components/temba/nickname-name";
import { Button } from "~/components/ui/button";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";

import { BibChip } from "./football-bibs";

function Radio({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border",
        selected ? "border-ink" : "border-input",
      )}
    >
      {selected ? <span className="bg-ink size-2.5 rounded-full" /> : null}
    </span>
  );
}

function ChoiceRow({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "border-rule focus-visible:ring-ring/50 flex min-h-[50px] w-full items-center gap-3 border-t px-3.5 py-2 text-start outline-none first:border-t-0 focus-visible:ring-[3px] focus-visible:ring-inset",
        selected ? "bg-wash" : "bg-paper hover:bg-wash",
      )}
    >
      {children}
      <Radio selected={selected} />
    </button>
  );
}

/**
 * The Organizer names each team's Side captain from that team's players, or
 * none (design 1b, ADR-0108). Guest players and Unclaimed players are not
 * offered: they cannot open the draft. A pick applies at once; Done closes.
 * A Captain pick offers the whole roster to each side and needs both, so it
 * has no "No captain" row.
 */
export function FootballCaptainsDialog({
  side,
  bibs,
  names,
  sides,
  captains,
  subtitle,
  emptyNote,
  required = false,
  onSideChange,
  onPick,
  onClose,
}: {
  side: Side | null;
  bibs: Bibs;
  names: { slot1: string; slot2: string };
  sides: { slot1: readonly BoardPlayer[]; slot2: readonly BoardPlayer[] };
  captains: SideCaptains;
  subtitle?: string;
  emptyNote?: string;
  required?: boolean;
  onSideChange: (side: Side) => void;
  onPick: (side: Side, userId: string | null) => void;
  onClose: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.football.captains;
  const t = m.webTournament.footballTeams;
  const current = side ?? 1;
  const team = current === 1 ? names.slot1 : names.slot2;
  const captain = current === 1 ? captains.slot1 : captains.slot2;
  const players = (current === 1 ? sides.slot1 : sides.slot2).filter(
    mayBeSideCaptain,
  );

  return (
    <ResponsiveDialog
      open={side != null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-[440px]">
        <ResponsiveDialogHeader className="text-start">
          <ResponsiveDialogTitle>{copy.title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {subtitle ?? copy.sheetBody}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-4 sm:px-0">
          <RovingRadioGroup
            aria-label={t.captainTeam}
            className="border-rule flex shrink-0 overflow-hidden rounded-lg border"
          >
            {([1, 2] as const).map((value) => {
              const selected = value === current;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSideChange(value)}
                  className={cn(
                    "text-meta focus-visible:ring-ring/50 flex h-[42px] flex-1 items-center justify-center gap-2 outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
                    selected
                      ? "bg-control text-on-control font-semibold"
                      : "bg-paper text-muted-foreground hover:bg-wash",
                  )}
                >
                  <BibChip bib={value === 1 ? bibs.slot1 : bibs.slot2} />
                  {value === 1 ? names.slot1 : names.slot2}
                </button>
              );
            })}
          </RovingRadioGroup>
          <RovingRadioGroup
            aria-label={t.captainChoices(team)}
            className={cn(
              "border-rule shrink-0 overflow-hidden rounded-lg border",
              players.length === 0 && required && "hidden",
            )}
          >
            {players.map((player) => {
              const name = player.isViewer
                ? m.common.you
                : (player.nickname?.name ?? player.name);
              const meta = [slotCode(player, locale), ovrLabel(player)]
                .filter(Boolean)
                .join(" ");
              return (
                <ChoiceRow
                  key={player.userId}
                  selected={captain === player.userId}
                  onSelect={() => onPick(current, player.userId)}
                >
                  <UserAvatar name={player.name} image={player.image} />
                  <NicknameName
                    name={name}
                    isNickname={!player.isViewer && player.nickname != null}
                    className="min-w-0 flex-1 [text-align:match-parent]"
                  />
                  <span
                    dir="ltr"
                    className="text-muted-foreground shrink-0 font-mono text-[11px]"
                  >
                    {meta}
                  </span>
                </ChoiceRow>
              );
            })}
            {required ? null : (
              <ChoiceRow
                selected={captain == null}
                onSelect={() => onPick(current, null)}
              >
                <span
                  aria-hidden="true"
                  className="border-input size-8 shrink-0 rounded-full border border-dashed"
                />
                <span className="text-muted-foreground min-w-0 flex-1">
                  {copy.noCaptainFor(team)}
                </span>
              </ChoiceRow>
            )}
          </RovingRadioGroup>
          {players.length === 0 ? (
            <p className="text-muted-foreground text-meta">
              {emptyNote ?? copy.noneOnTeam}
            </p>
          ) : null}
        </div>
        <ResponsiveDialogFooter>
          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            onClick={onClose}
          >
            {copy.done}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
