import {
  REQUEST_UNDO_WINDOW_MS,
  requestRows,
  waitingRequestCard,
  type RequestDecision,
  type RequestRow,
  type WaitingRequest,
} from "@repo/domain/waiting-requests";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import {
  canUndoAnswer,
  requestMutation,
  requestTouches,
  unsentAnswerIds,
  withAnswer,
  withCommitted,
  withoutAnswer,
  type AnsweredMap,
} from "./request-answers-model";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export type RequestAnswersStatus =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export type RequestAnswers = {
  status: RequestAnswersStatus;
  rows: RequestRow[];
  answer: (request: WaitingRequest, decision: RequestDecision) => void;
  answerMany: (requests: readonly WaitingRequest[]) => void;
  undo: (requestId: string) => void;
  canUndo: (row: RequestRow) => boolean;
  refetch: () => Promise<unknown>;
};

const RequestAnswersContext = createContext<RequestAnswers | null>(null);

export function useRequestAnswers(): RequestAnswers {
  const answers = useContext(RequestAnswersContext);
  if (!answers) {
    throw new Error(
      "useRequestAnswers needs a RequestAnswersProvider above it.",
    );
  }
  return answers;
}

/**
 * Requests answered in this session, shared by every screen that shows them.
 * An answer waits out its Undo window before it is sent, and is sent at once
 * when the App goes to the background or the provider unmounts.
 */
export function RequestAnswersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const m = useMessages();
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const query = api.notifications.waitingRequests.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );

  const [answered, setAnswered] = useState<AnsweredMap>(() => new Map());
  const [sending, setSending] = useState<ReadonlySet<string>>(() => new Set());
  const answeredRef = useRef(answered);
  const sendingRef = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const update = useCallback(
    (change: (current: AnsweredMap) => AnsweredMap) => {
      const next = change(answeredRef.current);
      answeredRef.current = next;
      setAnswered(next);
    },
    [],
  );

  const markSending = useCallback((requestId: string, on: boolean) => {
    if (on) {
      sendingRef.current.add(requestId);
    } else {
      sendingRef.current.delete(requestId);
    }
    setSending(new Set(sendingRef.current));
  }, []);

  const clearTimer = useCallback((requestId: string) => {
    const timer = timers.current.get(requestId);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(requestId);
    }
  }, []);

  const refreshAfter = useCallback(
    (request: WaitingRequest) => {
      const { gameId, groupId } = requestTouches(request);
      return Promise.all([
        utils.notifications.waitingRequests.invalidate(),
        utils.notifications.unreadCount.invalidate(),
        utils.notifications.list.invalidate(),
        utils.users.home.invalidate(),
        ...(gameId
          ? [
              utils.games.byId.invalidate({ id: gameId }),
              utils.games.footballBoard.invalidate({ gameId }),
            ]
          : []),
        ...(groupId
          ? [
              utils.groups.byId.invalidate({ id: groupId }),
              utils.groups.listJoinRequests.invalidate({ groupId }),
              utils.groups.mine.invalidate(),
            ]
          : []),
      ]);
    },
    [utils],
  );

  const send = useCallback(
    async (requestId: string) => {
      const entry = answeredRef.current.get(requestId);
      if (
        !entry ||
        entry.answer.committed ||
        sendingRef.current.has(requestId)
      ) {
        return false;
      }
      clearTimer(requestId);
      markSending(requestId, true);
      const { request } = entry;
      const input = { requestId };
      try {
        switch (requestMutation(request, entry.answer.decision)) {
          case "approveLevelRange":
            await utils.client.games.approveLevelRangeRequest.mutate(input);
            break;
          case "rejectLevelRange":
            await utils.client.games.rejectLevelRangeRequest.mutate(input);
            break;
          case "approveJoin":
            await utils.client.groups.approveJoinRequest.mutate(input);
            break;
          case "rejectJoin":
            await utils.client.groups.rejectJoinRequest.mutate({
              ...input,
              block: false,
            });
            break;
        }
        update((current) => withCommitted(current, requestId));
        return true;
      } catch {
        update((current) => withoutAnswer(current, requestId));
        toast.show(m.requests.failed(waitingRequestCard(request, locale).name));
        return false;
      } finally {
        markSending(requestId, false);
        void refreshAfter(request);
      }
    },
    [clearTimer, markSending, update, utils, toast, m, locale, refreshAfter],
  );

  const sendRef = useRef(send);
  sendRef.current = send;

  const flush = useCallback(() => {
    for (const requestId of unsentAnswerIds(
      answeredRef.current,
      sendingRef.current,
    )) {
      void sendRef.current(requestId);
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "background") {
        flush();
      }
    });
    return () => {
      subscription.remove();
      flush();
    };
  }, [flush]);

  const answerMany = useCallback(
    (requests: readonly WaitingRequest[], decision: RequestDecision) => {
      const now = Date.now();
      const fresh = requests.filter(
        (request) => !answeredRef.current.has(request.id),
      );
      update((current) =>
        fresh.reduce(
          (next, request) => withAnswer(next, request, decision, now),
          current,
        ),
      );
      for (const request of fresh) {
        timers.current.set(
          request.id,
          setTimeout(() => {
            timers.current.delete(request.id);
            void sendRef.current(request.id);
          }, REQUEST_UNDO_WINDOW_MS),
        );
      }
    },
    [update],
  );

  const undo = useCallback(
    (requestId: string) => {
      const entry = answeredRef.current.get(requestId);
      if (
        !entry ||
        !canUndoAnswer(requestId, entry.answer, sendingRef.current)
      ) {
        return;
      }
      clearTimer(requestId);
      update((current) => withoutAnswer(current, requestId));
    },
    [clearTimer, update],
  );

  const serverList = query.data;
  const rows = useMemo(
    () => requestRows(serverList ?? [], answered),
    [serverList, answered],
  );

  const errorMessage = query.data ? null : (query.error?.message ?? null);
  const status = useMemo<RequestAnswersStatus>(
    () =>
      serverList
        ? { kind: "ready" }
        : errorMessage != null
          ? { kind: "error", message: errorMessage }
          : { kind: "loading" },
    [serverList, errorMessage],
  );

  const { refetch } = query;
  const value = useMemo<RequestAnswers>(
    () => ({
      status,
      rows,
      answer: (request, decision) => answerMany([request], decision),
      answerMany: (requests) => answerMany(requests, "approve"),
      undo,
      canUndo: (row) => canUndoAnswer(row.request.id, row.answer, sending),
      refetch,
    }),
    [status, rows, answerMany, undo, sending, refetch],
  );

  return (
    <RequestAnswersContext.Provider value={value}>
      {children}
    </RequestAnswersContext.Provider>
  );
}
