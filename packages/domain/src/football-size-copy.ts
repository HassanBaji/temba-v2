import { sideSizeLabel } from "./game-shape";

export function footballSizeLabel(sideSize: number, playersAllowed: number) {
  return `${sideSizeLabel(sideSize)} · ${playersAllowed} players`;
}
