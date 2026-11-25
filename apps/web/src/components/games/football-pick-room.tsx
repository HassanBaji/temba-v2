"use client";

import {
  bibNames,
  lineupPlayerName,
  ofSide,
  ovrLabel,
  slotCode,
  type BoardPlayer,
  type Side,
} from "@repo/domain/football-board";
import {
  captainPickCountLines,
  captainPickFirstPickLine,
  captainPickPoolLine,
  captainPickPoolOrder,
  captainPickRoomLines,
  lastPick as lastPickOf,
  pickRoomAfterRead,
  pickRoomPollMs,
  pickRoomUserIds,
  pickRoomWithPick,
  type PickRoomView,
} from "@repo/domain/football-captain-pick";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import { formatGameStart } from "@repo/domain/format-game-start";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { BellIcon, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { ErrorState } from "~/components/common/error-state";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import { Skeleton } from "~/components/ui/skeleton";
import { Surface } from "~/components/ui/surface";
import { gameHomeHref } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

import { BibChip } from "./football-bibs";
import { FootballInfoRows } from "./football-info-rows";
import { FootballPickPool, FootballPickSides } from "./football-pick-sides";

type OpenPickRoom = Exclude<
  RouterOutputs["games"]["footballPickRoom"],
  { status: "stopped" | "closed" }
>;

const CLOSED_READ = { status: "closed" } as const;

const POOL_PREVIEW = 4;

type Reminded = "sent" | "recently";

function poolPlayers(
  room: OpenPickRoom,
  players: readonly BoardPlayer[],
  balanceOn: FootballBalanceOn,
) {
  const byId = new Map(players.map((player) => [player.userId, player]));
  return captainPickPoolOrder(
    room.pool.flatMap((userId) => {
      const player = byId.get(userId);
      return player ? [player] : [];
    }),
    { organizer: room.viewer.isOrganizer, balanceOn },
  );
}

function CaptainCard({
  side,
  room,
  team,
  player,
}: {
  side: Side;
  room: OpenPickRoom;
  team: string;
  player: BoardPlayer | undefined;
}) {
  const messages = useMessages();
  const locale = useLocale();
  const m = messages.football.pick;
  const inRoom = ofSide(room.captains, side)?.inRoom ?? false;
  const name = lineupPlayerName(player, locale) ?? "";
  const presence = inRoom ? m.inRoom : m.notHereYet;
  const meta = player
    ? [slotCode(player, locale), ovrLabel(player)].filter(Boolean).join(" ")
    : null;
  return (
    <section
      className={cn(
        "relative min-w-0 flex-1 space-y-3.5 overflow-hidden rounded-xl border p-4",
        inRoom ? "border-rule bg-paper" : "border-input border-dashed",
      )}
    >
      <span className="sr-only" aria-live="polite">
        {m.presenceSpoken(team, name, presence)}
      </span>
      {inRoom ? null : <Hatch className="absolute inset-0" />}
      <div aria-hidden="true" className="relative space-y-3.5">
        <div className="flex items-center gap-2">
          <BibChip bib={ofSide(room.bibs, side)} className="size-4" />
          <span className="text-muted-foreground text-meta">{team}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <UserAvatar
            name={player?.name ?? name}
            image={player?.image}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{name}</p>
            {meta ? (
              <p
                dir="ltr"
                className="text-muted-foreground font-mono text-[11px] [text-align:match-parent]"
              >
                {meta}
              </p>
            ) : null}
          </div>
        </div>
        {inRoom ? (
          <p className="text-meta flex items-center gap-1.5 font-semibold">
            <span className="bg-control text-on-control flex size-[18px] items-center justify-center rounded-sm">
              <Check className="size-3" />
            </span>
            {m.inRoom}
          </p>
        ) : (
          <p className="bg-paper text-muted-foreground text-meta w-fit rounded-sm px-1.5 py-px">
            {m.notHereYet}
          </p>
        )}
      </div>
    </section>
  );
}

function OrganizerAction({
  label,
  hint,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="focus-visible:ring-ring/50 hover:bg-wash flex w-full items-center gap-3 px-3.5 py-3 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset disabled:pointer-events-none"
      >
        <span className="min-w-0 flex-1 space-y-0.5">
          <span
            className={cn(
              "block font-semibold",
              disabled && "text-muted-foreground",
            )}
          >
            {label}
          </span>
          <span className="text-muted-foreground text-meta block">{hint}</span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground size-[18px] shrink-0 rtl:-scale-x-100"
        />
      </button>
    </li>
  );
}

/**
 * The Pick room (designs 4b to 4d, ADR-0109), for the two Side captains and
 * the Game's Organizers. It reads `games.footballPickRoom` every two seconds
 * while the tab is visible, which is what keeps a captain "In the room".
 * While it waits each captain sees the other and can remind them; the
 * Organizer can remind either, start without them or stop the pick. Once
 * live, the captain on turn selects a player and confirms; their own pick
 * shows at once and the next read corrects it. The Organizer watches and can
 * pick for the side on turn, undo the last pick or stop. What a read puts
 * on the page is `pickRoomAfterRead`'s to say: a pick stopped while it
 * waits or is live closes the room and says so, and a finished pick stays
 * on the page through the closed or not-found reads that follow once the
 * Organizer publishes or edits the draft. It is then read slowly, and a new
 * room the Organizer opens takes its place. A closed room is read again
 * only when the tab comes back in front. Someone the room was never read
 * to gets the not-found page.
 */
export function FootballPickRoom({ gameId }: { gameId: string }) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.pick;
  const router = useRouter();
  const utils = api.useUtils();
  const gameHref = gameHomeHref(gameId);
  const game = api.games.byId.useQuery({ id: gameId });
  const board = api.games.footballBoard.useQuery({ gameId });
  const [view, setView] = React.useState<PickRoomView<OpenPickRoom>>(null);
  const room = api.games.footballPickRoom.useQuery(
    { gameId },
    {
      refetchInterval: pickRoomPollMs(view),
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: "always",
      staleTime: 0,
      retry: false,
    },
  );
  const [reminded, setReminded] = React.useState<
    Partial<Record<Side, Reminded>>
  >({});
  const [selected, setSelected] = React.useState<string | null>(null);
  const [pickingFor, setPickingFor] = React.useState(false);
  const [confirm, setConfirm] = React.useState<"undo" | "stop" | null>(null);
  const refused =
    isNotFoundError(room.error) || room.error?.data?.code === "FORBIDDEN";
  // A read kept from an earlier visit does not count: the pick may have
  // ended or a new room opened since, so the view starts from this visit's.
  const read = !room.isFetchedAfterMount
    ? null
    : room.isSuccess
      ? room.data
      : refused
        ? CLOSED_READ
        : null;
  const data = view === "closed" ? null : view;
  const nextPick = data?.picks.next ?? null;
  const pickId = data?.pickId ?? null;

  React.useEffect(() => {
    setSelected(null);
    setPickingFor(false);
  }, [nextPick]);

  React.useEffect(() => {
    setReminded({});
  }, [pickId]);

  const leave = React.useCallback(
    async (message: string) => {
      toast(message);
      await Promise.all([
        utils.games.footballBoard.invalidate({ gameId }),
        utils.games.byId.invalidate({ id: gameId }),
      ]);
      router.replace(gameHref);
    },
    [utils, gameId, router, gameHref],
  );

  React.useEffect(() => {
    if (!read) {
      return;
    }
    const next = pickRoomAfterRead<OpenPickRoom>(view, read);
    setView(next.view);
    if (next.stopped) {
      void leave(m.stopped);
    }
  }, [read, view, leave, m.stopped]);

  const boardPlayers = board.data?.players;
  const unknownIds =
    boardPlayers && data
      ? pickRoomUserIds(data)
          .filter(
            (userId) =>
              !boardPlayers.some((player) => player.userId === userId),
          )
          .join(",")
      : "";
  const refetchBoard = board.refetch;
  React.useEffect(() => {
    if (unknownIds) {
      void refetchBoard();
    }
  }, [unknownIds, refetchBoard]);

  const refresh = () => utils.games.footballPickRoom.invalidate({ gameId });
  const failure = (error: { message: string }) => toast.error(error.message);
  const remind = api.games.remindFootballCaptain.useMutation({
    meta: OWN_ERROR_UI,
    onError: failure,
  });
  const start = api.games.startFootballPick.useMutation({
    meta: OWN_ERROR_UI,
    onError: failure,
    onSettled: refresh,
  });
  const stop = api.games.stopFootballPick.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      await refresh();
      setConfirm(null);
    },
    onError: failure,
  });
  const pickPlayer = api.games.pickFootballPlayer.useMutation({
    meta: OWN_ERROR_UI,
    onMutate: async (input) => {
      await utils.games.footballPickRoom.cancel({ gameId });
      const previous = utils.games.footballPickRoom.getData({ gameId });
      utils.games.footballPickRoom.setData({ gameId }, (current) =>
        current
          ? pickRoomWithPick(current, {
              userId: input.pickedUserId,
              pickNumber: input.pickNumber,
            })
          : current,
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        utils.games.footballPickRoom.setData({ gameId }, context.previous);
      }
      failure(error);
    },
    onSuccess: (result) => {
      if (result.done) {
        void utils.games.footballBoard.invalidate({ gameId });
      }
    },
    onSettled: refresh,
  });
  const undoPick = api.games.undoFootballPick.useMutation({
    meta: OWN_ERROR_UI,
    onError: failure,
    onSettled: () => {
      setConfirm(null);
      void refresh();
    },
  });

  const back = (
    <Button variant="outline" asChild>
      <Link href={gameHref}>{m.backToGame}</Link>
    </Button>
  );

  if (view == null && isNotFoundError(room.error)) {
    notFound();
  }
  if (view === "closed") {
    return (
      <DashboardShell title={m.title} action={back} isSubPage hideNav>
        <section className="border-rule bg-paper space-y-1 rounded-xl border p-5">
          <h2 className="font-semibold">{m.closedTitle}</h2>
          <p className="text-muted-foreground text-meta">{m.closedBody}</p>
        </section>
      </DashboardShell>
    );
  }
  const loadError = (data || refused ? null : room.error) ?? board.error;
  if (loadError) {
    return (
      <DashboardShell title={m.title} action={back} isSubPage hideNav>
        <ErrorState
          title={m.loadError}
          message={loadError.message}
          onRetry={() => {
            void room.refetch();
            void board.refetch();
          }}
          backHref={gameHref}
          backLabel={m.backToGame}
        />
      </DashboardShell>
    );
  }
  if (!data || !boardPlayers) {
    return (
      <DashboardShell title={m.title} action={back} isSubPage hideNav>
        <span className="sr-only" role="status">
          {m.loading}
        </span>
        <Skeleton className="h-80 w-full rounded-xl" />
      </DashboardShell>
    );
  }

  const names = bibNames(data.bibs, locale);
  const balanceOn = board.data?.balanceOn ?? "ovr";
  const playerOf = (userId: string | undefined) =>
    boardPlayers.find((player) => player.userId === userId);
  const captainPlayer = (side: Side) =>
    playerOf(ofSide(data.captains, side)?.userId);
  const captainName = (side: Side) =>
    lineupPlayerName(captainPlayer(side), locale) ?? "";
  const nameOf = (userId: string) =>
    lineupPlayerName(playerOf(userId), locale) ?? "";
  const otherSide: Side | null =
    data.viewer.side === 1 ? 2 : data.viewer.side === 2 ? 1 : null;
  const inRoom = (side: Side) => ofSide(data.captains, side)?.inRoom ?? false;

  const sendReminder = (side: Side) =>
    remind.mutate(
      { gameId, side },
      {
        onSuccess: (result) => {
          setReminded((current) => ({
            ...current,
            [side]: result.sent ? "sent" : "recently",
          }));
          toast.success(
            result.sent
              ? m.reminded(captainName(side))
              : m.remindedRecently(captainName(side)),
          );
        },
      },
    );
  const remindLabel = (side: Side) => {
    const state = reminded[side];
    const name = captainName(side);
    return state === "recently"
      ? m.remindedRecently(name)
      : state === "sent"
        ? m.reminded(name)
        : m.remind(name);
  };
  const remindButton = (side: Side) =>
    inRoom(side) ? null : (
      <Button
        key={side}
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        pending={remind.isPending && remind.variables?.side === side}
        onClick={() => sendReminder(side)}
      >
        <BellIcon aria-hidden="true" />
        {remindLabel(side)}
      </Button>
    );

  if (data.status === "waiting") {
    const kickoff = game.data?.windowStart ?? null;
    const intro =
      otherSide != null
        ? m.introCaptain(captainName(otherSide))
        : m.introOrganizer(captainName(1), captainName(2));
    const firstPickLine = captainPickFirstPickLine(
      { firstPick: data.firstPick, firstPickSide: data.firstPickSide },
      names,
      locale,
    );
    return (
      <DashboardShell
        title={m.title}
        description={kickoff ? formatGameStart(kickoff, locale) : undefined}
        action={back}
        isSubPage
        hideNav
      >
        <div className="space-y-5">
          <p className="text-muted-foreground text-meta">{intro}</p>
          <div className="flex gap-2.5">
            <CaptainCard
              side={1}
              room={data}
              team={names.slot1}
              player={captainPlayer(1)}
            />
            <CaptainCard
              side={2}
              room={data}
              team={names.slot2}
              player={captainPlayer(2)}
            />
          </div>
          <FootballInfoRows
            rows={[
              { label: m.firstPickLabel, value: firstPickLine },
              { label: m.orderLabel, value: m.orderValue },
              {
                label: m.toPickLabel,
                value: captainPickPoolLine(data.pool.length, locale),
              },
            ]}
          />
          <FootballPickPool
            pool={poolPlayers(data, boardPlayers, balanceOn)}
            head={m.poolHead(data.pool.length)}
            limit={POOL_PREVIEW}
          />
          <div className="border-rule bg-background sticky bottom-0 space-y-2 border-t py-4">
            {otherSide != null ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled
                >
                  {m.waitingFor(captainName(otherSide))}
                </Button>
                {remindButton(otherSide)}
              </>
            ) : (
              <>
                {remindButton(1)}
                {remindButton(2)}
              </>
            )}
            {data.viewer.isOrganizer ? (
              <>
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  pending={start.isPending}
                  disabled={stop.isPending}
                  onClick={() => start.mutate({ gameId })}
                >
                  {m.startNow}
                </Button>
                <p className="text-muted-foreground text-eyebrow text-center">
                  {m.startNowHint}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  pending={stop.isPending}
                  disabled={start.isPending}
                  onClick={() => stop.mutate({ gameId })}
                >
                  {m.stop}
                </Button>
                <p className="text-muted-foreground text-eyebrow text-center">
                  {m.stopHint}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </DashboardShell>
    );
  }

  const done = data.status === "done";
  const turn = data.turn;
  const lines = captainPickRoomLines(
    {
      status: data.status,
      picks: data.picks,
      turn,
      firstPick: data.firstPick,
      firstPickSide: data.firstPickSide,
      sizes: {
        slot1: data.sides.slot1.length,
        slot2: data.sides.slot2.length,
      },
    },
    data.viewer.side,
    {
      captains: { slot1: captainName(1), slot2: captainName(2) },
      teams: names,
    },
    locale,
  );
  const counts = captainPickCountLines(
    {
      slot1: data.sides.slot1.length,
      slot2: data.sides.slot2.length,
      pool: data.pool.length,
      firstPickSide: data.firstPickSide ?? 1,
    },
    locale,
  );
  const viewerOnTurn = !done && turn != null && data.viewer.side === turn;
  const mayPickFor =
    !done && turn != null && data.viewer.isOrganizer && !viewerOnTurn;
  const selectable = viewerOnTurn || (mayPickFor && pickingFor);
  const choice = selectable && selected ? playerOf(selected) : undefined;
  const choiceName = choice ? nameOf(choice.userId) : "";
  const lastPick = lastPickOf(data.sides);
  const lastPickName = lastPick ? nameOf(lastPick.userId) : "";

  const sendPick = () => {
    if (!choice || turn == null) {
      return;
    }
    pickPlayer.mutate({
      gameId,
      pickedUserId: choice.userId,
      pickNumber: data.picks.next,
      forSide: viewerOnTurn ? undefined : turn,
    });
  };
  const seeTheDraft = async () => {
    await Promise.all([
      utils.games.footballBoard.invalidate({ gameId }),
      utils.games.byId.invalidate({ id: gameId }),
    ]);
    router.push(gameHref);
  };

  const footer = done ? (
    <Button
      type="button"
      size="lg"
      className="w-full"
      onClick={() => void seeTheDraft()}
    >
      {m.seeTheDraft}
    </Button>
  ) : selectable ? (
    <div className="flex gap-2">
      {pickingFor && !viewerOnTurn ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            setPickingFor(false);
            setSelected(null);
          }}
        >
          {m.cancel}
        </Button>
      ) : null}
      <Button
        type="button"
        size="lg"
        className="flex-1"
        variant={choice ? "default" : "outline"}
        disabled={!choice}
        pending={pickPlayer.isPending}
        onClick={sendPick}
      >
        {choice
          ? viewerOnTurn || turn == null
            ? m.pickPlayer(choiceName)
            : m.pickPlayerFor(choiceName, captainName(turn))
          : m.tapToPick}
      </Button>
    </div>
  ) : data.viewer.side != null && turn != null ? (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      disabled
    >
      {m.isChoosing(captainName(turn))}
    </Button>
  ) : null;

  return (
    <DashboardShell
      title={m.title}
      description={lines.progress}
      action={back}
      width={done ? "content" : "wide"}
      isSubPage
      hideNav
    >
      <div className="space-y-5">
        <Surface
          tone={viewerOnTurn ? "ink" : "paper"}
          radius="surface"
          aria-live="polite"
          className={cn(
            "space-y-1.5 p-5",
            viewerOnTurn ? null : "border-rule border",
          )}
        >
          {lines.toss ? (
            <p className="text-eyebrow opacity-70">{lines.toss}</p>
          ) : null}
          <h2 className="font-expanded text-title font-bold">{lines.title}</h2>
          <p className="text-meta opacity-70">{lines.sub}</p>
        </Surface>
        <div
          className={cn(
            "space-y-5",
            !done &&
              "lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-5 lg:space-y-0",
          )}
        >
          <div className="space-y-5">
            <FootballPickSides
              sides={data.sides}
              captains={{
                slot1: data.captains.slot1?.userId ?? null,
                slot2: data.captains.slot2?.userId ?? null,
              }}
              bibs={data.bibs}
              teams={names}
              counts={counts}
              turn={done ? null : turn}
              nextPick={data.picks.next}
              players={boardPlayers}
              balanceOn={balanceOn}
            />
            {data.viewer.isOrganizer && !done ? (
              <ul className="border-rule bg-paper divide-rule divide-y overflow-hidden rounded-xl border">
                {mayPickFor && turn != null ? (
                  <OrganizerAction
                    label={m.pickFor(captainName(turn))}
                    hint={m.pickForHint(captainName(turn))}
                    disabled={pickingFor}
                    onClick={() => setPickingFor(true)}
                  />
                ) : null}
                <OrganizerAction
                  label={m.undoLast}
                  hint={lastPick ? m.undoHint(lastPickName) : m.undoNothing}
                  disabled={!lastPick || undoPick.isPending}
                  onClick={() => setConfirm("undo")}
                />
                <OrganizerAction
                  label={m.stop}
                  hint={m.stopHint}
                  disabled={stop.isPending}
                  onClick={() => setConfirm("stop")}
                />
              </ul>
            ) : null}
          </div>
          {done ? null : (
            <FootballPickPool
              pool={poolPlayers(data, boardPlayers, balanceOn)}
              head={counts.pool}
              selectable={selectable}
              selected={selectable ? selected : null}
              onSelect={setSelected}
            />
          )}
        </div>
        {footer ? (
          <div className="border-rule bg-background sticky bottom-0 border-t py-4">
            {footer}
          </div>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirm === "undo" && lastPick != null}
        onOpenChange={(open) => setConfirm(open ? "undo" : null)}
        title={lastPick ? m.undoTitle(lastPick.pickNumber) : m.undoLast}
        description={
          lastPick
            ? m.undoBody(lastPickName, captainName(lastPick.side))
            : undefined
        }
        confirmLabel={m.undoConfirm}
        cancelLabel={m.cancel}
        variant="default"
        pending={undoPick.isPending}
        onConfirm={() => {
          if (lastPick) {
            undoPick.mutate(
              { gameId, pickNumber: lastPick.pickNumber },
              { onSuccess: () => toast.success(m.undone(lastPickName)) },
            );
          }
        }}
      />
      <ConfirmDialog
        open={confirm === "stop"}
        onOpenChange={(open) => setConfirm(open ? "stop" : null)}
        title={m.stopTitle}
        description={m.stopBody}
        confirmLabel={m.stop}
        cancelLabel={m.cancel}
        variant="default"
        pending={stop.isPending}
        onConfirm={() => stop.mutate({ gameId })}
      />
    </DashboardShell>
  );
}
