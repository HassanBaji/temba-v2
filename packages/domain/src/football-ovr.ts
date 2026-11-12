import { clampLevel, levelFromMu, muFromLevel } from "./level";
import type { Sport } from "./sport";

/**
 * Football reads the Temba Level as OVR 40 to 99 (ADR-0069): a face of the
 * stored Level, so no Rating row is rewritten.
 */
export const OVR_MIN = 40;
export const OVR_MAX = 99;

const LEVEL_MAX = 7;

/** How a sport shows its Level: padel as the 0.0 to 7.0 Level, football as OVR. */
export type LevelFace = "level" | "ovr";

export function levelFaceFor(sport: Sport): LevelFace {
  return sport === "football" ? "ovr" : "level";
}

function clampOvr(ovr: number) {
  return Math.min(OVR_MAX, Math.max(OVR_MIN, ovr));
}

export function ovrFromLevel(level: number) {
  return OVR_MIN + ((OVR_MAX - OVR_MIN) * clampLevel(level)) / LEVEL_MAX;
}

export function levelFromOvr(ovr: number) {
  return ((clampOvr(ovr) - OVR_MIN) * LEVEL_MAX) / (OVR_MAX - OVR_MIN);
}

export function ovrFromMu(mu: number) {
  return ovrFromLevel(levelFromMu(mu));
}

export function muFromOvr(ovr: number) {
  return muFromLevel(levelFromOvr(ovr));
}

/** OVR is always shown as a whole number. */
export function formatOvr(ovr: number) {
  return String(Math.round(clampOvr(ovr)));
}
