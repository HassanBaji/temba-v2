/**
 * Football reads the Temba Level as OVR 40 to 99 (ADR-0069): a face of the
 * stored Level, so no Rating row is rewritten.
 */
export const OVR_MIN = 40;
export const OVR_MAX = 99;

const LEVEL_MAX = 7;

export function ovrFromLevel(level: number) {
  return OVR_MIN + ((OVR_MAX - OVR_MIN) * level) / LEVEL_MAX;
}
