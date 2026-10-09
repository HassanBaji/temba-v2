import { SignInForm } from "~/components/auth/sign-in-form";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);

  return <SignInForm redirectUrl={redirectUrl} />;
}
