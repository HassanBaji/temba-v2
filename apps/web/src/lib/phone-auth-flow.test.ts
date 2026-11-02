import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  phoneCodeFactor,
  previousPhoneAuthStep,
  signUpStepProgress,
} from "./phone-auth-flow";

describe("phoneCodeFactor", () => {
  it("picks the phone_code factor and its phoneNumberId", () => {
    assert.deepEqual(
      phoneCodeFactor([
        { strategy: "password" },
        {
          strategy: "phone_code",
          phoneNumberId: "idn_1",
          safeIdentifier: "+973…",
        },
      ]),
      { strategy: "phone_code", phoneNumberId: "idn_1" },
    );
  });

  it("is null when Clerk offers no phone code", () => {
    assert.equal(phoneCodeFactor([{ strategy: "password" }]), null);
    assert.equal(phoneCodeFactor([{ strategy: "phone_code" }]), null);
    assert.equal(phoneCodeFactor(null), null);
    assert.equal(phoneCodeFactor(undefined), null);
  });
});

describe("previousPhoneAuthStep", () => {
  it("walks back through the door", () => {
    assert.equal(previousPhoneAuthStep("phone"), null);
    assert.equal(previousPhoneAuthStep("code"), "phone");
    assert.equal(previousPhoneAuthStep("password"), "name");
  });

  it("skips the spent code when leaving the name step", () => {
    assert.equal(previousPhoneAuthStep("name"), "phone");
  });
});

describe("signUpStepProgress", () => {
  it("counts only the two sign-up steps", () => {
    assert.equal(signUpStepProgress("phone"), undefined);
    assert.equal(signUpStepProgress("code"), undefined);
    assert.deepEqual(signUpStepProgress("name"), { step: 1, total: 2 });
    assert.deepEqual(signUpStepProgress("password"), { step: 2, total: 2 });
  });
});
