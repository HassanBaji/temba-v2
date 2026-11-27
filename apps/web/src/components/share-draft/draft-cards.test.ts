import {
  draftShareCard,
  type DraftShareBoard,
  type DraftShareGame,
  type DraftShareMode,
} from "@repo/domain/football-draft-share";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DraftStoryCard } from "./draft-cards";

type Player = DraftShareBoard["players"][number];

function player(
  userId: string,
  name: string,
  extra: Partial<Player> = {},
): Player {
  return { userId, name, role: "outfield", position: "mid", ...extra };
}

const game: DraftShareGame = {
  windowStart: new Date("2026-10-17T17:00:00.000Z"),
  windowEnd: new Date("2026-10-17T18:00:00.000Z"),
  venue: { name: "Karbabad Turf", city: null },
  sideSize: 7,
  recordedCourts: [{ name: "Pitch 2" }],
};

function board(slot1: number, slot2: number): DraftShareBoard {
  const black = Array.from({ length: slot1 }, (_, i) =>
    player(`b${i}`, `Black Player${i}`),
  );
  const white = Array.from({ length: slot2 }, (_, i) =>
    player(`w${i}`, `White Player${i}`),
  );
  return {
    players: [
      ...black,
      ...white,
      player("rashid", "Rashid Nasser", { position: "def" }),
      player("hassan", "Hassan Ali", { role: "keeper", position: null }),
    ],
    draft: {
      bibs: { slot1: "black", slot2: "white" },
      sides: {
        slot1: ["rashid", "hassan", ...black.map((p) => p.userId)],
        slot2: white.map((p) => p.userId),
      },
      captains: { slot1: "rashid", slot2: null },
    },
  };
}

function card(mode: DraftShareMode, slot1 = 2, slot2 = 4) {
  const built = draftShareCard(game, board(slot1, slot2), mode, "en");
  if (!built) {
    throw new Error("expected a draft card");
  }
  return built;
}

function render(mode: DraftShareMode, slot1?: number, slot2?: number) {
  return renderToStaticMarkup(
    createElement(DraftStoryCard, { card: card(mode, slot1, slot2) }),
  );
}

describe("DraftStoryCard", () => {
  it.each(["both", "slot1", "slot2"] as const)(
    "draws the %s card at 1080 by 1920 on ink, stamped as a draft",
    (mode) => {
      const html = render(mode);

      expect(html).toContain("width:1080px;height:1920px");
      expect(html).toMatch(/^<div class="light bg-ink text-paper/);
      expect(html).toContain("DRAFT, NOT FINAL");
      expect(html).toContain("DRAFT / FOOTBALL / 7-A-SIDE");
    },
  );

  it("draws both teams with their captain lines and lists", () => {
    const html = render("both");

    expect(html).toContain("CAPTAIN RASHID N");
    expect(html).toContain("NO CAPTAIN");
    expect(html).toContain("TEAM BLACK");
    expect(html).toContain("TEAM WHITE");
    expect(html.match(/data-slot="draft-list"/g)).toHaveLength(2);
  });

  it("puts a C on the captain's row alone and marks nobody else", () => {
    const html = render("both");

    expect(html.match(/aria-label="Captain"/g)).toHaveLength(1);
    expect(html).not.toContain("YOU");
  });

  it("draws one team with the line about the other", () => {
    const html = render("slot2");

    expect(html).toContain("White");
    expect(html).not.toContain("TEAM BLACK");
    expect(html).toContain("NO CAPTAIN / 4 PLAYERS");
    expect(html).toContain("against Black, 7 start, the captain picks them");
  });

  it("ends a list that runs out of room with and N more", () => {
    const html = render("both", 12, 2);

    expect(html).toContain("and 3 more");
  });
});
