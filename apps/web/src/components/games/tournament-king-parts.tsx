"use client";

import {
  ArrowDownIcon,
  ArrowLeftRightIcon,
  ArrowUpIcon,
  CheckIcon,
  CrownIcon,
  ShuffleIcon,
} from "lucide-react";
import * as React from "react";

import {
  kingCourtCount,
  kingCourtsFromOrder,
  kingCourtTag,
  kingFirstNames,
  postedStartingOrder,
  shuffledOrder,
  swapPositions,
} from "@repo/domain/tournament-king";
import {
  isCompleteKingTeam,
  type KingCourtRow,
  type KingViewTeam,
} from "@repo/domain/tournament-king-view";

import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/components/ui/drawer";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { CloseButton } from "~/components/ui/nav-icon-button";
import { useMessages } from "~/components/locale-provider";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { cn } from "~/lib/utils";

import { InitialsMark, ROUND_CARD } from "./tournament-round-parts";

type MutationError = {
  message: string;
  data?: { zodError?: unknown } | null;
} | null;

function viewerOn(team: KingViewTeam, viewerUserId: string) {
  return team.members.some((member) => member.id === viewerUserId);
}

/** Initials, then both names on their own lines; the viewer's mark is solid. */
export function KingTeamLine({
  team,
  viewerUserId,
  className,
}: {
  team: KingViewTeam;
  viewerUserId: string;
  className?: string;
}) {
  const m = useMessages();
  const isViewer = viewerOn(team, viewerUserId);
  return (
    <span className={cn("flex min-w-0 flex-1 items-center gap-3", className)}>
      <InitialsMark name={team.members[0]?.name ?? ""} isViewer={isViewer} />
      <span className="text-meta flex min-w-0 flex-col text-start font-semibold leading-tight">
        {team.members.map((member) => (
          <span key={member.id} dir="auto" className="truncate">
            {member.name}
            {member.id === viewerUserId ? (
              <span className="text-muted-foreground font-normal">
                {" "}
                {m.tournamentRounds.score.you}
              </span>
            ) : null}
          </span>
        ))}
      </span>
    </span>
  );
}

function CourtTagLabel({ tag }: { tag: KingCourtRow["tag"] }) {
  const m = useMessages().tournamentKing.court;
  if (tag === "kings") {
    return (
      <span className="text-muted-foreground text-eyebrow flex items-center gap-1.5">
        <CrownIcon aria-hidden="true" className="text-ink size-3.5" />
        {m.kings}
      </span>
    );
  }
  if (tag === "bottom" || tag === "yours") {
    return (
      <span className="text-muted-foreground text-eyebrow">
        {tag === "bottom" ? m.bottom : m.yours}
      </span>
    );
  }
  return null;
}

export function KingCourtCard({
  court,
  tag,
  children,
}: {
  court: number;
  tag: KingCourtRow["tag"];
  children: React.ReactNode;
}) {
  const m = useMessages().tournamentKing;
  return (
    <section
      aria-label={m.court.name(court)}
      className={cn(ROUND_CARD, "bg-paper")}
    >
      <div className="border-rule flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-meta font-semibold">{m.court.name(court)}</span>
        <CourtTagLabel tag={tag} />
      </div>
      <div className="divide-rule divide-y">{children}</div>
    </section>
  );
}

/** 2a: the Organizer's way into the one draw there is. */
export function KingDrawEntry({
  completeTeams,
  teamCount,
  onOpen,
}: {
  completeTeams: number;
  teamCount: number;
  onOpen: () => void;
}) {
  const m = useMessages().tournamentKing.drawEntry;
  const full = completeTeams >= teamCount;
  return (
    <div className="border-ink rounded-card flex flex-wrap items-center gap-3 border px-4 py-3.5">
      <span
        aria-hidden="true"
        className="bg-ink text-paper inline-flex size-9 shrink-0 items-center justify-center rounded-md"
      >
        <ShuffleIcon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">
          {full
            ? m.allIn(completeTeams * 2)
            : m.someIn(completeTeams, teamCount)}
        </p>
        <p className="text-muted-foreground text-meta leading-relaxed">
          {m.copy}
        </p>
      </div>
      <Button
        type="button"
        onClick={onOpen}
        className="font-semibold max-sm:w-full"
      >
        {m.open}
      </Button>
    </div>
  );
}

