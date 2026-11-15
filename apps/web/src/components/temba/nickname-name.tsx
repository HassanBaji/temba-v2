import { Tag } from "lucide-react";

import { cn } from "~/lib/utils";

/**
 * A member's name on a Group list. A Member nickname carries the tag icon, so
 * it never reads as the player's Temba name.
 */
export function NicknameName({
  name,
  isNickname,
  className,
}: {
  name: string;
  isNickname: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1", className)}>
      {isNickname ? (
        <Tag aria-hidden="true" className="size-[0.85em] shrink-0" />
      ) : null}
      <span dir="auto" className="truncate">
        {name}
      </span>
    </span>
  );
}
