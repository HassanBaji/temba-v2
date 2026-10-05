import { describe, expect, it } from "vitest";

import { splitTrpcFormError } from "./form-error";

describe("splitTrpcFormError", () => {
  it("returns the first message per field", () => {
    expect(
      splitTrpcFormError({
        message: "bad",
        data: { zodError: { fieldErrors: { choice: ["Pick one", "x"] } } },
      }),
    ).toEqual({ fieldErrors: { choice: "Pick one" }, globalMessage: null });
  });

  it("prefers a form error over the raw message", () => {
    expect(
      splitTrpcFormError({
        message: "bad",
        data: { zodError: { fieldErrors: {}, formErrors: ["Form wrong"] } },
      }).globalMessage,
    ).toBe("Form wrong");
  });

  it("falls back to the error message", () => {
    expect(splitTrpcFormError({ message: "Offline" })).toEqual({
      fieldErrors: {},
      globalMessage: "Offline",
    });
  });
});
