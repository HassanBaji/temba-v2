import { View } from "react-native";

import { useLocale } from "../i18n/locale-provider";
import { CoinGiversSheet } from "./coin-givers-sheet";
import { GiveMarksSheet } from "./give-marks-sheet";
import { MarksClosedCard, MarksGiveCard } from "./marks-closed-card";
import {
  closedCardModel,
  giveRowModel,
  marksSectionVisible,
  rosterModel,
} from "./marks-model";
import { MarksRoster } from "./marks-roster";
import { MvpPickSheet } from "./mvp-pick-sheet";
import { MvpVoteSheet } from "./mvp-vote-sheet";
import type { GameMarksController } from "./use-game-marks";

const SECTION_GAP = 22;

/**
 * The marks on a Played game, between the columns and the facts: Give your
 * marks while the window is open, what the viewer gave once it closes, and
 * the roster everyone who can open the Game sees. Hosts every marks sheet.
 */
export function MarksSection({ marks }: { marks: GameMarksController }) {
  const locale = useLocale();
  const data = marks.data;
  const visible = marksSectionVisible(data);
  const give = data && visible ? giveRowModel(data, locale) : null;
  const closed = data && visible ? closedCardModel(data, locale) : null;
  const roster = data && visible ? rosterModel(data, locale) : null;

  return (
    <>
      {roster ? (
        <View style={{ gap: SECTION_GAP }}>
          {give ? (
            <MarksGiveCard
              model={give}
              onPress={() => marks.openSheet({ kind: "give" })}
            />
          ) : null}
          {closed ? <MarksClosedCard model={closed} /> : null}
          <MarksRoster
            roster={roster}
            onPressCoins={(userId) =>
              marks.openSheet({ kind: "givers", userId })
            }
          />
        </View>
      ) : null}
      <GiveMarksSheet marks={marks} />
      <MvpVoteSheet marks={marks} />
      <MvpPickSheet marks={marks} />
      <CoinGiversSheet marks={marks} />
    </>
  );
}
