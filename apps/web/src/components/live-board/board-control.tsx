"use client";

import { CopyIcon, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { formatGameClockWithoutMeridiem } from "@repo/domain/format-game-start";
import {
  formatBoardCode,
  LIVE_BOARD_MESSAGE_MAX,
  LIVE_BOARD_SCREENS,
  liveBoardScene,
  type LiveBoardKind,
  type LiveBoardScreen,
  type LiveBoardTheme,
} from "@repo/domain/live-board";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { TournamentHeaderBar } from "~/components/games/tournament-header-bar";
import { PageTitle } from "~/components/layout/page-title";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Surface } from "~/components/ui/surface";
import { gameHomeHref } from "~/lib/dashboard-paths";
import { copyTextWhenReady } from "~/lib/share-link";
import { cn } from "~/lib/utils";

import {
  SecondsSegments,
  SettingRow,
  SettingsBlock,
  SwitchRow,
  ThemeSegments,
} from "./board-settings";
import { ShowOnTvSheet } from "./show-on-tv-sheet";
import { useBoardNow } from "./use-board-now";
import {
  useLiveBoard,
  type LiveBoardControlState,
  type LiveBoardHandle,
} from "./use-live-board";

function Section({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 pb-2.5">
        <h2 className="font-expanded text-[19px]">{title}</h2>
        {meta ? (
          <span className="text-muted-foreground text-meta">{meta}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type Shown = LiveBoardScreen | "scoreboard";

/** A small picture of the board, so the Organizer need not look up at the TV. */
function BoardThumbnail({
  theme,
  shown,
}: {
  theme: LiveBoardTheme;
  shown: Shown;
}) {
  const block = "bg-rule rounded-[2px]";
  const lines = (count: number) =>
    Array.from({ length: count }, (_, index) => (
      <span key={index} className={cn(block, "h-[3px]")} />
    ));
  const grid = (
    <span className="grid grid-cols-2 grid-rows-2 gap-0.5">
      {Array.from({ length: 4 }, (_, index) => (
        <span key={index} className={block} />
      ))}
    </span>
  );
  return (
    <span
      aria-hidden="true"
      className={cn(
        theme,
        "bg-paper border-rule flex h-[74px] w-[132px] flex-none flex-col gap-1 rounded-[9px] border px-2 py-[7px]",
      )}
    >
      <span className="flex items-center justify-between">
        <span className="bg-ink h-1 w-[34px] rounded-[2px]" />
        <span className="bg-ink h-1 w-3.5 rounded-[2px]" />
      </span>
      {shown === "on_court" ? (
        <span className="flex min-h-0 flex-1 flex-col gap-[3px]">
          <span className="flex min-h-0 flex-1 gap-1 [&>*:first-child]:flex-[1.4]">
            {grid}
            <span className="flex flex-1 flex-col justify-between">
              {lines(6)}
            </span>
          </span>
          <span className={cn(block, "h-2")} />
        </span>
      ) : null}
      {shown === "standings" ? (
        <span className="flex min-h-0 flex-1 gap-1">
          <span className="flex flex-[2.4] flex-col justify-between">
            {lines(7)}
          </span>
          <span className="flex flex-1 flex-col gap-0.5">
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index} className={cn(block, "flex-1")} />
            ))}
          </span>
        </span>
      ) : null}
      {shown === "next_up" ? (
        <span className="flex min-h-0 flex-1 flex-col gap-[3px]">
          <span className="flex min-h-0 flex-1 gap-1 [&>*:first-child]:flex-[2]">
            {grid}
            <span className="flex flex-1 flex-col justify-between">
              {lines(6)}
            </span>
          </span>
          <span className={cn(block, "h-2")} />
        </span>
      ) : null}
      {shown === "scoreboard" ? (
        <span className="flex min-h-0 flex-1 flex-col gap-[3px]">
          <span className={cn(block, "flex-1")} />
          <span className={cn(block, "h-2")} />
        </span>
      ) : null}
    </span>
  );
}

/** The control's doors: the API in the App, plain state in the design preview. */
export type BoardControlDoors = {
  offsetMs: number;
  change: LiveBoardHandle["change"];
  setMessage: Pick<LiveBoardHandle["setMessage"], "mutate" | "isPending">;
  disconnectTv: Pick<LiveBoardHandle["disconnectTv"], "mutate" | "isPending">;
  stop: Pick<LiveBoardHandle["stop"], "mutateAsync" | "isPending">;
};

