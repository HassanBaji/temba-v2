import { Badge } from "~/components/ui/badge";

export function LevelBandBadge({ band }: { band: string }) {
  return (
    <Badge variant="outline" aria-label={`Level band ${band}`}>
      {band}
    </Badge>
  );
}
