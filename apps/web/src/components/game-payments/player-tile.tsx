import { initials } from "@repo/domain/initials";

import { cn } from "~/lib/utils";

const SIZE_CLASS = {
  sm: "size-8",
  md: "size-[34px]",
  lg: "size-9",
} as const;

/**
 * The square tile beside a name in the payment lists: the player's photo, or
 * their initials. Ink for the viewer, dashed for a player who owes nothing.
 */
export function PlayerTile({
  name,
  image,
  size = "sm",
  viewer = false,
  dashed = false,
}: {
  name: string;
  image?: string | null;
  size?: keyof typeof SIZE_CLASS;
  viewer?: boolean;
  dashed?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-eyebrow flex shrink-0 items-center justify-center overflow-hidden rounded-[9px] border font-semibold",
        SIZE_CLASS[size],
        viewer
          ? "border-ink bg-ink text-paper"
          : dashed
            ? "border-muted-foreground bg-paper text-ink border-dashed"
            : "border-rule bg-paper text-ink",
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small avatar from the media host, as `AvatarImage` renders it
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
