"use client";

import { BoardFrame, MessageStrip, type LiveBoardSnapshot } from "./board-kit";
import { FootballMatchScoreboard, PadelMatchScoreboard } from "./match-board";
import { SocialBoard } from "./social-board";

/** One Game's Live board at `now`: a Social's screens or a single scoreboard. */
export function LiveBoard({
  snapshot,
  now,
  fill,
}: {
  snapshot: LiveBoardSnapshot;
  now: Date;
  fill?: boolean;
}) {
  const { content } = snapshot;
  return (
    <BoardFrame colorScheme={snapshot.settings.colorScheme} fill={fill}>
      {content.kind === "social" ? (
        <SocialBoard content={content} now={now} snapshot={snapshot} />
      ) : null}
      {content.kind === "padel_match" ? (
        <PadelMatchScoreboard content={content} now={now} snapshot={snapshot} />
      ) : null}
      {content.kind === "football" ? (
        <FootballMatchScoreboard
          content={content}
          now={now}
          snapshot={snapshot}
        />
      ) : null}
      {snapshot.settings.message ? (
        <MessageStrip message={snapshot.settings.message} />
      ) : null}
    </BoardFrame>
  );
}
