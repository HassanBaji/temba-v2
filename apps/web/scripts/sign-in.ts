import type { Page } from "playwright";

import { callingCountryName, parseE164 } from "@repo/domain/phone-number";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Signs in through the phone-first /login form: country, national number,
 * Continue, password, then Clerk's new-device check on /login/factor-two when
 * it asks (test-mode numbers accept 424242).
 */
export async function signInWithPhone(
  page: Page,
  args: {
    baseUrl: string;
    phone: string;
    password: string;
    otp?: string;
    timeout?: number;
  },
) {
  const timeout = args.timeout ?? 30_000;
  const parsed = parseE164(args.phone.replace(/[\s()-]/g, ""));
  if (!parsed) {
    throw new Error(
      `"${args.phone}" is not an E.164 number in a supported country, for example +15555550101.`,
    );
  }

  await page.goto(`${args.baseUrl}/login`);
  // The form ignores submit until Clerk has loaded.
  await page.waitForFunction(
    () => (window as { Clerk?: { loaded?: boolean } }).Clerk?.loaded === true,
    undefined,
    { timeout },
  );

  const country = callingCountryName(parsed.iso, "en");
  const trigger = page.locator("[data-slot=select-trigger]").first();
  if (!(await trigger.getAttribute("aria-label"))?.includes(country)) {
    await trigger.click();
    await page
      .getByRole("option", { name: new RegExp(`^${escapeRegExp(country)}\\b`) })
      .click();
  }
  await page.locator("#phone-auth-phone").fill(parsed.national);
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.locator("#phone-auth-password").fill(args.password, { timeout });
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding|login\/factor-two)/, {
    timeout,
  });

  if (!page.url().includes("/login/factor-two")) {
    return;
  }
  // The code field stays disabled until Clerk has sent the code.
  const code = page.locator("#second-factor-code:not([disabled])");
  await code.waitFor({ timeout });
  // A whole code verifies on its own; Verify is the fallback.
  await code.fill(args.otp ?? "424242");
  const signedIn = /\/(dashboard|onboarding)/;
  const arrived = await page
    .waitForURL(signedIn, { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (arrived) {
    return;
  }
  const verify = page.getByRole("button", { name: /^verify$/i });
  if (await verify.isEnabled().catch(() => false)) {
    await verify.click();
  }
  await page.waitForURL(signedIn, { timeout });
}
