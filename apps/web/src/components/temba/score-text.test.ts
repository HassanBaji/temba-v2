import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "~/components/locale-provider";
import { ScoreText } from "~/components/temba/score-text";
import type { Locale } from "@repo/i18n/locale";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));
vi.mock("~/lib/set-locale-action", () => ({
  setLocaleAction: async () => undefined,
}));

function renderIn(locale: Locale) {
  return renderToStaticMarkup(
    createElement(LocaleProvider, {
      locale,
      children: createElement(ScoreText, { children: "6–4 7–5" }),
    }),
  );
}

describe("ScoreText", () => {
  it("isolates the score in the page direction", () => {
    expect(renderIn("ar")).toContain('<bdi dir="rtl" class="tabular-nums">');
    expect(renderIn("en")).toContain('<bdi dir="ltr" class="tabular-nums">');
  });
});
