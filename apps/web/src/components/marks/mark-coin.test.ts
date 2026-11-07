import {
  markCoinSizes,
  markCoins,
  type MarkCoinSize,
} from "@repo/design-tokens/marks";
import { COIN_KINDS, type CoinKind } from "@repo/domain/marks";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkCoin } from "./mark-coin";

function render(
  kind: CoinKind,
  state: "earned" | "notYet",
  size: MarkCoinSize = "set",
) {
  return renderToStaticMarkup(createElement(MarkCoin, { kind, size, state }));
}

describe("MarkCoin", () => {
  it("has a coin for every CoinKind and no other", () => {
    expect(Object.keys(markCoins).sort()).toEqual([...COIN_KINDS].sort());
  });

  it.each(COIN_KINDS)("draws %s in its own colours when earned", (kind) => {
    const html = render(kind, "earned");
    expect(html).toContain(`fill="${markCoins[kind].disc}"`);
    expect(html).toContain(markCoins[kind].shade);
    expect(html).not.toContain("hatch");
  });

  it.each(COIN_KINDS)(
    "draws %s as a hatched disc with no coin colour when not yet earned",
    (kind) => {
      const html = render(kind, "notYet");
      expect(html).toContain('class="hatch absolute rounded-full"');
      expect(html).not.toContain(markCoins[kind].disc);
      expect(html).not.toContain(markCoins[kind].shade);
      expect(html).toContain('="#6e6e6e"');
    },
  );

  it("hides the coin from assistive technology", () => {
    expect(render("clutch", "earned")).toMatch(/^<span[^>]*aria-hidden="true"/);
    expect(render("clutch", "notYet")).toMatch(/^<span[^>]*aria-hidden="true"/);
  });

  it.each(Object.entries(markCoinSizes))(
    "sizes the %s coin at %ipx",
    (size, px) => {
      const html = render("mvp", "earned", size as MarkCoinSize);
      expect(html).toContain(`width:${px}px;height:${px}px`);
      expect(html).toContain(`width="${px}" height="${px}"`);
    },
  );

  it("keeps the hatch on ink for a not-yet coin on an ink surface", () => {
    const html = renderToStaticMarkup(
      createElement(MarkCoin, {
        kind: "dynamo",
        size: "cabinet",
        state: "notYet",
        tone: "ink",
      }),
    );
    expect(html).toContain("hatch hatch-on-ink");
    expect(html).toContain('fill="#8e8e8e"');
  });

  it.each(["earned", "notYet"] as const)("renders %s as before", (state) => {
    expect(render("mr_ice", state, "cabinet")).toMatchSnapshot();
  });
});
