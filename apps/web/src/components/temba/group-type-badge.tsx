"use client";

import { useMessages } from "~/components/locale-provider";
import { Badge } from "~/components/ui/badge";

export function GroupTypeBadge({
  isLoose,
  type,
}: {
  isLoose: boolean;
  type?: string | null;
}) {
  const m = useMessages().webUi.groupType;

  const label = isLoose
    ? m.loose
    : type === "public"
      ? m.clubPublic
      : type === "private"
        ? m.clubPrivate
        : m.club;

  return <Badge variant="outline">{label}</Badge>;
}
