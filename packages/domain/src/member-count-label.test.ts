import { describe, expect, it } from "vitest";

import { memberCountLabel } from "./member-count-label";

describe("memberCountLabel", () => {
  it("pluralises member", () => {
    expect(memberCountLabel(0, "en")).toBe("0 members");
    expect(memberCountLabel(1, "en")).toBe("1 member");
    expect(memberCountLabel(14, "en")).toBe("14 members");
  });

  it("uses the Arabic plural forms", () => {
    expect(memberCountLabel(1, "ar")).toBe("عضو واحد");
    expect(memberCountLabel(2, "ar")).toBe("عضوان");
    expect(memberCountLabel(14, "ar")).toBe("14 عضوًا");
  });
});
