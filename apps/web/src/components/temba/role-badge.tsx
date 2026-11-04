"use client";

import { useMessages } from "~/components/locale-provider";
import { Badge } from "~/components/ui/badge";

export type RoleValue = "owner" | "admin" | "member";

function isRoleValue(role: string): role is RoleValue {
  return role === "owner" || role === "admin" || role === "member";
}

export function RoleBadge({ role }: { role: string }) {
  const m = useMessages();
  const label = isRoleValue(role) ? m.community.role[role] : role;

  return <Badge variant="outline">{label}</Badge>;
}
