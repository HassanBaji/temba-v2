import { markCoins } from "@repo/design-tokens/marks";
import { createGamesHubFixtures } from "@repo/domain/games-hub-fixtures";
import { matchHistoryCardModel } from "@repo/domain/match-history-card";
import type { CoinKind, MarkKind } from "@repo/domain/marks";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MatchHistoryCard } from "./match-history-card";

type Row = Parameters<typeof MatchHistoryCard>[0]["row"];

const fixture = createGamesHubFixtures(new Date("2026-10-12T12:00:00.000Z"))
  .mixed.history[0]!;

function render(marks: { viewerMarks: MarkKind[]; viewerIsMvp: boolean }) {
  const row: Row = { ...fixture, ratingScope: "temba", ...marks };
  return renderToStaticMarkup(createElement(MatchHistoryCard, { row }));
}

function coinsDrawn(html: string): CoinKind[] {
  const discs = [
    ...html.matchAll(
      /data-slot="mark-coin"[^]*?<svg[^>]*><circle[^>]*?fill="(#[0-9a-f]+)"/gi,
    ),
  ].map((match) => match[1]!.toLowerCase());
  return discs.map((disc) => {
    const kind = (Object.keys(markCoins) as CoinKind[]).find(
      (key) => markCoins[key].disc.toLowerCase() === disc,
    );
    if (!kind) {
      throw new Error(`No coin has the disc ${disc}`);
    }
    return kind;
  });
}

function linkLabel(html: string) {
  return /aria-label="([^"]*)"/.exec(html)?.[1];
}

describe("MatchHistoryCard coins", () => {
  it("draws the viewer's coins at 20 px after the score", () => {
    const html = render({
      viewerMarks: ["clutch", "dynamo"],
      viewerIsMvp: false,
    });

    expect(coinsDrawn(html)).toEqual(["clutch", "dynamo"]);
    expect(html).toContain("width:20px;height:20px");
    const score = matchHistoryCardModel(fixture, "en").scoreLine;
    expect(html).toContain(score);
    expect(html.indexOf('data-slot="mark-coin"')).toBeGreaterThan(
      html.indexOf(score),
    );
    expect(linkLabel(html)).toMatch(/\. Your marks: Clutch, Dynamo$/);
  });

  it("puts the MVP coin first and shows three coins at most", () => {
    const html = render({
      viewerMarks: ["clutch", "dynamo", "good_game"],
      viewerIsMvp: true,
    });

    expect(coinsDrawn(html)).toEqual(["mvp", "clutch", "dynamo"]);
    expect(linkLabel(html)).toMatch(/\. Your marks: MVP, Clutch, Dynamo$/);
  });

  it("leaves a card without marks as it was", () => {
    const html = render({ viewerMarks: [], viewerIsMvp: false });

    expect(html).not.toContain('data-slot="mark-coin"');
    expect(linkLabel(html)).not.toContain("Your marks");
  });
});
