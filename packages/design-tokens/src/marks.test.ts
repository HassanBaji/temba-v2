import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  coinDisc,
  coinToneColors,
  markCoins,
  type CoinAttrs,
  type CoinTone,
  type MarkCoinKind,
} from "./marks.ts";
import { darkColors } from "./tokens.ts";

const MARKS_DIR = new URL("../marks/", import.meta.url);
const SHAPES = new Set(["circle", "ellipse", "rect", "path", "polygon"]);
const PAINT_ATTRS = new Set(["fill", "stroke", "transform"]);
const STRING_ATTRS = new Set([
  "d",
  "points",
  "stroke-linecap",
  "stroke-linejoin",
]);
const SOURCE_INK = "#000";
const SOURCE_PAPER = "#fff";

type SourceElement = {
  shape: string;
  attrs: Record<string, number | string>;
  fill: string | undefined;
  stroke: string | undefined;
};

function attributes(source: string): Record<string, string> {
  return Object.fromEntries(
    [...source.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [
      name,
      value,
    ]),
  );
}

function camelCase(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/** The file's shapes in paint order, with each `<g>`'s transform and fill pushed down. */
function sourceElements(svg: string): SourceElement[] {
  const groups: Record<string, string>[] = [];
  const elements: SourceElement[] = [];
  for (const [, close, tag, rest] of svg.matchAll(/<(\/?)(\w+)([^>]*)>/g)) {
    if (tag === "svg") continue;
    if (tag === "g") {
      if (close) groups.pop();
      else groups.push(attributes(rest ?? ""));
      continue;
    }
    if (close) continue;
    if (!tag || !SHAPES.has(tag)) {
      throw new Error(`Unexpected <${tag}> in a coin`);
    }
    const own = attributes(rest ?? "");
    const attrs: Record<string, number | string> = {};
    for (const [name, value] of Object.entries(own)) {
      if (PAINT_ATTRS.has(name)) continue;
      attrs[camelCase(name)] = STRING_ATTRS.has(name) ? value : Number(value);
    }
    const transform = [...groups.map((group) => group.transform), own.transform]
      .filter(Boolean)
      .join(" ");
    if (transform) attrs.transform = transform;
    elements.push({
      shape: tag,
      attrs,
      fill: own.fill ?? groups.findLast((group) => group.fill)?.fill,
      stroke: own.stroke,
    });
  }
  return elements;
}

function sourceFile(kind: MarkCoinKind): string {
  return readFileSync(
    new URL(`${kind.replaceAll("_", "-")}.svg`, MARKS_DIR),
    "utf8",
  );
}

function sourceColour(kind: MarkCoinKind, tone: CoinTone): string {
  const coin = markCoins[kind];
  return {
    disc: coin.disc,
    shade: coin.shade,
    ink: SOURCE_INK,
    paper: SOURCE_PAPER,
  }[tone];
}

const kinds = Object.keys(markCoins) as MarkCoinKind[];

describe("markCoins", () => {
  it("has one coin per SVG file and one SVG file per coin", () => {
    const files = readdirSync(MARKS_DIR)
      .filter((file) => file.endsWith(".svg"))
      .map((file) => file.replace(/\.svg$/, "").replaceAll("-", "_"));
    expect([...kinds].sort()).toEqual(files.sort());
    expect(kinds).toHaveLength(13);
  });

  it.each(kinds)("%s paints only its four tones", (kind) => {
    const coin = markCoins[kind];
    const allowed = [coin.disc, coin.shade, SOURCE_INK, SOURCE_PAPER];
    for (const element of sourceElements(sourceFile(kind))) {
      for (const colour of [element.fill, element.stroke]) {
        if (colour === undefined || colour === "none") continue;
        expect(allowed).toContain(colour.toLowerCase());
      }
    }
  });

  it.each(kinds)("%s matches its SVG file element by element", (kind) => {
    const source = sourceElements(sourceFile(kind));
    const data = markCoins[kind].elements;
    expect(data).toHaveLength(source.length);
    data.forEach((element, index) => {
      const expected = source[index]!;
      const stroked =
        expected.stroke !== undefined && expected.stroke !== "none";
      expect(element.shape).toBe(expected.shape);
      expect(element.attrs satisfies CoinAttrs).toEqual(expected.attrs);
      expect(element.paint).toBe(stroked ? "stroke" : "fill");
      expect(sourceColour(kind, element.tone)).toBe(
        (stroked ? expected.stroke : expected.fill)?.toLowerCase(),
      );
    });
  });

  it.each(kinds)("%s opens with its disc", (kind) => {
    const [disc, ...rest] = markCoins[kind].elements;
    expect(disc).toEqual({
      shape: "circle",
      attrs: coinDisc,
      tone: "disc",
      paint: "fill",
    });
    expect(rest.some((element) => element.tone === "disc")).toBe(false);
  });

  it("uses lowercase hex for both coin colours", () => {
    for (const coin of Object.values(markCoins)) {
      expect(coin.disc).toMatch(/^#[0-9a-f]{6}$/);
      expect(coin.shade).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("coinToneColors", () => {
  it("paints an earned coin in its own colours", () => {
    expect(coinToneColors("mvp", "earned")).toEqual({
      disc: "#ffc233",
      shade: "#c98f0a",
      ink: "#000000",
      paper: "#ffffff",
    });
  });

  it.each(["paper", "ink"] as const)(
    "carries no coin colour when not yet earned, on %s",
    (surface) => {
      for (const kind of kinds) {
        const tones = coinToneColors(kind, "notYet", surface);
        expect(tones.disc).toBeNull();
        for (const colour of [tones.shade, tones.ink, tones.paper]) {
          expect(colour).not.toBe(markCoins[kind].disc);
          expect(colour).not.toBe(markCoins[kind].shade);
        }
      }
    },
  );

  it("draws a not-yet glyph in the surface's greys", () => {
    expect(coinToneColors("clutch", "notYet")).toEqual({
      disc: null,
      shade: "#e6e6e6",
      ink: "#6e6e6e",
      paper: "#ffffff",
    });
    expect(coinToneColors("clutch", "notYet", "ink")).toEqual({
      disc: null,
      shade: "#e0e0e0",
      ink: "#6e6e6e",
      paper: "#f4f4f4",
    });
  });

  it("keeps an earned coin's colours in the dark scheme", () => {
    expect(coinToneColors("mvp", "earned", "paper", darkColors)).toEqual(
      coinToneColors("mvp", "earned"),
    );
    expect(coinToneColors("mvp", "earned", "ink", darkColors)).toEqual(
      coinToneColors("mvp", "earned"),
    );
  });

  it("draws a not-yet glyph in the dark scheme's greys", () => {
    expect(coinToneColors("clutch", "notYet", "paper", darkColors)).toEqual({
      disc: null,
      shade: "#2e2e2e",
      ink: "#8e8e8e",
      paper: "#000000",
    });
    expect(coinToneColors("clutch", "notYet", "ink", darkColors)).toEqual({
      disc: null,
      shade: "#3a3a3a",
      ink: "#8e8e8e",
      paper: "#141414",
    });
  });
});
