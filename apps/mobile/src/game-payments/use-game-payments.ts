import { useMessages } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api, type RouterOutputs } from "../trpc/react";

export type GamePaymentsData = RouterOutputs["gamePayments"]["forGame"];
export type TrackedGamePayments = Extract<GamePaymentsData, { tracked: true }>;

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

/** The Game's payments, read only when the Game tracks them. */
export function useGamePayments(gameId: string, tracked: boolean) {
  return api.gamePayments.forGame.useQuery(
    { gameId },
    { ...REFETCH_ON_FOREGROUND, enabled: tracked },
  );
}

export function usePaymentActions(gameId: string) {
  const utils = api.useUtils();
  const toast = useToast();
  const copy = useMessages().gamePayments;
  const refresh = () => utils.gamePayments.forGame.invalidate({ gameId });
  const failure = (error: { message: string }) => toast.show(error.message);
  const options = (message?: string) => ({
    onSuccess: () => {
      if (message) {
        toast.show(message);
      }
    },
    onError: failure,
    onSettled: refresh,
  });

  const claim = api.gamePayments.claim.useMutation(
    options(copy.memberToast.claimed),
  );
  const unclaim = api.gamePayments.unclaim.useMutation(
    options(copy.memberToast.undone),
  );
  const markPaid = api.gamePayments.markPaid.useMutation(options());
  const markNotReceived = api.gamePayments.markNotReceived.useMutation(
    options(copy.organizer.toast.sentBack),
  );
  const undo = api.gamePayments.undo.useMutation(
    options(copy.organizer.toast.undone),
  );
  const confirmAll = api.gamePayments.confirmAll.useMutation({
    onSuccess: (result) =>
      toast.show(copy.organizer.toast.confirmedAll(result.confirmed)),
    onError: failure,
    onSettled: refresh,
  });
  const remind = api.gamePayments.remind.useMutation({
    onSuccess: (result) =>
      toast.show(copy.organizer.toast.reminded(result.reminded)),
    onError: failure,
    onSettled: refresh,
  });

  return {
    toast: (message: string) => toast.show(message),
    claim,
    unclaim,
    markPaid,
    markNotReceived,
    undo,
    confirmAll,
    remind,
    pending:
      claim.isPending ||
      unclaim.isPending ||
      markPaid.isPending ||
      markNotReceived.isPending ||
      undo.isPending ||
      confirmAll.isPending ||
      remind.isPending,
  };
}
