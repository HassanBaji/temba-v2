import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

function searchSheetLabel(
  query: string,
  count: number,
  everything: string,
  locale: Locale,
) {
  if (!query.trim()) {
    return everything;
  }
  return messagesFor(locale).mobileCreateGame.searchSheet.resultCount(count);
}

export function venueSheetLabel(query: string, count: number, locale: Locale) {
  return searchSheetLabel(
    query,
    count,
    messagesFor(locale).mobileCreateGame.searchSheet.allVenues,
    locale,
  );
}

export function groupSheetLabel(query: string, count: number, locale: Locale) {
  return searchSheetLabel(
    query,
    count,
    messagesFor(locale).mobileCreateGame.searchSheet.allGroups,
    locale,
  );
}

export function labelMatchesQuery(label: string, query: string) {
  return label.toLowerCase().includes(query.trim().toLowerCase());
}
