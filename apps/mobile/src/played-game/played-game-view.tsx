import type {
  PlayedColumn,
  PlayedFact,
  PlayedRow,
} from "@repo/domain/played-game";
import { Share } from "lucide-react-native";
import { View } from "react-native";

import { InfoRows } from "../football/info-rows";
import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import { useColors } from "../theme/theme-provider";
import { PlayedColumns } from "./played-columns";
import { PlayedHero, type PlayedHeroProps } from "./played-hero";

const SHARE_ICON = 17;

export type PlayedGameViewProps = {
  hero: Omit<PlayedHeroProps, "children" | "onShare" | "onMore" | "footer">;
  board: React.ReactNode;
  /** The MVP row, last in the hero. */
  heroFooter?: React.ReactNode;
  /** The marks rows, between the columns and the facts. */
  marks?: React.ReactNode;
  columns: [PlayedColumn, PlayedColumn];
  unplaced?: PlayedRow[];
  facts: PlayedFact[];
  refreshing: boolean;
  onRefresh: () => void;
  onShare: () => void;
  onMore?: () => void;
  onPressPlayer?: (row: PlayedRow) => void;
};

/** A played Game: the result on black, the roster, the facts, then share. */
export function PlayedGameView({
  hero,
  board,
  heroFooter,
  marks,
  columns,
  unplaced,
  facts,
  refreshing,
  onRefresh,
  onShare,
  onMore,
  onPressPlayer,
}: PlayedGameViewProps) {
  const colors = useColors();
  const m = useMessages();
  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      statusBarTone="ink"
      header={
        <PlayedHero
          {...hero}
          onShare={onShare}
          onMore={onMore}
          footer={heroFooter}
        >
          {board}
        </PlayedHero>
      }
    >
      <PlayedColumns
        columns={columns}
        unplaced={unplaced}
        onPressPlayer={onPressPlayer}
      />
      {marks}
      <InfoRows rows={facts} />
      <View>
        <Button
          label={m.game.cta.shareResult}
          size="lg"
          icon={<Share size={SHARE_ICON} color={colors.onControl} />}
          onPress={onShare}
        />
      </View>
    </Screen>
  );
}
