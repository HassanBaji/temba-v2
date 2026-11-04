import { Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "~/components/common/empty-state";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { communityClubGroupRow } from "@repo/domain/community";
import { type RouterOutputs } from "~/trpc/react";

type ClubGroup = RouterOutputs["communities"]["byId"]["groups"][number];

function ClubGroupRow({ group }: { group: ClubGroup }) {
  const m = useMessages();
  const locale = useLocale();
  const row = communityClubGroupRow(group, locale);
  return (
    <li>
      <Link
        href={`/dashboard/groups/${row.id}`}
        className="focus-visible:ring-ring/50 hover:bg-muted/50 flex w-full min-w-0 items-center gap-3.5 px-5 py-[18px] outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
      >
        <EntityMonogram name={row.name} image={row.imageUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="break-words text-[18px] font-semibold leading-6">
            {row.name}
          </p>
          <p className="text-meta text-muted-foreground mt-0.5">{row.meta}</p>
        </div>
        {row.joined ? (
          <span className="text-eyebrow text-muted-foreground shrink-0">
            {m.community.joined}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function StartAClubGroupCard({ onCreate }: { onCreate: () => void }) {
  const m = useMessages();
  return (
    <section className="border-rule rounded-[14px] border p-5">
      <h2 className="text-body font-semibold">
        {m.community.startClubGroup.title}
      </h2>
      <p className="text-meta text-muted-foreground mt-1.5">
        {m.community.startClubGroup.description}
      </p>
      <Button
        type="button"
        className="bg-ink text-paper hover:bg-dimrule mt-4 h-11 w-full rounded-[10px] font-semibold"
        onClick={onCreate}
      >
        {m.community.action.createClubGroup}
      </Button>
    </section>
  );
}

export function CommunityGroupsTab({
  venue,
  groups,
  canCreateClubGroup,
  onCreate,
}: {
  venue?: ReactNode;
  groups: ClubGroup[];
  canCreateClubGroup: boolean;
  onCreate: () => void;
}) {
  const m = useMessages();
  return (
    <div className="flex flex-col gap-[26px]">
      {venue}

      {groups.length === 0 ? (
        <EmptyState icon={Users} {...m.community.noGroupsEmpty} />
      ) : (
        <ul className="divide-rule border-rule divide-y overflow-hidden rounded-[14px] border">
          {groups.map((group) => (
            <ClubGroupRow key={group.id} group={group} />
          ))}
        </ul>
      )}

      {canCreateClubGroup ? <StartAClubGroupCard onCreate={onCreate} /> : null}
    </div>
  );
}
