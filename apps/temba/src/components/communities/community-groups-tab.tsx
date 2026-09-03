import { Users } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { GroupTypeBadge } from "~/components/temba/group-type-badge";
import { SportBadge } from "~/components/temba/sport-badge";
import { Button } from "~/components/ui/button";
import { Section } from "~/components/layout/section";
import { type RouterOutputs } from "~/trpc/react";

type ClubGroup = RouterOutputs["communities"]["byId"]["groups"][number];

export function CommunityGroupsTab({
  groups,
  canCreateClubGroup,
  onCreate,
}: {
  groups: ClubGroup[];
  canCreateClubGroup: boolean;
  onCreate: () => void;
}) {
  return (
    <Section
      title="Groups"
      description="Club Groups stay inside this Community. Public Groups are open to Community members with no extra request."
      action={
        canCreateClubGroup ? (
          <Button type="button" className="min-h-11" onClick={onCreate}>
            Create Club Group
          </Button>
        ) : null
      }
    >
      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Groups yet"
          description="This Community has no Groups yet."
          action={
            canCreateClubGroup ? (
              <Button type="button" className="min-h-11" onClick={onCreate}>
                Create Club Group
              </Button>
            ) : null
          }
        />
      ) : (
        <RowList>
          {groups.map((group) => (
            <ListRow
              key={group.id}
              asChild
              title={group.name ?? "Untitled Group"}
              meta={group.isMember ? "Joined" : undefined}
              trailing={
                <div className="flex flex-wrap items-center gap-2">
                  <GroupTypeBadge isLoose={false} type={group.type} />
                  {group.sport ? <SportBadge sport={group.sport} /> : null}
                </div>
              }
            >
              <Link href={`/dashboard/groups/${group.id}`} />
            </ListRow>
          ))}
        </RowList>
      )}
    </Section>
  );
}
