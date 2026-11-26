import { beforeEach, describe, expect, it } from "vitest";

import { consumePostAuthTarget } from "../auth/post-auth-target";
import { holdAppLink, settleAppLink } from "./pending-app-link";

describe("pending app link", () => {
  beforeEach(() => {
    settleAppLink(true);
    consumePostAuthTarget();
  });

  it("opens the link after sign-in when it arrived signed out", () => {
    holdAppLink("/games/x1");
    settleAppLink(false);
    expect(consumePostAuthTarget()).toBe("/games/x1");
  });

  it("drops the link when the User was already signed in", () => {
    holdAppLink("/games/x1");
    settleAppLink(true);
    settleAppLink(false);
    expect(consumePostAuthTarget()).toBeNull();
  });

  it("sets nothing without a link", () => {
    settleAppLink(false);
    expect(consumePostAuthTarget()).toBeNull();
  });
});
