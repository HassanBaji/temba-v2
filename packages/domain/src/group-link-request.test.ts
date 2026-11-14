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
      "Padel Hub wants to link Sunday Four",
    );
    expect(groupLinkRequestRowTitle("Padel Hub", null, "en")).toBe(
      "Padel Hub wants to link your Group",
    );
  });

  it("states the banner and toast", () => {
    expect(groupLinkRequestBannerText("Padel Hub", "en")).toBe(
      "Padel Hub wants to link this Group.",
    );
    expect(groupLinkRequestAcceptedToast(null, "Padel Hub", "en")).toBe(
      "this Group is now linked to Padel Hub",
    );
  });

  it("accept confirm lists Venue-locked Games and verification", () => {
    const confirm = groupLinkRequestAcceptConfirm(
      "Sunday Four",
      "Padel Hub",
      "en",
    );
    expect(confirm.title).toBe("Link Sunday Four to Padel Hub?");
    expect(confirm.consequences).toHaveLength(2);
    expect(confirm.consequences.join(" ")).toContain("Verified");
    expect(confirm.consequences.join(" ")).toContain(
      "New Games are held at Padel Hub.",
    );
  });

  it("decline confirm names the Venue", () => {
    expect(groupLinkRequestDeclineConfirm("Padel Hub", "en").title).toBe(
      "Decline Padel Hub's request?",
    );
  });

  it("linked-to line", () => {
    expect(groupPartOfVenueLine("Padel Hub", "en")).toBe("Linked to Padel Hub");
  });

  it("reads in Arabic", () => {
    expect(groupPartOfVenueLine("Padel Hub", "ar")).toBe("مرتبطة بـ Padel Hub");
    expect(groupLinkRequestAcceptConfirm(null, "Padel Hub", "ar").title).toBe(
      "ربط هذه المجموعة بـ Padel Hub؟",
    );
  });
});

describe("unlinking from a Venue copy", () => {
  it("names the Venue and warns that new Games stop counting for Temba Level", () => {
    expect(groupLeaveVenueActionLabel("Smash Club", "en")).toBe(
      "Unlink from Smash Club",
    );
    const confirm = groupLeaveVenueConfirm("Tuesday Crew", "Smash Club", "en");
    expect(confirm.title).toBe("Unlink from Smash Club?");
    expect(confirm.consequences).toHaveLength(2);
    expect(confirm.description).toContain("Tuesday Crew");
    expect(confirm.description).toContain("will not count for Temba Level");
    expect(confirm.description).toContain("Operator");
  });

  it("falls back to a generic Group name on the manager confirm", () => {
    expect(venueUnlinkGroupConfirm(null, "en").title).toBe(
      "Unlink this Group?",
    );
    expect(venueUnlinkGroupConfirm("Tuesday Crew", "en").description).toContain(
      "will not count for Temba Level",
    );
  });
});
