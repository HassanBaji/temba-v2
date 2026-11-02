import { type Metadata } from "next";

import { EmailTask } from "~/components/onboarding/email-task";
import { profileChecklistHref } from "~/lib/onboarding-step";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

export const metadata: Metadata = {
  title: "Add your email",
};

export default async function EmailTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const backHref = profileChecklistHref(
    safeInternalRedirect(params.redirect_url),
  );

  return <EmailTask backHref={backHref} />;
}
