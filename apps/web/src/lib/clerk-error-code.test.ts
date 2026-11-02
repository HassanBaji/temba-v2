import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { hasClerkErrorCode } from "./clerk-error-code";

describe("hasClerkErrorCode", () => {
  it("finds the code among a Clerk error's items", () => {
    const err = {
      clerkError: true,
      errors: [
        { code: "form_param_nil", message: "nil" },
        { code: "form_identifier_not_found", message: "not found" },
      ],
    };
    assert.equal(hasClerkErrorCode(err, "form_identifier_not_found"), true);
    assert.equal(hasClerkErrorCode(err, "form_password_incorrect"), false);
  });

  it("is false for anything that is not a Clerk error", () => {
    assert.equal(hasClerkErrorCode(new Error("boom"), "x"), false);
    assert.equal(hasClerkErrorCode(null, "x"), false);
    assert.equal(hasClerkErrorCode("string", "x"), false);
    assert.equal(hasClerkErrorCode({ errors: "nope" }, "x"), false);
    assert.equal(hasClerkErrorCode({ errors: [null, 1] }, "x"), false);
  });
});
