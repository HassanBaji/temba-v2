import { describe, expect, it } from "vitest";

import { errorMessage } from "./error-message";

const copy = {
  somethingWentWrong: "Something went wrong.",
  offline: "Offline.",
};

function trpcError(message: string, data?: { code: string }) {
  return Object.assign(new Error(message), {
    name: "TRPCClientError",
    shape: data ? { message, data } : undefined,
    data,
  });
}

describe("errorMessage", () => {
  it("keeps the server message of a coded error", () => {
    expect(
      errorMessage(
        trpcError("This Game is full", { code: "CONFLICT" }),
        copy,
        true,
      ),
    ).toBe("This Game is full");
  });

  it("hides the message of an internal server error", () => {
    expect(
      errorMessage(
        trpcError("relation does not exist", { code: "INTERNAL_SERVER_ERROR" }),
        copy,
        false,
      ),
    ).toBe(copy.somethingWentWrong);
  });

  it("replaces a request that never reached the API", () => {
    const failed = trpcError("Network request failed");
    expect(errorMessage(failed, copy, true)).toBe(copy.somethingWentWrong);
    expect(errorMessage(failed, copy, false)).toBe(copy.offline);
    expect(
      errorMessage(trpcError("JSON Parse error: Unexpected <"), copy, true),
    ).toBe(copy.somethingWentWrong);
  });

  it("replaces a native network failure outside tRPC", () => {
    expect(
      errorMessage(new TypeError("Network request failed"), copy, false),
    ).toBe(copy.offline);
    expect(errorMessage(new Error("Failed to fetch"), copy, true)).toBe(
      copy.somethingWentWrong,
    );
  });

  it("keeps any other error's own message", () => {
    expect(errorMessage(new Error("Photo too large"), copy, true)).toBe(
      "Photo too large",
    );
  });

  it("falls back when there is no message", () => {
    expect(errorMessage(undefined, copy, true)).toBe(copy.somethingWentWrong);
    expect(errorMessage({ message: "  " }, copy, true)).toBe(
      copy.somethingWentWrong,
    );
    expect(errorMessage(42, copy, false)).toBe(copy.offline);
  });
});
