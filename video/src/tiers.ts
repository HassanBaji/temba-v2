import { players } from "./data";

/**
 * Tier bands as `@repo/domain/tier-bands` cuts them (ADR-0067): the top three
 * ranked members are Sharks (fewer while only two to four are ranked), Hamour
 * the next 15% of the rest, Kanaad the next 35%, Safi everyone else. Mirrored
 * here because the domain module pulls in the i18n catalog.
 */
export type Band = "shark" | "hamour" | "kanaad" | "safi";

export const bandLabel: Record<Band, string> = {
  shark: "Shark",
  hamour: "Hamour",
  kanaad: "Kanaad",
  safi: "Safi",
};

export function bandCounts(ranked: number): Record<Band, number> {
  if (ranked < 2) return { shark: 0, hamour: 0, kanaad: 0, safi: 0 };
  const shark = Math.min(3, ranked - 1);
  const rest = ranked - shark;
  const hamour = Math.round(0.15 * rest);
  const kanaad = Math.round(0.35 * rest);
  return { shark, hamour, kanaad, safi: rest - hamour - kanaad };
}

export type Placed = { index: number; points: number; place: number; band: Band };

/** Places and bands for the ten ranked players, before or after the Game. */
export function placeTable(after: boolean): Placed[] {
  const counts = bandCounts(players.length);
  const order: Band[] = ["shark", "hamour", "kanaad", "safi"];
  const rows = players
    .map((player, index) => ({ index, points: player.points + (after ? player.move : 0) }))
    .sort((a, b) => b.points - a.points);
  return rows.map((row, i) => {
    let last = 0;
    let band: Band = "safi";
    for (const name of order) {
      last += counts[name];
      if (i < last) {
        band = name;
        break;
      }
    }
    return { ...row, place: i + 1, band };
  });
}

export const before = placeTable(false);
export const after = placeTable(true);
export const placeOf = (table: Placed[], index: number) => table.find((row) => row.index === index)!;

/** "1,486", as `formatTierPoints` writes it. */
export const formatPoints = (points: number) => String(Math.round(points)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const averagePoints = (indices: number[]) =>
  indices.reduce((sum, i) => sum + players[i]!.points, 0) / indices.length;
