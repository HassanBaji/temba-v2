import { describe, expect, it } from "vitest";

import {
  memberNicknameSheetSubtitle,
  memberNicknameSheetView,
  type MemberNicknameTarget,
} from "./member-nickname-sheet";

const member: MemberNicknameTarget = {
  userId: "u1",
  name: "Ahmed S",
  imageUri: null,
  nickname: null,
  isViewer: false,
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

  it("speaks to an approver naming themselves", () => {
    const self = { ...member, isViewer: true };
    expect(view({ member: self }).subtitle).toBe(
      "For you, in Karbabad Friday Football only.",
    );
    expect(view({ member: self }).note).toBe(
      "Only the Group's Organizers see this name, you included.",
    );
    expect(view({ member: self, visibility: "group" }).note).toBe(
      "Everyone in the Group will see it next to your name.",
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

describe("memberNicknameSheetSubtitle", () => {
  it("names the member, or says you when naming yourself", () => {
    expect(
      memberNicknameSheetSubtitle(member, "Karbabad Friday Football", "en"),
    ).toBe("For Ahmed S, in Karbabad Friday Football only.");
    expect(
      memberNicknameSheetSubtitle(
        { ...member, isViewer: true },
        "Karbabad Friday Football",
        "ar",
      ),
    ).toBe("لك، في Karbabad Friday Football فقط.");
  });
});
