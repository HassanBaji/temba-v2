import { describe, expect, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import {
  MATCH_DISPUTE_NOTE_MAX_LENGTH,
  matchDisputeCanSubmit,
  matchDisputeSheetCopy,
  matchDisputeView,
} from "./match-dispute";

const en = messagesFor("en").rating.dispute;

describe("matchDisputeView", () => {
  it("offers the action to a player who may dispute", () => {
    expect(
      matchDisputeView({ canDispute: true, openDispute: null }, "en"),
    ).toEqual({ kind: "raise", label: en.action, hint: en.hint });
  });

  it("says a dispute waits on Temba, by whom", () => {
    expect(
      matchDisputeView(
        { canDispute: false, openDispute: { raisedByViewer: true } },
        "en",
      ),
    ).toEqual({ kind: "open", line: en.openByViewer });
    expect(
      matchDisputeView(
        { canDispute: false, openDispute: { raisedByViewer: false } },
        "en",
      ),
    ).toEqual({ kind: "open", line: en.openByOther });
  });

  it("shows nothing otherwise", () => {
    expect(
      matchDisputeView({ canDispute: false, openDispute: null }, "en"),
    ).toEqual({ kind: "none" });
    expect(matchDisputeView(null, "en")).toEqual({ kind: "none" });
  });

  it("reads in Arabic", () => {
    const view = matchDisputeView({ canDispute: true, openDispute: null }, "ar");
    expect(view).toMatchObject({
      label: messagesFor("ar").rating.dispute.action,
    });
  });
});

describe("matchDisputeSheetCopy", () => {
  it("names the seven days", () => {
    expect(matchDisputeSheetCopy("en").description).toContain("7 days");
  });
});

describe("matchDisputeCanSubmit", () => {
  it("needs a note of up to 280 characters", () => {
    expect(matchDisputeCanSubmit("   ")).toBe(false);
    expect(matchDisputeCanSubmit(" It was 6–4 ")).toBe(true);
    expect(matchDisputeCanSubmit("x".repeat(MATCH_DISPUTE_NOTE_MAX_LENGTH))).toBe(
      true,
    );
    expect(
      matchDisputeCanSubmit("x".repeat(MATCH_DISPUTE_NOTE_MAX_LENGTH + 1)),
    ).toBe(false);
  });
});
