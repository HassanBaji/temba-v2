"use client";

import { ArrowLeftRight, LockIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";
import {
  editTeamsMoves,
  editTeamsNotified,
  editTeamsNotifyCopy,
  editTeamsRefusalMessage,
  editTeamsSeats,
  editTeamsSides,
  editTeamsSpotLabel,
  editTeamsSummary,
  editTeamsSwapSides,
  editTeamsTap,
  sameSpot,
  type EditTeamsMove,
  type EditTeamsPlayer,
  type EditTeamsPosition,
  type EditTeamsRules,
  type EditTeamsSide,
  type EditTeamsSpot,
} from "@repo/domain/edit-teams";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";

type SourceSide = Parameters<typeof editTeamsSides>[0][number];
type SourceMatch = NonNullable<Parameters<typeof editTeamsSides>[1]>[number];
type Format = "friendly_game" | "friendly_tournament";

const POSITIONS: readonly EditTeamsPosition[] = ["left", "right"];

function SeatButton({
  player,
  spot,
  format,
  isViewer,
  selected,
  moved,
  picking,
  onSelect,
}: {
  player: EditTeamsPlayer | null;
  spot: EditTeamsSpot;
  format: Format;
  isViewer: boolean;
  selected: boolean;
  moved: boolean;
  picking: boolean;
  onSelect: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.editTeams;
  const spotLabel = editTeamsSpotLabel(format, spot, locale);
  const positionName =
    spot.position === "left" ? m.game.sides.left : m.game.sides.right;
  const base =
    "focus-visible:ring-ring/50 flex min-h-[104px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg p-2.5 text-center outline-none focus-visible:ring-[3px]";

  if (!player) {
    return (
      <button
        type="button"
        aria-label={copy.openSr(spotLabel)}
        aria-disabled={!picking}
        title={picking ? copy.dropHint : undefined}
        onClick={onSelect}
        className={cn(
          base,
          "hatch",
          picking ? "border-foreground border" : "cursor-default",
        )}
      >
        <span className="text-eyebrow text-muted-foreground">
          {positionName}
        </span>
        <span
          className={cn(
            "text-meta font-medium",
            !picking && "text-muted-foreground",
          )}
        >
          {picking ? copy.moveHere : copy.open}
        </span>
      </button>
    );
  }

  const name = isViewer ? m.common.you : player.name;
  const level = player.levelBand
    ? displayLabelFromStoredBand(player.levelBand)
    : null;
  return (
    <button
      type="button"
      aria-label={copy.playerSr(name, spotLabel)}
      aria-pressed={selected}
      title={
        selected ? copy.cancelHint : picking ? copy.dropHint : copy.pickHint
      }
      onClick={onSelect}
      className={cn(
        base,
        selected
          ? "border-foreground bg-wash border-2"
          : "border-rule hover:bg-accent border",
      )}
    >
      <span className="text-eyebrow text-muted-foreground">{positionName}</span>
      <UserAvatar name={player.name} image={player.image} size="sm" />
      <span className="text-meta w-full truncate font-medium">{name}</span>
      <span className="text-eyebrow text-muted-foreground min-h-[1em] truncate">
        {moved ? copy.moved : level}
      </span>
    </button>
  );
}

function TeamBlock({
  side,
  format,
  viewerUserId,
  original,
  selected,
  onTap,
  onSwap,
}: {
  side: EditTeamsSide;
  format: Format;
  viewerUserId: string;
  original: readonly EditTeamsSide[];
  selected: EditTeamsSpot | null;
  onTap: (spot: EditTeamsSpot) => void;
  onSwap: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const teamLabel = formatGameSideLabel(format, side.sideIndex, locale);
  const before = original.find((row) => row.sideIndex === side.sideIndex);
  return (
    <section aria-label={teamLabel} className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-meta min-w-0 flex-1 font-semibold">{teamLabel}</h3>
        {side.locked ? (
          <span className="text-eyebrow text-muted-foreground inline-flex items-center gap-1">
            <LockIcon aria-hidden="true" className="size-3" />
            {m.editTeams.lockedTag}
          </span>
        ) : null}
        {side.left || side.right ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={m.editTeams.swapSidesOf(teamLabel)}
            onClick={onSwap}
          >
            <ArrowLeftRight aria-hidden="true" />
            {m.editTeams.swapSides}
          </Button>
        ) : null}
      </div>
      {/* Left and Right are court sides, so the seats keep their side in Arabic. */}
      <div className="flex gap-2 rtl:flex-row-reverse">
        {POSITIONS.map((position) => {
          const spot = { sideIndex: side.sideIndex, position };
          const player = side[position];
          return (
            <SeatButton
              key={position}
              player={player}
              spot={spot}
              format={format}
              isViewer={player?.userId === viewerUserId}
              selected={sameSpot(selected, spot)}
              moved={
                player != null && before?.[position]?.userId !== player.userId
              }
              picking={selected != null && !sameSpot(selected, spot)}
              onSelect={() => onTap(spot)}
            />
          );
        })}
      </div>
    </section>
  );
}

function MoveRow({
  move,
  format,
  viewerUserId,
}: {
  move: EditTeamsMove;
  format: Format;
  viewerUserId: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const from = editTeamsSpotLabel(format, move.from, locale);
  const to = editTeamsSpotLabel(format, move.to, locale);
  return (
    <li className="flex items-center gap-3">
      <UserAvatar name={move.player.name} image={move.player.image} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-meta truncate font-medium">
          {move.player.userId === viewerUserId
            ? m.common.you
            : move.player.name}
        </p>
        <p className="text-eyebrow text-muted-foreground">
          {m.editTeams.movedLine(from, to)}
        </p>
      </div>
    </li>
  );
}

/**
 * The Organizer's Edit teams board: click a player, then another player to
 * swap or an open spot to move there. Nothing changes until Save, which lists
 * every move and who gets told.
 */
export function EditTeamsDialog({
  open,
  onOpenChange,
  gameId,
  format,
  sides,
  matches,
  rules,
  viewerUserId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  format: Format;
  sides: readonly SourceSide[];
  matches: readonly SourceMatch[];
  rules: EditTeamsRules;
  viewerUserId: string;
  onSaved: () => Promise<unknown>;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.editTeams;
  const original = React.useMemo(
    () => editTeamsSides(sides, matches),
    [sides, matches],
  );
  const [board, setBoard] = React.useState<EditTeamsSide[]>(original);
  const [selected, setSelected] = React.useState<EditTeamsSpot | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const [notify, setNotify] = React.useState(true);

  const save = api.games.editTeams.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(copy.savedToast);
      await onSaved();
      onOpenChange(false);
    },
  });

  React.useEffect(() => {
    if (open) {
      setBoard(original);
      setSelected(null);
      setNotice(null);
      setConfirming(false);
      setNotify(true);
      save.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-gated reset, not on every refetch
  }, [open]);

  const moves = editTeamsMoves(original, board);
  const notified = editTeamsNotified(moves, viewerUserId);
  const hasLocked = board.some((side) => side.locked);
  const isGame = format === "friendly_game";

  function tap(spot: EditTeamsSpot) {
    const result = editTeamsTap(board, selected, spot, rules);
    setBoard(result.sides);
    setSelected(result.selected);
    setNotice(
      result.refused ? editTeamsRefusalMessage(result.refused, locale) : null,
    );
  }

  function swap(sideIndex: number) {
    setBoard((current) => editTeamsSwapSides(current, sideIndex));
    setSelected(null);
    setNotice(null);
  }

  function reset() {
    setBoard(original);
    setSelected(null);
    setNotice(null);
  }

  const teamBlock = (side: EditTeamsSide) => (
    <TeamBlock
      key={side.sideIndex}
      side={side}
      format={format}
      viewerUserId={viewerUserId}
      original={original}
      selected={selected}
      onTap={tap}
      onSwap={() => swap(side.sideIndex)}
    />
  );
  const [first, second] = board;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex flex-col gap-5 p-[22px] sm:max-w-[480px]">
        <ResponsiveDialogHeader className="p-0 text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
          <ResponsiveDialogTitle className="text-h2 tracking-[-0.02em]">
            {confirming ? copy.confirmTitle : copy.title}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-meta">
            {confirming
              ? editTeamsSummary(moves, locale)
              : isGame
                ? copy.gameInstructions
                : copy.tournamentInstructions}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {confirming ? (
          <div className="space-y-5">
            <ul className="space-y-3">
              {moves.map((move) => (
                <MoveRow
                  key={move.player.userId}
                  move={move}
                  format={format}
                  viewerUserId={viewerUserId}
                />
              ))}
            </ul>
            <div className="border-rule flex items-center gap-3 border-t pt-4">
              <div className="min-w-0 flex-1">
                <p id="edit-teams-notify" className="text-meta font-semibold">
                  {copy.notifyTitle}
                </p>
                <p className="text-eyebrow text-muted-foreground">
                  {editTeamsNotifyCopy(moves, viewerUserId, locale)}
                </p>
              </div>
              <Switch
                aria-labelledby="edit-teams-notify"
                checked={notify && notified.length > 0}
                disabled={notified.length === 0 || save.isPending}
                onCheckedChange={setNotify}
              />
            </div>
            {save.error ? (
              <p role="alert" className="text-destructive text-meta">
                {save.error.message}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={save.isPending}
                onClick={() => setConfirming(false)}
              >
                {copy.keepEditing}
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={save.isPending}
                onClick={() =>
                  save.mutate({
                    gameId,
                    seats: editTeamsSeats(board),
                    notifyPlayers: notify,
                  })
                }
              >
                {copy.saveTeams}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="max-h-[60vh] space-y-5 overflow-y-auto">
              {hasLocked ? (
                <div className="border-rule flex gap-2.5 rounded-lg border p-4">
                  <LockIcon aria-hidden="true" className="mt-0.5 size-4" />
                  <div className="min-w-0 flex-1">
                    <p className="text-meta font-semibold">
                      {copy.lockedTitle}
                    </p>
                    <p className="text-eyebrow text-muted-foreground">
                      {copy.lockedCopy}
                    </p>
                  </div>
                </div>
              ) : null}
              {isGame && first && second && board.length === 2 ? (
                <div className="space-y-3">
                  {teamBlock(first)}
                  <div
                    aria-hidden="true"
                    className="text-eyebrow text-muted-foreground flex items-center gap-2"
                  >
                    <span className="border-rule flex-1 border-t border-dashed" />
                    {copy.net}
                    <span className="border-rule flex-1 border-t border-dashed" />
                  </div>
                  {teamBlock(second)}
                </div>
              ) : (
                <div className="space-y-5">{board.map(teamBlock)}</div>
              )}
              <p aria-live="polite" role="status" className="text-meta">
                {notice}
              </p>
              <div className="flex items-center gap-3">
                <p className="text-eyebrow text-muted-foreground flex-1">
                  {isGame ? copy.untilScore : copy.roundsKeepSlots}
                </p>
                {moves.length > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={reset}
                  >
                    {copy.reset}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="border-rule flex items-center gap-3 border-t pt-4">
              <div className="min-w-0 flex-1">
                <p className="text-meta font-semibold">
                  {moves.length === 0
                    ? copy.noChangesTitle
                    : copy.changesTitle(moves.length)}
                </p>
                <p className="text-eyebrow text-muted-foreground">
                  {moves.length === 0
                    ? isGame
                      ? copy.noChangesGame
                      : copy.noChangesTournament
                    : copy.changesSubline}
                </p>
              </div>
              <Button
                type="button"
                disabled={moves.length === 0}
                onClick={() => {
                  save.reset();
                  setSelected(null);
                  setConfirming(true);
                }}
              >
                {copy.save}
              </Button>
            </div>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
