import type { MarksWindow, MvpMode } from "@repo/domain/marks";

export type GameEditMvp = {
  saved: MvpMode;
  picked: MvpMode;
  /** The mode is fixed once the Match completes, which opens the marks window. */
  editable: boolean;
};

export function gameEditMvp(
  marks: { window: MarksWindow | null; mvp: { mode: MvpMode } } | undefined,
  pick: MvpMode | null,
): GameEditMvp | null {
  if (!marks) {
    return null;
  }
  return {
    saved: marks.mvp.mode,
    picked: pick ?? marks.mvp.mode,
    editable: marks.window === null,
  };
}

export function gameEditMvpChanged(mvp: GameEditMvp | null): boolean {
  return mvp != null && mvp.editable && mvp.picked !== mvp.saved;
}
