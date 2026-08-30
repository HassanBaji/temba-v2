import { Badge } from "~/components/ui/badge";
import { type LevelBand } from "~/lib/level-bands";

export function LevelBandBadge({ band }: { band: LevelBand }) {
  return (
    <Badge variant="outline" aria-label={`Level band ${band}`}>
      {band}
    </Badge>
  );
}
