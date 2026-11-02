import { describe, expect, it } from "vitest";

import {
  hasFullName,
  userDisplayName,
  validateUserNames,
} from "./user-display-name";

describe("userDisplayName", () => {
  it("joins first and last", () => {
    expect(userDisplayName({ firstName: "Mikael", lastName: "Karlsson" })).toBe(
      "Mikael Karlsson",
    );
  });

  it("uses whichever half exists", () => {
    expect(userDisplayName({ firstName: " Mikael ", lastName: null })).toBe(
      "Mikael",
    );
    expect(userDisplayName({ firstName: "", lastName: "Karlsson" })).toBe(
      "Karlsson",
    );
  });

  it("is null with no name on file", () => {
    expect(
      userDisplayName({ firstName: null, lastName: undefined }),
    ).toBeNull();
    expect(userDisplayName({ firstName: "  ", lastName: "" })).toBeNull();
  });
});

describe("hasFullName", () => {
  it("needs both halves", () => {
    expect(hasFullName({ firstName: "Mikael", lastName: "Karlsson" })).toBe(
      true,
    );
    expect(hasFullName({ firstName: "Mikael", lastName: " " })).toBe(false);
    expect(hasFullName({ firstName: null, lastName: "Karlsson" })).toBe(false);
  });
});

describe("validateUserNames", () => {
  it("trims and accepts", () => {
    expect(
      validateUserNames({ firstName: " Mikael ", lastName: "Karlsson " }),
    ).toEqual({ ok: true, firstName: "Mikael", lastName: "Karlsson" });
  });

  it("names each missing field", () => {
    expect(validateUserNames({ firstName: "", lastName: null })).toEqual({
      ok: false,
      fieldErrors: {
        firstName: "Enter your first name",
        lastName: "Enter your last name",
      },
    });
  });

  it("bounds the length", () => {
    const result = validateUserNames({
      firstName: "a".repeat(61),
      lastName: "Karlsson",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.firstName).toMatch(/under 60/);
      expect(result.fieldErrors.lastName).toBeUndefined();
    }
  });
});
