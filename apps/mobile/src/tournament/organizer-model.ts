import { gameToast } from "@repo/domain/game-copy";
import type { Locale } from "@repo/i18n/locale";

export type DrawStep = "drawn" | "posted" | "undone";

export function drawToast(step: DrawStep, knockoutOnly: boolean, locale: Locale) {
  const toast = gameToast(locale);
  const poolToasts: Record<DrawStep, string> = {
    drawn: toast.poolsDrawn,
    posted: toast.poolDrawPosted,
    undone: toast.poolDrawUndone,
  };
  const knockoutToasts: Record<DrawStep, string> = {
    drawn: toast.knockoutDrawn,
    posted: toast.knockoutDrawPosted,
    undone: toast.knockoutDrawUndone,
  };
  return (knockoutOnly ? knockoutToasts : poolToasts)[step];
}