/** 2a: the courts from the king's court down, and what a win or a loss does. */
export function KingHowItRuns({ courtCount }: { courtCount: number }) {
  const m = useMessages().tournamentKing;
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 pb-2.5">
        <h2 className="font-expanded text-title tracking-[-0.03em]">
          {m.howItRuns.title}
        </h2>
        <p className="text-muted-foreground text-meta">{m.howItRuns.meta}</p>
      </div>
      <div className={cn(ROUND_CARD, "bg-paper")}>
        <ol className="divide-rule divide-y">
          {Array.from({ length: courtCount }, (_, index) => index + 1).map(
            (court) => (
              <li
                key={court}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span className="text-meta font-semibold">
                  {m.court.name(court)}
                </span>
                {court === 1 ? <CourtTagLabel tag="kings" /> : null}
              </li>
            ),
          )}
        </ol>
        <div className="border-rule text-meta flex flex-wrap gap-x-5 gap-y-1.5 border-t px-4 py-3">
          <span className="flex items-center gap-2">
            <ArrowUpIcon aria-hidden="true" className="size-4" />
            {m.howItRuns.up}
          </span>
          <span className="flex items-center gap-2">
            <ArrowDownIcon aria-hidden="true" className="size-4" />
            {m.howItRuns.down}
          </span>
        </div>
      </div>
      <p className="text-muted-foreground text-meta mt-2.5 leading-relaxed">
        {m.howItRuns.copy}
      </p>
    </section>
  );
}

function shortNames(team: KingViewTeam | undefined, viewerUserId: string) {
  if (!team) {
    return "";
  }
  return team.members
    .map((member) =>
      member.id === viewerUserId
        ? null
        : (member.name.trim().split(/\s+/)[0] ?? member.name),
    )
    .filter(Boolean)
    .join(" & ");
}

/**
 * 2b: the starting courts. Tap two teams to swap them, Draw again to
 * reshuffle, Post to tell the players. Change reopens a posted draw.
 */
