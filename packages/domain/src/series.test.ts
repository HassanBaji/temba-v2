import { LOCALES } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_SERIES_COLOUR,
  DEFAULT_SERIES_EMBLEM,
  SERIES_COLOURS,
  SERIES_EMBLEMS,
  SERIES_NAME_MAX_LENGTH,
  seriesNameError,
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

describe("seriesNameError", () => {
  const errors = messagesFor("en").series.errors;

  it("accepts a free name", () => {
    expect(seriesNameError("Sunday Social", ["Friday Classic"], "en")).toBe(
      null,
    );
  });

  it("refuses an empty name", () => {
    expect(seriesNameError("   ", [], "en")).toBe(errors.nameRequired);
  });

  it("refuses a name over the limit, counted after trimming", () => {
    const longest = "a".repeat(SERIES_NAME_MAX_LENGTH);
    expect(seriesNameError(`  ${longest}  `, [], "en")).toBe(null);
    expect(seriesNameError(`${longest}a`, [], "en")).toBe(
      errors.nameTooLong(SERIES_NAME_MAX_LENGTH),
    );
  });

  it("refuses a running Series' name, trimmed and without case", () => {
    expect(seriesNameError(" sunday social ", ["Sunday Social"], "en")).toBe(
      errors.nameTaken,
    );
  });

  it("answers in Arabic", () => {
    expect(seriesNameError("", [], "ar")).toBe(
      messagesFor("ar").series.errors.nameRequired,
    );
  });
});
