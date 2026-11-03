"use client";

import {
  formatResultShareMessage,
  resultShareCard,
} from "@repo/domain/game-result-share";
import { isFootballRosterGame } from "@repo/domain/football-game-details";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { toPng } from "html-to-image";
import {
  ImageDown,
  Link as LinkIcon,
  MessageSquare,
  Share,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { SheetMenu, SheetMenuRow } from "~/components/common/sheet-menu";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameDetailsSkeleton } from "~/components/games/game-details-skeleton";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { shareLinkWithFeedback, shareOrCopyLink } from "~/lib/share-link";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  ScaledCanvas,
  STICKER_WIDTH,
  STORY_HEIGHT,
  STORY_WIDTH,
} from "./scaled-canvas";
import { Sticker } from "./stickers";
import { StoryCard } from "./story-cards";

type ShareMode = "story" | "sticker";
type ShareAction = "save" | "share_image" | "share_link" | "share_message";

function downloadDataUrl(dataUrl: string, name: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = name;
  anchor.click();
}

async function fileFromDataUrl(dataUrl: string, name: string) {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: "image/png" });
}

export function ShareResultPage({ gameId }: { gameId: string }) {
  const locale = useLocale();
  const m = useMessages().webUi.shareResult;
  const [mode, setMode] = React.useState<ShareMode>("story");
  const [pending, setPending] = React.useState<ShareAction | null>(null);
  const storyRef = React.useRef<HTMLDivElement | null>(null);
  const stickerRef = React.useRef<HTMLDivElement | null>(null);

  const game = api.games.byId.useQuery({ id: gameId });
  const football = game.data != null && isFootballRosterGame(game.data);
  const board = api.games.footballBoard.useQuery(
    { gameId },
    { enabled: football },
  );
  const link = api.games.resultLink.useQuery({ gameId });

  const card = React.useMemo(
    () =>
      game.data
        ? resultShareCard(
            game.data,
            football ? (board.data ?? null) : null,
            locale,
          )
        : null,
    [game.data, board.data, football, locale],
  );
  const url = link.data?.url ?? null;
  const gameHref = `/dashboard/games/${gameId}`;
  const backAction = (
    <Button variant="outline" asChild>
      <Link href={gameHref}>{m.backToGame}</Link>
    </Button>
  );

  if (isNotFoundError(game.error)) {
    notFound();
  }
  if (game.error || (football && board.error)) {
    return (
      <DashboardShell title={m.title} action={backAction} isSubPage>
        <ErrorState
          title={m.loadError}
          message={game.error?.message ?? board.error?.message}
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
      <DashboardShell title={m.title} action={backAction} isSubPage>
        <GameDetailsSkeleton />
      </DashboardShell>
    );
  }
  if (!card) {
    return (
      <DashboardShell title={m.title} action={backAction} isSubPage>
        <ErrorState
          title={m.noResultTitle}
          message={m.noResultMessage}
          retryLabel={m.checkAgain}
          onRetry={() => {
            void game.refetch();
            void board.refetch();
          }}
        />
      </DashboardShell>
    );
  }

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

  function run(action: ShareAction, task: () => Promise<void>) {
    if (pending) {
      return;
    }
    setPending(action);
    void task()
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : m.shareFailed,
        );
      })
      .finally(() => setPending(null));
  }

  const saveImage = () =>
    run("save", async () => {
      downloadDataUrl(await capture(), fileName);
    });

  const shareImage = () =>
    run("share_image", async () => {
      const file = await fileFromDataUrl(await capture(), fileName);
      if (
        typeof navigator.share === "function" &&
        navigator.canShare?.({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            return;
          }
        }
      }
      downloadDataUrl(URL.createObjectURL(file), fileName);
    });

  const shareLink = () =>
    run("share_link", async () => {
      if (!url) {
        toast.error(m.linkLoading);
        return;
      }
      await shareLinkWithFeedback({ text: url, url }, m.linkCopied, locale);
    });

  const shareMessage = () =>
    run("share_message", async () => {
      const outcome = await shareOrCopyLink({
        text: formatResultShareMessage(card, url ?? "", locale),
      });
      if (outcome === "copied") {
        toast.success(m.messageCopied);
      }
    });

  return (
    <DashboardShell title={m.title} action={backAction} isSubPage>
      <div className="mx-auto max-w-[520px] space-y-6">
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as ShareMode)}
        >
          <TabsList variant="segmented" aria-label={m.whatToShare}>
            <TabsTrigger value="story">{m.story}</TabsTrigger>
            <TabsTrigger value="sticker">{m.sticker}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="space-y-2.5">
          <div
            className={cn(
              "overflow-hidden rounded-xl",
              mode === "sticker" ? "bg-wash p-4" : "bg-ink",
            )}
          >
            {mode === "story" ? (
              <ScaledCanvas
                canvasRef={storyRef}
                canvasWidth={STORY_WIDTH}
                canvasHeight={STORY_HEIGHT}
              >
                <StoryCard card={card} />
              </ScaledCanvas>
            ) : (
              <ScaledCanvas canvasRef={stickerRef} canvasWidth={STICKER_WIDTH}>
                <Sticker card={card} />
              </ScaledCanvas>
            )}
          </div>
          <p className="text-muted-foreground text-meta">
            {mode === "story" ? m.storyHint : m.stickerHint}
          </p>
        </div>
        <SheetMenu>
          <SheetMenuRow
            label={mode === "story" ? m.saveImage : m.saveSticker}
            hint={m.saveHint}
            icon={ImageDown}
            pending={pending === "save"}
            disabled={pending != null}
            onSelect={saveImage}
          />
          <SheetMenuRow
            label={m.shareImage}
            hint={m.shareImageHint}
            icon={Share}
            pending={pending === "share_image"}
            disabled={pending != null}
            onSelect={shareImage}
          />
          <SheetMenuRow
            label={m.shareLink}
            hint={m.shareLinkHint}
            icon={LinkIcon}
            pending={pending === "share_link"}
            disabled={pending != null || !url}
            onSelect={shareLink}
          />
          <SheetMenuRow
            label={m.shareMessage}
            hint={m.shareMessageHint}
            icon={MessageSquare}
            pending={pending === "share_message"}
            disabled={pending != null}
            onSelect={shareMessage}
          />
        </SheetMenu>
      </div>
    </DashboardShell>
  );
}
