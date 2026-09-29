import { describe, expect, it } from "vitest";

import { memberCountLabel } from "~/lib/member-count-label";

describe("memberCountLabel", () => {
  it("pluralises member", () => {
    expect(memberCountLabel(0)).toBe("0 members");
    expect(memberCountLabel(1)).toBe("1 member");
    expect(memberCountLabel(14)).toBe("14 members");
  });
});
