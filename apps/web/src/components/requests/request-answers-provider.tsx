"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { messagesFor } from "@repo/i18n/messages";
import {
  createRequestAnswerQueue,
  requestDoor,
  requestRows,
  requestTouches,
  type AnsweredRequests,
  type RequestRow,
} from "@repo/domain/request-answers";
import {
  waitingRequestCard,
  type RequestDecision,
  type SeatOutcome,
  type WaitingRequest,
} from "@repo/domain/waiting-requests";
import { useLocale } from "~/components/locale-provider";
import { api } from "~/trpc/react";

type Utils = ReturnType<typeof api.useUtils>;

type RequestAnswersValue = {
  isLoading: boolean;
  error: { message: string } | null;
  refetch: () => void;
  rows: RequestRow[];
  answer: (request: WaitingRequest, decision: RequestDecision) => void;
  approveMany: (requests: readonly WaitingRequest[]) => void;
  undo: (requestId: string) => void;
};

const RequestAnswersContext = createContext<RequestAnswersValue | null>(null);

/** An answer still has to arrive when it is sent as the page is being left. */
const OUTLIVES_PAGE = { context: { keepalive: true } };

async function sendAnswer(
  utils: Utils,
  request: WaitingRequest,
  decision: RequestDecision,
): Promise<SeatOutcome> {
  const input = { requestId: request.id };
  switch (requestDoor(request, decision)) {
    case "approveLevelRange": {
      const result = await utils.client.games.approveLevelRangeRequest.mutate(
        input,
        OUTLIVES_PAGE,
      );
      return result.seated;
    }
    case "rejectLevelRange":
      await utils.client.games.rejectLevelRangeRequest.mutate(
        input,
        OUTLIVES_PAGE,
      );
      return null;
    case "approveJoin": {
      const result = await utils.client.groups.approveJoinRequest.mutate(
        input,
        OUTLIVES_PAGE,
      );
      return result.heldSeat;
    }
    case "rejectJoin":
      await utils.client.groups.rejectJoinRequest.mutate(
        { ...input, block: false },
        OUTLIVES_PAGE,
      );
      return null;
  }
}

function refreshAfterAnswer(utils: Utils, request: WaitingRequest) {
  const { gameId, groupId } = requestTouches(request);
  return Promise.all([
    utils.notifications.waitingRequests.invalidate(),
    utils.notifications.unreadCount.invalidate(),
    ...(gameId
      ? [
          utils.games.byId.invalidate({ id: gameId }),
          utils.users.home.invalidate(),
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
}

/**
 * Answers to waiting requests, shared by every screen that shows one. An
 * answer waits out its Undo window before it is sent, and is sent at once
 * when the page is hidden or the provider unmounts (ADR-0087).
 */
export function RequestAnswersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const utils = api.useUtils();
  const waiting = api.notifications.waitingRequests.useQuery();
  const [answered, setAnswered] = useState<AnsweredRequests>(() => new Map());

  const latest = useRef({ locale, utils });
  latest.current = { locale, utils };

  const [queue] = useState(() =>
    createRequestAnswerQueue<ReturnType<typeof setTimeout>>({
      send: (request, decision) =>
        sendAnswer(latest.current.utils, request, decision),
      refresh: (request) => refreshAfterAnswer(latest.current.utils, request),
      onChange: setAnswered,
      onFailed: (request) => {
        const { locale: current } = latest.current;
        toast.error(
          messagesFor(current).requests.failed(
            waitingRequestCard(request, current).name,
          ),
        );
      },
      setTimer: (run, ms) => setTimeout(run, ms),
      clearTimer: clearTimeout,
      now: Date.now,
    }),
  );

  useEffect(() => {
    const flush = () => queue.flush();
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
      queue.flush();
    };
  }, [queue]);

  const { data, isLoading, error, refetch } = waiting;
  const value = useMemo<RequestAnswersValue>(
    () => ({
      isLoading,
      error,
      refetch: () => void refetch(),
      rows: requestRows(data ?? [], answered),
      answer: (request, decision) => queue.answer([request], decision),
      approveMany: (requests) => queue.answer(requests, "approve"),
      undo: (requestId) => queue.undo(requestId),
    }),
    [data, isLoading, error, refetch, answered, queue],
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
