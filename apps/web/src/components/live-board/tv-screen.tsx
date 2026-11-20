"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { isNotFoundError } from "@repo/domain/is-not-found-error";

import { useMessages } from "~/components/locale-provider";
import { OWN_ERROR_UI } from "~/trpc/query-client";
import { tvEntryHref } from "~/lib/tv-paths";
import { api } from "~/trpc/react";

import type { LiveBoardSnapshot } from "./board-kit";
import { isBoardStale } from "./board-layout";
import { LiveBoard } from "./live-board";
import { useBoardNow } from "./use-board-now";
import {
  clearTvToken,
  readTvName,
  readTvToken,
  writeTvToken,
} from "./tv-storage";

const SNAPSHOT_EVERY_MS = 5_000;

/** A second mount of the same page must not join the board as a second TV. */
const joining = new Map<string, Promise<string>>();

/** Keeps a TV or a laptop on HDMI from dimming while the board is up. */
function useStayAwake() {
  React.useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      if (
        document.visibilityState !== "visible" ||
        !("wakeLock" in navigator)
      ) {
        return;
      }
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          lock = sentinel;
        })
        .catch(() => undefined);
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      document.removeEventListener("visibilitychange", request);
      void lock?.release();
    };
  }, []);
}

/** A TV that keeps losing its place stops trying and asks for the code again. */
const REJOINS_BEFORE_GIVING_UP = 3;

type ShownBoard = {
  snapshot: LiveBoardSnapshot;
  /** This device's clock when the snapshot arrived. */
  receivedAt: number;
  offsetMs: number;
};

/**
 * The board on a TV. It joins with the Board code once, keeps the token it is
 * given, and asks for the board every few seconds. A board that was stopped,
 * closed or taken off this TV sends it back to the code entry; a TV that was
 * only away too long joins again without anyone noticing.
 */
export function TvScreen({ code }: { code: string }) {
  const m = useMessages().liveBoard.tv;
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const rejoins = React.useRef(0);
  const [shown, setShown] = React.useState<ShownBoard | null>(null);
  const connect = api.liveBoards.connect.useMutation({ meta: OWN_ERROR_UI });
  const connectAsync = connect.mutateAsync;
  useStayAwake();

  React.useEffect(() => {
    const stored = readTvToken(code);
    if (stored) {
      setToken(stored);
      return;
    }
    let cancelled = false;
    const pending =
      joining.get(code) ??
      connectAsync({ code, name: readTvName() || undefined }).then(
        (result) => result.token,
      );
    joining.set(code, pending);
    pending
      .then((joined) => {
        writeTvToken(code, joined);
        if (!cancelled) {
          setToken(joined);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          router.replace(
            tvEntryHref({
              code,
              notice: isNotFoundError(error) ? "not_found" : "failed",
            }),
          );
        }
      })
      .finally(() => joining.delete(code));
    return () => {
      cancelled = true;
    };
  }, [attempt, code, connectAsync, router]);

  const snapshot = api.liveBoards.snapshot.useQuery(
    { token: token ?? "" },
    {
      enabled: token != null,
      refetchInterval: SNAPSHOT_EVERY_MS,
      refetchIntervalInBackground: true,
      staleTime: 0,
      gcTime: Infinity,
      retry: false,
    },
  );
  const data = snapshot.data;
  const receivedAt = snapshot.dataUpdatedAt;

  React.useEffect(() => {
    if (!data) {
      return;
    }
    if (data.status === "live") {
      rejoins.current = 0;
      setShown({
        snapshot: data,
        receivedAt,
        offsetMs: data.serverNow.getTime() - receivedAt,
      });
      return;
    }
    clearTvToken(code);
    if (
      data.status === "expired" &&
      rejoins.current < REJOINS_BEFORE_GIVING_UP
    ) {
      rejoins.current += 1;
      setToken(null);
      setAttempt((count) => count + 1);
      return;
    }
    router.replace(
      tvEntryHref({
        notice: data.status === "expired" ? "disconnected" : data.status,
      }),
    );
  }, [code, data, receivedAt, router]);

  const now = useBoardNow(shown?.offsetMs ?? 0);

  if (!shown) {
    return (
      <div className="bg-paper text-muted-foreground text-lead dark fixed inset-0 flex items-center justify-center">
        {m.opening}
      </div>
    );
  }
  const deviceNow = now.getTime() - shown.offsetMs;
  return (
    <div className="cursor-none">
      <LiveBoard now={now} snapshot={shown.snapshot} />
      {isBoardStale(shown.receivedAt, deviceNow) ? (
        <div
          className="bg-focus text-on-focus border-dimrule text-meta dark fixed bottom-4 start-4 rounded-md border px-3 py-1.5"
          role="status"
        >
          {m.offline}
        </div>
      ) : null}
    </div>
  );
}
