import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  liveBoardPreviews,
  PREVIEW_NOW,
} from "~/app/dashboard/design/live-board/fixtures";

import type { LiveBoardSnapshot } from "./board-kit";
import { LiveBoard } from "./live-board";

function preview(title: string): LiveBoardSnapshot {
  const found = liveBoardPreviews.find((entry) => entry.title === title);
  if (!found) {
    throw new Error(`No preview called ${title}`);
  }
  return found.snapshot;
}

function render(snapshot: LiveBoardSnapshot, now = PREVIEW_NOW) {
  return renderToStaticMarkup(
    createElement(LiveBoard, { snapshot, now, fill: false }),
  );
}

describe("a Social's Live board", () => {
  const social = preview("2a Social, On court");

  it("opens on the courts with the table and the next Round", () => {
    const html = render(social);
    expect(html).toContain("On court now");
    expect(html).toContain("Round 4, started 12:00");
    expect(html).toContain("Layla &amp; Nora");
    expect(html).toContain("No score yet");
    expect(html).toContain("In play");
    expect(html).toContain("Round 4 of 7");
    expect(html).toContain("11:38");
    expect(html).toContain("after round 3 of 7");
    expect(html).toContain("Next, 12:40");
    expect(html).toContain("Follow on");
    expect(html).not.toContain("Win 3, draw 1, loss 0");
  });

  it("shows the full table with games and the points rule when held on Standings", () => {
    const html = render(preview("3a Social, Standings"));
    expect(html).toContain("after round 3 of 7. Win 3, draw 1, loss 0");
    expect(html).toContain("16–8");
    expect(html).toContain("Rounds");
    expect(html).not.toContain("Next, 12:40");
  });

  it("places each pair on Next up and names the Round after it", () => {
    const html = render(preview("3b Social, Next up"));
    expect(html).toContain("Next up, round 5");
    expect(html).toContain("starts 12:40, 30 minutes");
    expect(html).toContain("4th, 6 pts");
    expect(html).toContain("against");
    expect(html).toContain("Then, 1:20");
  });

  it("falls back to the courts when the next Round is not posted", () => {
    const lastPosted: LiveBoardSnapshot = {
      ...social,
      settings: { ...social.settings, heldScreen: "next_up" },
      content:
        social.content.kind === "social"
          ? {
              ...social.content,
              rounds: social.content.rounds.map((round) =>
                round.roundNumber > 4
                  ? { ...round, state: "not_made" as const, matches: [] }
                  : round,
              ),
            }
          : social.content,
    };
    const html = render(lastPosted);
    expect(html).toContain("On court now");
    expect(html).toContain("Not posted yet");
    expect(html).not.toContain("Next up, round 5");
  });

  it("rotates to Standings after ten seconds", () => {
    const rotating: LiveBoardSnapshot = {
      ...social,
      settings: { ...social.settings, rotate: true },
    };
    expect(render(rotating)).toContain("On court now");
    const later = new Date(PREVIEW_NOW.getTime() + 10_000);
    expect(render(rotating, later)).toContain("Win 3, draw 1, loss 0");
  });

  it("ends on the winners and the final table", () => {
    const html = render(preview("3c Social, final"));
    expect(html).toContain("Sunday Social, final");
    expect(html).toContain("Finished 2:30 PM");
    expect(html).toContain("1st of 8");
    expect(html).toContain("Qasim Albaqali");
    expect(html).toContain("19 points. 6 won, 1 drawn, 0 lost, +19 games");
    expect(html).toContain("Final standings");
    expect(html).toContain("7 rounds, 28 games");
    expect(html).toContain("Results");
    expect(html).not.toContain("left in the round");
  });

  it("waits until a Round is posted", () => {
    const html = render(preview("Before the Rounds are posted"));
    expect(html).toContain("The rounds are not posted yet");
    expect(html).toContain("Starts Monday 9 Nov");
  });

  it("ranks an Americano's players on games won", () => {
    const html = render(preview("Americano, twelve players"));
    expect(html).toContain("Player");
    expect(html).toContain("Ranked on games won");
    expect(html).toContain("Qasim A");
  });

  it("lays the Organizer's message over the bottom and hides the QR when it is off", () => {
    expect(render(preview("Message to the room"))).toContain(
      "Round 5 starts in 2 minutes. Check your court.",
    );
    const noQr: LiveBoardSnapshot = {
      ...social,
      settings: { ...social.settings, showQr: false },
    };
    expect(render(noQr)).not.toContain("Follow on");
  });

  it("is drawn in the scheme the Organizer picked", () => {
    expect(render(social)).toMatch(/class="dark /);
    expect(render(preview("5a Social, light"))).toMatch(/class="light /);
  });
});

describe("a one-Match Live board", () => {
  it("shows a padel Match's Sets, the Set in play and the match time", () => {
    const html = render(preview("4a Padel match"));
    expect(html).toContain("Friendly match");
    expect(html).toContain("Hassan Haji");
    expect(html).toContain("C+");
    expect(html).toContain("Set 3, in play");
    expect(html).toContain("Set 3 in play");
    expect(html).toContain("Counts for Temba Level");
    expect(html).toContain("1:12");
    expect(html).toContain("match time");
  });

  it("shows a football Game's Score, Scorers and both sides", () => {
    const html = render(preview("4b Football game"));
    expect(html).toContain("Black");
    expect(html).toContain("White");
    expect(html).toContain("Ali K");
    expect(html).toContain("minutes played");
    expect(html).toContain("7-a-side, 8 a squad");
    expect(html).toContain("After the game");
    expect(html).toContain("Karbabad Turf, Pitch 2");
  });

  it("waits for the football teams to be published", () => {
    expect(render(preview("Football, teams not published"))).toContain(
      "The teams are not posted yet",
    );
  });
});
