import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { WelcomeScreen } from "~/components/auth/welcome-screen";
import { safeInternalRedirect } from "~/lib/safe-internal-redirect";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const redirectUrl = safeInternalRedirect(params.redirect_url);

  return <WelcomeScreen redirectUrl={redirectUrl} />;
}
