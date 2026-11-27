import { colors } from "@repo/design-tokens";
import {
  seriesBadgeColours,
  seriesBadgeHex,
  seriesBadgeSizes,
  seriesEmblems,
  type SeriesBadgeSize,
} from "@repo/design-tokens/series";
import {
  SERIES_COLOURS,
  SERIES_EMBLEMS,
  type SeriesColour,
  type SeriesEmblem,
} from "@repo/domain/series";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SeriesBadge } from "./series-badge";

function render(
  props: Partial<ComponentProps<typeof SeriesBadge>> = {},
): string {
  return renderToStaticMarkup(
    createElement(SeriesBadge, {
      emblem: "cup",
      colour: "gold",
      size: "card",
      ...props,
    }),
  );
}

const BADGES = SERIES_EMBLEMS.flatMap((emblem) =>
  SERIES_COLOURS.map((colour): [SeriesEmblem, SeriesColour] => [
    emblem,
    colour,
  ]),
);

describe("SeriesBadge", () => {
  it("has an emblem for every SeriesEmblem and no other, in the same order", () => {
    expect(Object.keys(seriesEmblems)).toEqual([...SERIES_EMBLEMS]);
  });

  it("has a colour for every SeriesColour and no other, in the same order", () => {
    expect(Object.keys(seriesBadgeColours)).toEqual([...SERIES_COLOURS]);
  });

  it("draws 42 badges", () => {
    expect(BADGES).toHaveLength(42);
  });

  it.each(BADGES)("draws the %s in %s", (emblem, colour) => {
    const html = render({ emblem, colour });
    const { disc, shade } = seriesBadgeColours[colour];
    expect(html).toContain(`fill="${disc}" stroke="${disc}"`);
    expect(html).toContain(`="${shade}"`);
    for (const other of SERIES_COLOURS) {
      if (other === colour) continue;
      expect(html).not.toContain(seriesBadgeColours[other].disc);
      expect(html).not.toContain(seriesBadgeColours[other].shade);
    }
    const shapes = html.match(/<(path|polygon|rect|circle|ellipse) /g) ?? [];
    expect(shapes).toHaveLength(seriesEmblems[emblem].length + 1);
  });

  it("opens with the hexagon, its corners rounded by its own stroke", () => {
    const { points, strokeWidth, strokeLinejoin } = seriesBadgeHex;
    const { disc } = seriesBadgeColours.gold;
    expect(render()).toContain(
      `<svg viewBox="0 0 120 120" width="60" height="60" class="block"><polygon points="${points}" stroke-width="${strokeWidth}" stroke-linejoin="${strokeLinejoin}" fill="${disc}" stroke="${disc}"></polygon>`,
    );
  });

  it("keeps the emblem's light ink and paper, whatever the scheme", () => {
    const html = render({ emblem: "cup", colour: "gold" });
    expect(html).toContain(`fill="${colors.paper}"`);
    expect(html).toContain(`fill="${colors.ink}"`);
    expect(html).not.toContain("var(--");
  });

  it("hides the badge and its count from assistive technology", () => {
    expect(render()).toMatch(/^<span[^>]*aria-hidden="true"/);
    expect(render({ count: 3 })).toMatch(/^<span[^>]*aria-hidden="true"/);
  });

  it.each(Object.entries(seriesBadgeSizes))(
    "sizes the %s badge at %ipx",
    (size, px) => {
      const html = render({ size: size as SeriesBadgeSize });
      expect(html).toContain(`width:${px}px;height:${px}px`);
      expect(html).toContain(`width="${px}" height="${px}"`);
    },
  );

  it("draws no count pill unless a count is given", () => {
    expect(render()).not.toContain("series-badge-count");
  });

  it("draws the count in ink with paper digits, on the bottom trailing corner", () => {
    const html = render({ count: 12 });
    const pill = /<span data-slot="series-badge-count"[^>]*>12<\/span>/.exec(
      html,
    )?.[0];
    expect(pill).toBeDefined();
    expect(pill).toContain("bg-ink");
    expect(pill).toContain("text-paper");
    expect(pill).toContain("tabular-nums");
    expect(pill).toContain("inset-inline-end:-6px");
    expect(pill).toContain("bottom:-2px");
    expect(pill).toContain("min-width:20px;height:20px");
    expect(pill).toContain("border-width:2px");
    expect(pill).not.toMatch(/(^|[;"\s])(left|right):/);
    expect(pill).not.toContain("dir=");
  });

  it.each([
    [undefined, "border-paper"],
    ["paper", "border-paper"],
    ["focus", "border-focus"],
    ["sheet", "border-sheet"],
  ] as const)("rings the count in the %s surface's role", (surface, ring) => {
    expect(render({ count: 1, surface })).toContain(ring);
  });

  it("keeps the badge's own colours out of the count pill", () => {
    const pill = /<span data-slot="series-badge-count".*$/.exec(
      render({ count: 2, colour: "red" }),
    )?.[0];
    expect(pill).not.toMatch(/#[0-9a-f]{6}/);
  });
});
