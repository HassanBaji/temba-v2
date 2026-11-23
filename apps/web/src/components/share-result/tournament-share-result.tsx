"use client";

import {
  tournamentShareCard,
  type TournamentShareCard as TournamentShareCardModel,
  type TournamentShareFocus,
} from "@repo/domain/tournament-finished";
import type { TournamentDetails } from "@repo/domain/tournament-details";
import { isAmericano } from "@repo/domain/tournament-americano";
import { americanoShareCard } from "@repo/domain/tournament-americano-view";
import { toPng } from "html-to-image";
import {
  ImageDown,
  Link as LinkIcon,
  Maximize2,
  MessageCircle,
  Minimize2,
  Share,
} from "lucide-react";
import * as React from "react";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";

import { ScaledCanvas } from "./scaled-canvas";
import { ActionTile, ActionTileRow } from "./share-actions";
import { PreviewMeta, PreviewWell } from "./share-preview";
import {
  TOURNAMENT_CARD_SIZE,
  TournamentShareCard,
} from "./tournament-share-card";
import { useShareImage } from "./use-share-image";

const FILE_NAME = "temba-tournament-result.png";

function shareText(card: TournamentShareCardModel, url: string | null) {
  return url ? `${card.message}\n${url}` : card.message;
}

/** The finished tournament's square card, with the same doors as a Game result. */
export function TournamentShareResult({
  game,
  url,
  doneAction,
  onRetry,
}: {
  game: TournamentDetails;
  url: string | null;
  doneAction: React.ReactNode;
  onRetry: () => void;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.webUi.shareResult;
  const copy = messages.tournamentRounds.shareCard;
  const [full, setFull] = React.useState(false);
  const [highlightMe, setHighlightMe] = React.useState(false);
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const americano = isAmericano(game.format, game.tournamentShape);
  // An Americano ranks players, not Game teams: its card reads the board.
  const board = api.games.americanoBoard.useQuery(
    { gameId: game.id },
    { enabled: americano },
  );
  const cardFor = React.useCallback(
    (focus: TournamentShareFocus) => {
      if (!americano) {
        return tournamentShareCard(game, locale, focus);
      }
      if (!board.data) {
        return null;
      }
      return americanoShareCard(
        {
          name: game.name,
          windowStart: game.windowStart,
          venueName: game.venue?.name ?? null,
          players: board.data.players,
          matches: board.data.rounds.flatMap((round) =>
            round.matches.map((match) => ({
              ...match,
              roundNumber: round.roundNumber,
            })),
          ),
          table: board.data.table,
          viewerGamePlayerId: board.data.viewerGamePlayerId,
          finished: board.data.finished,
        },
        locale,
        focus,
      );
    },
    [americano, board.data, game, locale],
  );
  const mine = React.useMemo(() => cardFor("me"), [cardFor]);
  const table = React.useMemo(() => cardFor("table"), [cardFor]);
  // Only a player with a place has a card of their own to choose.
  const canHighlight = mine?.kind === "placing" && table != null;
  const card = canHighlight && !highlightMe ? table : mine;

  const share = useShareImage({
    capture: async () => {
      const node = canvasRef.current;
      if (!node) {
        throw new Error(m.notReady);
      }
      return toPng(node, {
        pixelRatio: 1,
        width: TOURNAMENT_CARD_SIZE,
        height: TOURNAMENT_CARD_SIZE,
        cacheBust: true,
        style: { transform: "none" },
      });
    },
    fileName: FILE_NAME,
    url,
    message: () => (card ? shareText(card, url) : (url ?? "")),
  });
  const { pending } = share;

  if (americano && board.isLoading) {
    return (
      <DashboardShell title={m.title} action={doneAction} isSubPage>
        {null}
      </DashboardShell>
    );
  }

  if (!card) {
    return (
      <DashboardShell title={m.title} action={doneAction} isSubPage>
        <ErrorState
          title={m.noResultTitle}
          message={m.noResultMessage}
          retryLabel={m.checkAgain}
          onRetry={() => {
            onRetry();
            if (americano) {
              void board.refetch();
            }
          }}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={m.title} action={doneAction} isSubPage>
      <div className="mx-auto max-w-[520px] space-y-5">
        <div className="space-y-2.5">
          <PreviewWell full={full}>
            <div role="img" aria-label={card.imageLabel}>
              <ScaledCanvas
                canvasRef={canvasRef}
                canvasWidth={TOURNAMENT_CARD_SIZE}
                canvasHeight={TOURNAMENT_CARD_SIZE}
              >
                <TournamentShareCard card={card} />
              </ScaledCanvas>
            </div>
          </PreviewWell>
          <PreviewMeta
            format={copy.format}
            action={{
              label: full ? m.fitToScreen : m.fullSize,
              icon: full ? Minimize2 : Maximize2,
              onClick: () => setFull((current) => !current),
            }}
          />
        </div>
        {canHighlight ? (
          <label className="border-rule flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="text-body block font-semibold">
                {copy.highlightMe}
              </span>
              <span className="text-muted-foreground text-meta block">
                {copy.highlightMeHint}
              </span>
            </span>
            <Switch checked={highlightMe} onCheckedChange={setHighlightMe} />
          </label>
        ) : null}
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            pending={pending === "share_image"}
            disabled={pending != null}
            onClick={share.shareImage}
          >
            <Share aria-hidden="true" />
            {m.shareImage}
          </Button>
          <ActionTileRow>
            <ActionTile
              label={messages.common.save}
              icon={ImageDown}
              pending={pending === "save"}
              disabled={pending != null}
              onClick={share.save}
            />
            <ActionTile
              label={m.copyLink}
              icon={LinkIcon}
              pending={pending === "copy_link"}
              disabled={pending != null || !url}
              onClick={share.copyLink}
            />
            <ActionTile
              label={m.message}
              icon={MessageCircle}
              pending={pending === "share_message"}
              disabled={pending != null}
              onClick={share.shareMessage}
            />
          </ActionTileRow>
        </div>
      </div>
    </DashboardShell>
  );
}
