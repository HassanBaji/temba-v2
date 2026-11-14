import {
  waitingBulkApproveLabel,
  waitingCountLabel,
  waitingGameFill,
  waitingGameHeading,
} from "@repo/domain/waiting-requests";
import { Fragment, useCallback, useState } from "react";
import { View } from "react-native";

import { useNow } from "../games/use-now";
import { Notice } from "../groups/notice";
import { SectionTitle } from "../home/section-title";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { SportGlyph } from "../lib/sport-glyph";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useRequestAnswers } from "./request-answers-provider";
import { RequestList, RequestRowItem } from "./request-card";
import { REQUESTS_HEADING_GAP, RequestsFootnote } from "./request-sections";
import {
  type GameRequestsSection,
  allRequestsView,
} from "@repo/domain/request-answers";

const GAME_GLYPH = 16;

function GameHeader({ entry }: { entry: GameRequestsSection }) {
  const locale = useLocale();
  const palette = useTonePalette();
  const { approveMany } = useRequestAnswers();
  const bulkLabel = waitingBulkApproveLabel(entry.waiting.length, locale);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 11,
        backgroundColor: palette.wash,
      }}
    >
      <SportGlyph
        sport={entry.game.sport}
        color={palette.foreground}
        size={GAME_GLYPH}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold" numberOfLines={1} accessibilityRole="header">
          {waitingGameHeading(entry.game, locale)}
        </Text>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {waitingGameFill(
            entry.game,
            {
              heldSeats: entry.heldSeats,
              approvedSeats: entry.approvedSeats,
            },
            locale,
          )}
        </Text>
      </View>
      {bulkLabel ? (
        <Button
          label={bulkLabel}
          size="sm"
          variant="outline"
          onPress={() => approveMany(entry.waiting)}
        />
      ) : null}
    </View>
  );
}

/** Design 2c/2d: every request waiting on the viewer, by Game, then by Group. */
export function AllRequestsScreen() {
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  const { rows, status, refetch } = useRequestAnswers();
  const [refreshing, setRefreshing] = useState(false);
  const view = allRequestsView(rows);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <ScreenHeader nav="back" fallback="/" title={m.requests.title} />
      {view.empty && status.kind === "loading" ? (
        <View style={{ gap: 12 }}>
          {[0, 1].map((key) => (
            <Skeleton key={key} height={180} radius={14} />
          ))}
        </View>
      ) : null}
      {view.empty && status.kind === "error" ? (
        <Notice
          alert
          title={m.requests.loadFailed}
          description={status.message}
          onRetry={() => void refetch()}
        />
      ) : null}
      {view.empty && status.kind === "ready" ? (
        <Notice
          title={m.requests.nothingWaiting}
          description={m.requests.nothingWaitingNote}
        />
      ) : null}
      {view.games.length > 0 ? (
        <View style={{ gap: REQUESTS_HEADING_GAP }}>
          <SectionTitle
            title={m.requests.games}
            meta={waitingCountLabel(view.gameWaitingCount, locale)}
          />
          <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
            {view.games.map((entry, index) => (
              <Fragment key={entry.game.id}>
                {index > 0 ? <Hairline /> : null}
                <GameHeader entry={entry} />
                {entry.rows.map((row) => (
                  <Fragment key={row.request.id}>
                    <Hairline />
                    <RequestRowItem row={row} now={now} />
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </Surface>
          <RequestsFootnote>{m.requests.gamesNote}</RequestsFootnote>
        </View>
      ) : null}
      {view.groups.length > 0 ? (
        <View style={{ gap: REQUESTS_HEADING_GAP }}>
          <SectionTitle
            title={m.requests.groups}
            meta={waitingCountLabel(view.groupWaitingCount, locale)}
          />
          <RequestList rows={view.groups} now={now} />
        </View>
      ) : null}
    </Screen>
  );
}
