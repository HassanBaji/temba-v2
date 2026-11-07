import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MvpModeField } from "~/app/dashboard/games/new/_parts/mvp-mode-field";
import { LocaleProvider } from "~/components/locale-provider";
import { MVP_MODES, mvpModeCopy, type MvpMode } from "@repo/domain/marks";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined }),
}));
vi.mock("~/lib/set-locale-action", () => ({
  setLocaleAction: async () => undefined,
}));

function render(mode: MvpMode, locale: Locale = "en") {
  return renderToStaticMarkup(
    createElement(LocaleProvider, {
      locale,
      children: createElement(MvpModeField, {
        idPrefix: "game",
        mode,
        onMode: () => undefined,
      }),
    }),
  );
}

function radios(html: string) {
  return html.match(/<button[^>]*role="radio"[^>]*>/g) ?? [];
}

describe("MvpModeField", () => {
  it("offers the three modes as one labelled radio group", () => {
    const html = render("vote");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-labelledby="game-mvp-label"');
    expect(html).toContain('id="game-mvp-label"');
    expect(html).toContain("MVP");
    expect(html).toContain("Decided after the game");
    expect(radios(html)).toHaveLength(MVP_MODES.length);
    for (const mode of MVP_MODES) {
      expect(html).toContain(mvpModeCopy(mode, "en").label);
      expect(html).toContain(mvpModeCopy(mode, "en").description);
    }
  });

  it.each(MVP_MODES)("checks %s and shows its help line", (mode) => {
    const html = render(mode);
    const checked = radios(html).filter((tag) =>
      tag.includes('aria-checked="true"'),
    );
    expect(checked).toHaveLength(1);
    const index = MVP_MODES.indexOf(mode);
    expect(radios(html)[index]).toContain('aria-checked="true"');
    expect(html).toContain(mvpModeCopy(mode, "en").help);
    for (const other of MVP_MODES.filter((value) => value !== mode)) {
      expect(html).not.toContain(mvpModeCopy(other, "en").help);
    }
  });

  it("draws a visible focus ring on every choice", () => {
    for (const tag of radios(render("vote"))) {
      expect(tag).toContain("focus-visible:ring-[3px]");
    }
  });

  it("speaks Arabic from the catalog", () => {
    const html = render("organizer", "ar");
    expect(html).toContain(messagesFor("ar").createGame.mvp.title);
    expect(html).toContain(messagesFor("ar").createGame.mvp.decidedAfterGame);
    expect(html).toContain(mvpModeCopy("organizer", "ar").label);
    expect(html).toContain(mvpModeCopy("organizer", "ar").help);
    expect(html).not.toContain("Players vote");
  });
});
