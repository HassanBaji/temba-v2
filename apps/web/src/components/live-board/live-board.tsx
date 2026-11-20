"use client";

import { BoardFrame, type LiveBoardSnapshot } from "./board-kit";
import { FootballBoard, PadelMatchBoard } from "./match-board";
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
    <BoardFrame fill={fill} theme={snapshot.settings.theme}>
      {content.kind === "social" ? (
        <SocialBoard content={content} now={now} snapshot={snapshot} />
      ) : null}
      {content.kind === "padel_match" ? (
        <PadelMatchBoard content={content} now={now} snapshot={snapshot} />
      ) : null}
      {content.kind === "football" ? (
        <FootballBoard content={content} now={now} snapshot={snapshot} />
      ) : null}
    </BoardFrame>
  );
}
