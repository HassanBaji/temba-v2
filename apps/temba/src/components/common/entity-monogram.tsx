"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { initials } from "~/lib/initials";
import { cn } from "~/lib/utils";

export function EntityMonogram({
  name,
  image,
  size = "default",
}: {
  name: string;
  image?: string | null;
  size?: "sm" | "default" | "lg";
}) {
  const src = image && image.length > 0 ? image : undefined;

  return (
    <Avatar aria-hidden="true" size={size} className={cn("rounded-lg")}>
      {src ? <AvatarImage alt="" src={src} /> : null}
      <AvatarFallback className="rounded-lg">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
