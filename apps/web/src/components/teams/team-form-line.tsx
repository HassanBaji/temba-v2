"use client";

import { type TeamDetailView } from "@repo/domain/team-detail";

import { ResultMark } from "~/components/temba/result-mark";

/** Ten result marks, oldest first, with the first and last days under them. */
export function TeamFormLine({ form }: { form: TeamDetailView["form"] }) {
  return (
    <div>
      <ol className="grid grid-cols-10 gap-1.5">
        {form.slots.map((slot) => (
          <li key={slot.key}>
            <ResultMark
              variant={slot.variant}
              className="aspect-square w-full"
            />
          </li>
        ))}
      </ol>
      {form.ends ? (
        <div className="text-eyebrow text-muted-foreground mt-1.5 flex justify-between">
          <span>{form.ends.oldest}</span>
          <span>{form.ends.newest}</span>
        </div>
      ) : null}
      {form.emptyCopy ? (
        <p className="text-meta text-muted-foreground mt-2">{form.emptyCopy}</p>
      ) : null}
    </div>
  );
}
