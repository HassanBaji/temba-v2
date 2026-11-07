import {
  footballResultCard,
  padelResultCard,
  type ResultCard,
} from "@repo/domain/game-result-share";
import { markCoins } from "@repo/design-tokens/marks";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Sticker } from "./stickers";
import { StoryCard } from "./story-cards";

const place = {
  windowStart: new Date("2026-10-10T17:00:00.000Z"),
  windowEnd: new Date("2026-10-10T18:30:00.000Z"),
  venue: { name: "Padel Hub", city: null },
  courtName: "Court 3",
};

function seat(userId: string, name: string) {
  return { userId, name, image: null, levelBand: "C1" as const };
}

const padel = padelResultCard(
  {
    ...place,
    viewerUserId: "you",
    rated: true,
    sides: [
      {
        sideIndex: 1,
        gameTeamId: "t1",
        left: seat("you", "Elin Larsson"),
        right: seat("p2", "Maryam Khalaf"),
      },
      {
        sideIndex: 2,
        gameTeamId: "t2",
        left: seat("p3", "Hassan Ali"),
        right: seat("p4", "Khalid Mansoor"),
      },
    ],
    match: {
      startTime: null,
      durationInMinutes: 90,
      slot1GameTeamId: "t1",
      slot2GameTeamId: "t2",
      sets: [
        { id: "s1", slot1GamesWon: 6, slot2GamesWon: 4 },
        { id: "s2", slot1GamesWon: 6, slot2GamesWon: 3 },
      ],
      outcome: { slot1SetWins: 2, slot2SetWins: 0, result: "slot1" as const },
    },
  },
  "en",
);

const football = footballResultCard(
  {
    ...place,
    players: [],
    bibs: { slot1: "black", slot2: "white" },
    score: { slot1: 3, slot2: 1 },
    sideSize: 6,
    rated: true,
  },
  "en",
);

const mvp = { name: "Yousif Kadhem", decidedBy: "By vote, 7 of 12" };
const MVP_DISC = `fill="${markCoins.mvp.disc}"`;

function story(card: ResultCard) {
  return renderToStaticMarkup(createElement(StoryCard, { card }));
}

describe.each([
  ["padel", padel],
  ["football", football],
] as const)("the %s story", (_sport, card) => {
  it("draws one MVP line with the gold coin when the MVP is settled", () => {
    const html = story({ ...card, mvp });

    expect(html.match(/data-slot="story-mvp"/g)).toHaveLength(1);
    expect(html).toContain("Yousif Kadhem, MVP");
    expect(html).toContain("By vote, 7 of 12");
    expect(html).toContain(MVP_DISC);
  });

  it("draws no MVP line and no coin without a settled MVP", () => {
    const html = story({ ...card, mvp: null });

    expect(html).not.toContain('data-slot="story-mvp"');
    expect(html).not.toContain('data-slot="mark-coin"');
    expect(html).not.toContain(", MVP");
  });

  it("leaves the sticker as it was", () => {
    const sticker = (next: ResultCard) =>
      renderToStaticMarkup(createElement(Sticker, { card: next }));

    expect(sticker({ ...card, mvp })).toBe(sticker({ ...card, mvp: null }));
  });
});
