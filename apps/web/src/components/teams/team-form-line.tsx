"use client";

import { type TeamHomeView } from "@repo/domain/teams";

import { useMessages } from "~/components/locale-provider";
import { ResultMark } from "~/components/temba/result-mark";

export function TeamFormLine({ form }: { form: TeamHomeView["form"] }) {
  const m = useMessages();
  return (
    <div className="space-y-2">
      <ol className="flex items-center gap-1.5">
        {form.slots.map((slot) => (
          <li key={slot.key} className="flex min-w-0 flex-1 justify-center">
            <ResultMark
              variant={slot.variant}
              className="aspect-square w-full max-w-7"
            />
          </li>
        ))}
      </ol>
      <div className="text-eyebrow text-muted-foreground flex justify-between">
        <span>{m.team.form.older}</span>
        <span>{m.team.form.latest}</span>
      </div>
      {form.emptyCopy ? (
        <p className="text-body text-muted-foreground">{form.emptyCopy}</p>
      ) : null}
    </div>
  );
}
