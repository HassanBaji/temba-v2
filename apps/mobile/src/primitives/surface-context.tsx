import type { SurfaceTone } from "@repo/domain/surface-tone";
import { createContext, useContext } from "react";

import type { InkRegistry } from "./ink-registry";
import { tonePalette } from "./tone-palette";

export const SurfaceToneContext = createContext<SurfaceTone>("paper");
export const InkRegistryContext = createContext<InkRegistry | null>(null);

export function useSurfaceTone(): SurfaceTone {
  return useContext(SurfaceToneContext);
}

export function useTonePalette() {
  return tonePalette(useSurfaceTone());
}
