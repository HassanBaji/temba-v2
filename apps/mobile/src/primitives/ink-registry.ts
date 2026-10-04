export type InkRegistry = {
  register: () => () => void;
};

export function createInkRegistry(
  warn: (message: string) => void,
): InkRegistry {
  let count = 0;
  return {
    register() {
      count += 1;
      if (count > 1) {
        warn(
          'A Screen has more than one Surface tone="ink". Ink marks the one upcoming focus; use tone="paper" for everything else.',
        );
      }
      let released = false;
      return () => {
        if (!released) {
          released = true;
          count -= 1;
        }
      };
    },
  };
}
