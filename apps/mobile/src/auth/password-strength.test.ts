import { describe, expect, it } from "vitest";

import { passwordMeetsMinimum, passwordStrength } from "./password-strength";

describe("passwordStrength", () => {
  it("lights nothing for a short plain password", () => {
    expect(passwordStrength("abc")).toEqual([false, false, false, false]);
  });

  it("lights length, number and symbol separately", () => {
    expect(passwordStrength("abcdefgh")).toEqual([true, false, false, false]);
    expect(passwordStrength("abcdefg1")).toEqual([true, true, false, false]);
    expect(passwordStrength("abcdef1!")).toEqual([true, true, true, false]);
  });

  it("lights every segment at twelve characters with a number and a symbol", () => {
    expect(passwordStrength("abcdefghij1!")).toEqual([true, true, true, true]);
  });
});

describe("passwordMeetsMinimum", () => {
  it("unlocks the button at eight characters", () => {
    expect(passwordMeetsMinimum("1234567")).toBe(false);
    expect(passwordMeetsMinimum("12345678")).toBe(true);
  });
});
