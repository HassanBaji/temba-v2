import { SurfaceLabel } from "~/components/common/surface-label";
import { ResultMark } from "~/components/temba/result-mark";
import {
  recentFormRecord,
  type RecentFormView,
} from "@repo/domain/home-recent-form";

export function RecentFormCard({ form }: { form: RecentFormView }) {
  const record = recentFormRecord(form);
  const figures = [
    { key: "played", label: "Played", value: form.playedCount },
    { key: "won", label: "Won", value: form.wins },
    { key: "lost", label: "Lost", value: form.losses },
  ];

  return (
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <SurfaceLabel meta="Last 10 matches">Recent form</SurfaceLabel>
      <div className="flex items-center justify-between gap-4 px-[22px] pb-[18px]">
        <p className="font-expanded text-[52px] tabular-nums leading-none">
          <span className="sr-only">Record </span>
          {record}
        </p>
        <div className="flex max-w-[150px] flex-wrap justify-end gap-[5px]">
          {form.bars.map((bar, index) => (
            <ResultMark
              key={index}
              variant={bar.kind === "empty" ? "not-played" : bar.outcome}
              className="size-4"
            />
          ))}
        </div>
      </div>
      <dl className="border-rule divide-rule flex divide-x border-t">
        {figures.map((figure) => (
          <div
            key={figure.key}
            className="flex min-w-0 flex-1 flex-col-reverse items-center gap-1 py-4"
          >
            <dt className="text-eyebrow text-muted-foreground">
              {figure.label}
            </dt>
            <dd className="font-expanded text-[22px] tabular-nums leading-none">
              {figure.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
