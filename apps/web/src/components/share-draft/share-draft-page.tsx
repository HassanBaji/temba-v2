"use client";

import { bibNames } from "@repo/domain/football-board";
import {
  draftShareCard,
  draftShareMessage,
  draftShareNote,
  type DraftShareMode,
} from "@repo/domain/football-draft-share";
import { isFootballRosterGame } from "@repo/domain/football-game-details";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { toPng } from "html-to-image";
import {
  ImageDown,
  Link as LinkIcon,
  Maximize2,
  MessageCircle,
  Minimize2,
  Share,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as React from "react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameDetailsSkeleton } from "~/components/games/game-details-skeleton";
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  ScaledCanvas,
  STORY_HEIGHT,
  STORY_WIDTH,
} from "~/components/share-result/scaled-canvas";
import {
  ActionTile,
  ActionTileRow,
} from "~/components/share-result/share-actions";
import {
  PreviewMeta,
  PreviewWell,
} from "~/components/share-result/share-preview";
import { useShareImage } from "~/components/share-result/use-share-image";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";

import { DraftStoryCard } from "./draft-cards";

/**
 * Share draft (design 3a): the Draft line-up as a Draft card for both teams
 * or one, with Share image, Save, Copy link and Message. Only an Organizer
 * or a Side captain reads a draft; anyone else gets the empty state.
 */
export function ShareDraftPage({ gameId }: { gameId: string }) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.draftShare;
  const shareResult = messages.webUi.shareResult;
  const [mode, setMode] = React.useState<DraftShareMode>("both");
  const [full, setFull] = React.useState(false);
  const storyRef = React.useRef<HTMLDivElement | null>(null);

  const game = api.games.byId.useQuery({ id: gameId });
  const football = game.data != null && isFootballRosterGame(game.data);
  const board = api.games.footballBoard.useQuery(
    { gameId },
    { enabled: football },
  );
  const link = api.games.resultLink.useQuery({ gameId });
  const url = link.data?.url ?? null;

  const card = React.useMemo(
    () =>
      game.data && football
        ? draftShareCard(game.data, board.data ?? null, mode, locale)
        : null,
    [game.data, board.data, football, mode, locale],
  );

  const share = useShareImage({
    capture: async () => {
      const node = storyRef.current;
      if (!node) {
        throw new Error(shareResult.notReady);
      }
      return toPng(node, {
        pixelRatio: 1,
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        cacheBust: true,
        style: { transform: "none" },
      });
    },
    fileName: `temba-draft-${mode}.png`,
    url,
    message: () =>
      game.data ? draftShareMessage(game.data, url ?? "", locale) : "",
    failedMessage: shareResult.draftShareFailed,
  });
  const { pending } = share;

  const doneAction = (
    <Button variant="ghost" className="font-semibold" asChild>
      <Link href={`/dashboard/games/${gameId}`}>{messages.common.done}</Link>
    </Button>
  );

  if (isNotFoundError(game.error) || isNotFoundError(board.error)) {
    notFound();
  }
  const error = game.error ?? (football ? board.error : null);
  if (error) {
    return (
      <DashboardShell title={m.title} action={doneAction} isSubPage>
        <ErrorState
          title={m.loadError}
          message={error.message}
          onRetry={() => {
            void game.refetch();
            void board.refetch();
          }}
        />
      </DashboardShell>
    );
  }
  if (!game.data || (football && !board.data)) {
    return (
      <DashboardShell title={m.title} action={doneAction} isSubPage>
        <GameDetailsSkeleton />
      </DashboardShell>
    );
  }
  const draft = board.data?.draft ?? null;
  if (!card || !draft) {
    return (
      <DashboardShell title={m.title} action={doneAction} isSubPage>
        <EmptyState title={m.empty.title} description={m.empty.body} />
      </DashboardShell>
    );
  }

  const names = bibNames(draft.bibs, locale);

  return (
    <DashboardShell title={m.title} action={doneAction} isSubPage>
      <div className="mx-auto max-w-[520px] space-y-5">
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as DraftShareMode)}
        >
          <TabsList variant="soft" aria-label={shareResult.whatToShare}>
            <TabsTrigger value="both">{m.bothTeams}</TabsTrigger>
            <TabsTrigger value="slot1">{names.slot1}</TabsTrigger>
            <TabsTrigger value="slot2">{names.slot2}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="space-y-2.5">
          <PreviewWell full={full}>
            <ScaledCanvas
              canvasRef={storyRef}
              canvasWidth={STORY_WIDTH}
              canvasHeight={STORY_HEIGHT}
            >
              <DraftStoryCard card={card} />
            </ScaledCanvas>
          </PreviewWell>
          <PreviewMeta
            format={shareResult.storyFormat}
            action={{
              label: full ? shareResult.fitToScreen : shareResult.fullSize,
              icon: full ? Minimize2 : Maximize2,
              onClick: () => setFull((current) => !current),
            }}
          />
          <p aria-live="polite" className="text-muted-foreground text-meta">
            {draftShareNote(mode, draft.bibs, game.data, locale)}
          </p>
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
            {shareResult.shareImage}
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
              label={shareResult.copyLink}
              icon={LinkIcon}
              pending={pending === "copy_link"}
              disabled={pending != null || !url}
              onClick={share.copyLink}
            />
            <ActionTile
              label={shareResult.message}
              icon={MessageCircle}
              pending={pending === "share_message"}
              disabled={pending != null || !url}
              onClick={share.shareMessage}
            />
          </ActionTileRow>
        </div>
      </div>
    </DashboardShell>
  );
}
