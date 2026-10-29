import { describe, expect, it } from "vitest";

import {
  arrivedWhole,
  extractVerificationCode,
  isVerificationCodeComplete,
} from "./verification-code";

describe("extractVerificationCode", () => {
  it("keeps typed digits", () => {
    expect(extractVerificationCode("123")).toBe("123");
    expect(extractVerificationCode("12a34-5678")).toBe("123456");
  });

  it("reads the code out of a pasted SMS", () => {
    expect(
      extractVerificationCode("123456 is your verification code for Temba."),
    ).toBe("123456");
    expect(
      extractVerificationCode(
        "Temba 2FA: your code is 654321. It expires in 10 minutes.",
      ),
    ).toBe("654321");
  });

  it("reads a code pasted after partial typing", () => {
    expect(extractVerificationCode("12Your code is 987654")).toBe("987654");
  });

  it("falls back to the first six digits without a standalone code", () => {
    expect(extractVerificationCode("+97312345678")).toBe("973123");
  });
});

describe("isVerificationCodeComplete", () => {
  it("needs six digits", () => {
    expect(isVerificationCodeComplete("12345")).toBe(false);
    expect(isVerificationCodeComplete("123456")).toBe(true);
  });
});

describe("arrivedWhole", () => {
  it("is true for a paste or autofill", () => {
    expect(arrivedWhole("", "123456")).toBe(true);
    expect(arrivedWhole("12", "654321")).toBe(true);
  });

  it("is false for the last keystroke or a partial code", () => {
    expect(arrivedWhole("12345", "123456")).toBe(false);
    expect(arrivedWhole("", "123")).toBe(false);
  });
});
