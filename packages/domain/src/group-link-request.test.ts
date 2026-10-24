import { describe, expect, it } from "vitest";

import {
  groupLinkRequestAcceptConfirm,
  groupLinkRequestAcceptedToast,
  groupLinkRequestBannerText,
  groupLinkRequestDeclineConfirm,
  groupLinkRequestRowTitle,
  groupPartOfVenueLine,
} from "./group-link-request";

describe("group link request copy", () => {
  it("names the Group and the Venue in the row title", () => {
    expect(groupLinkRequestRowTitle("Padel Hub", "Sunday Four")).toBe(
      "Padel Hub wants to add Sunday Four to its Community",
    );
    expect(groupLinkRequestRowTitle("Padel Hub", null)).toBe(
      "Padel Hub wants to add your Group to its Community",
    );
  });

  it("states the banner and toast", () => {
    expect(groupLinkRequestBannerText("Padel Hub")).toBe(
      "Padel Hub wants to add this Group to its Community.",
    );
    expect(groupLinkRequestAcceptedToast(null, "Padel Hub")).toBe(
      "this Group is now part of Padel Hub",
    );
  });

  it("accept confirm lists no direct Join, no Invite links and Venue-locked Games", () => {
    const confirm = groupLinkRequestAcceptConfirm("Sunday Four", "Padel Hub");
    expect(confirm.title).toBe("Add Sunday Four to Padel Hub’s Community?");
    expect(confirm.consequences).toHaveLength(5);
    expect(confirm.consequences.join(" ")).toContain("can’t join directly");
    expect(confirm.consequences.join(" ")).toContain("Invite links");
    expect(confirm.consequences.join(" ")).toContain(
      "New Games are held at Padel Hub.",
    );
  });

  it("decline confirm names the Venue", () => {
    expect(groupLinkRequestDeclineConfirm("Padel Hub").title).toBe(
      "Decline Padel Hub's request?",
    );
  });

  it("part-of line", () => {
    expect(groupPartOfVenueLine("Padel Hub")).toBe("Part of Padel Hub");
  });
});
