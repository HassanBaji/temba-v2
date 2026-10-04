import { GAME_TOAST } from "@repo/domain/game-copy";

export type DrawStep = "drawn" | "posted" | "undone";

const POOL_TOASTS: Record<DrawStep, string> = {
  drawn: GAME_TOAST.poolsDrawn,
  posted: GAME_TOAST.poolDrawPosted,
  undone: GAME_TOAST.poolDrawUndone,
};

const KNOCKOUT_TOASTS: Record<DrawStep, string> = {
  drawn: GAME_TOAST.knockoutDrawn,
  posted: GAME_TOAST.knockoutDrawPosted,
  undone: GAME_TOAST.knockoutDrawUndone,
};

export function drawToast(step: DrawStep, knockoutOnly: boolean) {
  return (knockoutOnly ? KNOCKOUT_TOASTS : POOL_TOASTS)[step];
}
