import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "~/components/locale-provider";

import {
  SeriesField,
  seriesAttachPick,
  type SeriesAttachOption,
} from "./series-field";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));
vi.mock("~/lib/set-locale-action", () => ({
  setLocaleAction: async () => undefined,
}));

const sunday: SeriesAttachOption = {
  id: "sunday",
  name: "Sunday Social",
  emblem: "cup",
  colour: "gold",
  edition: 12,
};
const thursday: SeriesAttachOption = {
  id: "thursday",
  name: "Thursday Ladder",
  emblem: "bolt",
  colour: "blue",
  edition: 32,
};

function render(element: ReactElement, locale: Locale = "en") {
  return renderToStaticMarkup(
    createElement(LocaleProvider, { locale, children: element }),
  );
}

function field(
  value: string | null,
  locale: Locale = "en",
  showNote?: boolean,
) {
  return render(
    createElement(SeriesField, {
      id: "create-series",
      labelledBy: "create-series-label",
      options: [sunday, thursday],
      value,
      onChange: () => undefined,
      groupName: "Tuesday Night Padel",
      showNote,
    }),
    locale,
  );
}

function radios(html: string) {
  return html.match(/<button[^>]*role="radio"[^>]*>[\s\S]*?<\/button>/g) ?? [];
}

describe("SeriesField", () => {
  it("is one labelled radio group: not part of a series, then each series", () => {
    const html = field(null);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-labelledby="create-series-label"');
    expect(html).toContain('aria-describedby="create-series-note"');
    const rows = radios(html);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain("Not part of a series");
    expect(rows[0]).toContain("A one-off");
    expect(rows[1]).toContain("Sunday Social");
    expect(rows[2]).toContain("Thursday Ladder");
  });

  it("picks not part of a series by default, hatched and hidden from assistive technology", () => {
    const rows = radios(field(null));
    expect(rows[0]).toContain('aria-checked="true"');
    expect(rows[0]).toMatch(/<span aria-hidden="true" class="[^"]*hatch/);
    expect(rows[1]).toContain('aria-checked="false"');
    expect(rows[1]).toContain("This would be edition 12");
    expect(rows[2]).toContain("This would be edition 32");
  });

  it("reads the picked series as the edition it will be, with a check", () => {
    const rows = radios(field("sunday"));
    expect(rows[0]).toContain('aria-checked="false"');
    expect(rows[1]).toContain('aria-checked="true"');
    expect(rows[1]).toContain("This will be edition 12");
    expect(rows[1]).toContain("bg-control");
    expect(rows[1]).toContain("lucide-check");
    expect(rows[2]).not.toContain("lucide-check");
    expect(rows[2]).toContain("This would be edition 32");
  });

  it("draws each badge decoratively", () => {
    const rows = radios(field(null));
    expect(rows[1]).toContain('data-slot="series-badge" aria-hidden="true"');
    expect(rows[2]).toContain('data-slot="series-badge" aria-hidden="true"');
  });

  it("says whose series these are, unless the sheet already does", () => {
    expect(field(null)).toContain(
      "Series of Tuesday Night Padel. The winners get the badge on their profile.",
    );
    const bare = field(null, "en", false);
    expect(bare).not.toContain("Series of Tuesday Night Padel");
    expect(bare).not.toContain("aria-describedby");
  });

  it("speaks Arabic", () => {
    const copy = messagesFor("ar").series.attach;
    const html = field("thursday", "ar");
    expect(html).toContain(copy.none);
    expect(html).toContain(copy.willBe(32));
    expect(html).toContain(copy.wouldBe(12));
    expect(html).toContain(copy.note("Tuesday Night Padel"));
  });
});

describe("seriesAttachPick", () => {
  it("finds the picked series while it is offered", () => {
    expect(seriesAttachPick([sunday, thursday], "thursday")).toBe(thursday);
  });

  it("falls back to none when the series is no longer offered", () => {
    expect(seriesAttachPick([thursday], "sunday")).toBeNull();
    expect(seriesAttachPick([], "sunday")).toBeNull();
  });

  it("is none when nothing is picked", () => {
    expect(seriesAttachPick([sunday], null)).toBeNull();
  });
});
