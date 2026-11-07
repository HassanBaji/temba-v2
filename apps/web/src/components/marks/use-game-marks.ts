"use client";

import type { MarkKind } from "@repo/domain/marks";
import * as React from "react";
import { toast } from "sonner";

import { useLocale } from "~/components/locale-provider";
import { api } from "~/trpc/react";

import { markErrorCopy, msUntilMarksClose, mvpErrorCopy } from "./marks-model";

// The server judges the close; a beat after it the read shows the closed state.
const CLOSE_SLACK_MS = 1000;

export type MarksSheetState =
  | { kind: "give" }
  | { kind: "vote" }
  | { kind: "pick" }
  | { kind: "givers"; userId: string };

/**
 * `marks.forGame` for the Game details page, the one sheet that is open, and
 * the write doors. Every write refetches, refused or not, and so does the
 * moment the window closes while the page is open.
 */
export function useGameMarks(gameId: string, enabled = true) {
  const locale = useLocale();
  const utils = api.useUtils();
  const [sheet, setSheet] = React.useState<MarksSheetState | null>(null);
  const query = api.marks.forGame.useQuery(
    { gameId },
    { enabled, refetchOnWindowFocus: true },
  );
  const { data, refetch } = query;

  React.useEffect(() => {
    const due = msUntilMarksClose(data, new Date());
    if (due === null) {
      return undefined;
    }
    const timer = window.setTimeout(() => void refetch(), due + CLOSE_SLACK_MS);
    return () => window.clearTimeout(timer);
  }, [data, refetch]);

  const settle = () => utils.marks.forGame.invalidate({ gameId });
  const markRefused = (error: { message: string }) =>
    toast.error(markErrorCopy(error.message, locale));
  const mvpRefused = (error: { message: string }) =>
    toast.error(mvpErrorCopy(error.message, locale));

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

  async function run(write: () => Promise<unknown>) {
    try {
      await write();
      return true;
    } catch {
      return false;
    }
  }

  return {
    data: enabled ? data : undefined,
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
