import { describe, expect, it } from "vitest";

import { publicGroupsEmptyLine } from "./groups-list-empty-states";

describe("publicGroupsEmptyLine", () => {
  it("names the filtered sport", () => {
    expect(publicGroupsEmptyLine("all")).toBe(
      "Public Groups show up here. Start one and players can find it.",
    );
    expect(publicGroupsEmptyLine("padel")).toBe(
      "Public Padel Groups show up here. Start one and players can find it.",
    );
  });
});
