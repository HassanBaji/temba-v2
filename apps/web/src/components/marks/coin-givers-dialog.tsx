"use client";

import * as React from "react";

import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale } from "~/components/locale-provider";

import { MarkCoin } from "./mark-coin";
import { coinGiversModel } from "./marks-model";
import { MarksSheet } from "./marks-sheet";
import type { GameMarksController } from "./use-game-marks";

/** E24: who gave each coin on a player's roster row, teammate or opponent. */
export function CoinGiversDialog({ marks }: { marks: GameMarksController }) {
  const locale = useLocale();
  const userId = marks.sheet?.kind === "givers" ? marks.sheet.userId : null;
  // Keeps the last player while the dialog animates closed.
  const [shownId, setShownId] = React.useState(userId);
  if (userId && userId !== shownId) {
    setShownId(userId);
  }
  const model =
    marks.data && shownId ? coinGiversModel(marks.data, shownId, locale) : null;
  if (!model) {
    return null;
  }
  return (
    <MarksSheet
      open={userId != null}
      onClose={marks.closeSheet}
      title={model.title}
      titleSize="title"
    >
      <ul className="space-y-2.5">
        {model.kinds.map((entry) => (
          <li
            key={entry.kind}
            className="border-rule rounded-card space-y-2.5 border px-3.5 py-3"
          >
            <div className="flex items-center gap-3">
              <MarkCoin kind={entry.kind} size="roster" />
              <div className="min-w-0 flex-1">
                <h3 className="text-meta font-semibold">{entry.name}</h3>
                {entry.note ? (
                  <p className="text-muted-foreground text-eyebrow">
                    {entry.note}
                  </p>
                ) : null}
              </div>
              {entry.count ? (
                <span
                  dir="ltr"
                  className="text-muted-foreground text-eyebrow font-mono tabular-nums"
                >
                  {entry.count}
                </span>
              ) : null}
            </div>
            {entry.givers.length > 0 ? (
              <ul className="space-y-2">
                {entry.givers.map((giver) => (
                  <li key={giver.userId} className="flex items-center gap-2.5">
                    <UserAvatar
                      name={giver.name}
                      image={giver.image}
                      size="sm"
                    />
                    <span className="text-meta min-w-0 flex-1 truncate">
                      {giver.name}
                    </span>
                    {giver.relation ? (
                      <span className="text-muted-foreground text-eyebrow">
                        {giver.relation}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </MarksSheet>
  );
}
