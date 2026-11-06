import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  defaultJoinSide,
  defaultJoinTeam,
  joinSeatSummary,
  joinSideFor,
  joinSideHelp,
  joinSideOptions,
  joinTeamCta,
  joinTeamOptions,
  lineupSidesNote,
  offersSetSides,
  offersSwapSides,
  openSeatSideLabel,
  seatSideLabel,
  seatSideState,
  sidePickerHint,
  teamHasNoSidesPicked,
  viewerSideChoice,
  viewerSideOpenLine,
  type SidesTeam,
} from "./padel-sides";

const ali = { userId: "ali", name: "Ali M.", eitherSide: false };
const hassanEither = { userId: "hassan", name: "Hassan", eitherSide: true };
const yousif = { userId: "yousif", name: "Yousif K.", eitherSide: false };
const omarEither = { userId: "omar", name: "Omar S.", eitherSide: true };

const teamAWithAli: SidesTeam = { sideIndex: 1, left: null, right: ali };
const emptyTeamB: SidesTeam = { sideIndex: 2, left: null, right: null };

describe("Line-up side labels", () => {
  it("labels the open seat next to a partner who picked with the free side", () => {
    assert.equal(
      openSeatSideLabel(teamAWithAli, "left", "en"),
      "Left, or either",
    );
    assert.equal(openSeatSideLabel(emptyTeamB, "left", "en"), "Any side");
  });

  it("labels Either next to a picked partner as auto, and the viewer's own as Either side", () => {
    const team = { sideIndex: 2, left: yousif, right: omarEither };
    assert.equal(seatSideState(team, "right"), "auto");
    assert.equal(seatSideLabel(team, "right", "hassan", "en"), "Right, auto");
    assert.equal(seatSideLabel(team, "left", "hassan", "en"), "Left");
    const mine = { sideIndex: 1, left: hassanEither, right: ali };
    assert.equal(seatSideLabel(mine, "left", "hassan", "en"), "Either side");
  });

  it("marks a full team of Either players as no sides picked", () => {
    const team = { sideIndex: 1, left: hassanEither, right: omarEither };
    assert.equal(teamHasNoSidesPicked(team), true);
    assert.equal(seatSideLabel(team, "right", "ali", "en"), "Either");
    assert.equal(offersSetSides(team, true), true);
    assert.equal(offersSetSides(team, false), false);
  });

  it("names who set the sides", () => {
    const team = {
      sideIndex: 1,
      left: { ...hassanEither, eitherSide: false, sideSetByUserId: "org" },
      right: { ...omarEither, eitherSide: false, sideSetByUserId: "org" },
    };
    assert.equal(seatSideLabel(team, "left", "org", "en"), "Left, set by you");
    assert.equal(
      seatSideLabel(team, "left", "hassan", "en"),
      "Left, set by organizer",
    );
    assert.equal(offersSwapSides(team, "org"), true);
  });
});

describe("Join sheet", () => {
  it("describes each team and preselects the one with a partner", () => {
    assert.deepEqual(
      joinTeamOptions([teamAWithAli, emptyTeamB], "en").map((row) => row.meta),
      ["With Ali M. (Right). 1 seat", "Empty. 2 seats"],
    );
    assert.equal(defaultJoinTeam([emptyTeamB, teamAWithAli]), 1);
  });

  it("hatches the side a partner picked and falls back to Either", () => {
    const options = joinSideOptions(teamAWithAli, "en");
    assert.equal(
      options.find((row) => row.side === "right")?.takenBy,
      "Ali M.",
    );
    assert.equal(defaultJoinSide(teamAWithAli, "right"), "either");
    assert.equal(defaultJoinSide(emptyTeamB, "right"), "right");
    assert.equal(joinSideFor(teamAWithAli, "right"), "either");
  });

  it("explains the side and names the seat", () => {
    assert.equal(
      joinSideHelp(teamAWithAli, "either", "en"),
      "Ali M. picked Right, so you'd play Left by default. Change it any time before the game.",
    );
    assert.equal(joinSeatSummary(1, "either", "en"), "Team A, either side");
    assert.equal(joinTeamCta(1, "either", "en"), "Join Team A");
    assert.equal(joinTeamCta(2, "left", "en"), "Join Team B, Left");
    assert.equal(
      sidePickerHint("right", "en"),
      "optional, your usual is Right",
    );
  });
});

describe("Viewer notes", () => {
  it("tells a viewer who answered Either where they play", () => {
    const teams = [{ sideIndex: 1, left: hassanEither, right: ali }];
    assert.equal(
      lineupSidesNote({
        teams,
        viewerUserId: "hassan",
        canJoin: false,
        locale: "en",
      }),
      "Ali M. picked Right, so you play Left. You didn't pick a side.",
    );
    assert.equal(
      viewerSideOpenLine(teams, "hassan", "en"),
      "Side open until you or Ali M. change it",
    );
    assert.equal(viewerSideChoice(teams, "hassan"), "either");
  });

  it("invites joining while seats are open", () => {
    assert.equal(
      lineupSidesNote({
        teams: [teamAWithAli, emptyTeamB],
        viewerUserId: null,
        canJoin: true,
        locale: "en",
      }),
      "Tap a team to join it. Sides are optional: pick one, or sort it out on court.",
    );
  });
});
