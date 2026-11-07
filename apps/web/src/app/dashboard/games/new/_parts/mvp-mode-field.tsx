import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
import { useLocale, useMessages } from "~/components/locale-provider";
import { MvpModeChoices } from "~/components/marks/mvp-mode-choices";
import { FieldDescription } from "~/components/ui/field";
import { mvpModeCopy, type MvpMode } from "@repo/domain/marks";

/** Create step 4: how the MVP is decided, with the help line for the pick. */
export function MvpModeField({
  idPrefix,
  mode,
  onMode,
}: {
  idPrefix: string;
  mode: MvpMode;
  onMode: (mode: MvpMode) => void;
}) {
  const locale = useLocale();
  const copy = useMessages().createGame.mvp;
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        id={`${idPrefix}-mvp-label`}
        title={copy.title}
        meta={copy.decidedAfterGame}
      />
      <MvpModeChoices
        id={`${idPrefix}-mvp`}
        labelledBy={`${idPrefix}-mvp-label`}
        describedBy={`${idPrefix}-mvp-help`}
        mode={mode}
        onSelect={onMode}
      />
      <FieldDescription id={`${idPrefix}-mvp-help`} aria-live="polite">
        {mvpModeCopy(mode, locale).help}
      </FieldDescription>
    </section>
  );
}
