"use client";

import * as React from "react";

import { useLocale } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

import { CandidateList } from "./candidate-list";
import { pickSheetModel, voteSheetModel } from "./marks-model";
import { MarksSheet } from "./marks-sheet";
import type { GameMarksController } from "./use-game-marks";

function usePickWhileOpen(open: boolean) {
  const [picked, setPicked] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!open) {
      setPicked(null);
    }
  }, [open]);
  return [picked, setPicked] as const;
}

/** 2d: one vote, either side, not yourself; only how many have voted shows. */
export function MvpVoteSheet({ marks }: { marks: GameMarksController }) {
  const locale = useLocale();
  const open = marks.sheet?.kind === "vote";
  const [picked, setPicked] = usePickWhileOpen(open);
  const model = marks.data ? voteSheetModel(marks.data, picked, locale) : null;

  async function vote() {
    if (model?.selected && (await marks.vote(model.selected))) {
      marks.closeSheet();
    }
  }

  if (!model) {
    return null;
  }
  return (
    <MarksSheet
      open={open}
      onClose={marks.closeSheet}
      title={model.title}
      subtitle={model.subtitle}
      footer={
        <>
          <div className="text-eyebrow flex justify-between gap-3">
            <p className="font-semibold">{model.progress}</p>
            <p className="text-muted-foreground">{model.tieRule}</p>
          </div>
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!model.cta.enabled}
            pending={marks.pending}
            onClick={() => void vote()}
          >
            {model.cta.label}
          </Button>
        </>
      }
    >
      {model.current ? (
        <p className="text-muted-foreground text-meta">{model.current}</p>
      ) : null}
      <CandidateList
        label={model.title}
        rows={model.rows}
        selected={model.selected}
        trailing="coins"
        onSelect={setPicked}
      />
    </MarksSheet>
  );
}

/** 2e: the Organizer's pick, or the tie-break among the tied only. */
export function MvpPickSheet({ marks }: { marks: GameMarksController }) {
  const locale = useLocale();
  const open = marks.sheet?.kind === "pick";
  const [picked, setPicked] = usePickWhileOpen(open);
  const model = marks.data ? pickSheetModel(marks.data, picked, locale) : null;

  async function pick() {
    if (model?.selected && (await marks.pick(model.selected))) {
      marks.closeSheet();
    }
  }

  if (!model) {
    return null;
  }
  return (
    <MarksSheet
      open={open}
      onClose={marks.closeSheet}
      title={model.title}
      subtitle={model.subtitle}
      footer={
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!model.cta.enabled}
          pending={marks.pending}
          onClick={() => void pick()}
        >
          {model.cta.label}
        </Button>
      }
    >
      <CandidateList
        label={model.title}
        rows={model.rows}
        selected={model.selected}
        trailing="marks"
        onSelect={setPicked}
      />
      {model.footnote ? (
        <p className="text-muted-foreground text-eyebrow">{model.footnote}</p>
      ) : null}
    </MarksSheet>
  );
}
