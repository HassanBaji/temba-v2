import { Users } from "lucide-react";
import Link from "next/link";

import { NotSetCell } from "~/components/temba/not-set-cell";
import { Button } from "~/components/ui/button";
import {
  MY_GROUPS_EMPTY_COPY,
  MY_GROUPS_EMPTY_TITLE,
  MY_GROUPS_PLACEHOLDER_TITLE,
  PUBLIC_GROUPS_EMPTY_TITLE,
  PUBLIC_GROUPS_PREVIEW_MONOGRAMS,
  publicGroupsEmptyLine,
} from "@repo/domain/groups-list-empty-states";
import type { PublicGroupSportFilter } from "@repo/domain/sport";
import { cardFrame } from "~/lib/page-layout";

const CREATE_GROUP_HREF = "/dashboard/groups/new";

function EmptyHeading({ title, line }: { title: string; line: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-expanded text-h1 leading-tight">{title}</h2>
      <p className="text-body text-muted-foreground">{line}</p>
    </div>
  );
}

/**
 * The Mine tab before the first Group, in the "Group empty states" language:
 * the first Group drawn as a hatched row, its Standing and next Game not set.
 */
export function MyGroupsEmpty({
  onBrowsePublic,
}: {
  onBrowsePublic: () => void;
}) {
  return (
    <div className="flex flex-col gap-[22px]">
      <section className={cardFrame}>
        <div className="flex flex-col gap-[18px] p-5">
          <div aria-hidden="true" className="flex items-center gap-3">
            <span className="hatch size-10 shrink-0 rounded-lg" />
            <span className="text-body text-muted-foreground min-w-0 flex-1 truncate">
              {MY_GROUPS_PLACEHOLDER_TITLE}
            </span>
            <span className="hatch h-11 w-[52px] shrink-0 rounded-lg" />
          </div>
          <EmptyHeading
            title={MY_GROUPS_EMPTY_TITLE}
            line={MY_GROUPS_EMPTY_COPY}
          />
        </div>
        <dl className="border-rule divide-rule grid grid-cols-2 divide-x border-t">
          <NotSetCell label="Standing" />
          <NotSetCell label="Next Game" />
        </dl>
      </section>
      <div className="flex flex-col gap-2">
        <Button asChild size="lg" className="text-body w-full font-semibold">
          <Link href={CREATE_GROUP_HREF}>Create Group</Link>
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="text-body w-full font-semibold"
          onClick={onBrowsePublic}
        >
          <Users aria-hidden="true" />
          Browse public Groups
        </Button>
      </div>
    </div>
  );
}

/** The Public tab with nothing to join: hatched monograms where Groups will list. */
export function PublicGroupsEmpty({
  sportFilter,
}: {
  sportFilter: PublicGroupSportFilter;
}) {
  return (
    <div className="flex flex-col gap-[22px]">
      <section className={cardFrame}>
        <div className="flex flex-col gap-[18px] p-5">
          <p className="text-meta text-muted-foreground flex justify-between gap-3">
            <span>Public Groups</span>
            <span>None open</span>
          </p>
          <div aria-hidden="true" className="flex gap-1.5">
            {Array.from({ length: PUBLIC_GROUPS_PREVIEW_MONOGRAMS }, (_, i) => (
              <span key={i} className="hatch size-10 rounded-lg" />
            ))}
          </div>
          <EmptyHeading
            title={PUBLIC_GROUPS_EMPTY_TITLE}
            line={publicGroupsEmptyLine(sportFilter)}
          />
        </div>
      </section>
      <Button asChild size="lg" className="text-body w-full font-semibold">
        <Link href={CREATE_GROUP_HREF}>Create Group</Link>
      </Button>
    </div>
  );
}
