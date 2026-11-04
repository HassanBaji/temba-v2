import { describe, expect, it } from "vitest";

import { inputDirectionStyle, textDirectionStyle } from "./text-direction";

describe("textDirectionStyle", () => {
  it("starts and reads LTR in an LTR layout", () => {
    expect(textDirectionStyle(false)).toEqual({
      textAlign: "left",
      writingDirection: "ltr",
    });
  });

  it("keeps the swapping start alignment and reads RTL in an RTL layout", () => {
    expect(textDirectionStyle(true)).toEqual({
      textAlign: "left",
      writingDirection: "rtl",
    });
  });

  it("reads an LTR value LTR in either layout", () => {
    expect(textDirectionStyle(true, true)).toEqual({
      textAlign: "left",
      writingDirection: "ltr",
    });
    expect(textDirectionStyle(false, true)).toEqual({
      textAlign: "left",
      writingDirection: "ltr",
    });
  });
});

describe("inputDirectionStyle", () => {
  it("starts at the left and reads LTR in an LTR layout", () => {
    expect(inputDirectionStyle(false)).toEqual({
      textAlign: "left",
      writingDirection: "ltr",
    });
  });

  it("starts at the right and reads RTL in an RTL layout", () => {
    expect(inputDirectionStyle(true)).toEqual({
      textAlign: "right",
      writingDirection: "rtl",
    });
  });

  it("keeps an LTR value at the left in an RTL layout", () => {
    expect(inputDirectionStyle(true, true)).toEqual({
      textAlign: "left",
      writingDirection: "ltr",
    });
  });
});
