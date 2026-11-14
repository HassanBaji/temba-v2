import {
  homeRequestsView,
  waitingCountLabel,
  waitingNextLine,
} from "@repo/domain/waiting-requests";
import { View } from "react-native";

import { useNow } from "../games/use-now";
import { SectionTitle } from "../home/section-title";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { useRequestAnswers } from "./request-answers-provider";
import { RequestRowItem } from "./request-card";
import { REQUESTS_HEADING_GAP, RequestLinkRow } from "./request-sections";

/** Design 1a/1b: the most urgent request on top of Home, under the line the last answer left. */
export function HomeRequests({ onAll }: { onAll: () => void }) {
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  const { rows } = useRequestAnswers();
  const view = homeRequestsView(rows);
  if (!view.visible) {
    return null;
  }
  const next = waitingNextLine(view.rest, locale);
  return (
    <View style={{ gap: REQUESTS_HEADING_GAP }}>
      <SectionTitle
        title={m.requests.title}
        meta={waitingCountLabel(view.waitingCount, locale)}
      />
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        {view.last ? <RequestRowItem row={view.last} now={now} /> : null}
        {view.last && view.current ? <Hairline /> : null}
        {view.current ? (
          <RequestRowItem
            row={{ request: view.current, answer: null }}
            now={now}
          />
        ) : null}
        {next ? (
          <>
            <Hairline />
            <RequestLinkRow
              lead={next}
              label={m.requests.all}
              accessibilityLabel={`${next}, ${m.requests.allTitle}`}
              onPress={onAll}
            />
          </>
        ) : null}
      </Surface>
    </View>
  );
}
