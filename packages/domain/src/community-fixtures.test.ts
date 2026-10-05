import { describe, expect, it } from "vitest";

import { createCommunityFixtures } from "./community-fixtures";
import {
  communityArchiveBanner,
  communityAvailableTabs,
  communityCanRequestJoin,
  communityLeaveNotices,
  communityVenueView,
} from "./community";

describe("createCommunityFixtures", () => {
  const fixtures = createCommunityFixtures(new Date("2026-03-10T12:00:00Z"));

  it("gives each viewer role the tabs the web page shows", () => {
    expect(communityAvailableTabs(fixtures.home.owner)).toEqual([
      "groups",
      "teams",
      "members",
      "requests",
    ]);
    expect(communityAvailableTabs(fixtures.home.member)).toEqual([
      "groups",
      "teams",
      "members",
    ]);
    expect(communityAvailableTabs(fixtures.home.publicVisitor)).toEqual([
      "groups",
    ]);
  });

  it("offers a join request only to a non-member of a live Public Community", () => {
    expect(communityCanRequestJoin(fixtures.home.publicVisitor)).toBe(true);
    expect(communityCanRequestJoin(fixtures.home.requestPending)).toBe(false);
    expect(communityCanRequestJoin(fixtures.home.requestRejected)).toBe(true);
    expect(communityCanRequestJoin(fixtures.home.privateVisitor)).toBe(false);
    expect(communityCanRequestJoin(fixtures.home.archivedVisitor)).toBe(false);
    expect(communityCanRequestJoin(fixtures.home.member)).toBe(false);
  });

  it("pauses every staff action on a Soft-archived Community", () => {
    const archived = fixtures.home.archivedOwner;
    expect(archived.canSoftArchive).toBe(false);
    expect(archived.canUnarchive).toBe(true);
    expect(communityArchiveBanner(archived)?.heading).toBe("Soft-archived");
    expect(communityArchiveBanner(fixtures.home.archivedVisitor)?.heading).toBe(
      "This Community is Soft-archived",
    );
    expect(communityArchiveBanner(fixtures.home.owner)).toBeNull();
  });

  it("explains why leaving is refused", () => {
    expect(communityLeaveNotices(fixtures.home.lastOwner)).toHaveLength(1);
    expect(communityLeaveNotices(fixtures.home.linkedTeam)).toHaveLength(1);
    expect(communityLeaveNotices(fixtures.home.owner)).toEqual([]);
  });

  it("shows the pending and rejected Venue link request notes", () => {
    expect(communityVenueView(fixtures.home.venueRequestPending).notes[0]).toBe(
      "Venue link request pending for Solna Padel Hall (Solna, Sweden).",
    );
    expect(
      communityVenueView(fixtures.home.venueRequestPending).canRequestLink,
    ).toBe(false);
    expect(
      communityVenueView(fixtures.home.venueRequestRejected).canRequestLink,
    ).toBe(true);
    expect(communityVenueView(fixtures.home.member).notes).toEqual([]);
  });

  it("lists the viewer first among members", () => {
    expect(fixtures.members[0]?.user.id).toBe("viewer");
  });
});
