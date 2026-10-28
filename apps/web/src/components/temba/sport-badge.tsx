import { SportGlyph } from "~/components/temba/sport-glyph";
import { Badge } from "~/components/ui/badge";
import { sportLabel } from "@repo/domain/sport";

export function SportBadge({ sport }: { sport: string }) {
  return (
    <Badge variant="secondary">
      <SportGlyph sport={sport} />
      {sportLabel(sport) ?? sport}
    </Badge>
  );
}
