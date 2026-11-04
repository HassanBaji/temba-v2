"use client";

import { SurfaceLabel } from "~/components/common/surface-label";
import { useMessages } from "~/components/locale-provider";
import { ResultMark } from "~/components/temba/result-mark";
import type { RecentFormView } from "@repo/domain/home-recent-form";

export function RecentFormCard({ form }: { form: RecentFormView }) {
  const m = useMessages();
  const copy = m.webAuth.home.recentForm;
  const figures = [
    { key: "played", label: copy.played, value: form.playedCount },
    { key: "won", label: copy.won, value: form.wins },
    { key: "lost", label: copy.lost, value: form.losses },
  ];

  return (
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <SurfaceLabel meta={copy.lastTen}>{copy.title}</SurfaceLabel>
      <div className="flex flex-wrap gap-[5px] px-[22px] pb-[18px]">
        {form.bars.map((bar, index) => (
          <ResultMark
            key={index}
            variant={bar.kind === "empty" ? "not-played" : bar.outcome}
            className="size-4"
          />
        ))}
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
