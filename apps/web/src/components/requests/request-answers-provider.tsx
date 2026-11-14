"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { messagesFor } from "@repo/i18n/messages";
import {
  isSeatRequest,
  REQUEST_UNDO_WINDOW_MS,
  requestRows,
  waitingRequestCard,
  type AnsweredRequest,
  type RequestDecision,
  type RequestRow,
  type WaitingRequest,
} from "@repo/domain/waiting-requests";
import { useLocale } from "~/components/locale-provider";
import { api } from "~/trpc/react";

type Utils = ReturnType<typeof api.useUtils>;

type PendingAnswer = {
  request: WaitingRequest;
  decision: RequestDecision;
  timer: ReturnType<typeof setTimeout>;
};

type RequestAnswersValue = {
  isLoading: boolean;
  error: { message: string } | null;
  refetch: () => void;
  rows: RequestRow[];
  answer: (request: WaitingRequest, decision: RequestDecision) => void;
  answerMany: (requests: readonly WaitingRequest[]) => void;
  undo: (requestId: string) => void;
};

const RequestAnswersContext = createContext<RequestAnswersValue | null>(null);

function sendAnswer(
  utils: Utils,
  request: WaitingRequest,
  decision: RequestDecision,
) {
  const requestId = request.id;
  if (request.kind === "level_range") {
    return decision === "approve"
      ? utils.client.games.approveLevelRangeRequest.mutate({ requestId })
      : utils.client.games.rejectLevelRangeRequest.mutate({ requestId });
  }
  return decision === "approve"
    ? utils.client.groups.approveJoinRequest.mutate({ requestId })
    : utils.client.groups.rejectJoinRequest.mutate({ requestId, block: false });
}

function refreshAfterAnswer(utils: Utils, request: WaitingRequest) {
  const reads: Promise<void>[] = [
    utils.notifications.waitingRequests.invalidate(),
    utils.notifications.unreadCount.invalidate(),
  ];
  if (isSeatRequest(request)) {
    reads.push(
      utils.games.byId.invalidate({ id: request.game.id }),
      utils.users.home.invalidate(),
    );
  }
  if (request.kind !== "level_range") {
    reads.push(
      utils.groups.byId.invalidate({ id: request.group.id }),
      utils.groups.listJoinRequests.invalidate({ groupId: request.group.id }),
      utils.groups.mine.invalidate(),
    );
  }
  return Promise.all(reads);
}

function without<T>(map: ReadonlyMap<string, T>, key: string) {
  const next = new Map(map);
  next.delete(key);
  return next;
}

/**
 * Answers to waiting requests, shared by every screen that shows one. An
 * answer waits `REQUEST_UNDO_WINDOW_MS` with Undo before it is sent, and is
 * sent at once when the page is hidden or the provider unmounts.
 */
export function RequestAnswersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const utils = api.useUtils();
  const waiting = api.notifications.waitingRequests.useQuery();
  const [answered, setAnswered] = useState<
    ReadonlyMap<string, AnsweredRequest>
  >(() => new Map());
  const pending = useRef(new Map<string, PendingAnswer>());

  const commit = useCallback(
    (requestId: string) => {
      const entry = pending.current.get(requestId);
      if (!entry) {
        return;
      }
      pending.current.delete(requestId);
      clearTimeout(entry.timer);
      sendAnswer(utils, entry.request, entry.decision).then(
        () => {
          setAnswered((previous) => {
            const current = previous.get(requestId);
            if (!current) {
              return previous;
            }
            return new Map(previous).set(requestId, {
              ...current,
              answer: { ...current.answer, committed: true },
            });
          });
          void refreshAfterAnswer(utils, entry.request);
        },
        () => {
          setAnswered((previous) => without(previous, requestId));
          const name = waitingRequestCard(
            entry.request,
            localeRef.current,
          ).name;
          toast.error(messagesFor(localeRef.current).requests.failed(name));
          void utils.notifications.waitingRequests.invalidate();
        },
      );
    },
    [utils],
  );

  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    const queue = pending.current;
    const flush = () => {
      for (const requestId of [...queue.keys()]) {
        commitRef.current(requestId);
      }
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      flush();
    };
  }, []);

  const answer = useCallback(
    (request: WaitingRequest, decision: RequestDecision) => {
      if (pending.current.has(request.id)) {
        return;
      }
      const timer = setTimeout(
        () => commitRef.current(request.id),
        REQUEST_UNDO_WINDOW_MS,
      );
      pending.current.set(request.id, { request, decision, timer });
      setAnswered((previous) =>
        new Map(previous).set(request.id, {
          request,
          answer: { decision, committed: false, answeredAt: Date.now() },
        }),
      );
    },
    [],
  );

  const answerMany = useCallback(
    (requests: readonly WaitingRequest[]) => {
      for (const request of requests) {
        answer(request, "approve");
      }
    },
    [answer],
  );

  const undo = useCallback((requestId: string) => {
    const entry = pending.current.get(requestId);
    if (!entry) {
      return;
    }
    clearTimeout(entry.timer);
    pending.current.delete(requestId);
    setAnswered((previous) => without(previous, requestId));
  }, []);

  const { data, isLoading, error, refetch } = waiting;
  const value = useMemo<RequestAnswersValue>(
    () => ({
      isLoading,
      error,
      refetch: () => void refetch(),
      rows: requestRows(data ?? [], answered),
      answer,
      answerMany,
      undo,
    }),
    [data, isLoading, error, refetch, answered, answer, answerMany, undo],
  );

  return (
    <RequestAnswersContext.Provider value={value}>
      {children}
    </RequestAnswersContext.Provider>
  );
}

export function useRequestAnswers() {
  const value = useContext(RequestAnswersContext);
  if (!value) {
    throw new Error("useRequestAnswers needs a RequestAnswersProvider");
  }
  return value;
}
