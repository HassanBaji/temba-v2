"use client";

import { LinkIcon, MonitorIcon, TvIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { formatBoardCode, type LiveBoardKind } from "@repo/domain/live-board";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Surface } from "~/components/ui/surface";
import { copyTextWhenReady } from "~/lib/share-link";

import {
  SettingRow,
  SettingsBlock,
  SwitchRow,
  ThemeSegments,
} from "./board-settings";
import type { LiveBoardControlState, LiveBoardHandle } from "./use-live-board";

/** The Board code and the settings worth choosing before a TV joins. */
export function ShowOnTvPanel({
  kind,
  board,
  change,
}: {
  kind: LiveBoardKind;
  board: LiveBoardControlState;
  change: LiveBoardHandle["change"];
}) {
  const m = useMessages().liveBoard;

  async function copyLink(url: string) {
    try {
      if (await copyTextWhenReady(Promise.resolve(url))) {
        toast.success(m.sheet.linkCopied);
      }
    } catch {
      toast.error(m.sheet.startFailed);
    }
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <Surface
        className="rounded-card flex items-center gap-3.5 px-[18px] py-4"
        tone="ink"
      >
        <div className="min-w-0 flex-1">
          <p className="text-dim text-meta">
            {m.sheet.codeLead(board.address)}
          </p>
          <p className="font-expanded mt-2 text-[40px] leading-none" dir="ltr">
            {formatBoardCode(board.code)}
          </p>
        </div>
        <TvIcon aria-hidden="true" className="size-[26px] flex-none" />
      </Surface>

      <SettingsBlock>
        {kind === "social" ? (
          <SwitchRow
            checked={board.rotate}
            hint={m.settings.rotateHint(board.rotateSeconds)}
            onChange={(rotate) => change({ rotate })}
            title={m.settings.rotate}
          />
        ) : null}
        <SwitchRow
          checked={board.showQr}
          hint={m.settings.qrHint(kind)}
          onChange={(showQr) => change({ showQr })}
          title={m.settings.qr}
        />
        <SettingRow hint={m.settings.themeHint} title={m.settings.theme}>
          <ThemeSegments
            onSelect={(theme) => change({ theme })}
            value={board.theme}
          />
        </SettingRow>
      </SettingsBlock>

      <div className="flex flex-col gap-2">
        <Button onClick={() => void copyLink(board.url)} size="lg">
          <LinkIcon aria-hidden="true" />
          {m.sheet.copyLink}
        </Button>
        <Button asChild variant="outline">
          <a href={board.url} rel="noreferrer" target="_blank">
            <MonitorIcon aria-hidden="true" />
            {m.sheet.openHere}
          </a>
        </Button>
      </div>
      <p className="text-muted-foreground text-eyebrow text-center">
        {m.sheet.footnote(kind)}
      </p>
    </div>
  );
}

/**
 * Show on TV: opening it starts the Game's Live board, so the Board code is
 * there to read out, with the three settings worth choosing before a TV joins.
 */
export function ShowOnTvSheet({
  gameId,
  kind,
  live,
  open,
  onOpenChange,
}: {
  gameId: string;
  kind: LiveBoardKind;
  live: LiveBoardHandle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const m = useMessages().liveBoard;
  const { board, start, change } = live;
  const startBoard = start.mutate;
  const idle = start.isIdle;

  React.useEffect(() => {
    if (open && !board && idle) {
      startBoard({ gameId });
    }
  }, [board, gameId, idle, open, startBoard]);

  return (
    <ResponsiveDialog
      onOpenChange={(next) => {
        if (!next) {
          start.reset();
        }
        onOpenChange(next);
      }}
      open={open}
    >
      <ResponsiveDialogContent showCloseButton>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="font-expanded text-h1 leading-none">
            {m.sheet.title}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {m.sheet.lead(kind)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {board ? (
          <ShowOnTvPanel board={board} change={change} kind={kind} />
        ) : start.isError ? (
          <div className="flex flex-col gap-3">
            <p className="text-body" role="alert">
              {start.error.message || m.sheet.startFailed}
            </p>
            <Button onClick={() => startBoard({ gameId })} variant="outline">
              {m.sheet.retry}
            </Button>
          </div>
        ) : (
          <div aria-busy="true" className="flex flex-col gap-[18px]">
            <Skeleton className="rounded-card h-[104px]" />
            <Skeleton className="rounded-card h-[176px]" />
            <Skeleton className="h-13 rounded-lg" />
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
