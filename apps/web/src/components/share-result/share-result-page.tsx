"use client";

import {
  formatResultShareMessage,
  resultCardMvp,
  resultShareCard,
} from "@repo/domain/game-result-share";
import { isFootballRosterGame } from "@repo/domain/football-game-details";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { isDrawnTournamentDetails } from "@repo/domain/tournament-details";
import type { Messages } from "@repo/i18n/messages";
import { toPng } from "html-to-image";
import {
  Image as ImageIcon,
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

import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameDetailsSkeleton } from "~/components/games/game-details-skeleton";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api, type RouterOutputs } from "~/trpc/react";

import {
  ScaledCanvas,
  STICKER_WIDTH,
  STORY_HEIGHT,
  STORY_WIDTH,
} from "./scaled-canvas";
import { ActionTile, ActionTileRow } from "./share-actions";
import { PhotoFrame, PreviewMeta, PreviewWell } from "./share-preview";
import { Sticker } from "./stickers";
import { StoryCard } from "./story-cards";
import { TournamentShareResult } from "./tournament-share-result";
import { useShareImage } from "./use-share-image";

type ShareMode = "story" | "sticker";

type ShareModeCopy = {
  /** The mono line under the preview: what the file is. */
  format: string;
  share: string;
  save: string;
  /** Shown under the preview when the saved file differs from what is on screen. */
  note: string | null;
};

function shareModeCopy(
  mode: ShareMode,
  m: Messages["webUi"]["shareResult"],
  save: string,
): ShareModeCopy {
  return mode === "story"
    ? { format: m.storyFormat, share: m.shareImage, save, note: null }
    : {
        format: m.stickerFormat,
        share: m.shareSticker,
        save: m.savePng,
        note: m.stickerNote,
      };
}

/** A photo the viewer picked, held as an object URL for as long as it shows. */
function usePickedPhoto() {
  const [url, setUrl] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) {
          setUrl(URL.createObjectURL(file));
        }
        event.target.value = "";
      }}
    />
  );

  return { url, input, pick: () => inputRef.current?.click() };
}

type ShareGame = RouterOutputs["games"]["byId"];

/** A Game's result as a story or a sticker, with the share doors under it. */
function GameShareResult({
  gameId,
  game,
  url,
  doneAction,
  onRetryGame,
}: {
  gameId: string;
  game: ShareGame;
  url: string | null;
  doneAction: React.ReactNode;
  onRetryGame: () => void;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.webUi.shareResult;
  const [mode, setMode] = React.useState<ShareMode>("story");
  const [full, setFull] = React.useState(false);
  const storyRef = React.useRef<HTMLDivElement | null>(null);
  const stickerRef = React.useRef<HTMLDivElement | null>(null);
  const photo = usePickedPhoto();

  const football = isFootballRosterGame(game);
  const board = api.games.footballBoard.useQuery(
    { gameId },
    { enabled: football },
  );
  const marks = api.marks.forGame.useQuery({ gameId });

  const card = React.useMemo(
    () =>
      resultShareCard(
        game,
        football ? (board.data ?? null) : null,
        locale,
        resultCardMvp(marks.data, locale),
      ),
    [game, board.data, football, marks.data, locale],
  );
  const fileName = `temba-result-${mode}.png`;

  async function capture() {
    const node = mode === "story" ? storyRef.current : stickerRef.current;
    if (!node) {
      throw new Error(m.notReady);
    }
    return toPng(node, {
      pixelRatio: 1,
      width: mode === "story" ? STORY_WIDTH : STICKER_WIDTH,
      height: mode === "story" ? STORY_HEIGHT : node.offsetHeight,
      cacheBust: true,
      style: { transform: "none" },
    });
  }

  const share = useShareImage({
    capture,
    fileName,
    url,
    message: () =>
      card ? formatResultShareMessage(card, url ?? "", locale) : (url ?? ""),
  });
  const { pending } = share;

  if (football && board.error) {
    return (
      <DashboardShell title={m.title} action={doneAction} isSubPage>
        <ErrorState
          title={m.loadError}
          message={board.error.message}
          onRetry={() => void board.refetch()}
        />
      </DashboardShell>
    );
  }
  if ((football && !board.data) || marks.isLoading) {
    return (
      <DashboardShell title={m.title} action={doneAction} isSubPage>
        <GameDetailsSkeleton />
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
            onRetryGame();
            void board.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  const copy = shareModeCopy(mode, m, messages.common.save);

  const sticker = (
    <ScaledCanvas canvasRef={stickerRef} canvasWidth={STICKER_WIDTH}>
      <Sticker card={card} />
    </ScaledCanvas>
  );

  return (
    <DashboardShell title={m.title} action={doneAction} isSubPage>
      <div className="mx-auto max-w-[520px] space-y-5">
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as ShareMode)}
        >
          <TabsList variant="soft" aria-label={m.whatToShare}>
            <TabsTrigger value="story">{m.story}</TabsTrigger>
            <TabsTrigger value="sticker">{m.sticker}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="space-y-2.5">
          <PreviewWell full={full}>
            {mode === "story" ? (
              <ScaledCanvas
                canvasRef={storyRef}
                canvasWidth={STORY_WIDTH}
                canvasHeight={STORY_HEIGHT}
              >
                <StoryCard card={card} />
              </ScaledCanvas>
            ) : (
              <PhotoFrame photoUrl={photo.url}>{sticker}</PhotoFrame>
            )}
          </PreviewWell>
          <PreviewMeta
            format={copy.format}
            action={
              mode === "story"
                ? {
                    label: full ? m.fitToScreen : m.fullSize,
                    icon: full ? Minimize2 : Maximize2,
                    onClick: () => setFull((current) => !current),
                  }
                : {
                    label: photo.url ? m.changePhoto : m.tryOnPhoto,
                    icon: ImageIcon,
                    onClick: photo.pick,
                  }
            }
          />
          {photo.input}
          {copy.note ? (
            <p className="text-muted-foreground text-meta">{copy.note}</p>
          ) : null}
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
            {copy.share}
          </Button>
          <ActionTileRow>
            <ActionTile
              label={copy.save}
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

/**
 * Loads the Game once, then draws a Game result or, for a drawn Friendly
 * tournament, the tournament's card.
 */
export function ShareResultPage({ gameId }: { gameId: string }) {
  const messages = useMessages();
  const m = messages.webUi.shareResult;
  const game = api.games.byId.useQuery({ id: gameId });
  const link = api.games.resultLink.useQuery({ gameId });
  const url = link.data?.url ?? null;
  const doneAction = (
    <Button variant="ghost" className="font-semibold" asChild>
      <Link href={`/dashboard/games/${gameId}`}>{messages.common.done}</Link>
    </Button>
  );
  const retry = () => void game.refetch();

  if (isNotFoundError(game.error)) {
    notFound();
  }
  if (game.error) {
    return (
      <DashboardShell title={m.title} action={doneAction} isSubPage>
        <ErrorState
          title={m.loadError}
          message={game.error.message}
          onRetry={retry}
        />
      </DashboardShell>
    );
  }
  if (!game.data) {
    return (
      <DashboardShell title={m.title} action={doneAction} isSubPage>
        <GameDetailsSkeleton />
      </DashboardShell>
    );
  }
  if (isDrawnTournamentDetails(game.data)) {
    return (
      <TournamentShareResult
        game={game.data}
        url={url}
        doneAction={doneAction}
        onRetry={retry}
      />
    );
  }
  return (
    <GameShareResult
      gameId={gameId}
      game={game.data}
      url={url}
      doneAction={doneAction}
      onRetryGame={retry}
    />
  );
}
