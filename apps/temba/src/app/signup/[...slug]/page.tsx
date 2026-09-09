import { redirect } from "next/navigation";

import { authCrossLinkUrl } from "~/lib/auth-redirect";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

/**
 * Retired Clerk `<SignUp>` drop-in sub-routes (`routing="path"`). Dedicated
 * pages remain for `sso-callback` and `continue`. Named leftovers —
 * `factor-one`, `factor-two`, `verify-email-address`, `verify-phone-number`,
 * `reset-password`, `reset-password-success`, `verify`, `create` — redirect
 * to `/signup` so none 404. `redirect_url` is preserved.
 */
export default async function RetiredSignupPathPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  redirect(
    authCrossLinkUrl("/signup", safeInternalRedirect(params.redirect_url)),
  );
}
