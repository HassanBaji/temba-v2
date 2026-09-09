import { SecondFactorForm } from "~/components/auth/second-factor-form";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

export default async function FactorTwoPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);

  return <SecondFactorForm redirectUrl={redirectUrl} />;
}
