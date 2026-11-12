"use client";

import { useLocale, useMessages } from "~/components/locale-provider";
import { type HomeLevelInput } from "@repo/domain/home-level";
import { homeTrendView, type TrendPoint } from "@repo/domain/home-level-trend";

import { SectionTitle } from "./section-title";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 96;
const INSET = 8;
const DOT = 4.5;
const SMALL_DOT = 3;
const LINE = 1.5;

function Dot({ point }: { point: TrendPoint }) {
  const { x, y, kind } = point;
  if (kind === "start" || kind === "set") {
    return (
      <circle cx={x} cy={y} r={SMALL_DOT} className="fill-muted-foreground" />
    );
  }
  if (kind === "won") {
    return <circle cx={x} cy={y} r={DOT} className="fill-ink" />;
  }
  return (
    <>
      <circle
        cx={x}
        cy={y}
        r={DOT}
        strokeWidth={LINE}
        className="fill-paper stroke-ink"
      />
      {kind === "drawn" ? (
        <path
          d={`M ${x} ${y - DOT} A ${DOT} ${DOT} 0 0 0 ${x} ${y + DOT} Z`}
          className="fill-ink"
        />
      ) : null}
    </>
  );
}

function Chart({
  points,
  baselineY,
}: {
  points: readonly TrendPoint[];
  baselineY: number;
}) {
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) {
    return null;
  }
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="block h-auto w-full"
    >
      <polygon
        points={`${line} ${last.x},${CHART_HEIGHT} ${first.x},${CHART_HEIGHT}`}
        className="fill-wash"
      />
      <line
        x1={INSET}
        y1={baselineY}
        x2={CHART_WIDTH - INSET}
        y2={baselineY}
        strokeWidth={1}
        strokeDasharray="2 3"
        className="stroke-muted-foreground"
      />
      <polyline
        points={line}
        fill="none"
        strokeWidth={LINE}
        strokeLinejoin="round"
        className="stroke-ink"
      />
      {points.map((point, index) => (
        <Dot key={index} point={point} />
      ))}
    </svg>
  );
}

export function TrendCard({ input }: { input: HomeLevelInput }) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.home.trend;
  const view = homeTrendView(
    input,
    { width: CHART_WIDTH, height: CHART_HEIGHT, inset: INSET },
    locale,
  );
  if (!view) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle title={copy.title} meta={view.window} />
      <div
        role="img"
        aria-label={view.spoken}
        className="border-rule bg-paper rounded-card flex flex-col gap-3.5 border p-[22px]"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-expanded text-[34px] tabular-nums leading-none">
            {view.signedDelta}
          </p>
          <p className="text-meta text-muted-foreground truncate">
            {copy.from(view.from)}
            <span className="text-ink font-semibold">{view.to}</span>
          </p>
        </div>
        <Chart points={view.points} baselineY={view.baselineY} />
        <div
          dir="ltr"
          className="text-eyebrow text-muted-foreground flex items-baseline justify-between gap-2"
        >
          <span className="shrink-0">{view.startLabel}</span>
          <span className="min-w-0 truncate text-center">{view.legend}</span>
          <span className="shrink-0">{copy.latest}</span>
        </div>
      </div>
    </section>
  );
}
