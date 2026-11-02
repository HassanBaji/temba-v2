import { describe, expect, it } from "vitest";

import {
  FRESH_ACCOUNT_TARGET,
  consumePostAuthTarget,
  setPostAuthTarget,
} from "./post-auth-target";

describe("post-auth target", () => {
  it("is empty until something sets it", () => {
    expect(consumePostAuthTarget()).toBeNull();
  });

  it("hands the target out once", () => {
    setPostAuthTarget(FRESH_ACCOUNT_TARGET);
    expect(consumePostAuthTarget()).toBe("/complete-profile?fresh=1");
    expect(consumePostAuthTarget()).toBeNull();
  });
});
