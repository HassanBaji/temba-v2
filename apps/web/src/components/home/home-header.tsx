"use client";

import { UserAvatar } from "~/components/common/user-avatar";
import { NotificationBell } from "~/components/notifications/notification-bell";

export function HomeHeader({
  name,
  dateLine,
  image,
}: {
  name: string;
  dateLine: string;
  image?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar
        name={name}
        image={image}
        size="lg"
        className="bg-control text-on-control [&_[data-slot=avatar-fallback]]:bg-control [&_[data-slot=avatar-fallback]]:text-on-control"
      />
      <div className="min-w-0 flex-1">
        <p className="text-eyebrow text-muted-foreground truncate">
          {dateLine}
        </p>
        <p className="font-expanded text-h2 truncate">{name}</p>
      </div>
      <NotificationBell className="rounded-lg lg:hidden" />
    </div>
  );
}
