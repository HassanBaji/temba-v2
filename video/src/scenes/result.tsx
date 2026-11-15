import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { marks, mvpVotes, players, score } from "../data";
import { Screen } from "../phone";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { MarkCoin } from "../primitives/coin";
import { Hairline, Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { c, snap } from "../theme";

export const VOTES_FROM = 10;
export const VOTE_EVERY = 3.6;
export const MVP_AT = 52;
export const MARKS_AT = 72;
export const COINS_FROM = 84;
export const COIN_EVERY = 8;
export const SHARE_AT = 136;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const totalVotes = mvpVotes.reduce((sum, row) => sum + row.votes, 0);

/** The order votes land in: round-robin until each player has theirs. */
export const voteOrder = (() => {
  const left = mvpVotes.map((row) => row.votes);
  const order: number[] = [];
  while (order.length < totalVotes) {
    left.forEach((n, i) => {
      if (n > 0) {
        order.push(i);
        left[i] = n - 1;
      }
    });
  }
  return order;
})();

export const voteAt = (k: number) => Math.round(VOTES_FROM + k * VOTE_EVERY);

function TeamSquare({ solid }: { solid: boolean }) {
  return <div style={{ width: 12, height: 12, borderRadius: 3, background: solid ? c.ink : c.paper, border: `1.5px solid ${c.ink}`, boxSizing: "border-box" }} />;
}

function ScoreHeader() {
  return (
    <Surface style={{ padding: "14px 18px 12px", marginTop: 2 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, width: 92 }}>
          <TeamSquare solid />
          <Text weight="semibold">Team A</Text>
        </div>
        <Text size={40} expanded style={{ lineHeight: "44px" }}>
          {score.a}
          <span style={{ color: c.faint, margin: "0 10px" }}>–</span>
          {score.b}
        </Text>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7, width: 92 }}>
          <Text weight="semibold">Team B</Text>
          <TeamSquare solid={false} />
        </div>
      </div>
      <Text size="meta" muted align="center" style={{ marginTop: 4 }}>
        {score.line}
      </Text>
    </Surface>
  );
}

function MvpVote() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cast = voteOrder.filter((_, k) => frame >= voteAt(k)).length;
  const coin = spring({ frame: frame - MVP_AT, fps, config: snap });
  const max = Math.max(...mvpVotes.map((row) => row.votes));
  return (
    <Surface style={{ marginTop: 14, padding: "16px 16px 8px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text size="title" weight="semibold">
          MVP vote
        </Text>
        <Text size="meta" muted={cast < totalVotes} weight={cast < totalVotes ? "regular" : "semibold"}>
          {cast} of {totalVotes} voted
        </Text>
      </div>
      <div style={{ marginTop: 10 }}>
        {mvpVotes.map((row, i) => {
          const votes = voteOrder.slice(0, cast).filter((v) => v === i).length;
          const fill = interpolate(votes, [0, max], [0, 1]);
          const player = players[row.index]!;
          const isMvp = i === 0;
          return (
            <div key={row.index}>
              {i > 0 ? <Hairline /> : null}
              <div style={{ height: 60, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <Avatar name={player.name} size={38} />
                  {isMvp && frame >= MVP_AT ? (
                    <div style={{ position: "absolute", right: -8, bottom: -6, transform: `scale(${coin})` }}>
                      <MarkCoin kind="mvp" size={24} />
                    </div>
                  ) : null}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <Text weight={isMvp && frame >= MVP_AT ? "semibold" : "medium"}>{player.short}</Text>
                    {isMvp && frame >= MVP_AT ? (
                      <Text size="meta" weight="semibold" style={{ opacity: coin }}>
                        MVP
                      </Text>
                    ) : null}
                  </div>
                  <div style={{ position: "relative", height: 8, marginTop: 7, borderRadius: 4, background: c.wash, border: `1px solid ${c.rule}`, overflow: "hidden" }}>
                    <div style={{ width: `${fill * 100}%`, height: "100%", background: c.ink }} />
                  </div>
                </div>
                <Text size="figure" expanded style={{ width: 26, textAlign: "right" }}>
                  {votes}
                </Text>
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

function MarksList() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const share = spring({ frame: frame - SHARE_AT, fps, config: snap });
  return (
    <>
      <div style={{ marginTop: 16, marginBottom: 8 }}>
        <Text size="title" weight="semibold">
          Marks
        </Text>
        <Text size="meta" muted>
          From teammates and opponents
        </Text>
      </div>
      <Surface>
        {marks.map((mark, i) => {
          const at = COINS_FROM + i * COIN_EVERY;
          const pop = spring({ frame: frame - at, fps, config: snap });
          const shown = frame >= at;
          return (
            <div key={mark.kind}>
              {i > 0 ? <Hairline inset={62} /> : null}
              <div style={{ height: 50, display: "flex", alignItems: "center", gap: 12, padding: "0 14px" }}>
                <div style={{ width: 34, height: 34, position: "relative" }}>
                  {shown ? (
                    <div style={{ transform: `scale(${pop}) rotate(${(1 - pop) * -40}deg)` }}>
                      <MarkCoin kind={mark.kind} size={34} />
                    </div>
                  ) : (
                    <div style={{ width: 34, height: 34, borderRadius: 17, border: `1px dashed ${c.rule}`, boxSizing: "border-box" }} />
                  )}
                </div>
                <Text weight="medium" style={{ flex: 1 }}>
                  {players[mark.index]!.name}
                </Text>
                <Text size="meta" weight="semibold" style={{ opacity: interpolate(frame - at, [2, 6], [0, 1], clamp) }}>
                  {mark.name}
                </Text>
              </div>
            </div>
          );
        })}
      </Surface>
      <div style={{ marginTop: 14, transform: `scale(${frame >= SHARE_AT ? 0.92 + share * 0.08 : 1})`, opacity: frame >= SHARE_AT ? Math.min(1, share * 1.5) : 0 }}>
        <Button>Share result</Button>
      </div>
    </>
  );
}

export function ResultScreen() {
  const frame = useCurrentFrame();
  const phase = interpolate(frame, [MARKS_AT - 3, MARKS_AT + 3], [0, 1], clamp);
  return (
    <Screen title="Result">
      <ScoreHeader />
      <div style={{ position: "relative" }}>
        {phase < 1 ? (
          <div style={{ opacity: 1 - phase }}>
            <MvpVote />
          </div>
        ) : null}
        {phase > 0 ? (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, opacity: phase }}>
            <MarksList />
          </div>
        ) : null}
      </div>
    </Screen>
  );
}
