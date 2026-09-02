import { Badge } from "~/components/ui/badge";
import { type LevelBand } from "~/lib/level-bands";
import { cn } from "~/lib/utils";

/** Monochrome D → A ramp: lightest gray for D, black (primary) for A. */
const BAND_GROUP_STYLES: Record<string, string> = {
  D: "bg-gray-100 text-gray-700 border-transparent",
  C: "bg-gray-300 text-gray-800 border-transparent",
  B: "bg-gray-600 text-white border-transparent",
  A: "bg-primary text-primary-foreground border-transparent",
};

export function LevelBandBadge({ band }: { band: LevelBand }) {
  const group = band.charAt(0);
  return (
    <Badge
      variant="outline"
      aria-label={`Level band ${band}`}
      className={cn(BAND_GROUP_STYLES[group])}
    >
      {band}
    </Badge>
  );
}
