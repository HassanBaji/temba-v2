import { describe, expect, it } from "vitest";

import { plural } from "./plural";

describe("plural", () => {
  it("picks one and other in English", () => {
    const forms = { one: "{n} player", other: "{n} players" };
    expect(plural("en", 1, forms)).toBe("1 player");
    expect(plural("en", 0, forms)).toBe("0 players");
    expect(plural("en", 12, forms)).toBe("12 players");
  });

  it("walks the six Arabic categories and falls back to other", () => {
    const forms = {
      zero: "لا لاعبين",
      one: "لاعب واحد",
      two: "لاعبان",
      few: "{n} لاعبين",
      many: "{n} لاعبًا",
      other: "{n} لاعب",
    };
    expect(plural("ar", 0, forms)).toBe("لا لاعبين");
    expect(plural("ar", 1, forms)).toBe("لاعب واحد");
    expect(plural("ar", 2, forms)).toBe("لاعبان");
    expect(plural("ar", 5, forms)).toBe("5 لاعبين");
    expect(plural("ar", 15, forms)).toBe("15 لاعبًا");
    expect(plural("ar", 100, forms)).toBe("100 لاعب");
    expect(plural("ar", 2, { one: "واحد", other: "{n}" })).toBe("2");
  });
});
