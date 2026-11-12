import { describe, expect, it } from "vitest";

import {
  memberMatchesQuery,
  memberNicknameIsVisible,
  normalizeMemberNickname,
} from "./member-nickname";

describe("normalizeMemberNickname", () => {
  it("trims and collapses inner whitespace", () => {
    expect(normalizeMemberNickname("  Ahmed   keeper ")).toBe("Ahmed keeper");
  });

  it("reads blank input as clearing the name", () => {
    expect(normalizeMemberNickname("   ")).toBeNull();
  });
});

describe("memberNicknameIsVisible", () => {
  it("shows a name set for the whole Group to everyone, the member included", () => {
    expect(
      memberNicknameIsVisible({
        visibility: "group",
        viewerIsApprover: false,
        viewerIsMember: true,
      }),
    ).toBe(true);
  });

  it("shows an approvers-only name to other approvers", () => {
    expect(
      memberNicknameIsVisible({
        visibility: "approvers",
        viewerIsApprover: true,
        viewerIsMember: false,
      }),
    ).toBe(true);
  });

  it("hides an approvers-only name from members", () => {
    expect(
      memberNicknameIsVisible({
        visibility: "approvers",
        viewerIsApprover: false,
        viewerIsMember: false,
      }),
    ).toBe(false);
  });

  it("hides an approvers-only name from the approver it names", () => {
    expect(
      memberNicknameIsVisible({
        visibility: "approvers",
        viewerIsApprover: true,
        viewerIsMember: true,
      }),
    ).toBe(false);
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
