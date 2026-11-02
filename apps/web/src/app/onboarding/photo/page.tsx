import { type Metadata } from "next";

import { PhotoTask } from "~/components/onboarding/photo-task";
import { profileChecklistHref } from "~/lib/onboarding-step";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

export const metadata: Metadata = {
  title: "Add a photo",
};

export default async function PhotoTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const backHref = profileChecklistHref(
    safeInternalRedirect(params.redirect_url),
  );

  return <PhotoTask backHref={backHref} />;
}
