import { initials } from "@repo/domain/initials";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";

/** The design's 28px ink square with initials, or the User's picture. */
export function PersonMonogram({
  name,
  image,
  className,
}: {
  name: string;
  image?: string | null;
  className?: string;
}) {
  const src = image && image.length > 0 ? image : undefined;

  return (
    <Avatar
      aria-hidden="true"
      className={cn("size-7 rounded-[7px]", className)}
    >
      {src ? <AvatarImage alt="" src={src} className="object-cover" /> : null}
      <AvatarFallback className="bg-ink text-paper rounded-[7px] text-[11px] font-semibold">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
