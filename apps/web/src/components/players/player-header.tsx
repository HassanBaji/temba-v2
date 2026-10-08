"use client";

import { useRouter } from "next/navigation";

import { UserAvatar } from "~/components/common/user-avatar";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Surface } from "~/components/ui/surface";
import type { PlayerLevelCardView } from "@repo/domain/player-profile-level";

import { PlayerLevelCard } from "./player-level-card";

export function PlayerBackButton({ surface }: { surface: "ink" | "paper" }) {
  const router = useRouter();
  return (
    <BackButton
      variant="boxed"
      surface={surface}
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/dashboard");
        }
      }}
    />
  );
}

export function PlayerHeader({
  name,
  image,
  subtitle,
  level,
}: {
  name: string;
  image: string | null;
  subtitle: string;
  level: PlayerLevelCardView;
}) {
  return (
    <Surface as="header" tone="ink" radius="surface" className="p-5">
      <PlayerBackButton surface="ink" />
      <div className="mt-5 flex items-center gap-4">
        <UserAvatar
          name={name}
          image={image}
          className="size-16 text-[20px] font-semibold data-[size=default]:size-16 [&_[data-slot=avatar-fallback]]:text-[20px]"
        />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-[22px] font-bold tracking-[-0.01em]">
            {name}
          </h1>
          <p className="text-meta text-dim mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5">
        <PlayerLevelCard view={level} />
      </div>
    </Surface>
  );
}
