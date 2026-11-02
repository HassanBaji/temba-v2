import { redirect } from "next/navigation";

import { authCrossLinkUrl } from "~/lib/auth-redirect";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

/**
 * Sign in and sign up are one phone door on `/login` (ADR-0049). Invite
 * buttons and old links still point here; `redirect_url` is preserved.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  redirect(
    authCrossLinkUrl("/login", safeInternalRedirect(params.redirect_url)),
  );
}
