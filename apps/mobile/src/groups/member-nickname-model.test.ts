import { describe, expect, it } from "vitest";

import {
  memberNicknameSheetView,
  type MemberNicknameTarget,
} from "./member-nickname-model";

const member: MemberNicknameTarget = {
  userId: "u1",
  name: "Ahmed S",
  imageUri: null,
  nickname: null,
};

function view(
  overrides: Partial<Parameters<typeof memberNicknameSheetView>[0]> = {},
) {
  return memberNicknameSheetView(
    {
      member,
      draft: "",
      visibility: "approvers",
      groupName: "Karbabad Friday Football",
      ...overrides,
    },
    "en",
  );
}

describe("memberNicknameSheetView", () => {
  it("asks for a name before saving and previews the Temba name", () => {
    const sheet = view();
    expect(sheet.canSave).toBe(false);
    expect(sheet.saveLabel).toBe("Type a name first");
    expect(sheet.counter).toBe("0 of 24");
    expect(sheet.preview).toEqual({
      main: "Ahmed S",
      sub: "No name in this Group",
      isNickname: false,
    });
    expect(sheet.canClear).toBe(false);
  });

  it("previews the typed name over the Temba name", () => {
    const sheet = view({ draft: "Ahmed  tall " });
    expect(sheet.canSave).toBe(true);
    expect(sheet.saveLabel).toBe("Save “Ahmed tall”");
    expect(sheet.preview).toEqual({
      main: "Ahmed tall",
      sub: "Ahmed S",
      isNickname: true,
    });
  });

  it("explains who sees the name", () => {
    expect(view().note).toBe(
      "Ahmed won't see this name. Only the Group's Organizers do.",
    );
    expect(view({ visibility: "group" }).note).toBe(
      "Ahmed and everyone else in the Group will see it next to their name.",
    );
  });

  it("saves an existing name only once it or who sees it changes", () => {
    const named = {
      ...member,
      nickname: { name: "Ahmed tall", visibility: "approvers" as const },
    };
    expect(view({ member: named, draft: "Ahmed tall" }).canSave).toBe(false);
    expect(
      view({ member: named, draft: "Ahmed tall", visibility: "group" }).canSave,
    ).toBe(true);
    expect(view({ member: named, draft: "Ahmed S, lefty" }).canSave).toBe(true);
    expect(view({ member: named, draft: "Ahmed tall" }).canClear).toBe(true);
  });
});
