import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  hasPasswordFactor,
  previousPhoneAuthStep,
  resetPasswordPhoneNumberId,
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

describe("resetPasswordPhoneNumberId", () => {
  it("returns the phone number the reset code goes to", () => {
    assert.equal(
      resetPasswordPhoneNumberId([
        { strategy: "password" },
        { strategy: "reset_password_phone_code", phoneNumberId: "idn_1" },
      ]),
      "idn_1",
    );
  });

  it("is null when Clerk offers no reset by SMS", () => {
    assert.equal(
      resetPasswordPhoneNumberId([
        { strategy: "password" },
        { strategy: "reset_password_email_code" },
      ]),
      null,
    );
    assert.equal(resetPasswordPhoneNumberId([]), null);
    assert.equal(resetPasswordPhoneNumberId(null), null);
    assert.equal(resetPasswordPhoneNumberId(undefined), null);
  });
});

describe("previousPhoneAuthStep", () => {
  it("walks back through the door", () => {
    assert.equal(previousPhoneAuthStep("phone"), null);
    assert.equal(previousPhoneAuthStep("password"), "phone");
    assert.equal(previousPhoneAuthStep("code"), "phone");
    assert.equal(previousPhoneAuthStep("new-password"), "name");
    assert.equal(previousPhoneAuthStep("reset-code"), "password");
  });

  it("skips a spent code when leaving the name and reset steps", () => {
    assert.equal(previousPhoneAuthStep("name"), "phone");
    assert.equal(previousPhoneAuthStep("reset-password"), "phone");
  });
});

describe("signUpStepProgress", () => {
  it("counts only the two sign-up steps", () => {
    assert.equal(signUpStepProgress("phone"), undefined);
    assert.equal(signUpStepProgress("password"), undefined);
    assert.equal(signUpStepProgress("code"), undefined);
    assert.equal(signUpStepProgress("reset-code"), undefined);
    assert.equal(signUpStepProgress("reset-password"), undefined);
    assert.deepEqual(signUpStepProgress("name"), { step: 1, total: 2 });
    assert.deepEqual(signUpStepProgress("new-password"), {
      step: 2,
      total: 2,
    });
  });
});
