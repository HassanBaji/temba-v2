import { type Metadata } from "next";

import { PhotoScreen } from "~/components/settings/photo-screen";
import { SETTINGS_PATH } from "~/components/settings/settings-screen";
import { getRequestMessages } from "~/lib/request-locale";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.webAuth.onboarding.photo.title };
}

export default async function SettingsPhotoPage({
  searchParams,
}: {
  searchParams: Promise<{ back?: string }>;
}) {
  const params = await searchParams;
  const backHref = safeInternalRedirect(params.back) ?? SETTINGS_PATH;

  return <PhotoScreen backHref={backHref} />;
}
