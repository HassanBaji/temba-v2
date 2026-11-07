"use client";

import { useLocale } from "~/components/locale-provider";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { SelectCard } from "~/components/ui/select-card";
import { MVP_MODES, mvpModeCopy, type MvpMode } from "@repo/domain/marks";

/** The three ways a Friendly game decides its MVP, as one radio group. */
export function MvpModeChoices({
  id,
  labelledBy,
  describedBy,
  mode,
  onSelect,
}: {
  id: string;
  labelledBy: string;
  describedBy?: string;
  mode: MvpMode;
  onSelect: (mode: MvpMode) => void;
}) {
  const locale = useLocale();
  return (
    <RovingRadioGroup
      id={id}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabIndex={-1}
      className="border-rule rounded-card flex flex-col overflow-hidden border outline-none"
    >
      {MVP_MODES.map((option) => {
        const copy = mvpModeCopy(option, locale);
        return (
          <SelectCard
            key={option}
            role="radio"
            layout="row"
            selected={mode === option}
            title={copy.label}
            description={copy.description}
            trailing="check"
            onClick={() => {
              onSelect(option);
            }}
          />
        );
      })}
    </RovingRadioGroup>
  );
}
