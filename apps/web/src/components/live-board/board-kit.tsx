"use client";

import * as React from "react";

import { formatGameClock, formatGameDay } from "@repo/domain/format-game-start";
import type {
  LiveBoardColorScheme,
  SocialBoardClock,
} from "@repo/domain/live-board";

import { Hatch } from "~/components/ui/hatch";
import { TembaWordmark } from "~/components/ui/temba-wordmark";
import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

import { BOARD_HEIGHT, BOARD_WIDTH, boardScale } from "./board-layout";
import { BoardQr } from "./board-qr";

export type LiveBoardSnapshot = Extract<
  RouterOutputs["liveBoards"]["snapshot"],
  { status: "live" }
>;

export type BoardGame = LiveBoardSnapshot["game"];

/** Type at the board's own scale: the canvas is 1280 wide whatever the TV is. */
export function boardType(
  size: number,
  lineHeight?: number,
): React.CSSProperties {
  return lineHeight == null
    ? { fontSize: size }
    : { fontSize: size, lineHeight };
}

export const LIFTED = "bg-focus text-on-focus border-dimrule border";
export const PLAIN = "border-rule border";

/**
 * The 1280 by 720 board, scaled to fill whatever screen it is on and drawn
 * in its own Color scheme, whatever the device prefers.
 */
export function BoardFrame({
  colorScheme,
  fill = true,
  children,
}: {
  colorScheme: LiveBoardColorScheme;
  /** Off for a preview, which sizes the board to its own width. */
  fill?: boolean;
  children: React.ReactNode;
}) {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(0);

  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return;
    }
    const measure = () =>
      setScale(
        fill
          ? boardScale({ width: frame.clientWidth, height: frame.clientHeight })
          : frame.clientWidth / BOARD_WIDTH,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    measure();
    return () => observer.disconnect();
  }, [fill]);

  return (
    <div
      ref={frameRef}
      className={cn(
        colorScheme,
        "bg-paper text-ink overflow-hidden",
        fill ? "fixed inset-0" : "relative w-full rounded-xl",
      )}
      style={fill ? undefined : { height: BOARD_HEIGHT * scale }}
    >
      <div
        className="absolute flex flex-col"
        style={{
          width: BOARD_WIDTH,
          height: BOARD_HEIGHT,
          top: "50%",
          left: "50%",
          padding: "32px 48px 34px",
          gap: 20,
          lineHeight: 1.25,
          transform: `translate(-50%, -50%) scale(${scale})`,
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="bg-rule flex-none" style={{ width: 1, height: 40 }} />;
}

/** When a board that has not started yet starts, for its waiting screen. */
export function useStartLine(game: BoardGame) {
  const b = useMessages().liveBoard.board;
  const locale = useLocale();
  return game.windowStart
    ? b.startsAt(
        formatGameDay(game.windowStart, locale, { weekday: "long" }),
        formatGameClock(game.windowStart, locale),
      )
    : b.waitingStart;
}

export function useBoardSubtitle(game: BoardGame) {
  const list = useMessages().liveBoard.list;
  return list([game.groupName, game.venueName].flatMap((part) => part ?? []));
}

export function BoardHeader({
  title,
  subtitle,
  status,
  aside,
}: {
  title: string;
  subtitle: string;
  status: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-none items-center"
      style={{ gap: 22, height: 70 }}
    >
      <TembaWordmark className="flex-none" />
      <Divider />
      <div className="min-w-0 flex-1">
        <div className="font-expanded truncate" style={boardType(32, 1.1)}>
          {title}
        </div>
        <div
          className="text-muted-foreground truncate"
          style={{ ...boardType(16), marginTop: 5 }}
        >
          {subtitle}
        </div>
      </div>
      <div className="flex flex-none flex-col items-end" style={{ gap: 9 }}>
        {status}
      </div>
      {aside ? (
        <>
          <Divider />
          {aside}
        </>
      ) : null}
    </div>
  );
}

export function StatusTag({
  tone,
  children,
}: {
  tone: "live" | "outline";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold",
        tone === "live" ? "bg-ink text-paper" : "border-ink border",
      )}
      style={{
        gap: 7,
        height: 26,
        padding: "0 10px",
        borderRadius: 7,
        fontSize: 14,
      }}
    >
      {tone === "live" ? (
        <span
          className="bg-paper rounded-full"
          style={{ width: 8, height: 8 }}
        />
      ) : null}
      {children}
    </span>
  );
}

export function StatusLine({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-muted-foreground whitespace-nowrap"
      style={boardType(16)}
    >
      {children}
    </span>
  );
}

/** One bar per Round: solid up to the Round on court, hatched for the rest. */
export function RoundBars({
  total,
  reached,
}: {
  total: number;
  reached: number;
}) {
  const width = total > 9 ? 14 : 24;
  return (
    <div className="flex" style={{ gap: total > 9 ? 3 : 5 }}>
      {Array.from({ length: total }, (_, index) =>
        index < reached ? (
          <span
            key={index}
            className="bg-ink"
            style={{ width, height: 6, borderRadius: 3 }}
          />
        ) : (
          <Hatch key={index} style={{ width, height: 6, borderRadius: 3 }} />
        ),
      )}
    </div>
  );
}

/** What a Round clock's digits count, the same on the board and its control. */
export function useClockLabel() {
  const b = useMessages().liveBoard.board;
  return (clock: SocialBoardClock, roundNumber: number) => {
    switch (clock.kind) {
      case "left":
        return b.clockLeft;
      case "starts":
        return b.clockStarts(roundNumber);
      case "paused":
        return b.clockPaused;
      case "ready":
        return b.clockReady(roundNumber);
    }
  };
}

