import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { ClerkAPIResponseError } from "@clerk/nextjs/errors";

import {
  CLERK_AUTH_ERROR_COPY,
  GENERIC_CLERK_AUTH_ERROR,
  clerkFieldErrorMessage,
  clerkGlobalErrorMessage,
  splitClerkAuthError,
} from "./clerk-auth-error";

function clerkError(
  errors: Array<{
    code: string;
    message?: string;
    long_message?: string;
    meta?: { param_name?: string };
  }>,
) {
  return new ClerkAPIResponseError("Unprocessable", {
    status: 422,
    data: errors.map((error) => ({
      code: error.code,
      message: error.message ?? "raw message",
      long_message: error.long_message ?? "raw long message",
      meta: error.meta,
    })),
  });
}

describe("splitClerkAuthError", () => {
  it("splits meta.paramName onto a field error", () => {
    const err = clerkError([
      {
        code: "form_identifier_not_found",
        meta: { param_name: "identifier" },
      },
    ]);
    assert.deepEqual(splitClerkAuthError(err), {
      fieldErrors: {
        identifier: CLERK_AUTH_ERROR_COPY.form_identifier_not_found,
      },
      globalMessage: null,
    });
    assert.equal(
      clerkFieldErrorMessage(err, "identifier"),
      CLERK_AUTH_ERROR_COPY.form_identifier_not_found,
    );
    assert.equal(clerkGlobalErrorMessage(err), null);
  });

  it("splits a Clerk error without paramName onto a global message", () => {
    const err = clerkError([{ code: "too_many_requests" }]);
    assert.deepEqual(splitClerkAuthError(err), {
      fieldErrors: {},
      globalMessage: CLERK_AUTH_ERROR_COPY.too_many_requests,
    });
    assert.equal(clerkFieldErrorMessage(err, "identifier"), undefined);
    assert.equal(
      clerkGlobalErrorMessage(err),
      CLERK_AUTH_ERROR_COPY.too_many_requests,
    );
  });

  it("yields the generic message for a non-Clerk error", () => {
    assert.deepEqual(splitClerkAuthError(new Error("boom")), {
      fieldErrors: {},
      globalMessage: GENERIC_CLERK_AUTH_ERROR,
    });
    assert.deepEqual(splitClerkAuthError("string"), {
      fieldErrors: {},
      globalMessage: GENERIC_CLERK_AUTH_ERROR,
    });
    assert.equal(clerkGlobalErrorMessage(null), GENERIC_CLERK_AUTH_ERROR);
  });

  it("uses Clerk longMessage when the code is not mapped", () => {
    const err = clerkError([
      {
        code: "some_unknown_code",
        long_message: "Clerk said this specifically.",
      },
    ]);
    assert.equal(clerkGlobalErrorMessage(err), "Clerk said this specifically.");
  });
});

describe("CLERK_AUTH_ERROR_COPY", () => {
  const cases: Array<[string, string]> = [
    [
      "form_identifier_not_found",
      CLERK_AUTH_ERROR_COPY.form_identifier_not_found,
    ],
    ["form_identifier_exists", CLERK_AUTH_ERROR_COPY.form_identifier_exists],
    ["form_code_incorrect", CLERK_AUTH_ERROR_COPY.form_code_incorrect],
    ["verification_expired", CLERK_AUTH_ERROR_COPY.verification_expired],
    ["verification_failed", CLERK_AUTH_ERROR_COPY.verification_failed],
    ["too_many_requests", CLERK_AUTH_ERROR_COPY.too_many_requests],
    [
      "form_param_format_invalid",
      CLERK_AUTH_ERROR_COPY.form_param_format_invalid,
    ],
    ["form_password_incorrect", CLERK_AUTH_ERROR_COPY.form_password_incorrect],
    ["form_password_pwned", CLERK_AUTH_ERROR_COPY.form_password_pwned],
  ];

  for (const [code, copy] of cases) {
    it(`maps ${code} to Temba copy instead of Clerk longMessage`, () => {
      const err = clerkError([
        {
          code,
          long_message: "Clerk raw long message that must not surface",
        },
      ]);
      assert.ok(copy.length > 0);
      assert.notEqual(copy, "Clerk raw long message that must not surface");
      assert.equal(clerkGlobalErrorMessage(err), copy);
    });
  }
});
