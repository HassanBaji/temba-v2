import {
  bibColors,
  invertedFocusPalettes,
  palettes,
} from "@repo/design-tokens";
import { describe, expect, it } from "vitest";

import { bibBlendsIn, bibEdge } from "./bib-edge";

describe("bibBlendsIn", () => {
  const light = invertedFocusPalettes.light;
  const dark = invertedFocusPalettes.dark;

  it("sinks the white bib into the light page and no other bib", () => {
    expect(bibBlendsIn(bibColors.white.fill, light.paper, "light")).toBe(true);
    expect(bibBlendsIn(bibColors.black.fill, light.paper, "light")).toBe(false);
    expect(bibBlendsIn(bibColors.red.fill, light.paper, "light")).toBe(false);
  });

  it("sinks no bib into the light focused surface", () => {
    expect(bibBlendsIn(bibColors.white.fill, light.focus, "light")).toBe(false);
    expect(bibBlendsIn(bibColors.black.fill, light.focus, "light")).toBe(false);
  });

  it("sinks the black bib into the dark page and the dark focused surface", () => {
    expect(bibBlendsIn(bibColors.black.fill, dark.paper, "dark")).toBe(true);
    expect(bibBlendsIn(bibColors.black.fill, dark.focus, "dark")).toBe(true);
    expect(bibBlendsIn(bibColors.white.fill, dark.paper, "dark")).toBe(false);
    expect(bibBlendsIn(bibColors.red.fill, dark.focus, "dark")).toBe(false);
  });
});

describe("bibEdge", () => {
  it("edges the white bib in light", () => {
    expect(bibEdge(bibColors.white.fill, palettes.light, "light")).toBe(
      palettes.light.inputBorder,
    );
    expect(bibEdge(bibColors.black.fill, palettes.light, "light")).toBe(
      bibColors.black.fill,
    );
  });

  it("edges the black bib in dark", () => {
    expect(bibEdge(bibColors.black.fill, palettes.dark, "dark")).toBe(
      palettes.dark.inputBorder,
    );
    expect(bibEdge(bibColors.white.fill, palettes.dark, "dark")).toBe(
      bibColors.white.fill,
    );
  });

  it("leaves a coloured bib on its own fill", () => {
    expect(bibEdge(bibColors.red.fill, palettes.dark, "dark")).toBe(
      bibColors.red.fill,
    );
  });
});
