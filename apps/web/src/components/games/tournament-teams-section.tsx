"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { RowList } from "~/components/common/row-list";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { SeatTile } from "~/components/temba/seat";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import { tournamentSeatLabel } from "@repo/domain/tournament-details";
import {
  tournamentCollapsedTeamsLabel,
  tournamentFieldSummary,
  tournamentTeamRows,
  tournamentTeamsCountLine,
  type TournamentHomeOccupant,
  type TournamentHomeSide,
  type TournamentTeamRow,
} from "@repo/domain/tournament-home";
import { useLocale, useMessages } from "~/components/locale-provider";
import { playerProfilePath } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";

import { useTournamentPlayerActions } from "./tournament-player-dialog";

export function TournamentTeamsSection({
  sides,
  viewerUserId,
  canTakeSeat,
  onTakeSeat,
  onOpenSeat,
  linkToPlayers = false,
}: {
  sides: readonly TournamentHomeSide[];
  viewerUserId: string;
  canTakeSeat: boolean;
  linkToPlayers?: boolean;
  onTakeSeat?: (seat: {
    sideIndex: number;
    position: "left" | "right";
  }) => void;
  /** The Organizer clicked an open seat; `canJoin` when they could take it too. */
  onOpenSeat?: OpenSeatHandler;
}) {
  const m = useMessages();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const field = tournamentFieldSummary(sides);
  const view = tournamentTeamRows(sides, viewerUserId, locale);
  const countLine = tournamentTeamsCountLine(
    field.full,
    field.halfOpen,
    locale,
  );
  const collapsible = view.collapsedCount > 0;
  const middle = expanded ? view.collapsed : [];

  return (
    <section>
      <div className="flex items-baseline gap-2.5 pb-2.5">
        <h2 className="font-expanded text-title tracking-[-0.03em]">
          {m.tournament.home.teamsHeading}
        </h2>
        {countLine ? (
          <p className="text-muted-foreground text-meta">{countLine}</p>
        ) : null}
      </div>
      <RowList
        aria-label={m.tournament.home.teamsHeading}
        className="border-rule divide-rule rounded-card"
      >
        {view.head.map((row) => (
          <TeamRow
            key={row.sideIndex}
            row={row}
            side={sideByIndex(sides, row.sideIndex)}
            viewerUserId={viewerUserId}
            canTakeSeat={canTakeSeat}
            onTakeSeat={onTakeSeat}
            onOpenSeat={onOpenSeat}
            linkToPlayers={linkToPlayers}
          />
        ))}
        {collapsible ? (
          <li data-slot="list-row">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
              className="focus-visible:ring-ring/50 flex min-h-11 w-full items-center gap-3 px-4 py-3 text-start outline-none focus-visible:ring-[3px]"
            >
              <span aria-hidden="true" className="w-[22px] shrink-0" />
              <span className="text-muted-foreground text-meta min-w-0 flex-1">
                {tournamentCollapsedTeamsLabel(view.collapsedCount, locale)}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "text-muted-foreground size-4 shrink-0 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </button>
          </li>
        ) : null}
        {middle.map((row) => (
          <TeamRow
            key={row.sideIndex}
            row={row}
            side={sideByIndex(sides, row.sideIndex)}
            viewerUserId={viewerUserId}
            canTakeSeat={canTakeSeat}
            onTakeSeat={onTakeSeat}
            onOpenSeat={onOpenSeat}
            linkToPlayers={linkToPlayers}
          />
        ))}
        {view.tail.map((row) => (
          <TeamRow
            key={row.sideIndex}
            row={row}
            side={sideByIndex(sides, row.sideIndex)}
            viewerUserId={viewerUserId}
            canTakeSeat={canTakeSeat}
            onTakeSeat={onTakeSeat}
            onOpenSeat={onOpenSeat}
            linkToPlayers={linkToPlayers}
          />
        ))}
      </RowList>
    </section>
  );
}

type OpenSeatHandler = (
  seat: { sideIndex: number; position: "left" | "right" },
  canJoin: boolean,
) => void;

function sideByIndex(sides: readonly TournamentHomeSide[], sideIndex: number) {
  return sides.find((side) => side.sideIndex === sideIndex) ?? null;
}

