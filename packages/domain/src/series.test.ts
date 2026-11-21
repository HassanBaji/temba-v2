import { LOCALES } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_SERIES_COLOUR,
  DEFAULT_SERIES_EMBLEM,
  SERIES_COLOURS,
  SERIES_EMBLEMS,
} from "./series";

describe("Series badge lists", () => {
  it("opens the picker on Cup and Gold", () => {
    expect(SERIES_EMBLEMS[0]).toBe(DEFAULT_SERIES_EMBLEM);
    expect(SERIES_COLOURS[0]).toBe(DEFAULT_SERIES_COLOUR);
    expect(DEFAULT_SERIES_EMBLEM).toBe("cup");
    expect(DEFAULT_SERIES_COLOUR).toBe("gold");
  });

  it.each(LOCALES)("names every emblem and colour in %s", (locale) => {
    const { emblems, colours } = messagesFor(locale).series;
    expect(Object.keys(emblems)).toEqual([...SERIES_EMBLEMS]);
    expect(Object.keys(colours)).toEqual([...SERIES_COLOURS]);
  });
});
