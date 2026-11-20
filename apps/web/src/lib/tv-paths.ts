/** Why a TV is back at the code entry. */
export const TV_ENTRY_NOTICES = [
  "stopped",
  "disconnected",
  "closed",
  "not_found",
  "failed",
] as const;

export type TvEntryNotice = (typeof TV_ENTRY_NOTICES)[number];

export const TV_ENTRY_HREF = "/tv";

export function tvBoardHref(code: string) {
  return `${TV_ENTRY_HREF}/${code}`;
}

/** The code entry, with the reason the TV is back and the code to try again. */
export function tvEntryHref(args: { notice?: TvEntryNotice; code?: string }) {
  const query = new URLSearchParams();
  if (args.code) {
    query.set("code", args.code);
  }
  if (args.notice) {
    query.set("notice", args.notice);
  }
  const search = query.toString();
  return search ? `${TV_ENTRY_HREF}?${search}` : TV_ENTRY_HREF;
}

export function parseTvEntryNotice(
  value: string | undefined,
): TvEntryNotice | undefined {
  return TV_ENTRY_NOTICES.find((notice) => notice === value);
}
