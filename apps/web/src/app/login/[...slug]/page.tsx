import { redirect } from "next/navigation";

import { authCrossLinkUrl } from "~/lib/auth-redirect";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

/**
 * Retired Clerk `<SignIn>` drop-in sub-routes (`routing="path"`). Dedicated
 * pages remain for `sso-callback`, `reset-password`, and `factor-two`. Named
 * leftovers — `factor-one`, `verify-email-address`, `verify-phone-number`,
 * `reset-password-success`, `verify`, `create` — redirect to `/login` so none
 * 404. `redirect_url` is preserved.
 */
export default async function RetiredLoginPathPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  redirect(
    authCrossLinkUrl("/login", safeInternalRedirect(params.redirect_url)),
  );
}
