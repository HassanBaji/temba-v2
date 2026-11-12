"use client";

import {
  tournamentShareCard,
  type TournamentShareCard as TournamentShareCardModel,
} from "@repo/domain/tournament-finished";
import type { TournamentDetails } from "@repo/domain/tournament-details";
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
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const card = React.useMemo(
    () => tournamentShareCard(game, locale),
    [game, locale],
  );

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

  if (!card) {
    return (
      <DashboardShell title={copy.title} action={doneAction} isSubPage>
        <ErrorState
          title={m.noResultTitle}
          message={m.noResultMessage}
          retryLabel={m.checkAgain}
          onRetry={onRetry}
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={copy.title} action={doneAction} isSubPage>
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
