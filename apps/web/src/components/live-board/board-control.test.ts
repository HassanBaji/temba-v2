import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  ROUND_CLOCK_ON_SCHEDULE,
  type LiveBoardRoundClock,
} from "@repo/domain/live-board";

import { BoardControlBody, type BoardControlDoors } from "./board-control";
import type { LiveBoardControlState } from "./use-live-board";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
}));

const NOW = new Date("2026-11-09T09:12:00.000Z");
const ROUND_START = new Date("2026-11-09T09:00:00.000Z");

const DOORS: BoardControlDoors = {
  offsetMs: 0,
  change: () => undefined,
  setRoundClock: () => undefined,
  setMessage: { isPending: false, mutate: () => undefined },
  disconnectTv: { isPending: false, mutate: () => undefined },
  stop: {
    isPending: false,
    mutateAsync: (() =>
      Promise.resolve({
        ok: true,
      })) as unknown as BoardControlDoors["stop"]["mutateAsync"],
  },
};

function board(
  roundClock: LiveBoardRoundClock,
  status: LiveBoardControlState["status"] = {
    phase: "live",
    screens: ["on_court", "table", "next_up"],
    round: {
      roundNumber: 4,
      lengthSeconds: 30 * 60,
      schedule: {
        startsAt: null,
        endsAt: new Date(ROUND_START.getTime() + 30 * 60_000),
      },
    },
  },
): LiveBoardControlState {
  return {
    id: "board",
    code: "482913",
    url: "https://temba.app/tv/482913",
    address: "temba.app/tv",
    rotate: false,
    rotateSeconds: 10,
    heldScreen: "on_court",
    rotationStartedAt: NOW,
    colorScheme: "dark",
    showQr: true,
    roundClock,
    message: null,
    messageShown: false,
    tvs: [],
    status,
    serverNow: NOW,
  };
}

function render(state: LiveBoardControlState) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  try {
    return renderToStaticMarkup(
      createElement(BoardControlBody, {
        board: state,
        gameId: "game",
        kind: "social",
        live: DOORS,
        onStopped: () => undefined,
      }),
    );
  } finally {
    vi.useRealTimers();
  }
}

describe("the board control's Round clock", () => {
  it("follows the schedule until the Organizer takes it, offering Pause and a fresh start", () => {
    const html = render(board(ROUND_CLOCK_ON_SCHEDULE));
    expect(html).toContain("Round clock");
    expect(html).toContain("On schedule");
    expect(html).toContain("18:00");
    expect(html).toContain("left in the round");
    expect(html).toContain("Pause");
    expect(html).toContain("Start round 4");
    expect(html).not.toContain("Resume");
  });

  it("offers Start alone for a Round the Organizer has yet to start", () => {
    const html = render(
      board({ ...ROUND_CLOCK_ON_SCHEDULE, byHand: true, roundNumber: 3 }),
    );
    expect(html).toContain("Not started");
    expect(html).toContain("30:00");
    expect(html).toContain("Start round 4");
    expect(html).not.toContain("Pause");
    expect(html).not.toContain("Start again");
  });

  it("offers Pause while the Organizer's clock runs and Resume once paused", () => {
    const started = new Date(ROUND_START.getTime() + 7 * 60_000);
    const running = render(
      board({
        byHand: true,
        roundNumber: 4,
        startedAt: started,
        runningSince: started,
        elapsedMs: 0,
      }),
    );
    expect(running).toContain("Running");
    expect(running).toContain("25:00");
    expect(running).toContain("Pause");
    expect(running).toContain("Start again");

    const paused = render(
      board({
        byHand: true,
        roundNumber: 4,
        startedAt: started,
        runningSince: null,
        elapsedMs: 3 * 60_000,
      }),
    );
    expect(paused).toContain("Paused");
    expect(paused).toContain("27:00");
    expect(paused).toContain("left, clock paused");
    expect(paused).toContain("Resume");
    expect(paused).not.toContain(">Pause<");
  });

  it("has no Round clock while the Social waits for its Rounds or is over", () => {
    for (const phase of ["waiting", "final"] as const) {
      const html = render(
        board(ROUND_CLOCK_ON_SCHEDULE, { phase, screens: [], round: null }),
      );
      expect(html).not.toContain("Round clock");
    }
  });
});
