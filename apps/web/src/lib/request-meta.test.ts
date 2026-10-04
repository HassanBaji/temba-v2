import { bahrainDate } from "~/lib/bahrain-date.test-support";
import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatRequestedAt, requestRowMeta } from "./request-meta";

// Local-time constructors keep these independent of the machine's timezone.
const NOW = bahrainDate(2026, 9, 10, 9, 0, 0);

describe("formatRequestedAt", () => {
  it("says today for a request made earlier the same local day", () => {
    assert.equal(
      formatRequestedAt(bahrainDate(2026, 9, 10, 0, 5, 0), NOW),
      "Requested today",
    );
  });

  it("says yesterday for the previous local day, even under 24 hours ago", () => {
    assert.equal(
      formatRequestedAt(bahrainDate(2026, 9, 9, 23, 30, 0), NOW),
      "Requested yesterday",
    );
  });

  it("counts days within the week", () => {
    assert.equal(
      formatRequestedAt(bahrainDate(2026, 9, 4, 18, 0, 0), NOW),
      "Requested 6 days ago",
    );
  });

  it("switches to a day-first date after a week", () => {
    assert.equal(
      formatRequestedAt(bahrainDate(2026, 9, 3, 18, 0, 0), NOW),
      "Requested 3 Oct",
    );
  });

  it("adds the year for a request from another year", () => {
    assert.equal(
      formatRequestedAt(bahrainDate(2025, 11, 20, 18, 0, 0), NOW),
      "Requested 20 Dec 2025",
    );
  });

  it("accepts a serialised date", () => {
    const requestedAt = bahrainDate(2026, 9, 8, 12, 0, 0).toISOString();
    assert.equal(formatRequestedAt(requestedAt, NOW), "Requested 2 days ago");
  });
});

describe("requestRowMeta", () => {
  it("puts request details first and when it was made last", () => {
    assert.equal(
      requestRowMeta(bahrainDate(2026, 9, 10, 8, 0, 0), ["From Dev"], NOW),
      "From Dev · Requested today",
    );
  });

  it("drops empty details", () => {
    assert.equal(
      requestRowMeta(
        bahrainDate(2026, 9, 9, 8, 0, 0),
        [null, undefined, ""],
        NOW,
      ),
      "Requested yesterday",
    );
  });
});
