"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { initials } from "@repo/domain/initials";
import { cn } from "~/lib/utils";

export function UserAvatar({
  name,
  image,
  size = "default",
  guest = false,
  className,
}: {
  name: string;
  image?: string | null;
  size?: "sm" | "default" | "lg";
  /** A Guest player: a dashed outline, since no account stands behind it. */
  guest?: boolean;
  className?: string;
}) {
  const src = image && image.length > 0 ? image : undefined;

  return (
    <Avatar
      aria-hidden="true"
      size={size}
      className={cn(
        guest &&
          "[&_[data-slot=avatar-fallback]]:border-ink [&_[data-slot=avatar-fallback]]:bg-paper [&_[data-slot=avatar-fallback]]:border [&_[data-slot=avatar-fallback]]:border-dashed",
        className,
      )}
    >
      {src ? <AvatarImage alt="" src={src} /> : null}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
