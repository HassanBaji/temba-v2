import { seriesBadgeColours } from "@repo/design-tokens/series";
import {
  SERIES_COLOURS,
  SERIES_EMBLEMS,
  type SeriesColour,
  type SeriesEmblem,
} from "@repo/domain/series";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "~/components/locale-provider";

import { SeriesColourPicker, SeriesEmblemPicker } from "./series-pickers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));
vi.mock("~/lib/set-locale-action", () => ({
  setLocaleAction: async () => undefined,
}));

function render(element: ReactElement, locale: Locale = "en") {
  return renderToStaticMarkup(
    createElement(LocaleProvider, { locale, children: element }),
  );
}

function emblemPicker(value: SeriesEmblem, locale: Locale = "en") {
  return render(
    createElement(SeriesEmblemPicker, { value, onChange: () => undefined }),
    locale,
  );
}

function colourPicker(value: SeriesColour, locale: Locale = "en") {
  return render(
    createElement(SeriesColourPicker, { value, onChange: () => undefined }),
    locale,
  );
}

function radios(html: string) {
  return html.match(/<button[^>]*role="radio"[^>]*>/g) ?? [];
}

describe("SeriesEmblemPicker", () => {
  it("is one labelled radio group with a chip per emblem, named", () => {
    const html = emblemPicker("cup");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-labelledby="series-emblem"');
    expect(html).toContain('id="series-emblem"');
    expect(radios(html)).toHaveLength(SERIES_EMBLEMS.length);
    SERIES_EMBLEMS.forEach((emblem, index) => {
      expect(radios(html)[index]).toContain(
        `aria-label="${messagesFor("en").series.emblems[emblem]}"`,
      );
    });
  });

  it.each(SERIES_EMBLEMS)(
    "checks %s and names it beside the heading",
    (emblem) => {
      const html = emblemPicker(emblem);
      const checked = radios(html).filter((tag) =>
        tag.includes('aria-checked="true"'),
      );
      expect(checked).toHaveLength(1);
      expect(radios(html)[SERIES_EMBLEMS.indexOf(emblem)]).toContain(
        'aria-checked="true"',
      );
      expect(html).toContain(
        `>${messagesFor("en").series.emblems[emblem]}</p>`,
      );
    },
  );

  it("draws each emblem in ink alone, without a badge colour", () => {
    const html = emblemPicker("cup");
    for (const colour of SERIES_COLOURS) {
      expect(html).not.toContain(seriesBadgeColours[colour].disc);
      expect(html).not.toContain(seriesBadgeColours[colour].shade);
    }
    expect(html).toContain('fill="currentColor"');
    expect(html).not.toContain("translate(4 5)");
  });

  it("names the chips in Arabic", () => {
    const html = emblemPicker("moon", "ar");
    expect(html).toContain(
      `aria-label="${messagesFor("ar").series.emblems.moon}"`,
    );
  });
});

describe("SeriesColourPicker", () => {
  it("is one labelled radio group with a swatch of each colour's disc", () => {
    const html = colourPicker("gold");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-labelledby="series-colour"');
    expect(radios(html)).toHaveLength(SERIES_COLOURS.length);
    SERIES_COLOURS.forEach((colour, index) => {
      expect(radios(html)[index]).toContain(
        `aria-label="${messagesFor("en").series.colours[colour]}"`,
      );
      expect(html).toContain(seriesBadgeColours[colour].disc);
    });
    expect(radios(html)[0]).toContain('aria-checked="true"');
    expect(html).toContain(">Gold</p>");
  });
});
