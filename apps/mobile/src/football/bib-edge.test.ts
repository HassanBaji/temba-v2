import { bibColors, palettes } from "@repo/design-tokens";
import { describe, expect, it } from "vitest";

import { bibEdge } from "./bib-edge";

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
