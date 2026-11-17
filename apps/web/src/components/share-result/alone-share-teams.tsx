"use client";

import {
  aloneTeamsShareText,
  formatAloneLevel,
} from "@repo/domain/alone-teams";
import {
  formatGameDay,
  formatGameTimeWindow,
} from "@repo/domain/format-game-start";
import { gameDisplayName } from "@repo/domain/game-custom-name";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { toPng } from "html-to-image";
import {
  Copy,
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
import { aloneShareTeams } from "~/components/games/alone-teams-view";
import { GameDetailsSkeleton } from "~/components/games/game-details-skeleton";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { copyTextWhenReady } from "~/lib/share-link";
import { api } from "~/trpc/react";

import {
  ALONE_SQUARE_SIZE,
  AloneTeamsSquare,
  AloneTeamsStory,
  type AloneShareCardModel,
} from "./alone-teams-share-card";
import { ScaledCanvas, STORY_HEIGHT, STORY_WIDTH } from "./scaled-canvas";
import { ActionTile, ActionTileRow } from "./share-actions";
import { PreviewMeta, PreviewWell } from "./share-preview";
import { useShareImage } from "./use-share-image";

type ShareTeamsMode = "story" | "square" | "text";

/**
 * 4a–4c: an Organizer shares the posted teams of an Alone-only Social as a
 * Story, a Square or a numbered list for the group chat (ADR-0096).
 */
export function AloneShareTeams({ gameId }: { gameId: string }) {
  const messages = useMessages();
  const m = messages.aloneTeams.share;
  const shareResult = messages.webUi.shareResult;
  const locale = useLocale();
  const game = api.games.byId.useQuery({ id: gameId });
  const sheet = api.games.teamsSheet.useQuery({ gameId });
  const link = api.games.resultLink.useQuery({ gameId });
  const url = link.data?.url ?? null;
  const [mode, setMode] = React.useState<ShareTeamsMode>("story");
  const [showLevels, setShowLevels] = React.useState(false);
  const [full, setFull] = React.useState(false);
  const [copying, setCopying] = React.useState(false);
  const storyRef = React.useRef<HTMLDivElement | null>(null);
  const squareRef = React.useRef<HTMLDivElement | null>(null);

  const teams = React.useMemo(
    () =>
      sheet.data ? aloneShareTeams(sheet.data.players, sheet.data.teams) : [],
    [sheet.data],
  );
  const share = React.useMemo(() => {
    const row = game.data;
    if (!row) {
      return null;
    }
    const name = gameDisplayName(row, locale);
    const venue = row.venue?.name ?? null;
    const day = row.windowStart
      ? formatGameDay(row.windowStart, locale, { weekday: "short" })
      : null;
    const time = row.windowStart
      ? formatGameTimeWindow(
          row.windowStart,
          row.windowEnd,
          row.windowStart,
          locale,
        )
      : null;
    const dayTime =
      day && time ? messages.dates.gameStart(day, time) : (day ?? time);
    const card: AloneShareCardModel = {
      eyebrow: m.eyebrow,
      name,
      meta: m.meta(row.groupName, teams.length, row.roundCount),
      theTeams: m.theTeams,
      teams: teams.map((team) => ({
        leftName: team.leftName,
        rightName: team.rightName,
        average:
          showLevels && team.average != null
            ? formatAloneLevel(team.average, locale)
            : null,
      })),
      venue,
      day,
      time,
      dayTime,
    };
    const text = aloneTeamsShareText(
      {
        gameName: name,
        detailLines: [dayTime, venue].filter(
          (line): line is string => line != null,
        ),
        teams,
        showLevels,
      },
      locale,
    );
    return { name, card, text };
  }, [game.data, teams, showLevels, locale, m, messages.dates]);

  const image = useShareImage({
    capture: async () => {
      const node = mode === "square" ? squareRef.current : storyRef.current;
      if (!node) {
        throw new Error(shareResult.notReady);
      }
      return toPng(node, {
        pixelRatio: 1,
        width: mode === "square" ? ALONE_SQUARE_SIZE : STORY_WIDTH,
        height: mode === "square" ? ALONE_SQUARE_SIZE : STORY_HEIGHT,
        cacheBust: true,
        style: { transform: "none" },
      });
    },
    fileName: `temba-teams-${mode}.png`,
    url,
    message: () => share?.text ?? url ?? "",
  });
  const { pending } = image;

  const doneAction = (
    <Button variant="ghost" className="font-semibold" asChild>
      <Link href={`/dashboard/games/${gameId}`}>{m.done}</Link>
    </Button>
  );

  async function copyText() {
    if (!share || copying) {
      return;
    }
    setCopying(true);
    try {
      await copyTextWhenReady(Promise.resolve(share.text));
      toast.success(m.copied);
    } catch {
      toast.error(m.shareFailed);
    } finally {
      setCopying(false);
    }
  }

  if (isNotFoundError(game.error)) {
    notFound();
  }
  const error = game.error ?? sheet.error;
  if (error) {
    return (
      <DashboardShell title={m.title} action={doneAction} isSubPage>
        <ErrorState
          title={messages.webTournament.aloneTeams.loadFailed}
          message={error.message}
          onRetry={() => {
            void game.refetch();
            void sheet.refetch();
          }}
        />
      </DashboardShell>
    );
  }
  if (!share || !sheet.data) {
    return (
      <DashboardShell title={m.title} action={doneAction} isSubPage>
        <GameDetailsSkeleton />
      </DashboardShell>
    );
  }
  if (sheet.data.teamsPostedAt == null || teams.length === 0) {
    return (
      <DashboardShell title={m.title} action={doneAction} isSubPage>
        <section className="border-rule bg-paper rounded-xl border p-5">
          <p className="text-body font-semibold">
            {messages.webTournament.aloneTeams.notPosted}
          </p>
        </section>
      </DashboardShell>
    );
  }

  const note =
    mode === "story"
      ? m.storyNote(teams.length)
      : mode === "square"
        ? m.squareNote
        : m.textNote;

  return (
    <DashboardShell title={m.title} action={doneAction} isSubPage>
      <div className="mx-auto max-w-[520px] space-y-5">
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as ShareTeamsMode)}
        >
          <TabsList variant="soft" aria-label={m.title}>
            <TabsTrigger value="story">{m.story}</TabsTrigger>
            <TabsTrigger value="square">{m.square}</TabsTrigger>
            <TabsTrigger value="text">{m.text}</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "text" ? (
          <pre
            dir="auto"
            className="bg-wash text-body whitespace-pre-wrap break-words rounded-[16px] p-[22px] font-sans"
          >
            {share.text}
          </pre>
        ) : (
          <div className="space-y-2.5">
            <PreviewWell full={full}>
              <div role="img" aria-label={m.imageAlt(share.name)}>
                {mode === "story" ? (
                  <ScaledCanvas
                    canvasRef={storyRef}
                    canvasWidth={STORY_WIDTH}
                    canvasHeight={STORY_HEIGHT}
                  >
                    <AloneTeamsStory card={share.card} />
                  </ScaledCanvas>
                ) : (
                  <ScaledCanvas
                    canvasRef={squareRef}
                    canvasWidth={ALONE_SQUARE_SIZE}
                    canvasHeight={ALONE_SQUARE_SIZE}
                  >
                    <AloneTeamsSquare card={share.card} />
                  </ScaledCanvas>
                )}
              </div>
            </PreviewWell>
            <PreviewMeta
              format={mode === "story" ? m.storySize : m.squareSize}
              action={{
                label: full ? shareResult.fitToScreen : shareResult.fullSize,
                icon: full ? Minimize2 : Maximize2,
                onClick: () => setFull((current) => !current),
              }}
            />
          </div>
        )}

        <label className="border-rule flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="text-body block font-semibold">
              {m.showLevels}
            </span>
            <span className="text-muted-foreground text-meta block">
              {m.showLevelsHint}
            </span>
          </span>
          <Switch checked={showLevels} onCheckedChange={setShowLevels} />
        </label>
        <p className="text-muted-foreground text-meta">{note}</p>

        <div className="space-y-2">
          {mode === "text" ? (
            <Button
              size="lg"
              className="w-full"
              pending={copying}
              onClick={() => void copyText()}
            >
              <Copy aria-hidden="true" />
              {m.copyText}
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              pending={pending === "share_image"}
              disabled={pending != null}
              onClick={image.shareImage}
            >
              <Share aria-hidden="true" />
              {m.shareImage}
            </Button>
          )}
          <ActionTileRow>
            <ActionTile
              label={m.save}
              icon={ImageDown}
              pending={pending === "save"}
              disabled={pending != null || mode === "text"}
              onClick={image.save}
            />
            <ActionTile
              label={m.copyLink}
              icon={LinkIcon}
              pending={pending === "copy_link"}
              disabled={pending != null || !url}
              onClick={image.copyLink}
            />
            <ActionTile
              label={m.message}
              icon={MessageCircle}
              pending={pending === "share_message"}
              disabled={pending != null}
              onClick={image.shareMessage}
            />
          </ActionTileRow>
        </div>
      </div>
    </DashboardShell>
  );
}
