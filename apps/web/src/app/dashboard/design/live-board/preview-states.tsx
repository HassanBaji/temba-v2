"use client";

import * as React from "react";

import { normalizeBoardMessage } from "@repo/domain/live-board";

import {
  BoardControlBody,
  type BoardControlDoors,
} from "~/components/live-board/board-control";
import { LiveBoard } from "~/components/live-board/live-board";
import { OnTvCard } from "~/components/live-board/on-tv-card";
import { ShowOnTvPanel } from "~/components/live-board/show-on-tv-sheet";
import { useBoardNow } from "~/components/live-board/use-board-now";
import type { LiveBoardControlState } from "~/components/live-board/use-live-board";

import { liveBoardPreviews, PREVIEW_NOW } from "./fixtures";

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
    theme: "dark",
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
        rotate:
          settings.rotate ?? (settings.heldScreen ? false : current.rotate),
        rotationStartedAt:
          settings.rotate !== undefined ||
          settings.rotateSeconds !== undefined ||
          settings.heldScreen !== undefined
            ? new Date()
            : current.rotationStartedAt,
      })),
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
  // real clock, so the screens turn without the Round running out.
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
      theme: board.theme,
      showQr: board.showQr,
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
