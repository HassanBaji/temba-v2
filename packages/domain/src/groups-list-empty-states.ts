import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { sportLabel, type PublicGroupSportFilter } from "./sport";

/** The Public placeholder draws this many hatched Group monograms. */
export const PUBLIC_GROUPS_PREVIEW_MONOGRAMS = 3;

export function publicGroupsEmptyLine(
  filter: PublicGroupSportFilter,
  locale: Locale,
) {
  const m = messagesFor(locale).group.list;
  const sport = filter === "all" ? null : sportLabel(filter, locale);
  return sport ? m.publicEmptyLineSport(sport) : m.publicEmptyLine;
}
