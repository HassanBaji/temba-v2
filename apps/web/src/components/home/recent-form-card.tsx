"use client";

import { useMessages } from "~/components/locale-provider";
import { ResultMark } from "~/components/temba/result-mark";
import {
  lastTenOrder,
  type RecentFormView,
} from "@repo/domain/home-recent-form";
import { WIN_RATE_MIN_MATCHES } from "@repo/domain/win-rate";

import { SectionTitle } from "./section-title";

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <p className="flex items-baseline gap-1.5">
      <span className="font-expanded text-[34px] tabular-nums leading-none">
        {value}
      </span>
      <span className="text-meta text-muted-foreground">{label}</span>
    </p>
  );
}

export function RecentFormCard({ form }: { form: RecentFormView }) {
  const m = useMessages();
  const copy = m.home.lastTen;
  const showRate = form.playedCount >= WIN_RATE_MIN_MATCHES;
  const parts = [
    { key: "won", flex: form.wins, className: "bg-ink" },
    { key: "drawn", flex: form.draws, className: "bg-muted-foreground" },
    { key: "lost", flex: form.losses, className: "bg-paper border-ink border" },
  ].filter((part) => part.flex > 0);

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle title={copy.title} meta={copy.oldestFirst} />
      <div className="border-rule bg-paper divide-rule rounded-card divide-y overflow-hidden border">
        <div className="flex flex-col gap-3.5 p-[22px]">
          <div
            role="group"
            aria-label={copy.spoken(form.wins, form.draws, form.losses)}
            className="flex flex-wrap items-baseline gap-x-4"
          >
            <Figure value={form.wins} label={copy.won} />
            {form.draws > 0 ? (
              <Figure value={form.draws} label={copy.drawn} />
            ) : null}
            <Figure value={form.losses} label={copy.lost} />
            {showRate ? (
              <p className="text-meta text-muted-foreground ms-auto">
                <span className="text-ink font-semibold">
                  {copy.percentWon(form.winRatePercent)}
                </span>{" "}
                {copy.percentWonLabel}
              </p>
            ) : null}
          </div>
          <div aria-hidden="true" className="flex h-2 gap-0.5">
            {parts.map((part) => (
              <span
                key={part.key}
                className={`rounded-[2px] ${part.className}`}
                style={{ flexGrow: part.flex, flexBasis: 0 }}
              />
            ))}
          </div>
        </div>
        <ol className="flex justify-between px-[22px] py-3.5">
          {lastTenOrder(form.bars).map((bar, index) => (
            <li key={index}>
              <ResultMark
                variant={bar.kind === "empty" ? "not-played" : bar.outcome}
                className="size-[22px]"
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
