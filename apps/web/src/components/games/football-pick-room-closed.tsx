"use client";

import { useMessages } from "~/components/locale-provider";

/** The Pick room with no pick in it: stopped, or edited or published since. */
export function FootballPickRoomClosed() {
  const m = useMessages().football.pick;
  return (
    <section className="border-rule bg-paper space-y-1 rounded-xl border p-5">
      <h2 className="font-semibold">{m.closedTitle}</h2>
      <p className="text-muted-foreground text-meta">{m.closedBody}</p>
    </section>
  );
}
