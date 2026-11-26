import { describe, expect, it } from "vitest";

import { appleAppSiteAssociation } from "./apple-app-site-association";

describe("appleAppSiteAssociation", () => {
  it("claims the Game page for the given App", () => {
    const file = appleAppSiteAssociation("ABCDE12345.app.temba.mobile");
    const [detail] = file.applinks.details;
    expect(detail?.appIDs).toEqual(["ABCDE12345.app.temba.mobile"]);
    expect(detail?.components.at(-1)).toEqual({ "/": "/dashboard/games/*" });
  });

  it("excludes the create pages and the Game's subpages first", () => {
    const [detail] = appleAppSiteAssociation("A.b").applinks.details;
    const excluded = detail?.components
      .filter((component) => "exclude" in component)
      .map((component) => component["/"]);
    expect(excluded).toEqual([
      "/dashboard/games/new",
      "/dashboard/games/new-tournament",
      "/dashboard/games/*/?*",
    ]);
  });
});
