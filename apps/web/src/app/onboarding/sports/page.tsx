import { type Metadata } from "next";

import { SportsTask } from "~/components/onboarding/sports-task";
import { profileChecklistHref } from "~/lib/onboarding-step";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

export const metadata: Metadata = {
  title: "Pick your sports",
};

export default async function SportsTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const backHref = profileChecklistHref(
    safeInternalRedirect(params.redirect_url),
  );

  return <SportsTask backHref={backHref} />;
}
