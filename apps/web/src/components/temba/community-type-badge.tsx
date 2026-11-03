"use client";

import type { Messages } from "@repo/i18n/messages";
import { useMessages } from "~/components/locale-provider";
import { Badge } from "~/components/ui/badge";

export type CommunityTypeValue = "public" | "private";

export function communityTypeLabel(type: string, m: Messages) {
  return type === "public" || type === "private" ? m.community.type[type] : type;
}

export function CommunityTypeBadge({ type }: { type: string }) {
  const m = useMessages();

  return <Badge variant="outline">{communityTypeLabel(type, m)}</Badge>;
}
