import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ListRow } from "~/components/common/row-list";

function titleTag(props: Parameters<typeof ListRow>[0]) {
  const html = renderToStaticMarkup(createElement(ListRow, props));
  return /<p[^>]*>/.exec(html)?.[0] ?? "";
}

describe("ListRow title", () => {
  it("truncates a plain-text title in its own direction", () => {
    const tag = titleTag({ title: "Testa Phonedoor" });

    expect(tag).toContain('dir="auto"');
    expect(tag).toContain("truncate");
  });

  it("leaves the direction of a composed title to its parts", () => {
    expect(
      titleTag({ title: createElement("span", null, "Testa") }),
    ).not.toContain("dir=");
  });

  it("wraps onto two lines instead of cutting a word", () => {
    const tag = titleTag({ title: "Autumn Cup", titleClamp: "lines" });

    expect(tag).toContain("line-clamp-2");
    expect(tag).not.toContain("truncate");
  });
});
