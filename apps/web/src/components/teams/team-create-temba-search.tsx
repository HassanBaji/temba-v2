"use client";

import { Search } from "lucide-react";
import * as React from "react";

import { useMessages } from "~/components/locale-provider";
import { TeamCreateTile } from "~/components/teams/team-create-tile";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { initials } from "@repo/domain/initials";
import { api } from "~/trpc/react";

const SEARCH_MIN_LENGTH = 2;

/** On Temba: find someone by name, username, email or phone and invite them. */
export function TeamCreateTembaSearch({
  listedUserIds,
  full,
  disabled,
  onInvite,
}: {
  listedUserIds: readonly string[];
  full: boolean;
  disabled: boolean;
  onInvite: (user: { id: string; name: string }) => void;
}) {
  const m = useMessages();
  const [query, setQuery] = React.useState("");
  const trimmed = query.trim();
  const search = api.teams.searchLookupUsers.useQuery(
    { query: trimmed },
    { enabled: trimmed.length >= SEARCH_MIN_LENGTH },
  );
  const rows = trimmed.length >= SEARCH_MIN_LENGTH ? (search.data ?? []) : [];

  return (
    <div className="mt-2.5 space-y-2">
      <InputGroup className="focus-within:border-ink h-13 rounded-lg shadow-none">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={m.team.addPlayers.searchLabel}
          aria-label={m.team.addPlayers.searchLabel}
          autoComplete="off"
          disabled={disabled}
          className="text-base"
        />
      </InputGroup>
      <div aria-live="polite">
        {search.error ? (
          <p role="alert" className="text-eyebrow font-medium">
            {search.error.message}
          </p>
        ) : search.data?.length === 0 && trimmed.length >= SEARCH_MIN_LENGTH ? (
          <p className="text-eyebrow text-muted-foreground">
            {m.team.addPlayers.searchEmpty}
          </p>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <ul className="border-ink rounded-card divide-rule divide-y overflow-hidden border">
          {rows.map((row) => {
            const listed = listedUserIds.includes(row.id);
            return (
              <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                <TeamCreateTile tone={listed ? "invited" : "plain"} size="md">
                  {initials(row.name)}
                </TeamCreateTile>
                <div className="min-w-0 flex-1">
                  <p className="text-body truncate font-semibold">{row.name}</p>
                  {row.username ? (
                    <p className="text-eyebrow text-muted-foreground truncate">
                      {row.username}
                    </p>
                  ) : null}
                </div>
                {listed ? (
                  <span className="text-eyebrow text-muted-foreground shrink-0">
                    {m.team.addPlayers.invitedMark}
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={m.team.create.lookup.inviteA11y(row.name)}
                    disabled={disabled || full}
                    onClick={() => onInvite(row)}
                    className="bg-control text-on-control text-meta focus-visible:ring-ring/50 flex h-9 shrink-0 items-center rounded-[10px] px-3.5 font-semibold outline-none focus-visible:ring-[3px] disabled:opacity-50"
                  >
                    {m.team.create.lookup.invite}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
