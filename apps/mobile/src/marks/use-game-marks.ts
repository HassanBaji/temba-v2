import type { MarkKind } from "@repo/domain/marks";
import { useCallback, useEffect, useState } from "react";

import { useLocale } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { markErrorCopy, msUntilMarksClose, mvpErrorCopy } from "./marks-model";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
// The server judges the close; a beat after it the read shows the closed state.
const CLOSE_SLACK_MS = 1000;

export type MarksSheet =
  | { kind: "give" }
  | { kind: "vote" }
  | { kind: "pick" }
  | { kind: "givers"; userId: string };

/**
 * `marks.forGame` for the Played game screen, the one sheet that is open,
 * and the write doors. Every write refetches, refused or not, and so does
 * the moment the window closes while the screen is open.
 */
export function useGameMarks(gameId: string, enabled = true) {
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const [sheet, setSheet] = useState<MarksSheet | null>(null);
  const query = api.marks.forGame.useQuery(
    { gameId },
    { ...REFETCH_ON_FOREGROUND, enabled },
  );
  const { data, refetch } = query;

  useEffect(() => {
    const due = msUntilMarksClose(data, new Date());
    if (due === null) {
      return undefined;
    }
    const timer = setTimeout(() => void refetch(), due + CLOSE_SLACK_MS);
    return () => clearTimeout(timer);
  }, [data, refetch]);

  const settle = () => utils.marks.forGame.invalidate({ gameId });
  const markRefused = (error: { message: string }) =>
    toast.show(markErrorCopy(error.message, locale));
  const mvpRefused = (error: { message: string }) =>
    toast.show(mvpErrorCopy(error.message, locale));

  const giveMutation = api.marks.give.useMutation({
    onError: markRefused,
    onSettled: settle,
  });
  const retractMutation = api.marks.retract.useMutation({
    onError: markRefused,
    onSettled: settle,
  });
  const voteMutation = api.marks.castMvpVote.useMutation({
    onError: mvpRefused,
    onSettled: settle,
  });
  const pickMutation = api.marks.setMvp.useMutation({
    onError: mvpRefused,
    onSettled: settle,
  });

  const run = useCallback(async (write: () => Promise<unknown>) => {
    try {
      await write();
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    data,
    refetch,
    sheet,
    openSheet: setSheet,
    closeSheet: () => setSheet(null),
    give: (receiverUserId: string, kind: MarkKind) =>
      run(() => giveMutation.mutateAsync({ gameId, receiverUserId, kind })),
    retract: (receiverUserId: string) =>
      run(() => retractMutation.mutateAsync({ gameId, receiverUserId })),
    vote: (candidateUserId: string) =>
      run(() => voteMutation.mutateAsync({ gameId, candidateUserId })),
    pick: (userId: string) =>
      run(() => pickMutation.mutateAsync({ gameId, userId })),
    pending:
      giveMutation.isPending ||
      retractMutation.isPending ||
      voteMutation.isPending ||
      pickMutation.isPending,
  };
}

export type GameMarksController = ReturnType<typeof useGameMarks>;
