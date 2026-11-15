import {
  canUndoAnswer,
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
import { messagesFor } from "@repo/i18n/messages";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { useLocale } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

type Utils = ReturnType<typeof api.useUtils>;

export type RequestAnswersStatus =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export type RequestAnswers = {
  status: RequestAnswersStatus;
  rows: RequestRow[];
  answer: (request: WaitingRequest, decision: RequestDecision) => void;
  approveMany: (requests: readonly WaitingRequest[]) => void;
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

async function sendAnswer(
  utils: Utils,
  request: WaitingRequest,
  decision: RequestDecision,
): Promise<SeatOutcome> {
  const input = { requestId: request.id };
  switch (requestDoor(request, decision)) {
    case "approveLevelRange":
      return (await utils.client.games.approveLevelRangeRequest.mutate(input))
        .seated;
    case "rejectLevelRange":
      await utils.client.games.rejectLevelRangeRequest.mutate(input);
      return null;
    case "approveJoin":
      return (await utils.client.groups.approveJoinRequest.mutate(input))
        .heldSeat;
    case "rejectJoin":
      await utils.client.groups.rejectJoinRequest.mutate({
        ...input,
        block: false,
      });
      return null;
  }
}

function refreshAfterAnswer(utils: Utils, request: WaitingRequest) {
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
}

/**
 * Requests answered in this session, shared by every screen that shows them.
 * An answer waits out its Undo window before it is sent, and is sent at once
 * when the App goes to the background or the provider unmounts (ADR-0087).
 */
export function RequestAnswersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const query = api.notifications.waitingRequests.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const [answered, setAnswered] = useState<AnsweredRequests>(() => new Map());

  const latest = useRef({ locale, toast, utils });
  latest.current = { locale, toast, utils };

  const [queue] = useState(() =>
    createRequestAnswerQueue<ReturnType<typeof setTimeout>>({
      send: (request, decision) =>
        sendAnswer(latest.current.utils, request, decision),
      refresh: (request) => refreshAfterAnswer(latest.current.utils, request),
      onChange: setAnswered,
      onFailed: (request) => {
        const current = latest.current;
        current.toast.show(
          messagesFor(current.locale).requests.failed(
            waitingRequestCard(request, current.locale).name,
          ),
        );
      },
      setTimer: (run, ms) => setTimeout(run, ms),
      clearTimer: clearTimeout,
      now: Date.now,
    }),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "background") {
        queue.flush();
      }
    });
    return () => {
      subscription.remove();
      queue.flush();
    };
  }, [queue]);

  const serverList = query.data;
  const rows = useMemo(
    () => requestRows(serverList ?? [], answered),
    [serverList, answered],
  );

  const errorMessage = serverList ? null : (query.error?.message ?? null);
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
      answer: (request, decision) => queue.answer([request], decision),
      approveMany: (requests) => queue.answer(requests, "approve"),
      undo: queue.undo,
      canUndo: (row) => canUndoAnswer(row.answer),
      refetch,
    }),
    [status, rows, queue, refetch],
  );

  return (
    <RequestAnswersContext.Provider value={value}>
      {children}
    </RequestAnswersContext.Provider>
  );
}
