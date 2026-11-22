import { radii, sizes } from "@repo/design-tokens";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Notice } from "../groups/notice";
import { useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { SectionHead } from "../profile/profile-parts";
import { Sheet, SheetCloseButton } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import type {
  ProfileSeriesAllRow,
  ProfileSeriesEditionRow,
  ProfileSeriesSheetModel,
} from "./profile-series-model";
import { SeriesBadge } from "./series-badge";

const EDITION_NUMBER_WIDTH = 22;
const TALL_AFTER_ROWS = 4;
const HEADER_GAP = 16;

function WinRow({
  row,
  first,
  leading,
  onOpenGame,
}: {
  row: ProfileSeriesEditionRow | ProfileSeriesAllRow;
  first: boolean;
  leading: React.ReactNode;
  onOpenGame: (gameId: string) => void;
}) {
  const colors = useColors();
  const { gameId } = row;
  return (
    <Pressable
      accessible
      accessibilityRole={gameId ? "button" : undefined}
      accessibilityLabel={row.spoken}
      disabled={!gameId}
      onPress={gameId ? () => onOpenGame(gameId) : undefined}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: first ? 0 : hairline,
        borderColor: colors.rule,
        backgroundColor: pressed ? colors.wash : undefined,
      })}
    >
      {leading}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold">{row.title}</Text>
        {row.sub ? (
          <Text size="eyebrow" tone="muted">
            {row.sub}
          </Text>
        ) : null}
      </View>
      {gameId ? (
        <ChevronRight
          size={sizes.iconRow}
          color={colors.muted}
          style={mirrorInRtl}
        />
      ) : null}
    </Pressable>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: colors.rule,
        borderRadius: radii.card,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

function SeriesWins({
  model,
  error,
  onRetry,
  onOpenGame,
}: {
  model: Extract<ProfileSeriesSheetModel, { mode: "series" }>;
  error: string | null;
  onRetry: () => void;
  onOpenGame: (gameId: string) => void;
}) {
  const m = useMessages();
  const { wins } = model;
  if (!wins) {
    return error ? (
      <Notice
        alert
        title={m.series.profile.loadError}
        description={error}
        onRetry={onRetry}
      />
    ) : (
      <View style={{ gap: 10 }}>
        <Skeleton width={128} height={24} />
        <Skeleton height={120} radius={radii.card} />
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <SectionHead title={wins.heading} meta={wins.played} />
      <Rows>
        {wins.rows.map((row, index) => (
          <WinRow
            key={row.key}
            row={row}
            first={index === 0}
            onOpenGame={onOpenGame}
            leading={
              <Text
                size="eyebrow"
                tone="muted"
                mono
                ltr
                style={{ minWidth: EDITION_NUMBER_WIDTH }}
              >
                {row.edition}
              </Text>
            }
          />
        ))}
      </Rows>
    </View>
  );
}

function SeriesHeader({
  model,
  onClose,
}: {
  model: Extract<ProfileSeriesSheetModel, { mode: "series" }>;
  onClose: () => void;
}) {
  const { badge } = model;
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: HEADER_GAP }}
    >
      <SeriesBadge
        emblem={badge.emblem}
        colour={badge.colour}
        size="sheet"
        count={badge.wins}
        surface="sheet"
      />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <Text
          size="h1"
          width="expanded"
          weight="bold"
          accessibilityRole="header"
        >
          {badge.name}
        </Text>
        {badge.groupName ? (
          <Text size="meta" tone="muted">
            {badge.groupName}
          </Text>
        ) : null}
      </View>
      <View style={{ alignSelf: "flex-start" }}>
        <SheetCloseButton onPress={onClose} />
      </View>
    </View>
  );
}

/**
 * The sheet over a profile (4b): the wins behind one badge with the way to
 * the Series, or every Series win in its all mode.
 */
export function SeriesWinsSheet({
  visible,
  model,
  error,
  onRetry,
  onClose,
  onOpenGame,
  onOpenSeries,
}: {
  visible: boolean;
  model: ProfileSeriesSheetModel | null;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
  onOpenGame: (gameId: string) => void;
  onOpenSeries: (seriesId: string) => void;
}) {
  if (model?.mode === "all") {
    return (
      <Sheet
        visible={visible}
        onClose={onClose}
        closeButton
        title={model.heading}
        subtitle={model.meta}
        tall={model.rows.length > TALL_AFTER_ROWS}
      >
        <Rows>
          {model.rows.map((row, index) => (
            <WinRow
              key={row.key}
              row={row}
              first={index === 0}
              onOpenGame={onOpenGame}
              leading={
                <SeriesBadge
                  emblem={row.emblem}
                  colour={row.colour}
                  size="line"
                  surface="sheet"
                />
              }
            />
          ))}
        </Rows>
      </Sheet>
    );
  }

  const seeSeries = model?.wins?.seeSeries;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      tall={(model?.wins?.rows.length ?? 0) > TALL_AFTER_ROWS}
      footer={
        model && seeSeries ? (
          <Button
            label={seeSeries}
            variant="outline"
            onPress={() => onOpenSeries(model.badge.seriesId)}
          />
        ) : undefined
      }
    >
      {model ? (
        <View style={{ gap: 18 }}>
          <SeriesHeader model={model} onClose={onClose} />
          <SeriesWins
            model={model}
            error={error}
            onRetry={onRetry}
            onOpenGame={onOpenGame}
          />
        </View>
      ) : null}
    </Sheet>
  );
}
