import { describe, expect, it } from "vitest";

import {
  buildContinuePayload,
  fieldError,
  isCodeComplete,
  nextSignUpStep,
  resolveSignInIdentifier,
  sanitizeCode,
  splitSignInError,
} from "./clerk-forms";

function clerkError(code: string, message: string, paramName?: string) {
  return {
    clerkError: true,
    errors: [{ code, message, meta: paramName ? { paramName } : undefined }],
  };
}

describe("resolveSignInIdentifier", () => {
  it("trims a username", () => {
    expect(
      resolveSignInIdentifier({
        mode: "username",
        username: "  hassan ",
        countryIso: "BH",
        national: "",
      }),
    ).toEqual({ ok: true, identifier: "hassan" });
  });

  it("assembles a phone number to E.164", () => {
    expect(
      resolveSignInIdentifier({
        mode: "phone",
        username: "",
        countryIso: "BH",
        national: "3612 4408",
      }),
    ).toEqual({ ok: true, identifier: "+97336124408" });
  });

  it("uses the web format message for a short number", () => {
    const result = resolveSignInIdentifier({
      mode: "phone",
      username: "",
      countryIso: "BH",
      national: "361",
    });
    expect(result).toEqual({
      ok: false,
      split: {
        fieldErrors: {
          identifier:
            "That doesn't look right. Check the format and try again.",
        },
        globalMessage: null,
      },
    });
  });
});

describe("splitSignInError", () => {
  it("moves an unknown identifier to the summary", () => {
    expect(
      splitSignInError(
        clerkError("form_identifier_not_found", "x", "identifier"),
      ),
    ).toEqual({
      fieldErrors: {},
      globalMessage:
        "No account matches that. Try a different one, or create an account.",
    });
  });

  it("keeps a wrong password on the password field", () => {
    expect(
      splitSignInError(clerkError("form_password_incorrect", "x", "password")),
    ).toEqual({
      fieldErrors: { password: "That password is incorrect." },
      globalMessage: null,
    });
  });

  it("falls back to the generic message", () => {
    expect(splitSignInError(new Error("boom")).globalMessage).toBe(
      "Something went wrong. Try again.",
    );
  });
});

describe("nextSignUpStep", () => {
  it("completes with a session", () => {
    expect(
      nextSignUpStep({ status: "complete", createdSessionId: "sess_1" }),
    ).toEqual({ kind: "complete", sessionId: "sess_1" });
  });

  it("verifies the phone when it is unverified", () => {
    expect(
      nextSignUpStep({
        status: "missing_requirements",
        createdSessionId: null,
        unverifiedFields: ["phone_number"],
      }),
    ).toEqual({ kind: "verify-phone" });
  });

  it("asks for missing fields before verification", () => {
    expect(
      nextSignUpStep({
        status: "missing_requirements",
        createdSessionId: null,
        missingFields: ["username"],
        unverifiedFields: ["email_address"],
      }),
    ).toEqual({ kind: "fields" });
  });

  it("reports stuck when nothing is left to do", () => {
    expect(nextSignUpStep({ status: null, createdSessionId: null })).toEqual({
      kind: "stuck",
    });
  });
});

describe("buildContinuePayload", () => {
  const values = {
    username: " sam ",
    emailAddress: "",
    password: "",
    firstName: "",
    lastName: "",
    countryIso: "BH",
    national: "36124408",
  };

  it("sends only the missing fields", () => {
    expect(buildContinuePayload(["username", "phone_number"], values)).toEqual({
      ok: true,
      payload: { username: "sam", phoneNumber: "+97336124408" },
    });
  });

  it("rejects a malformed phone number before calling Clerk", () => {
    const result = buildContinuePayload(["phone_number"], {
      ...values,
      national: "12",
    });
    expect(result.ok).toBe(false);
  });
});

describe("codes", () => {
  it("keeps six digits", () => {
    expect(sanitizeCode("12a34-5678")).toBe("123456");
    expect(isCodeComplete("12345")).toBe(false);
    expect(isCodeComplete("123456")).toBe(true);
  });
});

describe("fieldError", () => {
  it("reads either key spelling", () => {
    const split = {
      fieldErrors: { phone_number: "bad" },
      globalMessage: null,
    };
    expect(fieldError(split, "phone_number", "phoneNumber")).toBe("bad");
    expect(fieldError(null, "x")).toBeUndefined();
  });
});
