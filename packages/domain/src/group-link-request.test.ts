import { describe, expect, it } from "vitest";

import {
  groupLinkRequestAcceptConfirm,
  groupLinkRequestAcceptedToast,
  groupLinkRequestBannerText,
  groupLinkRequestDeclineConfirm,
  groupLeaveVenueActionLabel,
  groupLeaveVenueConfirm,
  groupLinkRequestRowTitle,
  groupPartOfVenueLine,
  venueUnlinkGroupConfirm,
} from "./group-link-request";

describe("group link request copy", () => {
  it("names the Group and the Venue in the row title", () => {
    expect(groupLinkRequestRowTitle("Padel Hub", "Sunday Four", "en")).toBe(
      "Padel Hub wants to add Sunday Four to its Community",
    );
    expect(groupLinkRequestRowTitle("Padel Hub", null, "en")).toBe(
      "Padel Hub wants to add your Group to its Community",
    );
  });

  it("states the banner and toast", () => {
    expect(groupLinkRequestBannerText("Padel Hub", "en")).toBe(
      "Padel Hub wants to add this Group to its Community.",
    );
    expect(groupLinkRequestAcceptedToast(null, "Padel Hub", "en")).toBe(
      "this Group is now part of Padel Hub",
    );
  });

  it("accept confirm lists no direct Join, no Invite links and Venue-locked Games", () => {
    const confirm = groupLinkRequestAcceptConfirm(
      "Sunday Four",
      "Padel Hub",
      "en",
    );
    expect(confirm.title).toBe("Add Sunday Four to Padel Hub’s Community?");
    expect(confirm.consequences).toHaveLength(5);
    expect(confirm.consequences.join(" ")).toContain("can’t join directly");
    expect(confirm.consequences.join(" ")).toContain("Invite links");
    expect(confirm.consequences.join(" ")).toContain(
      "New Games are held at Padel Hub.",
    );
  });

  it("decline confirm names the Venue", () => {
    expect(groupLinkRequestDeclineConfirm("Padel Hub", "en").title).toBe(
      "Decline Padel Hub's request?",
    );
  });

  it("part-of line", () => {
    expect(groupPartOfVenueLine("Padel Hub", "en")).toBe("Part of Padel Hub");
  });

  it("reads in Arabic", () => {
    expect(groupPartOfVenueLine("Padel Hub", "ar")).toBe("جزء من Padel Hub");
    expect(groupLinkRequestAcceptConfirm(null, "Padel Hub", "ar").title).toBe(
      "إضافة هذه المجموعة إلى مجتمع Padel Hub؟",
    );
  });
});

describe("leaving a Venue Community copy", () => {
  it("names the Venue and warns that new Games rate the group only", () => {
    expect(groupLeaveVenueActionLabel("Smash Club", "en")).toBe(
      "Leave Smash Club’s Community",
    );
    const confirm = groupLeaveVenueConfirm("Tuesday Crew", "Smash Club", "en");
    expect(confirm.title).toBe("Leave Smash Club’s Community?");
    expect(confirm.description).toContain("Tuesday Crew");
    expect(confirm.description).toContain("group rating only");
    expect(confirm.description).toContain("Operator");
  });

  it("falls back to a generic Group name on the manager confirm", () => {
    expect(venueUnlinkGroupConfirm(null, "en").title).toBe(
      "Unlink this Group?",
    );
    expect(venueUnlinkGroupConfirm("Tuesday Crew", "en").description).toContain(
      "group rating only",
    );
  });
});
