import type { FriendlyGameCtaPhase } from "./friendly-game-cta";

export type SurfaceTone = "ink" | "paper";

export function surfaceToneForPhase(phase: FriendlyGameCtaPhase): SurfaceTone {
  return phase === "final" ? "paper" : "ink";
}