function MessageSection({
  gameId,
  board,
  live,
}: {
  gameId: string;
  board: LiveBoardControlState;
  live: BoardControlDoors;
}) {
  const messages = useMessages();
  const m = messages.liveBoard.control;
  const cancelLabel = messages.common.cancel;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const pending = live.setMessage.isPending;
  const writing = editing || !board.message;

  function save(shown?: boolean) {
    live.setMessage.mutate(
      { gameId, message: draft, shown },
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <Section
      meta={board.messageShown ? m.messageOn : m.messageOff}
      title={m.messageTitle}
    >
      <div className="border-rule divide-rule rounded-card divide-y overflow-hidden border">
        {writing ? (
          <form
            className="flex flex-col gap-2.5 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <Input
              aria-label={m.messageLabel}
              maxLength={LIVE_BOARD_MESSAGE_MAX}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={m.messagePlaceholder}
              value={draft}
            />
            <div className="flex gap-2">
              {board.message ? (
                <Button
                  onClick={() => setEditing(false)}
                  type="button"
                  variant="outline"
                >
                  {cancelLabel}
                </Button>
              ) : null}
              <Button
                className="flex-1"
                disabled={draft.trim().length === 0}
                pending={pending}
                type="submit"
                variant="outline"
              >
                {m.messageSave}
              </Button>
              <Button
                className="flex-1"
                disabled={draft.trim().length === 0}
                onClick={() => save(true)}
                pending={pending}
                type="button"
              >
                {m.messageShow}
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p className="text-body px-[18px] py-3.5">{board.message}</p>
            <div className="flex gap-2 p-3">
              <Button
                onClick={() => {
                  setDraft(board.message ?? "");
                  setEditing(true);
                }}
                variant="outline"
              >
                <PencilIcon aria-hidden="true" />
                {m.messageEdit}
              </Button>
              <Button
                className="flex-1"
                onClick={() =>
                  live.setMessage.mutate({
                    gameId,
                    shown: !board.messageShown,
                  })
                }
                pending={pending}
                variant={board.messageShown ? "outline" : "default"}
              >
                {board.messageShown ? m.messageTakeDown : m.messageShow}
              </Button>
            </div>
          </>
        )}
      </div>
    </Section>
  );
}

export function BoardControlBody({
  gameId,
  kind,
  board,
  live,
  onStopped,
}: {
  gameId: string;
  kind: LiveBoardKind;
  board: LiveBoardControlState;
  live: BoardControlDoors;
  onStopped: () => void;
}) {
  const m = useMessages().liveBoard;
  const c = m.control;
  const locale = useLocale();
  const now = useBoardNow(live.offsetMs);
  const [stopOpen, setStopOpen] = React.useState(false);
  const social = kind === "social";
  const scene = liveBoardScene(board, now);
  const shown: Shown = social ? scene.screen : "scoreboard";
  const code = formatBoardCode(board.code);

  async function copyLink() {
    try {
      if (await copyTextWhenReady(Promise.resolve(board.url))) {
        toast.success(m.sheet.linkCopied);
      }
    } catch {
      toast.error(m.sheet.startFailed);
    }
  }

  return (
    <>
      <Surface
        className="flex items-center gap-3.5 rounded-xl px-4 py-3.5"
        tone="ink"
      >
        <BoardThumbnail shown={shown} theme={board.theme} />
        <div className="min-w-0">
          <p className="text-dim text-eyebrow">{c.now}</p>
          <p className="font-expanded mt-1 text-[24px] leading-none">
            {m.screens[shown]}
          </p>
          <p className="text-dim text-eyebrow mt-2">
            {!social
              ? c.oneScreen
              : scene.next && scene.secondsToNext != null
                ? c.thenIn(m.screens[scene.next], scene.secondsToNext)
                : c.held}
          </p>
        </div>
      </Surface>

      {social ? (
        <>
          <Section meta={c.screensHint} title={c.screensTitle}>
            <div className="border-rule divide-rule rounded-card divide-y overflow-hidden border">
              {LIVE_BOARD_SCREENS.map((screen) => {
                const on = scene.screen === screen;
                return (
                  <button
                    key={screen}
                    aria-label={c.showScreen(m.screens[screen])}
                    aria-pressed={on}
                    className={cn(
                      "focus-visible:ring-ring/50 flex min-h-[58px] w-full items-center gap-3.5 px-[18px] py-2.5 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
                      on && "bg-wash",
                    )}
                    onClick={() => live.change({ heldScreen: screen })}
                    type="button"
                  >
                    <span
                      className={cn(
                        "size-[18px] flex-none rounded-[5px] border",
                        on ? "bg-control border-control" : "border-input",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn("text-body block", on && "font-semibold")}
                      >
                        {m.screens[screen]}
                      </span>
                      <span className="text-muted-foreground text-eyebrow mt-0.5 block">
                        {c.screenHints[screen]}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "text-meta flex-none",
                        !on && "text-muted-foreground",
                      )}
                    >
                      {on ? c.onNow : c.show}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            meta={board.rotate ? c.rotationOn : c.rotationHeld}
            title={c.rotationTitle}
          >
            <SettingsBlock>
              <SwitchRow
                checked={board.rotate}
                hint={m.settings.rotateOffHint}
                onChange={(rotate) => live.change({ rotate })}
                title={m.settings.rotate}
              />
              <SettingRow hint={c.perScreen} title={c.changeEvery}>
                <SecondsSegments
                  onSelect={(rotateSeconds) => live.change({ rotateSeconds })}
                  value={board.rotateSeconds}
                />
              </SettingRow>
            </SettingsBlock>
          </Section>
        </>
      ) : null}

      <MessageSection board={board} gameId={gameId} live={live} />

      <Section title={c.displayTitle}>
        <SettingsBlock>
          <SettingRow hint={m.settings.themeHint} title={m.settings.theme}>
            <ThemeSegments
              onSelect={(theme) => live.change({ theme })}
              value={board.theme}
            />
          </SettingRow>
          <SwitchRow
            checked={board.showQr}
            hint={m.settings.qrHint(kind)}
            onChange={(showQr) => live.change({ showQr })}
            title={m.settings.qr}
          />
        </SettingsBlock>
      </Section>

      <Section meta={c.tvsConnected(board.tvs.length)} title={c.tvsTitle}>
        <SettingsBlock>
          {board.tvs.map((tv) => (
            <SettingRow
              key={tv.id}
              hint={c.tvSince(
                formatGameClockWithoutMeridiem(tv.connectedAt, locale),
              )}
              title={tv.name}
            >
              <button
                aria-label={c.disconnectTv(tv.name)}
                className="text-muted-foreground text-meta hover:text-ink focus-visible:ring-ring/50 min-h-11 flex-none rounded-sm underline underline-offset-2 outline-none focus-visible:ring-[3px]"
                disabled={live.disconnectTv.isPending}
                onClick={() =>
                  live.disconnectTv.mutate({ gameId, tvId: tv.id })
                }
                type="button"
              >
                {c.disconnect}
              </button>
            </SettingRow>
          ))}
          <SettingRow
            hint={c.addLine(board.address, code)}
            title={board.tvs.length > 0 ? c.addTv : c.addFirstTv}
          >
            <Button
              aria-label={m.sheet.copyLink}
              className="flex-none"
              onClick={() => void copyLink()}
              size="icon"
              variant="outline"
            >
              <CopyIcon aria-hidden="true" />
            </Button>
          </SettingRow>
        </SettingsBlock>
      </Section>

      <div className="border-rule -mx-1 border-t pt-4">
        <Button
          className="w-full"
          onClick={() => setStopOpen(true)}
          size="lg"
          variant="outline"
        >
          {c.stop}
        </Button>
        <p className="text-muted-foreground text-eyebrow mt-2.5 text-center">
          {c.stopNote}
        </p>
      </div>

      <ConfirmDialog
        cancelLabel={c.stopKeep}
        confirmLabel={c.stop}
        description={c.stopBody}
        onConfirm={async () => {
          await live.stop.mutateAsync({ gameId });
          toast.success(c.stopped);
          onStopped();
        }}
        onOpenChange={setStopOpen}
        open={stopOpen}
        pending={live.stop.isPending}
        title={c.stopTitle}
      />
    </>
  );
}

/**
 * The board control: everything an Organizer may want mid-game on one
 * scroll, each change showing on the TV straight away.
 */
export function BoardControlPage({ gameId }: { gameId: string }) {
  const m = useMessages().liveBoard;
  const c = m.control;
  const live = useLiveBoard(gameId, true);
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const { state, board } = live;

  return (
    <DashboardShell hideMobileTopBar hidePageHeader title={c.title}>
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 pb-8">
        <header className="mt-6 lg:mt-2">
          <TournamentHeaderBar
            backHref={gameHomeHref(gameId)}
            chip={c.chip}
            surface="paper"
          />
          <div className="text-muted-foreground text-meta mt-6 flex items-center justify-between gap-2.5">
            <span className="min-w-0 truncate">{state?.gameName}</span>
            {board ? (
              <span className="flex-none">{c.onScreens(board.tvs.length)}</span>
            ) : null}
          </div>
          <PageTitle className="mt-1.5" variant="hero">
            {c.title}
          </PageTitle>
          <p className="text-muted-foreground text-meta mt-2 leading-relaxed">
            {board ? c.lead : null}
          </p>
        </header>

        {live.error ? (
          <ErrorState
            message={live.error.message}
            onRetry={() => void live.refetch()}
          />
        ) : !state ? (
          <div aria-busy="true" className="flex flex-col gap-6">
            <Skeleton className="h-[102px] rounded-xl" />
            <Skeleton className="rounded-card h-[176px]" />
            <Skeleton className="rounded-card h-[118px]" />
          </div>
        ) : board && state.kind ? (
          <BoardControlBody
            board={board}
            gameId={gameId}
            kind={state.kind}
            live={live}
            onStopped={() => router.push(gameHomeHref(gameId))}
          />
        ) : (
          <div className="border-rule rounded-card flex flex-col gap-3 border p-[18px]">
            <p className="text-body font-semibold">
              {state.canStart ? c.offTitle : c.unavailable}
            </p>
            {state.canStart ? (
              <>
                <p className="text-muted-foreground text-meta">{c.offLead}</p>
                <Button
                  onClick={() => {
                    live.ensureStarted();
                    setSheetOpen(true);
                  }}
                >
                  {m.menu.showOnTv}
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>
      {state?.kind && state.canStart ? (
        <ShowOnTvSheet
          kind={state.kind}
          live={live}
          onOpenChange={setSheetOpen}
          open={sheetOpen}
        />
      ) : null}
    </DashboardShell>
  );
}
