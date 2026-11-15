import { waitingCountLabel } from "@repo/domain/waiting-requests";
import { View } from "react-native";

import { useNow } from "../games/use-now";
import { SectionTitle } from "../home/section-title";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { useRequestAnswers } from "./request-answers-provider";
import { RequestList } from "./request-card";
import {
  REQUESTS_HEADING_GAP,
  RequestLinkRow,
  RequestsFootnote,
} from "./request-sections";
import { notificationsRequestsView } from "@repo/domain/request-answers";

export function useNotificationsRequestsVisible() {
  return notificationsRequestsView(useRequestAnswers().rows).visible;
}

/** Design 2a/2b: requests in their own section above the notifications, answered in place. */
export function NotificationsRequests({ onMore }: { onMore: () => void }) {
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  const view = notificationsRequestsView(useRequestAnswers().rows);
  if (!view.visible) {
    return null;
  }
  return (
    <View style={{ gap: REQUESTS_HEADING_GAP }}>
      <SectionTitle
        title={m.requests.title}
        meta={waitingCountLabel(view.waitingCount, locale)}
      />
      <RequestList
        rows={view.rows}
        now={now}
        footer={
          view.moreCount > 0 ? (
            <RequestLinkRow
              label={m.requests.moreRequests(view.moreCount)}
              onPress={onMore}
            />
          ) : undefined
        }
      />
      <RequestsFootnote>{m.requests.notificationsNote}</RequestsFootnote>
    </View>
  );
}
