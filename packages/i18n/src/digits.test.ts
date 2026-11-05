import { describe, expect, it } from "vitest";

import { latinDigits } from "./digits";

describe("latinDigits", () => {
  it("maps Arabic-Indic digits to Latin", () => {
    expect(latinDigits("٨:٢٣ م")).toBe("8:23 م");
    expect(latinDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  it("maps Extended Arabic-Indic digits to Latin", () => {
    expect(latinDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    expect(latinDigits("نوفمبر ۲۰۲۶")).toBe("نوفمبر 2026");
  });

  it("leaves Latin digits and letters alone", () => {
    expect(latinDigits("8:23 PM")).toBe("8:23 PM");
    expect(latinDigits("")).toBe("");
  });
});
