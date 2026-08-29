import { Badge } from "~/components/ui/badge";

export function GroupTypeBadge({
  isLoose,
  type,
}: {
  isLoose: boolean;
  type?: string | null;
}) {
  const join =
    type === "public" ? "Public" : type === "private" ? "Private" : null;

  const label = isLoose
    ? "Group outside a Community"
    : join
      ? `Club Group ${join}`
      : "Club Group";

  return <Badge variant="outline">{label}</Badge>;
}
