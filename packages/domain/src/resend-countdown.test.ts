import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  RESEND_COUNTDOWN_SECONDS,
  formatCountdown,
  isResendAvailable,
  remainingSeconds,
  resendAccessibleName,
} from "./resend-countdown";

describe("remainingSeconds", () => {
  const startedAt = 1_000_000;

  it("returns the full window at t0", () => {
    assert.equal(
      remainingSeconds(startedAt, startedAt),
      RESEND_COUNTDOWN_SECONDS,
    );
  });

  it("counts remaining seconds after elapsed time", () => {
    assert.equal(remainingSeconds(startedAt, startedAt + 6_000), 24);
  });

  it("hits zero at the duration boundary", () => {
    assert.equal(
      remainingSeconds(startedAt, startedAt + RESEND_COUNTDOWN_SECONDS * 1000),
      0,
    );
  });

  it("does not go negative after the window", () => {
    assert.equal(
      remainingSeconds(
        startedAt,
        startedAt + (RESEND_COUNTDOWN_SECONDS + 5) * 1000,
      ),
      0,
    );
  });
});

describe("formatCountdown", () => {
  it("formats the artboard's 0:24", () => {
    assert.equal(formatCountdown(24), "0:24");
  });

  it("zero-pads single-digit seconds", () => {
    assert.equal(formatCountdown(5), "0:05");
  });

  it("formats the availability boundary as 0:00", () => {
    assert.equal(formatCountdown(0), "0:00");
  });
});

describe("isResendAvailable", () => {
  it("is unavailable above zero", () => {
    assert.equal(isResendAvailable(1), false);
    assert.equal(isResendAvailable(24), false);
  });

  it("is available at and below zero", () => {
    assert.equal(isResendAvailable(0), true);
    assert.equal(isResendAvailable(-1), true);
  });
});

describe("resendAccessibleName", () => {
  it("names the wait while counting down", () => {
    assert.equal(
      resendAccessibleName(24),
      "Resend code, available in 24 seconds",
    );
    assert.equal(resendAccessibleName(1), "Resend code, available in 1 second");
  });

  it("drops the wait once available", () => {
    assert.equal(resendAccessibleName(0), "Resend code");
  });
});
