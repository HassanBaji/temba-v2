import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LevelSlider } from "~/components/groups/level-slider";
import { LocaleProvider } from "~/components/locale-provider";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { Locale } from "@repo/i18n/locale";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));
vi.mock("~/lib/set-locale-action", () => ({
  setLocaleAction: async () => undefined,
}));

function renderIn(locale: Locale, child: React.ReactElement) {
  return renderToStaticMarkup(
    createElement(LocaleProvider, { locale, children: child }),
  );
}

function openingTag(html: string, slot: string) {
  return new RegExp(`<[^>]*data-slot="${slot}"[^>]*>`).exec(html)?.[0] ?? "";
}

function tabs() {
  return createElement(
    Tabs,
    { defaultValue: "one" },
    createElement(
      TabsList,
      null,
      createElement(TabsTrigger, { value: "one" }, "1"),
      createElement(TabsTrigger, { value: "two" }, "2"),
    ),
  );
}

describe("LocaleProvider direction", () => {
  it("gives Radix primitives the page direction", () => {
    expect(openingTag(renderIn("ar", tabs()), "tabs")).toContain('dir="rtl"');
    expect(openingTag(renderIn("en", tabs()), "tabs")).toContain('dir="ltr"');
  });

  it("mirrors the Level slider with the page", () => {
    const html = renderIn(
      "ar",
      createElement(LevelSlider, {
        tenths: 30,
        currentTenths: 20,
        onTenthsChange: () => undefined,
      }),
    );

    expect(openingTag(html, "slider")).toContain('dir="rtl"');
    for (const slot of ["level-slider-value", "level-slider-now"]) {
      const tag = openingTag(html, slot);
      expect(tag).toContain("rtl:translate-x-1/2");
      expect(tag).toContain('style="inset-inline-start:');
    }
  });
});