export function KingDrawSheet({
  open,
  onOpenChange,
  gameTeams,
  viewerUserId,
  posted,
  locked,
  pending,
  error,
  onPost,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameTeams: readonly KingViewTeam[];
  viewerUserId: string;
  posted: boolean;
  locked: boolean;
  pending: boolean;
  error: MutationError;
  onPost: (gameTeamIds: string[]) => Promise<void>;
}) {
  const m = useMessages().tournamentKing;
  const complete = React.useMemo(
    () => gameTeams.filter(isCompleteKingTeam),
    [gameTeams],
  );
  const byId = React.useMemo(
    () => new Map(complete.map((team) => [team.id, team])),
    [complete],
  );
  const [order, setOrder] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [editing, setEditing] = React.useState(!posted);

  const completeRef = React.useRef(complete);
  completeRef.current = complete;

  // Draw once per opening: a refetch while the sheet is open must not reshuffle it.
  React.useEffect(() => {
    if (!open) {
      return;
    }
    const teams = completeRef.current;
    const postedOrder = postedStartingOrder(teams);
    setOrder((postedOrder ?? shuffledOrder(teams)).map((team) => team.id));
    setSelected(null);
    setEditing(!posted);
  }, [open, posted]);

  const courts = kingCourtsFromOrder(order);
  const courtCount = kingCourtCount(order.length);
  const playerCount = order.length * 2;
  const showPosted = posted && !editing;
  const selectedTeam =
    selected != null ? byId.get(order[selected] ?? "") : undefined;
  const note = showPosted
    ? m.draw.postedNote
    : selectedTeam
      ? m.draw.swapWith(
          viewerOn(selectedTeam, viewerUserId)
            ? kingFirstNames(selectedTeam.members)
            : shortNames(selectedTeam, viewerUserId),
        )
      : m.draw.note(order.length, courtCount);

  function tap(position: number) {
    if (showPosted || pending) {
      return;
    }
    if (selected == null) {
      setSelected(position);
      return;
    }
    if (selected !== position) {
      setOrder((current) => swapPositions(current, selected, position));
    }
    setSelected(null);
  }

  async function post() {
    try {
      await onPost(order);
      setEditing(false);
    } catch {
      return;
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (pending && !next) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <DrawerContent className="mt-0 h-dvh max-h-dvh rounded-none p-0 data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-dvh [&>div.bg-muted]:hidden">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-start justify-between gap-3 px-[22px] pt-[22px]">
            <div className="min-w-0">
              <DrawerTitle className="font-expanded text-display leading-none tracking-[-0.03em]">
                {m.draw.title}
              </DrawerTitle>
              <DrawerDescription
                aria-live="polite"
                className="text-muted-foreground text-meta mt-2.5 leading-relaxed"
              >
                {note}
              </DrawerDescription>
            </div>
            <CloseButton
              variant="boxed"
              label={m.draw.close}
              onClick={() => onOpenChange(false)}
              disabled={pending}
            />
          </div>

          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-[22px] pt-5">
            {courts.map((court) => (
              <KingCourtCard
                key={court.court}
                court={court.court}
                tag={kingCourtTag(court.court, courtCount)}
              >
                {court.teams.map((teamId, slot) => {
                  const position = (court.court - 1) * 2 + slot;
                  const team = byId.get(teamId);
                  if (!team) {
                    return null;
                  }
                  const on = selected === position;
                  return (
                    <button
                      key={teamId}
                      type="button"
                      aria-pressed={on}
                      aria-label={m.draw.swapLabel(
                        team.members.map((member) => member.name).join(" & "),
                      )}
                      disabled={showPosted || pending}
                      onClick={() => tap(position)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-start outline-none transition-colors",
                        "focus-visible:ring-ink focus-visible:ring-2 focus-visible:ring-inset",
                        on
                          ? "bg-wash ring-ink ring-[1.5px] ring-inset"
                          : "bg-paper",
                        !showPosted && "hover:bg-wash",
                      )}
                    >
                      <KingTeamLine team={team} viewerUserId={viewerUserId} />
                      {showPosted ? null : (
                        <span className="text-muted-foreground text-eyebrow flex shrink-0 items-center gap-1.5">
                          {on ? m.draw.swapTag : null}
                          <ArrowLeftRightIcon
                            aria-hidden="true"
                            className="size-3.5"
                          />
                        </span>
                      )}
                    </button>
                  );
                })}
              </KingCourtCard>
            ))}
          </div>

          <div className="border-rule mt-4 shrink-0 space-y-2 border-t px-[22px] pb-[22px] pt-4">
            <FormErrorSummary message={globalFormErrorMessage(error)} />
            {showPosted ? (
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="bg-ink text-paper inline-flex size-[22px] shrink-0 items-center justify-center rounded-[7px]"
                >
                  <CheckIcon className="size-[13px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold">{m.draw.posted}</p>
                  <p className="text-muted-foreground text-eyebrow">
                    {locked
                      ? m.draw.changeLocked
                      : m.draw.postedCopy(playerCount)}
                  </p>
                </div>
                {locked ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 font-semibold"
                    onClick={() => setEditing(true)}
                  >
                    {m.draw.change}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  size="lg"
                  className="w-full font-semibold"
                  disabled={pending || order.length === 0}
                  aria-busy={pending}
                  onClick={() => void post()}
                >
                  {pending ? m.draw.posting : m.draw.post}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full"
                  disabled={pending}
                  onClick={() => {
                    setOrder((current) => shuffledOrder(current));
                    setSelected(null);
                  }}
                >
                  <ShuffleIcon aria-hidden="true" className="size-4" />
                  {m.draw.again}
                </Button>
                <p className="text-muted-foreground text-eyebrow text-center">
                  {m.draw.footer}
                </p>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
