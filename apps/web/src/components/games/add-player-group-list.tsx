"use client";

import { Check, Search } from "lucide-react";

import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { NotOnTembaTag } from "~/components/temba/seat";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { Skeleton } from "~/components/ui/skeleton";
import { addPlayerFootballRoleChoices } from "@repo/domain/add-player-by-phone";
import type { AddPlayerFootballPosition } from "@repo/domain/add-player-by-phone";
import {
  groupMemberPositionChoices,
  type GroupMemberFootballPick,
  type GroupMemberRowView,
} from "@repo/domain/add-player-from-group";
import type { FootballRole } from "@repo/domain/football-lineup";
import { cn } from "~/lib/utils";

function CompactChoices<T extends string>({
  label,
  choices,
  value,
  onSelect,
  disabled,
}: {
  label: string;
  choices: { value: T; name: string; detail?: string }[];
  value: T;
  onSelect: (value: T) => void;
  disabled: boolean;
}) {
  const many = choices.length > 2;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-eyebrow text-muted-foreground">{label}</span>
      <RovingRadioGroup
        aria-label={label}
        className={cn(
          "grid",
          many ? "grid-cols-4 gap-1" : "grid-cols-2 gap-1.5",
        )}
      >
        {choices.map((choice) => {
          const selected = choice.value === value;
          return (
            <button
              key={choice.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onSelect(choice.value)}
              className={cn(
                "focus-visible:ring-ring/50 flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-md border px-0.5 outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
                selected
                  ? "border-ink bg-control text-on-control"
                  : "border-rule bg-paper text-ink hover:bg-wash",
              )}
            >
              <span
                className={cn(
                  "truncate font-semibold",
                  many ? "text-eyebrow" : "text-meta",
                )}
              >
                {choice.name}
              </span>
              {choice.detail ? (
                <span
                  className={cn(
                    "text-eyebrow truncate",
                    selected
                      ? "text-on-control-muted"
                      : "text-muted-foreground",
                  )}
                >
                  {choice.detail}
                </span>
              ) : null}
            </button>
          );
        })}
      </RovingRadioGroup>
    </div>
  );
}

function PickMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px]",
        selected ? "border-ink bg-ink text-paper" : "border-input",
      )}
    >
      {selected ? <Check className="size-3.5" /> : null}
    </span>
  );
}

function MemberRow({
  row,
  unclaimed,
  image,
  football,
  onToggle,
  onFootballChange,
  disabled,
}: {
  row: GroupMemberRowView;
  unclaimed: boolean;
  image: string | null;
  football: GroupMemberFootballPick | null;
  onToggle: () => void;
  onFootballChange: (pick: GroupMemberFootballPick) => void;
  disabled: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const unavailable = row.status != null || row.blocked;
  return (
    <li className="border-rule border-b">
      <button
        type="button"
        role="checkbox"
        aria-checked={row.selected}
        disabled={unavailable || disabled}
        onClick={onToggle}
        className={cn(
          "focus-visible:ring-ring/50 min-h-15.5 flex w-full items-center gap-3 py-2.5 text-start outline-none focus-visible:ring-[3px]",
          unavailable ? "cursor-default opacity-45" : "hover:opacity-80",
        )}
      >
        <UserAvatar
          name={row.name}
          image={image}
          size="lg"
          className="rounded-md"
        />
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="block truncate font-semibold">{row.name}</span>
          {unclaimed ? <NotOnTembaTag /> : null}
          {row.meta ? (
            <span className="text-eyebrow text-muted-foreground block truncate">
              {row.meta}
            </span>
          ) : null}
        </span>
        {row.status ? (
          <span className="text-eyebrow text-muted-foreground shrink-0">
            {row.status}
          </span>
        ) : (
          <PickMark selected={row.selected} />
        )}
      </button>
      {row.selected && football ? (
        <div className="flex flex-col gap-2.5 pb-3.5 ps-[52px]">
          <CompactChoices<FootballRole>
            label={m.webGame.addPlayer.playsAs}
            choices={addPlayerFootballRoleChoices(locale)}
            value={football.role}
            onSelect={(role) => onFootballChange({ ...football, role })}
            disabled={disabled}
          />
          {football.role === "outfield" ? (
            <CompactChoices<AddPlayerFootballPosition>
              label={m.webGame.addPlayer.preferredPosition}
              choices={groupMemberPositionChoices(locale)}
              value={football.position}
              onSelect={(position) =>
                onFootballChange({ ...football, position })
              }
              disabled={disabled}
            />
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function GroupMemberList({
  query,
  onQueryChange,
  groupLine,
  spotsLine,
  full,
  rows,
  detailsById,
  footballById,
  emptyLine,
  loading,
  error,
  onToggle,
  onFootballChange,
  disabled,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  groupLine: string | null;
  spotsLine: string | null;
  full: boolean;
  rows: GroupMemberRowView[];
  detailsById: ReadonlyMap<
    string,
    { unclaimed: boolean; image: string | null }
  >;
  /** Present on a football Game, keyed by picked member. */
  footballById: Readonly<Record<string, GroupMemberFootballPick>> | null;
  emptyLine: string | null;
  loading: boolean;
  error: string | null;
  onToggle: (userId: string) => void;
  onFootballChange: (userId: string, pick: GroupMemberFootballPick) => void;
  disabled: boolean;
}) {
  const m = useMessages();
  const copy = m.group.addPlayer.fromGroup;
  return (
    <div className="space-y-3">
      <InputGroup className="h-11">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={copy.search}
          aria-label={copy.search}
          autoComplete="off"
        />
      </InputGroup>
      {groupLine ? (
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-meta text-muted-foreground min-w-0 truncate">
            {groupLine}
          </p>
          {spotsLine ? (
            <p
              aria-live="polite"
              className={cn(
                "text-eyebrow shrink-0",
                full ? "text-ink" : "text-muted-foreground",
              )}
            >
              {spotsLine}
            </p>
          ) : null}
        </div>
      ) : null}
      {loading ? (
        <div className="space-y-2" aria-label={copy.loading}>
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : error ? (
        <p role="alert" className="text-meta font-medium">
          {error}
        </p>
      ) : (
        <>
          <ul>
            {rows.map((row) => {
              const details = detailsById.get(row.userId);
              return (
                <MemberRow
                  key={row.userId}
                  row={row}
                  unclaimed={details?.unclaimed ?? false}
                  image={details?.image ?? null}
                  football={footballById?.[row.userId] ?? null}
                  onToggle={() => onToggle(row.userId)}
                  onFootballChange={(pick) =>
                    onFootballChange(row.userId, pick)
                  }
                  disabled={disabled}
                />
              );
            })}
          </ul>
          {emptyLine ? (
            <p className="text-meta text-muted-foreground py-5 text-center">
              {emptyLine}
              <br />
              {copy.tryPhone}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
