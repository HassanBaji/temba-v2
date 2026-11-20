import { parseBoardCode } from "@repo/domain/live-board";

import { TvEntry } from "~/components/live-board/tv-entry";
import { parseTvEntryNotice } from "~/lib/tv-paths";

export default async function TvEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; notice?: string }>;
}) {
  const { code, notice } = await searchParams;
  return (
    <TvEntry
      initialCode={(code && parseBoardCode(code)) ?? undefined}
      notice={parseTvEntryNotice(notice)}
    />
  );
}
