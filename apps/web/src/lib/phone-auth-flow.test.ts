import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  hasPasswordFactor,
  previousPhoneAuthStep,
  signUpStepProgress,
} from "./phone-auth-flow";

describe("hasPasswordFactor", () => {
  it("is true when Clerk offers the password first factor", () => {
    assert.equal(
      hasPasswordFactor([{ strategy: "phone_code" }, { strategy: "password" }]),
      true,
    );
  });

  it("is false when Clerk offers no password", () => {
    assert.equal(hasPasswordFactor([{ strategy: "phone_code" }]), false);
    assert.equal(hasPasswordFactor([]), false);
    assert.equal(hasPasswordFactor(null), false);
    assert.equal(hasPasswordFactor(undefined), false);
  });
});

describe("previousPhoneAuthStep", () => {
  it("walks back through the door", () => {
    assert.equal(previousPhoneAuthStep("phone"), null);
    assert.equal(previousPhoneAuthStep("password"), "phone");
    assert.equal(previousPhoneAuthStep("code"), "phone");
    assert.equal(previousPhoneAuthStep("new-password"), "name");
  });

  it("skips the spent code when leaving the name step", () => {
    assert.equal(previousPhoneAuthStep("name"), "phone");
  });
});

describe("signUpStepProgress", () => {
  it("counts only the two sign-up steps", () => {
    assert.equal(signUpStepProgress("phone"), undefined);
    assert.equal(signUpStepProgress("password"), undefined);
    assert.equal(signUpStepProgress("code"), undefined);
    assert.deepEqual(signUpStepProgress("name"), { step: 1, total: 2 });
    assert.deepEqual(signUpStepProgress("new-password"), {
      step: 2,
      total: 2,
    });
  });
});
