import { Badge } from "~/components/ui/badge";

export const COMMUNITY_TYPE_LABELS = {
  public: "Public",
  private: "Private",
} as const;

export type CommunityTypeValue = keyof typeof COMMUNITY_TYPE_LABELS;

export function CommunityTypeBadge({ type }: { type: string }) {
  const label =
    type in COMMUNITY_TYPE_LABELS
      ? COMMUNITY_TYPE_LABELS[type as CommunityTypeValue]
      : type;

  return <Badge variant="outline">{label}</Badge>;
}
