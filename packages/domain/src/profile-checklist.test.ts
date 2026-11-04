import { describe, expect, it } from "vitest";

import {
  checklistBlurb,
  checklistCountLabel,
  checklistCta,
  homeChecklistAfterSkip,
  homeChecklistRows,
  profileChecklist,
  youAreInTitle,
} from "./profile-checklist";

const fresh = {
  hasName: true,
  hasPhoto: false,
  hasVerifiedEmail: false,
  sportsDone: false,
};

describe("profileChecklist", () => {
  it("counts phone and name as the first two of five for a new account", () => {
    const list = profileChecklist(fresh, "en");
    expect(list.tasks.map((task) => task.id)).toEqual([
      "photo",
      "email",
      "sports",
    ]);
    expect(checklistCountLabel(list, "en")).toBe("2 OF 5");
    expect(list.complete).toBe(false);
  });

  it("adds a required name row for an account without a name", () => {
    const list = profileChecklist({ ...fresh, hasName: false }, "en");
    expect(list.tasks[0]).toMatchObject({
      id: "name",
      required: true,
      done: false,
    });
    expect(checklistCountLabel(list, "en")).toBe("1 OF 5");
  });

  it("is complete once every task is done", () => {
    const list = profileChecklist(
      {
        hasName: true,
        hasPhoto: true,
        hasVerifiedEmail: true,
        sportsDone: true,
      },
      "en",
    );
    expect(list.complete).toBe(true);
    expect(checklistCountLabel(list, "en")).toBe("5 OF 5");
    expect(checklistCta(list, "en")).toBe("Find games");
    expect(checklistBlurb(list, "en")).toMatch(/All done/);
  });

  it("words the blurb by what is left", () => {
    expect(checklistBlurb(profileChecklist(fresh, "en"), "en")).toBe(
      "Three short tasks, any order. Each one unlocks something.",
    );
    expect(
      checklistBlurb(
        profileChecklist({ ...fresh, hasPhoto: true }, "en"),
        "en",
      ),
    ).toBe("2 tasks left. Any order, each one saves on its own.");
    expect(
      checklistBlurb(
        profileChecklist(
          { ...fresh, hasPhoto: true, hasVerifiedEmail: true },
          "en",
        ),
        "en",
      ),
    ).toBe("1 task left. Any order, each one saves on its own.");
    expect(checklistCta(profileChecklist(fresh, "en"), "en")).toBe(
      "Continue to games",
    );
  });
});

describe("Home card", () => {
  it("shows three rows and folds the rest", () => {
    const list = profileChecklist({ ...fresh, hasName: false }, "en");
    const rows = homeChecklistRows(list, "en");
    expect(rows.shown.map((task) => task.id)).toEqual([
      "name",
      "photo",
      "email",
    ]);
    expect(rows.more).toBe("1 more task");
    expect(homeChecklistRows(profileChecklist(fresh, "en"), "en").more).toBe(
      "All tasks",
    );
  });

  it("keeps only the required name row after Skip for now", () => {
    expect(
      homeChecklistAfterSkip(
        profileChecklist({ ...fresh, hasName: false }, "en"),
      ).map((task) => task.id),
    ).toEqual(["name"]);
    expect(homeChecklistAfterSkip(profileChecklist(fresh, "en"))).toEqual([]);
  });
});

describe("checklist in Arabic", () => {
  it("reads the tasks, the count and the blurb", () => {
    const list = profileChecklist(fresh, "ar");
    expect(list.tasks[0]?.title).toBe("أضف صورة للملف الشخصي");
    expect(checklistCountLabel(list, "ar")).toBe("2 من 5");
    expect(checklistBlurb(list, "ar")).toBe(
      "3 مهام قصيرة بأي ترتيب. كل واحدة تفتح لك شيئًا.",
    );
    expect(youAreInTitle("Mikael", "ar")).toBe("لقد انضممت يا Mikael.");
  });
});

describe("youAreInTitle", () => {
  it("greets by first name when there is one", () => {
    expect(youAreInTitle("Mikael", "en")).toBe("You're in, Mikael.");
    expect(youAreInTitle(null, "en")).toBe("You're in.");
  });
});
