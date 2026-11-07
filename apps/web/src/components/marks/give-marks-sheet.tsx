"use client";

import type { GameMarks, MarkKind } from "@repo/domain/marks";
import { ChevronRight } from "lucide-react";
import * as React from "react";

import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";

import { MarkCoin } from "./mark-coin";
import {
  givePlayersModel,
  markPickModel,
  type GivePlayerRow,
  type MarkPickModel,
} from "./marks-model";
import { MarksSheet } from "./marks-sheet";
import type { GameMarksController } from "./use-game-marks";

function focusReceiverRow(userId: string) {
  document
    .querySelector<HTMLElement>(`[data-receiver="${CSS.escape(userId)}"]`)
    ?.focus();
}

function GroupHead({
  id,
  title,
  caption,
}: {
  id: string;
  title: string;
  caption: string | null;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <h3 id={id} className="text-meta text-muted-foreground font-medium">
        {title}
      </h3>
      {caption ? (
        <p className="text-muted-foreground text-eyebrow">{caption}</p>
      ) : null}
    </div>
  );
}

function PlayerRow({
  row,
  pending,
  onPick,
  onRetract,
}: {
  row: GivePlayerRow;
  pending: boolean;
  onPick: () => void;
  onRetract: () => void;
}) {
  const m = useMessages();
  const body = (
    <>
      <UserAvatar name={row.name} image={row.image} />
      <span className="min-w-0 flex-1">
        <span className="text-meta block truncate font-semibold">
          {row.name}
        </span>
        {row.givenName ? (
          <span className="text-eyebrow block truncate">{row.givenName}</span>
        ) : row.sub ? (
          <span className="text-muted-foreground text-eyebrow block truncate">
            {row.sub}
          </span>
        ) : null}
      </span>
    </>
  );
  return (
    <li className="border-rule flex min-h-14 items-center gap-3 border-t first:border-t-0">
      {row.canPick ? (
        <button
          type="button"
          data-receiver={row.userId}
          aria-label={[row.name, row.sub]
            .filter(Boolean)
            .join(m.common.listSeparator)}
          onClick={onPick}
          className="hover:bg-wash focus-visible:ring-ring/50 flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3.5 py-2.5 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
        >
          {body}
          <ChevronRight
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0 rtl:-scale-x-100"
          />
        </button>
      ) : (
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 py-2.5 ps-3.5",
            !row.given && "pe-3.5 opacity-60",
          )}
        >
          {body}
        </div>
      )}
      {row.given ? (
        <div className="flex shrink-0 items-center gap-3 pe-3.5">
          <MarkCoin kind={row.given} size="row" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-receiver={row.userId}
            aria-label={row.retractSpoken ?? undefined}
            disabled={pending}
            onClick={onRetract}
          >
            {m.marks.give.retract}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function PlayersStep({
  data,
  pending,
  onPick,
  onRetract,
}: {
  data: GameMarks;
  pending: boolean;
  onPick: (userId: string) => void;
  onRetract: (userId: string) => void;
}) {
  const locale = useLocale();
  const model = givePlayersModel(data, locale);
  return (
    <>
      {model.groups.map((group) => {
        const headId = `give-marks-${group.relation}`;
        return (
          <section
            key={group.relation}
            aria-labelledby={headId}
            className="space-y-2"
          >
            <GroupHead
              id={headId}
              title={group.title}
              caption={group.caption}
            />
            <ul className="border-rule rounded-card overflow-hidden border">
              {group.rows.map((row) => (
                <PlayerRow
                  key={row.userId}
                  row={row}
                  pending={pending}
                  onPick={() => onPick(row.userId)}
                  onRetract={() => onRetract(row.userId)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function KindTile({
  name,
  kind,
  selected,
  onPick,
}: {
  name: string;
  kind: MarkKind;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      className={cn(
        "flex min-h-11 flex-col items-center gap-1.5 rounded-lg border px-1.5 py-3 outline-none",
        "hover:bg-wash focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        selected ? "border-ink bg-wash" : "border-rule bg-paper",
      )}
    >
      <MarkCoin kind={kind} size="cabinet" />
      <span
        className={cn(
          "text-eyebrow line-clamp-2 text-center",
          selected && "font-semibold",
        )}
      >
        {name}
      </span>
    </button>
  );
}

function MarksStep({
  model,
  picked,
  onPick,
}: {
  model: MarkPickModel;
  picked: MarkKind | null;
  onPick: (kind: MarkKind) => void;
}) {
  return (
    <>
      {model.groups.map((group) => {
        const headId = `give-marks-kinds-${group.key}`;
        return (
          <section key={group.key} className="space-y-2">
            <GroupHead
              id={headId}
              title={group.title}
              caption={group.caption}
            />
            <RovingRadioGroup
              aria-labelledby={headId}
              className="grid grid-cols-3 gap-2"
            >
              {group.kinds.map((choice) => (
                <KindTile
                  key={choice.kind}
                  kind={choice.kind}
                  name={choice.name}
                  selected={picked === choice.kind}
                  onPick={() => onPick(choice.kind)}
                />
              ))}
            </RovingRadioGroup>
          </section>
        );
      })}
      {model.footnote ? (
        <p className="text-muted-foreground text-eyebrow">{model.footnote}</p>
      ) : null}
    </>
  );
}

/**
 * Give marks: pick a player (2b), then pick the mark (2c). Only the kinds
 * the server would accept are offered; a refused give still shows its
 * reason and refreshes. Keyboard focus follows the step: Back on the mark
 * step, the player's row on the way back.
 */
export function GiveMarksSheet({ marks }: { marks: GameMarksController }) {
  const locale = useLocale();
  const m = useMessages();
  const open = marks.sheet?.kind === "give";
  const [receiver, setReceiver] = React.useState<string | null>(null);
  const [picked, setPicked] = React.useState<MarkKind | null>(null);
  const backRef = React.useRef<HTMLButtonElement>(null);
  const returnTo = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setReceiver(null);
      setPicked(null);
      returnTo.current = null;
    }
  }, [open]);

  React.useEffect(() => {
    if (receiver) {
      backRef.current?.focus();
      return;
    }
    const userId = returnTo.current;
    returnTo.current = null;
    if (userId) {
      focusReceiverRow(userId);
    }
  }, [receiver]);

  const data = marks.data;
  if (!data) {
    return null;
  }
  const pickModel = receiver
    ? markPickModel(data, receiver, picked, locale)
    : null;
  const players = givePlayersModel(data, locale);

  function backToPlayers() {
    returnTo.current = receiver;
    setReceiver(null);
    setPicked(null);
  }

  async function retract(userId: string) {
    if (await marks.retract(userId)) {
      window.requestAnimationFrame(() => focusReceiverRow(userId));
    }
  }

  async function give() {
    if (!data || !receiver || !picked || !pickModel?.picked) {
      return;
    }
    const lastOne = data.viewer.remaining <= 1;
    if (await marks.give(receiver, picked)) {
      if (lastOne) {
        marks.closeSheet();
      } else {
        backToPlayers();
      }
    }
  }

  return (
    <MarksSheet
      open={open}
      onClose={marks.closeSheet}
      title={pickModel?.title ?? players.title}
      subtitle={pickModel?.subtitle ?? players.subtitle}
      action={
        pickModel ? (
          <Button
            ref={backRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={backToPlayers}
          >
            {m.common.back}
          </Button>
        ) : undefined
      }
      footer={
        pickModel ? (
          <>
            {pickModel.picked && picked ? (
              <div
                aria-live="polite"
                className="border-rule rounded-card flex items-center gap-2.5 border px-3.5 py-3"
              >
                <MarkCoin kind={picked} size="row" />
                <p className="text-meta min-w-0 flex-1 truncate font-semibold">
                  {pickModel.picked.line}
                </p>
                <p className="text-muted-foreground text-eyebrow shrink-0">
                  {pickModel.picked.remaining}
                </p>
              </div>
            ) : null}
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={!pickModel.picked}
              pending={marks.pending}
              onClick={() => void give()}
            >
              {pickModel.picked?.cta ?? pickModel.choose}
            </Button>
          </>
        ) : undefined
      }
    >
      {pickModel ? (
        <MarksStep model={pickModel} picked={picked} onPick={setPicked} />
      ) : (
        <PlayersStep
          data={data}
          pending={marks.pending}
          onPick={(userId) => {
            setReceiver(userId);
            setPicked(null);
          }}
          onRetract={(userId) => void retract(userId)}
        />
      )}
    </MarksSheet>
  );
}
