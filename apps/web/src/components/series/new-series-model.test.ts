import { describe, expect, it } from "vitest";

import { seriesNameError } from "@repo/domain/series";
import { messagesFor } from "@repo/i18n/messages";

import { seriesNameFieldError } from "./new-series-model";

describe("seriesNameFieldError", () => {
  it("keeps the name's own errors for the field", () => {
    const taken = seriesNameError("sunday social", ["Sunday Social"], "en");
    expect(taken).not.toBeNull();
    expect(seriesNameFieldError(taken ?? "", "en")).toBe(taken);

    const empty = seriesNameError("  ", [], "ar");
    expect(seriesNameFieldError(empty ?? "", "ar")).toBe(empty);

    const long = seriesNameError("x".repeat(41), [], "en");
    expect(seriesNameFieldError(long ?? "", "en")).toBe(long);
  });

  it("leaves other refusals to the toast", () => {
    const errors = messagesFor("en").series.errors;
    expect(seriesNameFieldError(errors.verifiedOnly, "en")).toBeNull();
    expect(seriesNameFieldError(errors.tooMany(10), "en")).toBeNull();
  });
});
