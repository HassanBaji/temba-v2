import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderThemeCss } from "./theme-css.ts";
import { bibColors, colors } from "./tokens.ts";

describe("theme.css", () => {
  it("matches the committed stylesheet; run `pnpm --filter @repo/design-tokens generate` after changing tokens", () => {
    const committed = readFileSync(
      new URL("../theme.css", import.meta.url),
      "utf8",
    );
    expect(committed).toBe(renderThemeCss());
  });
});

describe("colors", () => {
  it("are plain hex or rgba", () => {
    for (const value of Object.values(colors)) {
      expect(value).toMatch(/^(#[0-9a-f]{6}|rgba\(.+\))$/);
    }
  });
});

describe("bibColors", () => {
  it("name every football bib with a hex fill and ink", () => {
    for (const bib of Object.values(bibColors)) {
      expect(bib.fill).toMatch(/^#[0-9a-f]{6}$/);
      expect(bib.on).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