function TeamSeat({
  occupant,
  position,
  teamLabel,
  viewerUserId,
  joinable,
  addable = false,
  onJoin,
  linked,
}: {
  occupant: TournamentHomeOccupant | null;
  position: "left" | "right";
  teamLabel: string;
  viewerUserId: string;
  joinable: boolean;
  /** The Organizer may add a player here. */
  addable?: boolean;
  onJoin?: () => void;
  linked: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const playerActions = useTournamentPlayerActions();
  const positionName =
    position === "left"
      ? m.tournament.position.left
      : m.tournament.position.right;

  if (!occupant) {
    const canJoin = joinable && onJoin != null;
    const canAdd = addable && onJoin != null;
    return (
      <SeatTile
        occupant={null}
        caption={canAdd && !canJoin ? m.group.addPlayer.action : positionName}
        label={
          canAdd && !canJoin
            ? m.webDashboard.game.addPlayerTo(teamLabel, positionName)
            : tournamentSeatLabel({
                position,
                teamLabel,
                joinable: canJoin,
                locale,
              })
        }
        onSelect={canJoin || canAdd ? onJoin : undefined}
      />
    );
  }

  const openActions = playerActions?.canKick(occupant.userId)
    ? () =>
        playerActions.open({
          userId: occupant.userId,
          name: occupant.name,
          image: occupant.image ?? null,
          levelBand: occupant.levelBand,
          guest: occupant.guest,
          phoneNumber: occupant.phoneNumber,
        })
    : undefined;

  return (
    <SeatTile
      occupant={{ name: occupant.name, image: occupant.image ?? null }}
      name={occupant.userId === viewerUserId ? m.common.you : occupant.name}
      level={
        occupant.levelBand
          ? displayLabelFromStoredBand(occupant.levelBand)
          : null
      }
      caption={positionName}
      label={
        openActions
          ? m.webTournament.player.openActions(occupant.name)
          : undefined
      }
      onSelect={openActions}
      href={
        linked && !openActions && !occupant.guest
          ? playerProfilePath(occupant.userId)
          : undefined
      }
    />
  );
}

function TeamRow({
  row,
  side,
  viewerUserId,
  canTakeSeat,
  onTakeSeat,
  onOpenSeat,
  linkToPlayers,
}: {
  row: TournamentTeamRow;
  side: TournamentHomeSide | null;
  viewerUserId: string;
  canTakeSeat: boolean;
  onTakeSeat?: (seat: {
    sideIndex: number;
    position: "left" | "right";
  }) => void;
  onOpenSeat?: OpenSeatHandler;
  linkToPlayers: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const teamLabel = formatGameSideLabel(
    "friendly_tournament",
    row.sideIndex,
    locale,
  );

  const canJoin = canTakeSeat && onTakeSeat != null && !row.isViewer;

  function join(position: "left" | "right") {
    const seat = { sideIndex: row.sideIndex, position };
    if (onOpenSeat) {
      onOpenSeat(seat, canJoin);
      return;
    }
    if (canJoin) {
      onTakeSeat?.(seat);
    }
  }

  return (
    <li
      data-slot="list-row"
      className={cn("px-4 py-4", row.isViewer && "bg-muted")}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          aria-hidden="true"
          className="text-eyebrow text-muted-foreground inline-block w-[22px] tabular-nums"
        >
          {row.indexLabel}
        </span>
        <span className="text-body min-w-0 flex-1 truncate font-medium">
          {teamLabel}
        </span>
        {row.isViewer ? (
          <span className="text-muted-foreground text-eyebrow">
            {m.tournament.home.yourTeamTag}
          </span>
        ) : null}
      </div>
      {/* Left and Right are court sides, so the seats keep their side in Arabic. */}
      <div className="flex gap-2 rtl:flex-row-reverse">
        <TeamSeat
          occupant={side?.left ?? null}
          position="left"
          teamLabel={teamLabel}
          viewerUserId={viewerUserId}
          joinable={canTakeSeat && !row.isViewer && side?.left == null}
          addable={onOpenSeat != null && side?.left == null}
          onJoin={
            side?.left == null
              ? () => {
                  join("left");
                }
              : undefined
          }
          linked={linkToPlayers}
        />
        <TeamSeat
          occupant={side?.right ?? null}
          position="right"
          teamLabel={teamLabel}
          viewerUserId={viewerUserId}
          joinable={canTakeSeat && !row.isViewer && side?.right == null}
          addable={onOpenSeat != null && side?.right == null}
          onJoin={
            side?.right == null
              ? () => {
                  join("right");
                }
              : undefined
          }
          linked={linkToPlayers}
        />
      </div>
    </li>
  );
}
