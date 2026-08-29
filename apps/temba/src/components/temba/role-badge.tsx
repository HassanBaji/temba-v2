import { Badge } from "~/components/ui/badge";

export const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
} as const;

export type RoleValue = keyof typeof ROLE_LABELS;

export function RoleBadge({ role }: { role: string }) {
  const label = role in ROLE_LABELS ? ROLE_LABELS[role as RoleValue] : role;

  return <Badge variant="outline">{label}</Badge>;
}
