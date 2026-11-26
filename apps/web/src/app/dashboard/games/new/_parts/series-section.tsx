import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
import { useMessages } from "~/components/locale-provider";
import {
  SeriesField,
  type SeriesAttachOption,
} from "~/components/series/series-field";

export type CreateSeriesChoice = {
  options: readonly SeriesAttachOption[];
  value: string | null;
  onChange: (seriesId: string | null) => void;
  groupName: string;
};

/** Create step 4: the optional Series, shown only when the Group runs one. */
export function SeriesSection({
  idPrefix,
  choice,
}: {
  idPrefix: string;
  choice: CreateSeriesChoice;
}) {
  const m = useMessages();
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        id={`${idPrefix}-series-label`}
        title={m.series.attach.title}
        meta={m.common.optional}
      />
      <SeriesField
        id={`${idPrefix}-series`}
        labelledBy={`${idPrefix}-series-label`}
        {...choice}
      />
    </section>
  );
}
