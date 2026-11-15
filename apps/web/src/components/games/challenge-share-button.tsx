"use client";

import type { SurfaceTone } from "@repo/domain/surface-tone";
import { Share } from "lucide-react";

import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/** The boxed share in a football Challenge Game's hero: the Game page, since a Challenge Game takes no invites. */
export function ChallengeShareButton({
  onShare,
  tone,
}: {
  onShare: () => void;
  tone: SurfaceTone;
}) {
  const m = useMessages();
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={m.webDashboard.game.shareGame}
      className={cn(
        "rounded-md",
        tone === "ink"
          ? "border-dimrule bg-raised text-on-focus hover:bg-raised/80 hover:text-on-focus border"
          : "border-rule text-ink border",
      )}
      onClick={onShare}
    >
      <Share aria-hidden="true" className="size-[18px]" />
    </Button>
  );
}
