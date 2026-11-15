import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { gaugeArc } from "./home-level-chart";
import { lastTenOrder } from "./home-recent-form";

describe("gaugeArc", () => {
  it("runs the share of the ring toward the next band, kept inside 0 to 100", () => {
    assert.equal(gaugeArc(50, 10), Math.PI * 10);
    assert.equal(gaugeArc(-5, 10), 0);
    assert.equal(gaugeArc(140, 10), 2 * Math.PI * 10);
  });
});

describe("lastTenOrder", () => {
  it("reads oldest first and leaves the unplayed slots at the end", () => {
    const order = lastTenOrder([
      { kind: "played", outcome: "won", label: "W" },
      { kind: "played", outcome: "lost", label: "L" },
      { kind: "empty" },
    ]);
    assert.deepEqual(
      order.map((bar) => (bar.kind === "played" ? bar.outcome : "empty")),
      ["lost", "won", "empty"],
    );
  });
});
