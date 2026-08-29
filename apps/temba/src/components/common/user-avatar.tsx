"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { initials } from "~/lib/initials";

export function UserAvatar({
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
    <Avatar aria-hidden="true" size={size}>
      {src ? <AvatarImage alt="" src={src} /> : null}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
