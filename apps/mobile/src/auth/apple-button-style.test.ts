import { describe, expect, it } from "vitest";

import { appleButtonStyle } from "./apple-button-style";

describe("appleButtonStyle", () => {
  it("is black on a light paper surface", () => {
    expect(appleButtonStyle("paper", "light")).toBe("black");
  });

  it("is white on an ink surface or in the dark scheme", () => {
    expect(appleButtonStyle("ink", "light")).toBe("white");
    expect(appleButtonStyle("paper", "dark")).toBe("white");
    expect(appleButtonStyle("ink", "dark")).toBe("white");
  });
});
