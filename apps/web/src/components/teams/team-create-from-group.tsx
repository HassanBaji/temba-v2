"use client";

import { Check, Tag } from "lucide-react";
import * as React from "react";

import { useLocale, useMessages } from "~/components/locale-provider";
import { TeamCreateTile } from "~/components/teams/team-create-tile";
import { Switch } from "~/components/ui/switch";
import type { Sport } from "@repo/domain/sport";
import {
  teamGroupChoiceRows,
  teamSquadCountLine,
  teamSquadPickRows,
  type TeamGroupChoice,
  type TeamGroupMemberToAdd,
  type TeamRosterDraft,
} from "@repo/domain/team-roster-draft";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const VISIBLE_ROWS = 8;

function SectionHead({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-expanded text-title">{title}</h2>
      {aside ? (
        <span className="text-eyebrow text-muted-foreground">{aside}</span>
      ) : null}
    </div>
  );
}

/** Team from a group: pick a Group you organize, tick the squad, tag it. */
export function TeamCreateFromGroup({
  groups,
  loading,
  groupId,
  onGroupChange,
  draft,
  sport,
  captainName,
  onToggle,
  tagged,
  onTaggedChange,
  disabled,
}: {
  groups: readonly TeamGroupChoice[];
  loading: boolean;
  groupId: string | null;
  onGroupChange: (group: TeamGroupChoice) => void;
  draft: TeamRosterDraft;
  sport: Sport;
  captainName: string;
  onToggle: (member: TeamGroupMemberToAdd, groupName: string) => void;
  tagged: boolean;
  onTaggedChange: (tagged: boolean) => void;
  disabled: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const c = m.team.create.group;
  const [expanded, setExpanded] = React.useState(false);
  const choices = teamGroupChoiceRows(groups, locale);
  const selected = choices.find((choice) => choice.id === groupId) ?? null;

  const members = api.teams.listGroupMembersToAdd.useQuery(
    { groupId: groupId ?? "" },
    { enabled: groupId != null },
  );
  const memberRows = members.data?.members ?? [];
  const rows = teamSquadPickRows(
    { captainName, members: memberRows, draft, sport },
    locale,
  );
  const visible = expanded ? rows : rows.slice(0, VISIBLE_ROWS);
  const hidden = rows.length - visible.length;
  const tag = selected ? c.tag(selected.name) : null;

  return (
    <div className="flex flex-col gap-[26px]">
      <section>
        <SectionHead title={c.title} aside={c.organize(groups.length)} />
        {groups.length === 0 ? (
          <p className="text-meta text-muted-foreground mt-3">
            {loading ? m.team.create.lookingUp : c.empty}
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-label={c.title}
            className="border-rule bg-paper rounded-card divide-rule mt-3 divide-y overflow-hidden border"
          >
            {choices.map((choice, index) => {
              const checked = choice.id === groupId;
              return (
                <button
                  key={choice.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={disabled}
                  onClick={() => {
                    setExpanded(false);
                    onGroupChange(groups[index]!);
                  }}
                  className={cn(
                    "focus-visible:ring-ring/50 flex w-full items-center gap-3 px-4 py-3.5 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
                    checked ? "bg-wash" : "hover:bg-wash",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      checked
                        ? "border-control-edge bg-control"
                        : "border-input",
                    )}
                  >
                    {checked ? (
                      <span className="bg-on-control size-[7px] rounded-full" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold leading-5">
                      {choice.name}
                    </span>
                    <span className="text-eyebrow text-muted-foreground block">
                      {choice.meta}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selected ? (
        <section>
          <SectionHead
            title={c.squadTitle}
            aside={teamSquadCountLine(draft, sport, locale)}
          />
          {members.error ? (
            <p role="alert" className="text-meta mt-3 font-medium">
              {members.error.message}
            </p>
          ) : null}
          <ul className="border-rule bg-paper rounded-card divide-rule mt-3 divide-y overflow-hidden border">
            {visible.map((row) => {
              const member = memberRows.find(
                (entry) => entry.userId === row.userId,
              );
              return (
                <li key={row.userId}>
                  <label
                    className={cn(
                      "flex items-center gap-3 px-4 py-[11px]",
                      row.disabled
                        ? "cursor-default"
                        : "hover:bg-wash cursor-pointer",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={row.picked}
                      disabled={disabled || row.disabled}
                      onChange={() => {
                        if (member) {
                          onToggle(member, selected.name);
                        }
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "peer-focus-visible:ring-ring/50 flex size-[22px] shrink-0 items-center justify-center rounded-[6px] peer-focus-visible:ring-[3px]",
                        row.picked
                          ? "bg-control text-on-control"
                          : "border-input border",
                        row.disabled && !row.picked && "opacity-50",
                      )}
                    >
                      {row.picked ? <Check className="size-3.5" /> : null}
                    </span>
                    <TeamCreateTile tone={row.isCaptain ? "in" : "plain"}>
                      {row.initials}
                    </TeamCreateTile>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold leading-5">
                        {row.name}
                      </span>
                      {row.meta ? (
                        <span className="text-eyebrow text-muted-foreground block">
                          {row.meta}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {members.isPending ? (
            <p className="text-eyebrow text-muted-foreground mt-2">
              {m.team.create.lookingUp}
            </p>
          ) : hidden > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-eyebrow text-muted-foreground hover:text-ink mt-2 min-h-6"
            >
              {c.more(hidden)}
            </button>
          ) : null}
        </section>
      ) : null}

      {selected && tag ? (
        <div className="border-rule bg-paper rounded-card flex items-center gap-3 border px-4 py-3.5">
          <Tag aria-hidden="true" className="size-4 shrink-0" />
          <p
            id="team-create-tag"
            className="text-meta text-muted-foreground flex-1 leading-normal"
          >
            {tag.before}
            <span className="text-ink font-semibold">{tag.strong}</span>
            {tag.after}
          </p>
          <Switch
            checked={tagged}
            onCheckedChange={onTaggedChange}
            disabled={disabled}
            aria-labelledby="team-create-tag"
          />
        </div>
      ) : null}
    </div>
  );
}
