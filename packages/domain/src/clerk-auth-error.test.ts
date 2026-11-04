import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import {
  clerkAuthErrorCopy,
  clerkFieldErrorMessage,
  clerkGlobalErrorMessage,
  splitClerkAuthError,
} from "./clerk-auth-error";

const COPY = messagesFor("en").auth.clerkError;

function clerkError(
  errors: Array<{
    code: string;
    message?: string;
    longMessage?: string;
    meta?: { paramName?: string };
  }>,
) {
  return {
    clerkError: true,
    errors: errors.map((error) => ({
      code: error.code,
      message: error.message ?? "raw message",
      longMessage: error.longMessage ?? "raw long message",
      meta: error.meta,
    })),
  };
}

describe("splitClerkAuthError", () => {
  it("splits meta.paramName onto a field error", () => {
    const err = clerkError([
      {
        code: "form_identifier_not_found",
        meta: { paramName: "identifier" },
      },
    ]);
    assert.deepEqual(splitClerkAuthError(err, "en"), {
      fieldErrors: {
        identifier: COPY.identifierNotFound,
      },
      globalMessage: null,
    });
    assert.equal(
      clerkFieldErrorMessage(err, "identifier", "en"),
      COPY.identifierNotFound,
    );
    assert.equal(clerkGlobalErrorMessage(err, "en"), null);
  });

  it("splits a Clerk error without paramName onto a global message", () => {
    const err = clerkError([{ code: "too_many_requests" }]);
    assert.deepEqual(splitClerkAuthError(err, "en"), {
      fieldErrors: {},
      globalMessage: COPY.tooManyRequests,
    });
    assert.equal(clerkFieldErrorMessage(err, "identifier", "en"), undefined);
    assert.equal(clerkGlobalErrorMessage(err, "en"), COPY.tooManyRequests);
  });

  it("yields the generic message for a non-Clerk error", () => {
    assert.deepEqual(splitClerkAuthError(new Error("boom"), "en"), {
      fieldErrors: {},
      globalMessage: COPY.generic,
    });
    assert.deepEqual(splitClerkAuthError("string", "en"), {
      fieldErrors: {},
      globalMessage: COPY.generic,
    });
    assert.equal(clerkGlobalErrorMessage(null, "en"), COPY.generic);
  });

  it("uses Clerk longMessage when the code is not mapped", () => {
    const err = clerkError([
      {
        code: "some_unknown_code",
        longMessage: "Clerk said this specifically.",
      },
    ]);
    assert.equal(
      clerkGlobalErrorMessage(err, "en"),
      "Clerk said this specifically.",
    );
  });
});

describe("clerkAuthErrorCopy", () => {
  const cases: Array<[string, string]> = [
    ["form_identifier_not_found", COPY.identifierNotFound],
    ["form_identifier_exists", COPY.identifierExists],
    ["form_code_incorrect", COPY.codeIncorrect],
    ["verification_expired", COPY.verificationExpired],
    ["verification_failed", COPY.verificationFailed],
    ["too_many_requests", COPY.tooManyRequests],
    ["form_param_format_invalid", COPY.paramFormatInvalid],
    ["form_password_incorrect", COPY.passwordIncorrect],
    ["form_password_pwned", COPY.passwordPwned],
  ];

  for (const [code, copy] of cases) {
    it(`maps ${code} to Temba copy instead of Clerk longMessage`, () => {
      const err = clerkError([
        {
          code,
          longMessage: "Clerk raw long message that must not surface",
        },
      ]);
      assert.ok(copy.length > 0);
      assert.notEqual(copy, "Clerk raw long message that must not surface");
      assert.equal(clerkGlobalErrorMessage(err, "en"), copy);
      assert.equal(clerkAuthErrorCopy(code, "en"), copy);
    });
  }

  it("reads Arabic copy for a mapped code and the generic fallback", () => {
    assert.equal(
      clerkGlobalErrorMessage(
        clerkError([{ code: "form_code_incorrect" }]),
        "ar",
      ),
      "هذا الرمز غير صحيح. حاول مرة أخرى.",
    );
    assert.equal(
      clerkGlobalErrorMessage(null, "ar"),
      "حدث خطأ ما. حاول مرة أخرى.",
    );
  });
});
