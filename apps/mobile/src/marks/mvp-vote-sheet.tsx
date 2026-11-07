import { useEffect, useState } from "react";
import { View } from "react-native";

import { useLocale } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { CandidateList } from "./candidate-list";
import { voteSheetModel } from "./marks-model";
import type { GameMarksController } from "./use-game-marks";

/** 2d: one vote, either side, not yourself; only how many have voted shows. */
export function MvpVoteSheet({ marks }: { marks: GameMarksController }) {
  const locale = useLocale();
  const visible = marks.sheet?.kind === "vote";
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPicked(null);
    }
  }, [visible]);

  const model = marks.data ? voteSheetModel(marks.data, picked, locale) : null;

  const vote = async () => {
    if (model?.selected && (await marks.vote(model.selected))) {
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
          <View style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text size="eyebrow" weight="semibold">
                {model.progress}
              </Text>
              <Text size="eyebrow" tone="muted">
                {model.tieRule}
              </Text>
            </View>
            <Button
              label={model.cta.label}
              size="lg"
              disabled={!model.cta.enabled}
              pending={marks.pending}
              onPress={() => void vote()}
            />
          </View>
        ) : undefined
      }
    >
      {model ? (
        <>
          {model.current ? (
            <Text size="meta" tone="muted">
              {model.current}
            </Text>
          ) : null}
          <CandidateList
            rows={model.rows}
            selected={model.selected}
            trailing="coins"
            onSelect={setPicked}
          />
        </>
      ) : null}
    </Sheet>
  );
}
