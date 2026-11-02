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
    const list = profileChecklist(fresh);
    expect(list.tasks.map((task) => task.id)).toEqual([
      "photo",
      "email",
      "sports",
    ]);
    expect(checklistCountLabel(list)).toBe("2 OF 5");
    expect(list.complete).toBe(false);
  });

  it("adds a required name row for an account without a name", () => {
    const list = profileChecklist({ ...fresh, hasName: false });
    expect(list.tasks[0]).toMatchObject({
      id: "name",
      required: true,
      done: false,
    });
    expect(checklistCountLabel(list)).toBe("1 OF 5");
  });

  it("is complete once every task is done", () => {
    const list = profileChecklist({
      hasName: true,
      hasPhoto: true,
      hasVerifiedEmail: true,
      sportsDone: true,
    });
    expect(list.complete).toBe(true);
    expect(checklistCountLabel(list)).toBe("5 OF 5");
    expect(checklistCta(list)).toBe("Find games");
    expect(checklistBlurb(list)).toMatch(/All done/);
  });

  it("words the blurb by what is left", () => {
    expect(checklistBlurb(profileChecklist(fresh))).toBe(
      "Three short tasks, any order. Each one unlocks something.",
    );
    expect(checklistBlurb(profileChecklist({ ...fresh, hasPhoto: true }))).toBe(
      "2 tasks left. Any order, each one saves on its own.",
    );
    expect(
      checklistBlurb(
        profileChecklist({ ...fresh, hasPhoto: true, hasVerifiedEmail: true }),
      ),
    ).toBe("1 task left. Any order, each one saves on its own.");
    expect(checklistCta(profileChecklist(fresh))).toBe("Continue to games");
  });
});

describe("Home card", () => {
  it("shows three rows and folds the rest", () => {
    const list = profileChecklist({ ...fresh, hasName: false });
    const rows = homeChecklistRows(list);
    expect(rows.shown.map((task) => task.id)).toEqual([
      "name",
      "photo",
      "email",
    ]);
    expect(rows.more).toBe("1 more task");
    expect(homeChecklistRows(profileChecklist(fresh)).more).toBe("All tasks");
  });

  it("keeps only the required name row after Skip for now", () => {
    expect(
      homeChecklistAfterSkip(
        profileChecklist({ ...fresh, hasName: false }),
      ).map((task) => task.id),
    ).toEqual(["name"]);
    expect(homeChecklistAfterSkip(profileChecklist(fresh))).toEqual([]);
  });
});

describe("youAreInTitle", () => {
  it("greets by first name when there is one", () => {
    expect(youAreInTitle("Mikael")).toBe("You're in, Mikael.");
    expect(youAreInTitle(null)).toBe("You're in.");
  });
});
