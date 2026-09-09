import { SignUpContinueForm } from "~/components/auth/sign-up-continue-form";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

export default async function SignUpContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);

  return <SignUpContinueForm redirectUrl={redirectUrl} />;
}
