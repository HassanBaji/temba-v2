"use client";

import { type GroupTeamData } from "@repo/domain/group-data";
import { groupTeamRowView } from "@repo/domain/teams";
import Link from "next/link";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { ListRow, RowList } from "~/components/common/row-list";
import { Section } from "~/components/layout/section";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

/** Teams tagged to the Group, for members; Organizers also get Create team. */
export function GroupTeamsRow({
  groupId,
  teams,
  isMember,
  canCreateTeam,
}: {
  groupId: string;
  teams: GroupTeamData[];
  isMember: boolean;
  canCreateTeam: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  if (!canCreateTeam && (!isMember || teams.length === 0)) {
    return null;
  }
  const rows = teams.map((team) => groupTeamRowView(team, locale));
  return (
    <Section
      title={m.group.teams.title}
      action={
        canCreateTeam ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/teams/new?groupId=${groupId}`}>
              {m.group.teams.createLabel}
            </Link>
          </Button>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="text-body text-muted-foreground">{m.group.teams.empty}</p>
      ) : (
        <RowList>
          {rows.map((row) => (
            <ListRow
              key={row.id}
              asChild
              leading={<EntityMonogram name={row.title} size="sm" />}
              title={row.title}
              meta={row.meta}
            >
              <Link
                href={`/dashboard/teams/${row.id}`}
                aria-label={row.accessibilityLabel}
              />
            </ListRow>
          ))}
        </RowList>
      )}
    </Section>
  );
}
