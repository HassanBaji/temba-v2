import { describe, expect, it } from "vitest";

import { publicGroupsEmptyLine } from "./groups-list-empty-states";

describe("publicGroupsEmptyLine", () => {
  it("names the filtered sport", () => {
    expect(publicGroupsEmptyLine("all", "en")).toBe(
      "Public Groups show up here. Start one and players can find it.",
    );
    expect(publicGroupsEmptyLine("padel", "en")).toBe(
      "Public Padel Groups show up here. Start one and players can find it.",
    );
  });

  it("reads in Arabic", () => {
    expect(publicGroupsEmptyLine("padel", "ar")).toBe(
      "تظهر مجموعات بادل العامة هنا. أنشئ واحدة ليجدها اللاعبون.",
    );
  });
});