export function BoardClock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-none text-end" style={{ minWidth: 128 }}>
      <div className="font-expanded" style={boardType(46, 0.9)}>
        <span dir="ltr">{value}</span>
      </div>
      <div
        className="text-muted-foreground whitespace-nowrap"
        style={{ ...boardType(14), marginTop: 6 }}
      >
        {label}
      </div>
    </div>
  );
}

export function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div
      className="flex flex-none items-baseline justify-between"
      style={{ height: 38, gap: 16 }}
    >
      <span className="font-expanded whitespace-nowrap" style={boardType(22)}>
        {title}
      </span>
      {meta ? (
        <span className="text-muted-foreground truncate" style={boardType(15)}>
          {meta}
        </span>
      ) : null}
    </div>
  );
}

/** "Not yet" drawn the way the app draws it, on the page or on the lifted card. */
export function NotYet({
  lifted = false,
  width,
  height,
  radius = 8,
}: {
  lifted?: boolean;
  width: number;
  height: number;
  radius?: number;
}) {
  return (
    <Hatch
      className="block flex-none"
      style={{ width, height, borderRadius: radius }}
      tone={lifted ? "ink" : "paper"}
    />
  );
}

export function QrCell({
  url,
  size,
  lines,
}: {
  url: string;
  size: number;
  lines: [string, string];
}) {
  return (
    <div className="flex flex-none items-center" style={{ gap: 12 }}>
      <div
        className="text-muted-foreground text-end"
        style={boardType(14, 1.35)}
      >
        {lines[0]}
        <br />
        {lines[1]}
      </div>
      <BoardQr size={size} value={url} />
    </div>
  );
}

export function BoardStrip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        PLAIN,
        "divide-rule flex flex-none divide-x overflow-hidden rtl:divide-x-reverse",
      )}
      style={{ height: 96, borderRadius: 16 }}
    >
      {children}
    </div>
  );
}

export function StripLead({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-none flex-col justify-center"
      style={{ width: 178, padding: "0 20px", gap: 4 }}
    >
      <span className="text-muted-foreground" style={boardType(14)}>
        {label}
      </span>
      <span className="font-expanded whitespace-nowrap" style={boardType(22)}>
        {value}
      </span>
    </div>
  );
}

export function StripFact({
  label,
  value,
  lead,
  grow = 1,
}: {
  label: string;
  value: string;
  lead?: React.ReactNode;
  /** A fact with a long value takes a wider share of the strip. */
  grow?: number;
}) {
  return (
    <div
      className="flex min-w-0 items-center"
      style={{ flex: `${grow} 1 0%`, padding: "0 20px", gap: 12 }}
    >
      {lead}
      <div className="flex min-w-0 flex-col" style={{ gap: 4 }}>
        <span className="text-muted-foreground truncate" style={boardType(14)}>
          {label}
        </span>
        <span className="truncate font-semibold" style={boardType(19)}>
          {value}
        </span>
      </div>
    </div>
  );
}

export function StripQr({
  url,
  lines,
}: {
  url: string;
  lines: [string, string];
}) {
  return (
    <div
      className="flex flex-none items-center"
      style={{ paddingInline: "18px 12px" }}
    >
      <QrCell lines={lines} size={66} url={url} />
    </div>
  );
}

export function useFollowLines(): [string, string] {
  const m = useMessages().liveBoard.board;
  return [m.followOn, m.followPhone];
}

/** The Organizer's one line, laid over the bottom strip until it is taken down. */
export function MessageStrip({ message }: { message: string }) {
  const m = useMessages().liveBoard.board;
  const size = message.length > 62 ? 22 : message.length > 45 ? 26 : 32;
  return (
    <div
      className="bg-ink text-paper absolute flex items-center"
      style={{
        left: 48,
        right: 48,
        bottom: 34,
        height: 96,
        borderRadius: 16,
        gap: 22,
        padding: "0 30px",
      }}
    >
      <span
        className="flex-none"
        style={{ ...boardType(15, 1.3), maxWidth: 84 }}
      >
        {m.fromOrganizer}
      </span>
      <span className="bg-paper flex-none" style={{ width: 1, height: 44 }} />
      <span className="font-expanded truncate" style={boardType(size)}>
        {message}
      </span>
    </div>
  );
}

/** Which Board screen is on: one short bar each, the one showing lit. */
export function ScreenBars({
  count,
  active,
}: {
  count: number;
  active: number;
}) {
  return (
    <div
      className="absolute inset-x-0 flex justify-center"
      style={{ bottom: 13, gap: 6 }}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={index === active ? "bg-ink" : "bg-rule"}
          style={{ width: 56, height: 4, borderRadius: 2 }}
        />
      ))}
    </div>
  );
}

/** A board with nothing to score yet: what it is waiting for, and when it starts. */
export function WaitingPanel({ title, line }: { title: string; line: string }) {
  return (
    <div
      className={cn(
        LIFTED,
        "flex min-h-0 flex-1 flex-col items-center justify-center",
      )}
      style={{ borderRadius: 16, gap: 14 }}
    >
      <NotYet height={56} lifted radius={14} width={56} />
      <div className="font-expanded text-center" style={boardType(44, 1.1)}>
        {title}
      </div>
      <div className="text-dim" style={boardType(20)}>
        {line}
      </div>
    </div>
  );
}
