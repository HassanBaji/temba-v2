import { useEffect, useState } from "react";

/**
 * What the viewer of a live pick has chosen and not yet sent: the player
 * tapped in the pool, and an Organizer having said they pick for the
 * captain on turn. Both clear when the pick to come changes.
 */
export function usePickChoice(nextPick: number | null) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pickingFor, setPickingFor] = useState(false);

  useEffect(() => {
    setSelected(null);
    setPickingFor(false);
  }, [nextPick]);

  return {
    selected,
    select: setSelected,
    pickingFor,
    pickFor: () => setPickingFor(true),
    cancel: () => {
      setPickingFor(false);
      setSelected(null);
    },
  };
}

export type PickChoice = ReturnType<typeof usePickChoice>;
