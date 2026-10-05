import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Hatch } from "./hatch";
import { Surface } from "./surface";

function classes(markup: string) {
  const match = /class="([^"]*)"/.exec(markup);
  return new Set((match?.[1] ?? "").split(" ").filter(Boolean));
}

describe("Surface", () => {
  it("keeps the classes the hand-written ink surfaces carried", () => {
    const markup = renderToStaticMarkup(
      createElement(Surface, {
        as: "article",
        tone: "ink",
        radius: "surface",
        className: "p-[22px]",
      }),
    );
    expect(markup.startsWith("<article")).toBe(true);
    expect(classes(markup)).toEqual(
      new Set([
        "surface-ink",
        "bg-ink",
        "text-paper",
        "rounded-xl",
        "p-[22px]",
      ]),
    );
  });

  it("keeps the classes the hand-written paper surface carried", () => {
    const markup = renderToStaticMarkup(
      createElement(Surface, { tone: "paper", className: "flex" }),
    );
    expect(classes(markup)).toEqual(new Set(["bg-paper", "text-ink", "flex"]));
  });

  it("defaults to a paper div", () => {
    const markup = renderToStaticMarkup(createElement(Surface));
    expect(markup.startsWith("<div")).toBe(true);
    expect(classes(markup).has("surface-ink")).toBe(false);
  });
});

describe("Hatch", () => {
  it("is hidden from assistive technology and light by default", () => {
    const markup = renderToStaticMarkup(createElement(Hatch));
    expect(markup).toContain('aria-hidden="true"');
    expect(classes(markup)).toEqual(new Set(["hatch"]));
  });

  it("adds the on-ink variant and the radius", () => {
    const markup = renderToStaticMarkup(
      createElement(Hatch, {
        tone: "ink",
        radius: "slot",
        className: "size-3",
      }),
    );
    expect(classes(markup)).toEqual(
      new Set(["hatch", "hatch-on-ink", "rounded-xs", "size-3"]),
    );
  });
});
