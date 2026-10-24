import { describe, expect, it } from "vitest";

import type { GameRow } from "#src/games/access";
import { isIndividualSeatGame } from "#src/games/seats";

type Shape = Pick<GameRow, "format" | "registrationMode" | "sport">;

function seatGame(shape: Shape) {
  return isIndividualSeatGame(shape as GameRow);
}

describe("isIndividualSeatGame", () => {
  const cases: (Shape & { seats: boolean })[] = [
    {
      format: "friendly_game",
      registrationMode: "individual",
      sport: "padel",
      seats: true,
    },
    {
      format: "friendly_game",
      registrationMode: "individual",
      sport: null,
      seats: true,
    },
    {
      format: "friendly_game",
      registrationMode: "individual",
      sport: "football",
      seats: false,
    },
    {
      format: "friendly_tournament",
      registrationMode: "individual",
      sport: "padel",
      seats: true,
    },
    {
      format: "friendly_tournament",
      registrationMode: "team_only",
      sport: "padel",
      seats: false,
    },
    {
      format: "friendly_game",
      registrationMode: "team_only",
      sport: "padel",
      seats: false,
    },
    {
      format: "americano",
      registrationMode: "individual",
      sport: "padel",
      seats: false,
    },
    {
      format: "americano",
      registrationMode: "individual",
      sport: "football",
      seats: false,
    },
  ];

  it.each(cases)(
    "$format / $registrationMode / $sport seats: $seats",
    ({ seats, ...shape }) => {
      expect(seatGame(shape)).toBe(seats);
    },
  );
});
