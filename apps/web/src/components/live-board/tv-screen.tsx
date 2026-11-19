"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { isNotFoundError } from "@repo/domain/is-not-found-error";

import { useMessages } from "~/components/locale-provider";
import { OWN_ERROR_UI } from "~/trpc/query-client";
import { api } from "~/trpc/react";

import { LiveBoard } from "./live-board";
import { useBoardNow } from "./use-board-now";
import {
  clearTvToken,
  readTvName,
  readTvToken,
  writeTvToken,
} from "./tv-storage";

const SNAPSHOT_EVERY_MS = 5_000;
const FAILURES_BEFORE_NOTICE = 3;

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

/**
 * The board on a TV. It joins with the Board code once, keeps the token it is
 * given, and asks for the board every few seconds; a board that was stopped,
 * closed or taken off this TV sends it back to the code entry.
 */
export function TvScreen({ code }: { code: string }) {
  const m = useMessages().liveBoard.tv;
  const router = useRouter();
  const [token, setToken] = React.useState<string | null>(null);
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
            `/tv?code=${code}&notice=${isNotFoundError(error) ? "not_found" : "failed"}`,
          );
        }
      })
      .finally(() => joining.delete(code));
    return () => {
      cancelled = true;
    };
  }, [code, connectAsync, router]);

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
  const ended = data && data.status !== "live" ? data.status : null;

  React.useEffect(() => {
    if (ended) {
      clearTvToken(code);
      router.replace(`/tv?notice=${ended}`);
    }
  }, [code, ended, router]);

  const offsetMs =
    data?.status === "live"
      ? data.serverNow.getTime() - snapshot.dataUpdatedAt
      : 0;
  const now = useBoardNow(offsetMs);

  if (data?.status !== "live") {
    return (
      <div className="bg-paper text-muted-foreground text-lead dark fixed inset-0 flex items-center justify-center">
        {m.opening}
      </div>
    );
  }
  return (
    <div className="cursor-none">
      <LiveBoard now={now} snapshot={data} />
      {snapshot.failureCount >= FAILURES_BEFORE_NOTICE ? (
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
