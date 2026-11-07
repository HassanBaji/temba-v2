"use client";

import { useLocale } from "~/components/locale-provider";

import { CoinGiversDialog } from "./coin-givers-dialog";
import { GiveMarksSheet } from "./give-marks-sheet";
import { MarksClosedCard, MarksGiveCard } from "./marks-cards";
import {
  closedCardModel,
  giveRowModel,
  marksSectionVisible,
  rosterModel,
} from "./marks-model";
import { MarksRoster } from "./marks-roster";
import { MvpPickSheet, MvpVoteSheet } from "./mvp-sheets";
import type { GameMarksController } from "./use-game-marks";

/**
 * The marks on a played Game, between the columns and the facts: Give your
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
        <div className="space-y-[22px]">
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
        </div>
      ) : null}
      <GiveMarksSheet marks={marks} />
      <MvpVoteSheet marks={marks} />
      <MvpPickSheet marks={marks} />
      <CoinGiversDialog marks={marks} />
    </>
  );
}
