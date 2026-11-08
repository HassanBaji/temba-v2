"use client";

import { type TeamHomeView } from "@repo/domain/teams";
import { Plus, Users, X } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "~/components/common/empty-state";
import { MemberRow } from "~/components/common/member-row";
import { ListRow, RowList } from "~/components/common/row-list";
import { useMessages } from "~/components/locale-provider";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

type MemberRemove = NonNullable<TeamHomeView["members"][number]["remove"]>;

export function TeamRosterList({
  view,
  onAddMore,
  onRemove,
}: {
  view: TeamHomeView;
  onAddMore: () => void;
  onRemove: (remove: MemberRemove) => void;
}) {
  const m = useMessages();
  const [expanded, setExpanded] = useState(false);

  if (view.members.length === 0) {
    return (
      <EmptyState
        headingLevel={3}
        icon={Users}
        title={m.team.noMembers.title}
        description={m.team.noMembers.description}
      />
    );
  }

  const shown = expanded
    ? view.members
    : view.members.slice(0, view.rosterPreview);

  return (
    <RowList>
      {shown.map((member) => (
        <MemberRow
          key={member.id}
          name={member.name}
          image={member.image}
          isViewer={member.isViewer}
          unclaimed={member.addedLabel != null}
          meta={
            [member.phoneMasked, member.seatLabel, member.levelLabel]
              .filter(Boolean)
              .join(m.common.listSeparator) || undefined
          }
          badge={
            member.captainLabel ? (
              <Badge variant="outline">{member.captainLabel}</Badge>
            ) : undefined
          }
          action={
            member.remove ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={member.remove.label}
                onClick={() => {
                  if (member.remove) {
                    onRemove(member.remove);
                  }
                }}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            ) : undefined
          }
        />
      ))}
      {view.rosterMore && !expanded ? (
        <ListRow asChild title={view.rosterMore}>
          <button type="button" onClick={() => setExpanded(true)} />
        </ListRow>
      ) : null}
      {view.addMore ? (
        <ListRow
          asChild
          icon={<Plus aria-hidden="true" className="size-5" />}
          title={view.addMore.title}
          meta={view.addMore.detail}
        >
          <button type="button" onClick={onAddMore} />
        </ListRow>
      ) : null}
    </RowList>
  );
}
