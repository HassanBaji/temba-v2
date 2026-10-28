import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CourtSportBadge } from "./court-sport-badge";

const render = (sport: "padel" | "football") =>
  renderToStaticMarkup(createElement(CourtSportBadge, { sport }));

describe("CourtSportBadge", () => {
  it("shows the sport as a word with a glyph", () => {
    const padel = render("padel");
    const football = render("football");
    expect(padel).toContain("Padel");
    expect(football).toContain("Football");
    expect(padel).toContain("<svg");
    expect(football).toContain("<svg");
    expect(padel).not.toBe(football.replace("Football", "Padel"));
  });
});
