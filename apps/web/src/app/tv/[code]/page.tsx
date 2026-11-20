import { redirect } from "next/navigation";

import { parseBoardCode } from "@repo/domain/live-board";

import { TvScreen } from "~/components/live-board/tv-screen";
import { tvEntryHref } from "~/lib/tv-paths";

export default async function TvBoardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const parsed = parseBoardCode(decodeURIComponent(code));
  if (!parsed) {
    redirect(tvEntryHref({ notice: "not_found" }));
  }
  return <TvScreen code={parsed} />;
}
