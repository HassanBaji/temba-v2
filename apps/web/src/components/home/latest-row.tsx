"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { MarkCoin } from "~/components/marks/mark-coin";
import type { LatestMark } from "@repo/domain/home-latest";

/** The newest thing that happened to the User; it opens Latest on the profile. */
export function LatestRow({
  latest,
  href,
  onOpen,
}: {
  latest: LatestMark;
  href: string;
  onOpen: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onOpen}
      className="border-rule bg-paper hover:bg-wash focus-visible:ring-ring/50 rounded-card flex min-h-[60px] items-center gap-3 border px-4 py-3 outline-none transition-colors focus-visible:ring-[3px]"
    >
      <MarkCoin kind={latest.kind} size="cabinet" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{latest.title}</span>
        <span className="text-eyebrow text-muted-foreground block truncate">
          {latest.line}
        </span>
      </span>
      <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
    </Link>
  );
}
