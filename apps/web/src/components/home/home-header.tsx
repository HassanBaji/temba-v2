"use client";

import { UserAvatar } from "~/components/common/user-avatar";
import { NotificationBell } from "~/components/notifications/notification-bell";

export function HomeHeader({
  name,
  image,
}: {
  name: string;
  image?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar
        name={name}
        image={image}
        size="lg"
        className="bg-ink text-paper [&_[data-slot=avatar-fallback]]:bg-ink [&_[data-slot=avatar-fallback]]:text-paper"
      />
      <p className="font-expanded text-h2 min-w-0 flex-1 truncate">{name}</p>
      <NotificationBell className="lg:hidden" />
    </div>
  );
}
