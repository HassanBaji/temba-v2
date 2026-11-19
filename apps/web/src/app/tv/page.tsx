import { parseBoardCode } from "@repo/domain/live-board";

import { TvEntry, type TvEntryNotice } from "~/components/live-board/tv-entry";

const NOTICES: readonly TvEntryNotice[] = [
  "stopped",
  "disconnected",
  "closed",
  "not_found",
  "failed",
];

export default async function TvEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; notice?: string }>;
}) {
  const { code, notice } = await searchParams;
  return (
    <TvEntry
      initialCode={(code && parseBoardCode(code)) ?? undefined}
      notice={NOTICES.find((value) => value === notice)}
    />
  );
}
