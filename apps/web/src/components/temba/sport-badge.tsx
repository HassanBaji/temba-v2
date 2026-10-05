import { Badge } from "~/components/ui/badge";

export const SPORT_LABELS = {
  padel: "Padel",
  football: "Football",
} as const;

export type SportValue = keyof typeof SPORT_LABELS;

export function SportBadge({ sport }: { sport: string }) {
  const label =
    sport in SPORT_LABELS ? SPORT_LABELS[sport as SportValue] : sport;

  return <Badge variant="secondary">{label}</Badge>;
}
