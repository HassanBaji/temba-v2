"use client";

import { SeriesPageView } from "~/components/series/series-page";

import {
  SERIES_PREVIEW_NOW,
  seriesAfterAYear,
  seriesAfterOneEdition,
} from "./fixtures";

const noop = () => undefined;

/** The Series page as 5a (after one Edition) and 5b (after a year) draw it. */
export function SeriesPagePreviews() {
  return (
    <div className="flex flex-wrap items-start gap-10">
      {[
        { id: "series-5a", series: seriesAfterOneEdition },
        { id: "series-5b", series: seriesAfterAYear },
      ].map((preview) => (
        <section
          key={preview.id}
          id={preview.id}
          className="w-full max-w-[390px] px-4"
        >
          <SeriesPageView
            series={preview.series}
            now={SERIES_PREVIEW_NOW}
            onEnd={noop}
          />
        </section>
      ))}
    </div>
  );
}
