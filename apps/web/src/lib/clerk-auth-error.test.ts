import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { ClerkAPIResponseError } from "@clerk/nextjs/errors";

import {
  clerkAuthErrorCopy,
  splitClerkAuthError,
} from "@repo/domain/clerk-auth-error";

describe("splitClerkAuthError with the Clerk SDK error", () => {
  it("maps a real ClerkAPIResponseError", () => {
    const err = new ClerkAPIResponseError("Unprocessable", {
      status: 422,
      data: [
        {
          code: "form_identifier_not_found",
          message: "raw message",
          long_message: "raw long message",
          meta: { param_name: "identifier" },
        },
      ],
    });
    assert.deepEqual(splitClerkAuthError(err, "en"), {
      fieldErrors: {
        identifier: clerkAuthErrorCopy("form_identifier_not_found", "en"),
      },
      globalMessage: null,
    });
  });
});
