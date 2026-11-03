"use client";

import {
  formatResultShareMessage,
  resultShareCard,
} from "@repo/domain/game-result-share";
import { isFootballRosterGame } from "@repo/domain/football-game-details";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
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
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { GameDetailsSkeleton } from "~/components/games/game-details-skeleton";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  COPY_LINK_FAILED_MESSAGE,
  copyTextWhenReady,
  shareOrCopyLink,
} from "~/lib/share-link";
import { api } from "~/trpc/react";

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

type ShareMode = "story" | "sticker";
type ShareAction = "save" | "share_image" | "copy_link" | "share_message";

type ShareModeCopy = {
  /** The mono line under the preview: what the file is. */
  format: string;
  share: string;
  save: string;
  /** Shown under the preview when the saved file differs from what is on screen. */
  note: string | null;
};

const SHARE_MODE_COPY: Record<ShareMode, ShareModeCopy> = {
  story: {
    format: "1080 × 1920 · STORY",
    share: "Share image",
    save: "Save",
    note: null,
  },
  sticker: {
    format: "TRANSPARENT PNG · STICKER",
    share: "Share sticker",
    save: "Save PNG",
    note: "Only the black card is saved. Drop it on your own photo in the story editor.",
  },
};

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

export function ShareResultPage({ gameId }: { gameId: string }) {
  const [mode, setMode] = React.useState<ShareMode>("story");
  const [full, setFull] = React.useState(false);
  const [pending, setPending] = React.useState<ShareAction | null>(null);
  const storyRef = React.useRef<HTMLDivElement | null>(null);
  const stickerRef = React.useRef<HTMLDivElement | null>(null);
  const photo = usePickedPhoto();

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
        ? resultShareCard(game.data, football ? (board.data ?? null) : null)
        : null,
    [game.data, board.data, football],
  );
  const url = link.data?.url ?? null;
  const gameHref = `/dashboard/games/${gameId}`;
  const doneAction = (
    <Button variant="ghost" className="font-semibold" asChild>
      <Link href={gameHref}>Done</Link>
    </Button>
  );

  if (isNotFoundError(game.error)) {
    notFound();
  }
  if (game.error || (football && board.error)) {
    return (
      <DashboardShell title="Share result" action={doneAction} isSubPage>
        <ErrorState
          title="Result could not be loaded"
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
      <DashboardShell title="Share result" action={doneAction} isSubPage>
        <GameDetailsSkeleton />
      </DashboardShell>
    );
  }
  if (!card) {
    return (
      <DashboardShell title="Share result" action={doneAction} isSubPage>
        <ErrorState
          title="No result to share yet"
          message="Once the score is confirmed, the result card is ready here."
          retryLabel="Check again"
          onRetry={() => {
            void game.refetch();
            void board.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  const copy = SHARE_MODE_COPY[mode];
  const fileName = `temba-result-${mode}.png`;

  async function capture() {
    const node = mode === "story" ? storyRef.current : stickerRef.current;
    if (!node) {
      throw new Error("The card is not ready yet");
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
          error instanceof Error ? error.message : "Could not share the result",
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

  const copyLink = () =>
    run("copy_link", async () => {
      if (!url) {
        toast.error("The link is still loading");
        return;
      }
      try {
        await copyTextWhenReady(Promise.resolve(url));
        toast.success("Link copied");
      } catch {
        toast.error(COPY_LINK_FAILED_MESSAGE);
      }
    });

  const shareMessage = () =>
    run("share_message", async () => {
      const outcome = await shareOrCopyLink({
        text: formatResultShareMessage(card, url ?? ""),
      });
      if (outcome === "copied") {
        toast.success("Message copied");
      }
    });

  const sticker = (
    <ScaledCanvas canvasRef={stickerRef} canvasWidth={STICKER_WIDTH}>
      <Sticker card={card} />
    </ScaledCanvas>
  );

  return (
    <DashboardShell title="Share result" action={doneAction} isSubPage>
      <div className="mx-auto max-w-[520px] space-y-5">
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as ShareMode)}
        >
          <TabsList variant="soft" aria-label="What to share">
            <TabsTrigger value="story">Story</TabsTrigger>
            <TabsTrigger value="sticker">Sticker</TabsTrigger>
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
                    label: full ? "Fit to screen" : "Full size",
                    icon: full ? Minimize2 : Maximize2,
                    onClick: () => setFull((current) => !current),
                  }
                : {
                    label: photo.url ? "Change photo" : "Try on a photo",
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
            onClick={shareImage}
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
              onClick={saveImage}
            />
            <ActionTile
              label="Copy link"
              icon={LinkIcon}
              pending={pending === "copy_link"}
              disabled={pending != null || !url}
              onClick={copyLink}
            />
            <ActionTile
              label="Message"
              icon={MessageCircle}
              pending={pending === "share_message"}
              disabled={pending != null}
              onClick={shareMessage}
            />
          </ActionTileRow>
        </div>
      </div>
    </DashboardShell>
  );
}
