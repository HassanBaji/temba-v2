import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PairLabel } from "~/components/temba/pair-label";

function render(label: string) {
  return renderToStaticMarkup(createElement(PairLabel, { label }));
}

function namesIn(html: string) {
  return [...html.matchAll(/<span dir="auto"[^>]*>([^<]*)<\/span>/g)].map(
    (match) => match[1],
  );
}

describe("PairLabel", () => {
  it("gives each partner a span of their own", () => {
    const html = render("Testa Phonedoor / أحمد الخليفة");

    expect(namesIn(html)).toEqual(["Testa Phonedoor", "أحمد الخليفة"]);
    expect(html).toContain(">Testa Phonedoor</span>");
    expect(html.replace(/<[^>]+>/g, "")).toBe("Testa Phonedoor / أحمد الخليفة");
  });

  it("draws a single name as one span", () => {
    expect(namesIn(render("Team A"))).toEqual(["Team A"]);
  });
});
