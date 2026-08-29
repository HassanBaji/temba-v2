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
  size = "default",
  surface = "background",
  className,
}: {
  people: AvatarStackPerson[];
  size?: "sm" | "default" | "lg";
  surface?: "background" | "raised";
  className?: string;
}) {
  const visible = people.slice(0, VISIBLE_COUNT);
  const overflow = people.length - visible.length;
  const ringClass =
    surface === "raised"
      ? "*:data-[slot=avatar]:ring-surface-raised"
      : "*:data-[slot=avatar]:ring-background";

  return (
    <AvatarGroup
      aria-label={`${people.length} ${people.length === 1 ? "person" : "people"}`}
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
