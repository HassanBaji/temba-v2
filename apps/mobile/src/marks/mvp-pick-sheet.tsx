import { useEffect, useState } from "react";

import { useLocale } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { CandidateList } from "./candidate-list";
import { pickSheetModel } from "./marks-model";
import type { GameMarksController } from "./use-game-marks";

/** 2e: the Organizer's pick, or the tie-break among the tied only. */
export function MvpPickSheet({ marks }: { marks: GameMarksController }) {
  const locale = useLocale();
  const visible = marks.sheet?.kind === "pick";
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPicked(null);
    }
  }, [visible]);

  const model = marks.data ? pickSheetModel(marks.data, picked, locale) : null;

  const pick = async () => {
    if (model?.selected && (await marks.pick(model.selected))) {
      marks.closeSheet();
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={marks.closeSheet}
      tall
      closeButton
      title={model?.title}
      subtitle={model?.subtitle}
      footer={
        model ? (
          <Button
            label={model.cta.label}
            size="lg"
            disabled={!model.cta.enabled}
            pending={marks.pending}
            onPress={() => void pick()}
          />
        ) : undefined
      }
    >
      {model ? (
        <>
          <CandidateList
            rows={model.rows}
            selected={model.selected}
            trailing="marks"
            onSelect={setPicked}
          />
          {model.footnote ? (
            <Text size="eyebrow" tone="muted">
              {model.footnote}
            </Text>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}
