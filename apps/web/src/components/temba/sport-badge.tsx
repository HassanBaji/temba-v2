"use client";

import { useLocale } from "~/components/locale-provider";
import { SportGlyph } from "~/components/temba/sport-glyph";
import { Badge } from "~/components/ui/badge";
import { sportLabel } from "@repo/domain/sport";

export function SportBadge({ sport }: { sport: string }) {
  const locale = useLocale();
  return (
    <Badge variant="secondary">
      <SportGlyph sport={sport} />
      {sportLabel(sport, locale) ?? sport}
    </Badge>
  );
}
