"use client";

import * as React from "react";

import {
  changeBoardRotation,
  changeRoundClock,
  normalizeBoardMessage,
  ROUND_CLOCK_ON_SCHEDULE,
} from "@repo/domain/live-board";

import {
  BoardControlBody,
  type BoardControlDoors,
} from "~/components/live-board/board-control";
import { LiveBoard } from "~/components/live-board/live-board";
import { OnTvCard } from "~/components/live-board/on-tv-card";
import { ShowOnTvPanel } from "~/components/live-board/show-on-tv-sheet";
import { useBoardNow } from "~/components/live-board/use-board-now";
import type { LiveBoardControlState } from "~/components/live-board/use-live-board";

import {
  liveBoardPreviews,
  PREVIEW_NOW,
} from "~/components/live-board/board-fixtures";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-meta font-mono uppercase">
      {children}
    </p>
  );
}

function Phone({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3" data-preview-phone={title}>
      <Label>{title}</Label>
      <div className="border-rule bg-paper flex w-[390px] flex-col gap-6 rounded-xl border p-[22px]">
        {children}
      </div>
    </div>
  );
}

const PREVIEW_ROUND_SECONDS = 30 * 60;

/** The fixture's Round has 11:38 left when the preview opens. */
const PREVIEW_SECONDS_LEFT = 11 * 60 + 38;

function initialControl(): LiveBoardControlState {
  const now = new Date();
  return {
    id: "preview",
    code: "482913",
    url: "https://temba.app/tv/482913",
    address: "temba.app/tv",
    rotate: true,
    rotateSeconds: 10,
    heldScreen: "on_court",
    rotationStartedAt: now,
    colorScheme: "dark",
    showQr: true,
    message: "Round 5 starts in 2 minutes. Check your court.",
    messageShown: false,
    tvs: [
      {
        id: "tv-1",
        name: "Clubhouse TV",
        connectedAt: new Date(now.getTime() - 8 * 60_000),
      },
    ],
    roundClock: ROUND_CLOCK_ON_SCHEDULE,
    status: {
      phase: "live",
      screens: ["on_court", "table", "next_up"],
      round: {
        roundNumber: 4,
        lengthSeconds: PREVIEW_ROUND_SECONDS,
        schedule: {
          startsAt: null,
          endsAt: new Date(now.getTime() + PREVIEW_SECONDS_LEFT * 1000),
        },
      },
    },
    serverNow: now,
  };
}

/** The control's doors over plain state, so the preview runs without the API. */
function usePreviewControl() {
  const [board, setBoard] = React.useState(initialControl);
  const doors: BoardControlDoors = {
    offsetMs: 0,
    change: (settings) =>
      setBoard((current) => ({
        ...current,
        ...settings,
        ...changeBoardRotation(current, settings, new Date()),
      })),
    setRoundClock: (action) =>
      setBoard((current) => {
        const round = current.status?.round;
        const roundClock = round
          ? changeRoundClock(current.roundClock, action, round, new Date())
          : null;
        return roundClock ? { ...current, roundClock } : current;
      }),
    setMessage: {
      isPending: false,
      mutate: (input, options) => {
        setBoard((current) => {
          const message =
            input.message === undefined
              ? current.message
              : normalizeBoardMessage(input.message);
          return {
            ...current,
            message,
            messageShown:
              message == null ? false : (input.shown ?? current.messageShown),
          };
        });
        options?.onSuccess?.(
          { ok: true },
          input,
          undefined,
          undefined as never,
        );
      },
    },
    disconnectTv: {
      isPending: false,
      mutate: (input) =>
        setBoard((current) => ({
          ...current,
          tvs: current.tvs.filter((tv) => tv.id !== input.tvId),
        })),
    },
    stop: {
      isPending: false,
      mutateAsync: (() =>
        Promise.resolve({
          ok: true,
        })) as unknown as BoardControlDoors["stop"]["mutateAsync"],
    },
  };
  return { board, doors };
}

