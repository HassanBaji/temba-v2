"use client";

import { UserAvatar } from "~/components/common/user-avatar";
import { AvatarGroup, AvatarGroupCount } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";

const VISIBLE_COUNT = 4;

export type AvatarStackPerson = {
  name: string;
  image?: string | null;
};

export function AvatarStack({
  people,
  openSeats = 0,
  size = "default",
  surface = "background",
  className,
}: {
  people: AvatarStackPerson[];
  openSeats?: number;
  size?: "sm" | "default" | "lg";
  surface?: "background" | "raised";
  className?: string;
}) {
  const visible = people.slice(0, VISIBLE_COUNT);
  const overflow = people.length - visible.length;
  const total = people.length + openSeats;
  const ringClass =
    surface === "raised"
      ? "*:data-[slot=avatar]:ring-surface-raised"
      : "*:data-[slot=avatar]:ring-background";
  const placeholderSize =
    size === "lg" ? "size-10" : size === "sm" ? "size-6" : "size-8";
  const placeholderRing =
    surface === "raised" ? "ring-surface-raised" : "ring-background";

  return (
    <AvatarGroup
      aria-label={`${total} ${total === 1 ? "person" : "people"}`}
      className={cn(ringClass, className)}
    >
      {visible.map((person, index) => (
        <UserAvatar
          key={`${person.name}-${index}`}
          name={person.name}
          image={person.image}
          size={size}
        />
      ))}
      {openSeats > 0
        ? Array.from({ length: openSeats }).map((_, index) => (
            <span
              key={`open-${index}`}
              aria-hidden="true"
              className={cn(
                "border-muted-foreground/50 bg-background shrink-0 rounded-full border-2 border-dashed ring-2",
                placeholderSize,
                placeholderRing,
              )}
            />
          ))
        : null}
      {overflow > 0 ? (
        <AvatarGroupCount
          className={
            surface === "raised" ? "ring-surface-raised" : "ring-background"
          }
        >
          +{overflow}
        </AvatarGroupCount>
      ) : null}
    </AvatarGroup>
  );
}
