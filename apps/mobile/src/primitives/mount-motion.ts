export type MountMotion = {
  from: number;
  to: number;
  durationMs: number;
};

export function mountMotion(options: {
  reducedMotion: boolean;
  durationMs: number;
}): MountMotion {
  if (options.reducedMotion) {
    return { from: 1, to: 1, durationMs: 0 };
  }
  return { from: 0, to: 1, durationMs: options.durationMs };
}