/** The board and its control, both live: the TV follows the phone beside it. */
function LiveControlPreview() {
  const { board, doors } = usePreviewControl();
  const clock = useBoardNow(0);
  const social = liveBoardPreviews[0]?.snapshot;
  if (!social) {
    return null;
  }
  // The fixture's Round stays at 11:38 left while the rotation runs on the
  // real clock, so the screens turn without the Round running out. A clock
  // run by hand from the control is moved onto the fixture's time.
  const onFixture = (time: Date | null) =>
    time
      ? new Date(PREVIEW_NOW.getTime() - (clock.getTime() - time.getTime()))
      : null;
  const snapshot = {
    ...social,
    settings: {
      ...social.settings,
      rotate: board.rotate,
      rotateSeconds: board.rotateSeconds,
      heldScreen: board.heldScreen,
      rotationStartedAt: new Date(
        PREVIEW_NOW.getTime() -
          (clock.getTime() - board.rotationStartedAt.getTime()),
      ),
      colorScheme: board.colorScheme,
      showQr: board.showQr,
      roundClock: {
        ...board.roundClock,
        startedAt: onFixture(board.roundClock.startedAt),
        runningSince: onFixture(board.roundClock.runningSince),
      },
      message: board.messageShown ? board.message : null,
    },
  };
  return (
    <div className="flex flex-wrap items-start gap-10">
      <div
        className="min-w-[640px] flex-1 space-y-3"
        data-preview-board="2a Live, run by the control"
      >
        <Label>2a The board, run by the control beside it</Label>
        <LiveBoard fill={false} now={PREVIEW_NOW} snapshot={snapshot} />
      </div>
      <Phone title="2b Board control">
        <BoardControlBody
          board={board}
          gameId="preview"
          kind="social"
          live={doors}
          onStopped={() => undefined}
        />
      </Phone>
      <Phone title="1a Show on TV">
        <ShowOnTvPanel board={board} change={doors.change} kind="social" />
      </Phone>
      <Phone title="1b On TV card">
        <OnTvCard board={board} gameId="preview" kind="social" offsetMs={0} />
        <OnTvCard
          board={{ ...board, tvs: [] }}
          gameId="preview"
          kind="social"
          offsetMs={0}
        />
        <OnTvCard
          board={{
            ...board,
            status: { phase: "waiting", screens: [], round: null },
          }}
          gameId="preview"
          kind="social"
          offsetMs={0}
        />
        <OnTvCard
          board={{
            ...board,
            status: { phase: "final", screens: [], round: null },
          }}
          gameId="preview"
          kind="social"
          offsetMs={0}
        />
        <OnTvCard board={board} gameId="preview" kind="football" offsetMs={0} />
      </Phone>
      <Phone title="2b Board control, round 5 not posted">
        <BoardControlBody
          board={{
            ...board,
            status: board.status && {
              ...board.status,
              screens: ["on_court", "table"],
            },
          }}
          gameId="preview"
          kind="social"
          live={doors}
          onStopped={() => undefined}
        />
      </Phone>
      <Phone title="2b Board control, final">
        <BoardControlBody
          board={{
            ...board,
            status: { phase: "final", screens: [], round: null },
          }}
          gameId="preview"
          kind="social"
          live={doors}
          onStopped={() => undefined}
        />
      </Phone>
    </div>
  );
}

export function LiveBoardPreviewStates() {
  return (
    <div className="space-y-10">
      <LiveControlPreview />
      {liveBoardPreviews.map((preview) => (
        <div
          key={preview.title}
          className="space-y-3"
          data-preview-board={preview.title}
        >
          <Label>{preview.title}</Label>
          <LiveBoard
            fill={false}
            now={PREVIEW_NOW}
            snapshot={preview.snapshot}
          />
        </div>
      ))}
    </div>
  );
}
