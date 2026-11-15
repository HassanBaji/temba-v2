"use client";

import { UserRoundPlus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PhoneField } from "~/components/auth/phone-field";
import { useLocale, useMessages } from "~/components/locale-provider";
import { TeamCreateTile } from "~/components/teams/team-create-tile";
import { FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { addPlayerCompletePhone } from "@repo/domain/add-player-by-phone";
import {
  DEFAULT_CALLING_COUNTRY_ISO,
  phoneShapePlaceholder,
} from "@repo/domain/phone-number";
import type { Sport } from "@repo/domain/sport";
import {
  teamNewPlayerAddLabel,
  teamNewPlayerFootball,
  teamNewPlayerRoleChoices,
  teamPhoneLookupCard,
  type TeamNewPlayerRole,
  type TeamRosterDraftPhone,
} from "@repo/domain/team-roster-draft";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const PHONE_ID = "team-create-phone";
const NAME_ID = "team-create-new-name";

/**
 * By phone: the number, then who it is. Someone on Temba gets an invite; a
 * number that isn't gets a name and joins the Roster directly.
 */
export function TeamCreatePhoneLookup({
  sport,
  listedPhones,
  full,
  disabled,
  onAdd,
}: {
  sport: Sport;
  listedPhones: readonly string[];
  full: boolean;
  disabled: boolean;
  onAdd: (phone: TeamRosterDraftPhone) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const [countryIso, setCountryIso] = React.useState(
    DEFAULT_CALLING_COUNTRY_ISO,
  );
  const [national, setNational] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<TeamNewPlayerRole | null>(null);

  const e164 = addPlayerCompletePhone(countryIso, national);
  const preview = api.teams.previewPlayerByPhone.useQuery(
    { countryIso, nationalNumber: national, sport },
    { enabled: e164 != null, retry: false },
  );
  const previewData = e164 ? (preview.data ?? null) : null;
  const card = previewData
    ? teamPhoneLookupCard(
        previewData,
        { listed: e164 != null && listedPhones.includes(e164), sport },
        locale,
      )
    : null;
  const blocked = disabled || full;

  function reset() {
    setNational("");
    setName("");
    setRole(null);
  }

  function add() {
    if (!previewData || e164 == null || blocked) {
      return;
    }
    const isNew = previewData.kind === "new";
    const listedName = isNew
      ? name.trim()
      : (previewData.name ?? previewData.phoneMasked ?? "");
    if (listedName.length === 0) {
      return;
    }
    onAdd({
      e164,
      countryIso,
      nationalNumber: national,
      name: listedName,
      kind: previewData.kind,
      phoneMasked: previewData.phoneMasked,
      levelBand: previewData.levelBand ?? null,
      ovr: previewData.ovr ?? null,
      footballRole: previewData.footballRole ?? null,
      footballPosition: previewData.footballPosition ?? null,
      football:
        isNew && sport === "football" ? teamNewPlayerFootball(role) : undefined,
    });
    toast.success(m.team.addPlayers.listed(listedName));
    reset();
  }

  return (
    <>
      <div className="mt-2.5">
        <PhoneField
          id={PHONE_ID}
          countryIso={countryIso}
          national={national}
          placeholder={phoneShapePlaceholder(countryIso)}
          onCountryIsoChange={setCountryIso}
          onNationalChange={setNational}
          invalid={Boolean(e164 && preview.error)}
          describedBy={`${PHONE_ID}-status`}
          disabled={disabled}
        />
        <div id={`${PHONE_ID}-status`} aria-live="polite">
          {e164 && preview.error ? (
            <FieldError className="mt-1.5">{preview.error.message}</FieldError>
          ) : e164 && preview.isFetching && !previewData ? (
            <p className="text-eyebrow text-muted-foreground mt-1.5">
              {m.team.create.lookingUp}
            </p>
          ) : null}
        </div>
      </div>

      {card ? (
        <div className="border-ink rounded-card mt-2 overflow-hidden border">
          {card.kind === "new" ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3">
                <TeamCreateTile tone="added" size="md">
                  <UserRoundPlus aria-hidden="true" className="size-4" />
                </TeamCreateTile>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold">{card.title}</p>
                  <p className="text-eyebrow text-muted-foreground">
                    {card.line}
                  </p>
                </div>
              </div>
              <div className="border-rule flex flex-col gap-2 border-t px-4 py-3">
                <label
                  htmlFor={NAME_ID}
                  className="text-eyebrow text-muted-foreground"
                >
                  {m.team.create.lookup.nameLabel}
                </label>
                <Input
                  id={NAME_ID}
                  size="lg"
                  value={name}
                  maxLength={100}
                  autoComplete="off"
                  disabled={disabled}
                  onChange={(event) => setName(event.target.value)}
                  className="border-ink h-12 min-h-12 px-3.5 text-base font-semibold"
                />
                {sport === "football" ? (
                  <div
                    role="radiogroup"
                    aria-label={m.team.create.lookup.roleLabel}
                    className="flex gap-1.5"
                  >
                    {teamNewPlayerRoleChoices(locale).map((choice) => {
                      const selected = role === choice.value;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={disabled}
                          onClick={() =>
                            setRole(selected ? null : choice.value)
                          }
                          className={cn(
                            "focus-visible:ring-ring/50 flex h-10 flex-1 flex-col items-center justify-center gap-px rounded-[10px] outline-none focus-visible:ring-[3px]",
                            selected
                              ? "bg-control text-on-control"
                              : "border-rule hover:bg-wash border",
                          )}
                        >
                          <span className="font-mono text-[11px] leading-none">
                            {choice.code}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] leading-3",
                              selected
                                ? "text-on-control-muted"
                                : "text-muted-foreground",
                            )}
                          >
                            {choice.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={add}
                disabled={blocked || name.trim().length === 0}
                className="border-rule hover:bg-wash focus-visible:ring-ring/50 flex h-12 w-full items-center justify-center border-t text-[14px] font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-inset disabled:opacity-50"
              >
                {teamNewPlayerAddLabel(name, locale)}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3">
                <TeamCreateTile
                  tone={card.kind === "found" ? "plain" : "added"}
                  size="md"
                >
                  {card.initials}
                </TeamCreateTile>
                <div className="min-w-0 flex-1">
                  <p className="text-body truncate font-semibold">
                    {card.name}
                  </p>
                  <p className="text-eyebrow text-muted-foreground">
                    {card.line}
                  </p>
                </div>
                {card.kind === "blocked" ? null : (
                  <button
                    type="button"
                    onClick={add}
                    disabled={blocked}
                    aria-label={card.actionA11y}
                    className="bg-control text-on-control text-meta focus-visible:ring-ring/50 flex h-9 shrink-0 items-center rounded-[10px] px-3.5 font-semibold outline-none focus-visible:ring-[3px] disabled:opacity-50"
                  >
                    {card.action}
                  </button>
                )}
              </div>
              {card.kind !== "blocked" && card.note ? (
                <p className="border-rule text-eyebrow text-muted-foreground border-t px-4 py-2.5 leading-[1.45]">
                  {card.note}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
