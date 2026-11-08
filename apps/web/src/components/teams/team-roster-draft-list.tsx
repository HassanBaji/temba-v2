"use client";

import { type TeamRosterDraftView } from "@repo/domain/team-roster-draft";
import { Plus, X } from "lucide-react";

import { MemberRow } from "~/components/common/member-row";
import { useMessages } from "~/components/locale-provider";
import { ListRow, RowList } from "~/components/common/row-list";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export function TeamRosterDraftList({
  roster,
  onAddMore,
  onRemove,
  disabled,
}: {
  roster: TeamRosterDraftView;
  onAddMore: () => void;
  onRemove: (key: string) => void;
  disabled: boolean;
}) {
  const m = useMessages();
  return (
    <div className="space-y-3">
      <p className="text-meta text-muted-foreground" aria-live="polite">
        {roster.countLine}
      </p>
      <RowList>
        {roster.rows.map((row) => (
          <MemberRow
            key={row.key}
            name={row.name}
            meta={
              row.isCaptain
                ? undefined
                : [row.status, row.detail]
                    .filter(Boolean)
                    .join(m.common.listSeparator)
            }
            badge={
              row.isCaptain ? (
                <Badge variant="outline">{row.status}</Badge>
              ) : undefined
            }
            action={
              row.removeLabel ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={row.removeLabel}
                  disabled={disabled}
                  onClick={() => onRemove(row.key)}
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              ) : undefined
            }
          />
        ))}
        {roster.addMore ? (
          <ListRow
            asChild
            icon={<Plus aria-hidden="true" className="size-5" />}
            title={roster.addMore.title}
            meta={roster.addMore.detail}
          >
            <button type="button" onClick={onAddMore} disabled={disabled} />
          </ListRow>
        ) : null}
      </RowList>
      {roster.fullLine ? (
        <p className="text-meta text-muted-foreground">{roster.fullLine}</p>
      ) : null}
      {roster.footer ? (
        <p className="text-meta text-muted-foreground">{roster.footer}</p>
      ) : null}
    </div>
  );
}
