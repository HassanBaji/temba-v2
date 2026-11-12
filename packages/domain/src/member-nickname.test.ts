import { describe, expect, it } from "vitest";

import { memberMatchesQuery, normalizeMemberNickname } from "./member-nickname";

describe("normalizeMemberNickname", () => {
  it("trims and collapses inner whitespace", () => {
    expect(normalizeMemberNickname("  Ahmed   keeper ")).toBe("Ahmed keeper");
  });

  it("reads blank input as clearing the name", () => {
    expect(normalizeMemberNickname("   ")).toBeNull();
  });
});

describe("memberMatchesQuery", () => {
  const member = {
    name: "Ahmed Buhazza",
    nickname: { name: "Abu Ali", visibility: "approvers" as const },
  };

  it("matches the Temba name", () => {
    expect(memberMatchesQuery(member, "buhazza")).toBe(true);
  });

  it("matches the nickname", () => {
    expect(memberMatchesQuery(member, "abu")).toBe(true);
  });

  it("matches everyone on an empty query", () => {
    expect(memberMatchesQuery({ name: null }, "  ")).toBe(true);
  });

  it("misses when neither name holds the query", () => {
    expect(memberMatchesQuery(member, "salman")).toBe(false);
  });
});
