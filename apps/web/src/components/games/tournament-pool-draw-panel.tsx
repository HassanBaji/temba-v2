"use client";

import { initials } from "@repo/domain/initials";

import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { useLocale, useMessages } from "~/components/locale-provider";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import {
  draftPoolMetaLine,
  draftPoolsFromGameTeams,
  hasDraftPoolDraw,
  type DraftPoolTeam,
} from "@repo/domain/tournament-pool-draw";

export function TournamentPoolDrawPanel({
  gameTeams,
  storedRoundCount,
  windowStart,
  windowEnd,
  matchMinutes,
  courtNames,
  drawPending,
  drawError,
  onDraw,
  postPending,
  postError,
  onPost,
}: {
  gameTeams: readonly DraftPoolTeam[];
  storedRoundCount: number | null | undefined;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  matchMinutes: number | null;
  courtNames: readonly string[];
  drawPending: boolean;
  drawError: { message: string; data?: { zodError?: unknown } | null } | null;
  onDraw: () => void | Promise<void>;
  postPending: boolean;
  postError: { message: string; data?: { zodError?: unknown } | null } | null;
  onPost: () => void | Promise<void>;
}) {
  const m = useMessages();
  const locale = useLocale();
  const hasDraft = hasDraftPoolDraw(gameTeams);
  const pools = draftPoolsFromGameTeams({
    gameTeams,
    storedRoundCount,
    windowStart,
    windowEnd,
    matchMinutes,
    courtNames,
    locale,
  });
  const busy = drawPending || postPending;

  async function confirmPost() {
    if (busy || !hasDraft) {
      return;
    }
    try {
      await onPost();
    } catch {
      return;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto overscroll-contain px-[22px] py-[22px]">
        {hasDraft ? (
          pools.map((pool) => {
            const meta = draftPoolMetaLine(pool, locale);
            return (
              <section key={pool.poolIndex}>
                <div className="flex items-baseline gap-2.5 pb-2.5">
                  <h3 className="font-expanded text-title tracking-[-0.03em]">
                    {pool.label}
                  </h3>
                  {meta ? (
                    <p className="text-muted-foreground text-meta">{meta}</p>
                  ) : null}
                </div>
                <ol
                  aria-label={pool.label}
                  className="border-rule divide-rule rounded-card divide-y overflow-hidden border"
                >
                  {pool.teams.map((team, index) => {
                    const names = team.name.split(" / ");
                    return (
                      <li
                        key={team.id}
                        className="flex min-h-14 items-center gap-3 px-4 py-3"
                      >
                        <span className="text-muted-foreground text-meta w-5 tabular-nums">
                          {index + 1}
                        </span>
                        <span
                          aria-hidden="true"
                          className="border-rule text-eyebrow inline-flex size-9 shrink-0 items-center justify-center rounded-md border font-semibold"
                        >
                          {initials(names[0] ?? "")}
                        </span>
                        <span className="text-meta flex min-w-0 flex-1 flex-col font-semibold leading-tight">
                          {names.map((name) => (
                            <span key={name} dir="auto" className="truncate">
                              {name}
                            </span>
                          ))}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })
        ) : (
          <p className="text-muted-foreground text-body leading-relaxed">
            {m.tournament.poolDraw.emptyDraft}
          </p>
        )}

        <FormErrorSummary
          message={globalFormErrorMessage(drawError ?? postError)}
        />
      </div>

      <div className="border-rule mt-auto flex shrink-0 flex-col gap-2.5 border-t px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5">
        {hasDraft ? (
          <>
            <Button
              type="button"
              size="lg"
              className="w-full font-semibold"
              disabled={busy}
              aria-busy={postPending}
              onClick={() => {
                void confirmPost();
              }}
            >
              {postPending
                ? m.webTournament.draw.posting
                : m.tournamentRounds.draw.post}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={busy}
              aria-busy={drawPending}
              onClick={() => {
                void onDraw();
              }}
            >
              {drawPending
                ? m.webTournament.draw.drawing
                : m.tournament.poolDraw.drawAgain}
            </Button>
            <p className="text-muted-foreground text-meta text-center leading-relaxed">
              {m.tournamentRounds.draw.footer}
            </p>
          </>
        ) : (
          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            disabled={busy}
            aria-busy={drawPending}
            onClick={() => {
              void onDraw();
            }}
          >
            {drawPending
              ? m.webTournament.draw.drawing
              : m.tournament.poolDraw.drawPools}
          </Button>
        )}
      </div>
    </div>
  );
}
