import { SignUpForm } from "~/components/auth/sign-up-form";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);

  return <SignUpForm redirectUrl={redirectUrl} />;
}
