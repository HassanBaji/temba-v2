import { describe, expect, it } from "vitest";

import {
  buildContinuePayload,
  fieldError,
  hasClerkErrorCode,
  nextSignUpStep,
  resolvePhone,
} from "./clerk-forms";

function clerkError(code: string, message: string, paramName?: string) {
  return {
    clerkError: true,
    errors: [{ code, message, meta: paramName ? { paramName } : undefined }],
  };
}

describe("resolvePhone", () => {
  it("assembles a phone number to E.164", () => {
    expect(resolvePhone("BH", "3612 4408", "identifier")).toEqual({
      ok: true,
      e164: "+97336124408",
    });
  });

  it("uses the web format message for a short number", () => {
    expect(resolvePhone("BH", "361", "identifier")).toEqual({
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

describe("hasClerkErrorCode", () => {
  it("finds the code among a Clerk error's items", () => {
    const err = clerkError("form_identifier_not_found", "x", "identifier");
    expect(hasClerkErrorCode(err, "form_identifier_not_found")).toBe(true);
    expect(hasClerkErrorCode(err, "form_password_incorrect")).toBe(false);
  });

  it("is false for anything that is not a Clerk error", () => {
    expect(hasClerkErrorCode(new Error("boom"), "x")).toBe(false);
    expect(hasClerkErrorCode(null, "x")).toBe(false);
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
        missingFields: ["first_name"],
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
    emailAddress: "",
    password: "",
    firstName: " Sam ",
    lastName: "",
    countryIso: "BH",
    national: "36124408",
  };

  it("sends only the missing fields", () => {
    expect(
      buildContinuePayload(["first_name", "phone_number"], values),
    ).toEqual({
      ok: true,
      payload: { firstName: "Sam", phoneNumber: "+97336124408" },
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
