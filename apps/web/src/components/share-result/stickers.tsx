import { colors } from "@repo/design-tokens";
import {
  padelStickerLine,
  type FootballResultCard,
  type PadelResultCard,
  type ResultCard,
} from "@repo/domain/game-result-share";

import { STICKER_WIDTH } from "./scaled-canvas";
import { Big, BibSquare, InitialsSquare, Label, Wordmark } from "./story-parts";

/** The black card itself; the canvas around it stays transparent. */
function StickerFrame({
  typeLine,
  children,
}: {
  typeLine: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ width: STICKER_WIDTH }}>
      <div
        className="bg-ink text-paper flex flex-col"
        style={{ borderRadius: 32, padding: "40px 44px", gap: 28 }}
      >
        <div className="flex items-center justify-between gap-6">
          <Wordmark mark={40} px={28} />
          <Label px={20} className="text-dim shrink-0 whitespace-nowrap">
            {typeLine}
          </Label>
        </div>
        {children}
      </div>
    </div>
  );
}

function StickerFoot({
  whenShort,
  children,
}: {
  whenShort: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="border-dimrule flex items-center justify-between gap-6 border-t"
      style={{ paddingTop: 24 }}
    >
      {children}
      {whenShort ? (
        <Big px={24} className="text-dim shrink-0 text-right">
          {whenShort}
        </Big>
      ) : null}
    </div>
  );
}

function FootballSticker({ card }: { card: FootballResultCard }) {
  const side = (
    team: FootballResultCard["win"],
    word: string,
    strong: boolean,
    align: "left" | "right",
  ) => (
    <div
      className={
        align === "right"
          ? "flex min-w-0 flex-1 flex-col items-end text-right"
          : "flex min-w-0 flex-1 flex-col items-start"
      }
      style={{ gap: 10 }}
    >
      <BibSquare bib={team.bib} size={28} radius={8} />
      <Big px={34} className={strong ? "truncate font-semibold" : "truncate"}>
        <span style={{ color: strong ? colors.paper : colors.dim }}>
          {team.name}
        </span>
      </Big>
      <Label
        px={20}
        tracking={0.14}
        className={strong ? "text-dim" : "text-muted-foreground"}
      >
        {word}
      </Label>
    </div>
  );
  return (
    <StickerFrame typeLine={card.typeLine}>
      <div className="flex items-center" style={{ gap: 28 }}>
        {side(card.win, card.draw ? "DRAW" : "WON", true, "left")}
        <div className="flex items-baseline" style={{ gap: 16 }}>
          <Big px={150} ratio={0.86} tracking={-0.05} expanded>
            {card.win.score}
          </Big>
          <Big px={60} ratio={0.86} className="text-muted-foreground">
            –
          </Big>
          <Big px={150} ratio={0.86} tracking={-0.05} expanded>
            <span style={{ color: card.draw ? colors.paper : colors.muted }}>
              {card.lose.score}
            </span>
          </Big>
        </div>
        {side(card.lose, card.draw ? "DRAW" : "LOST", card.draw, "right")}
      </div>
      <StickerFoot whenShort={card.whenShort}>
        {card.you ? (
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <InitialsSquare
              init={card.you.init}
              size={52}
              radius={14}
              px={18}
              variant="solid"
            />
            <div className="min-w-0 space-y-1">
              <Big px={28} className="truncate font-semibold">
                {card.you.name}
              </Big>
              <Label px={20} className="text-dim">
                {[`${card.you.goals} GOALS`, card.you.code]
                  .filter(Boolean)
                  .join(" · ")}
              </Label>
            </div>
          </div>
        ) : (
          <Label px={20} className="text-dim flex-1">
            {card.typeNote}
          </Label>
        )}
      </StickerFoot>
    </StickerFrame>
  );
}

function PadelSticker({ card }: { card: PadelResultCard }) {
  const pair = (short: string, line: string, strong: boolean) => (
    <div className="flex min-w-0 flex-1 items-center" style={{ gap: 14 }}>
      <InitialsSquare
        init={short}
        size={52}
        radius={14}
        px={18}
        variant={strong ? "solid" : "outline-muted"}
      />
      <Big px={34} className={strong ? "truncate font-semibold" : "truncate"}>
        <span style={{ color: strong ? colors.paper : colors.dim }}>
          {line}
        </span>
      </Big>
    </div>
  );
  const cells = (pick: "w" | "l") => (
    <div className="flex" style={{ gap: 22 }}>
      {card.setRows.map((row) => {
        const value = pick === "w" ? row.w : row.l;
        const won = pick === "w" ? row.w > row.l : row.l > row.w;
        return (
          <Big
            key={row.id}
            px={92}
            ratio={0.9}
            tracking={-0.05}
            expanded
            className="w-[90px] text-center"
          >
            <span style={{ color: won ? colors.paper : colors.muted }}>
              {value}
            </span>
          </Big>
        );
      })}
    </div>
  );
  return (
    <StickerFrame typeLine={card.typeLine}>
      <div className="flex flex-col" style={{ gap: 12 }}>
        <div className="flex items-center" style={{ gap: 28 }}>
          {pair(card.winnerShort, card.winnerLine, true)}
          {cells("w")}
        </div>
        <div className="flex items-center" style={{ gap: 28 }}>
          {pair(card.loserShort, card.loserLine, card.draw)}
          {cells("l")}
        </div>
      </div>
      <StickerFoot whenShort={card.whenShort}>
        <Label px={20} className="text-dim min-w-0 flex-1 truncate">
          {padelStickerLine(card)}
        </Label>
      </StickerFoot>
    </StickerFrame>
  );
}

/** A compact result on a transparent canvas, to drop on a photo. */
export function Sticker({ card }: { card: ResultCard }) {
  return card.kind === "padel" ? (
    <PadelSticker card={card} />
  ) : (
    <FootballSticker card={card} />
  );
}
