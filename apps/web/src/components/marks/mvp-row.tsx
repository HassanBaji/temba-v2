"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { playerProfilePath } from "~/lib/dashboard-paths";

import { MarkCoin } from "./mark-coin";
import { mvpRowModel } from "./marks-model";
import type { GameMarksController } from "./use-game-marks";

/**
 * The MVP inside the black hero: not decided yet with Vote or Pick while the
 * window is open (2a), then the MVP with how it was decided (2f). Outlined on
 * ink, so the hero stays the page's one ink Surface.
 */
export function MvpRow({
  marks,
  canOpenProfile,
}: {
  marks: GameMarksController;
  canOpenProfile: boolean;
}) {
  const locale = useLocale();
  const m = useMessages();
  const data = marks.data;
  const model = data ? mvpRowModel(data, locale) : null;
  if (!data || !model) {
    return null;
  }
  const { action, userId } = model;
  const mvp = userId
    ? data.participants.find((participant) => participant.userId === userId)
    : undefined;
  const profileHref =
    canOpenProfile && mvp && !mvp.isUnclaimed
      ? playerProfilePath(mvp.userId, data.sport)
      : null;
  return (
    <div className="border-dimrule rounded-card mt-5 flex items-center gap-3 border px-3.5 py-3">
      <MarkCoin
        kind="mvp"
        size="roster"
        tone="ink"
        state={model.state === "decided" ? "earned" : "notYet"}
      />
      <div className="min-w-0 flex-1">
        <p className="text-meta font-semibold">{model.title}</p>
        <p className="text-dim text-eyebrow">{model.line}</p>
      </div>
      {action ? (
        <Button
          type="button"
          variant="inverse"
          size="sm"
          onClick={() => marks.openSheet({ kind: action.sheet })}
        >
          {action.label}
        </Button>
      ) : profileHref && mvp ? (
        <Button variant="outline-inverse" size="icon-sm" asChild>
          <Link
            href={profileHref}
            aria-label={m.webMarks.mvp.profileSpoken(mvp.name)}
          >
            <ArrowUpRight aria-hidden="true" className="rtl:-scale-x-100" />
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
