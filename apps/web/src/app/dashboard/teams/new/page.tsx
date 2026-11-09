"use client";

import { Phone, Search, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { TeamCreateFromGroup } from "~/components/teams/team-create-from-group";
import { TeamCreatePhoneLookup } from "~/components/teams/team-create-phone-lookup";
import { TeamCreateSeatStrip } from "~/components/teams/team-create-seat-strip";
import { TeamCreateTembaSearch } from "~/components/teams/team-create-temba-search";
import { TeamRosterDraftList } from "~/components/teams/team-roster-draft-list";
import { Button } from "~/components/ui/button";
import { FieldError } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { BackButton } from "~/components/ui/nav-icon-button";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { challengesTabQuery } from "@repo/domain/challenges-tab";
import { initials } from "@repo/domain/initials";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import {
  addDraftInvites,
  addDraftPhone,
  EMPTY_TEAM_ROSTER_DRAFT,
  removeDraftRow,
  rosterDraftCount,
  rosterDraftCreateInput,
  rosterDraftForSport,
  rosterDraftSpotsLeft,
  rosterDraftView,
  teamCreateSubmitLabel,
  teamSportChoices,
  toggleDraftGroupMember,
  type TeamRosterDraft,
} from "@repo/domain/team-roster-draft";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const FIELD_IDS = { name: "team-name" };
const TEAMS_HREF = `/dashboard/challenges${challengesTabQuery("teams")}`;

type Mode = "form" | "group";
type Source = "phone" | "temba";

export default function NewTeamPage() {
  const m = useMessages();
  return (
    <React.Suspense
      fallback={
        <DashboardShell title={m.team.create.title} hidePageHeader>
          {null}
        </DashboardShell>
      }
    >
      <NewTeamForm />
    </React.Suspense>
  );
}

function SectionHead({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-expanded text-title">{title}</h2>
      {aside ? (
        <span className="text-eyebrow text-muted-foreground" aria-live="polite">
          {aside}
        </span>
      ) : null}
    </div>
  );
}

function NewTeamForm() {
  const m = useMessages();
  const c = m.team.create;
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const initialGroupId = searchParams.get("groupId");

  const [mode, setMode] = React.useState<Mode>(
    initialGroupId ? "group" : "form",
  );
  const [groupId, setGroupId] = React.useState<string | null>(initialGroupId);
  const [tagged, setTagged] = React.useState(true);
  const [name, setName] = React.useState("");
  const [pickedSport, setSport] = React.useState<Sport>(DEFAULT_SPORT);
  const [draft, setDraft] = React.useState<TeamRosterDraft>(
    EMPTY_TEAM_ROSTER_DRAFT,
  );
  const [adderOpen, setAdderOpen] = React.useState(true);
  const [source, setSource] = React.useState<Source>("phone");

  const me = api.users.profileDetails.useQuery();
  const organized = api.games.listCreateGroups.useQuery();
  const groups = organized.data ?? [];
  const group = groups.find((entry) => entry.id === groupId) ?? null;
  const sport = mode === "group" && group ? group.sport : pickedSport;
  const tagGroupId = tagged && group?.sport === sport ? group.id : null;

  const fitted = rosterDraftForSport(draft, sport);
  const count = rosterDraftCount(fitted);
  const full = rosterDraftSpotsLeft(fitted, sport) === 0;
  const captainName = me.data?.name ?? m.common.you;
  const roster = rosterDraftView(
    fitted,
    {
      sport,
      captain: {
        name: captainName,
        footballRole: me.data?.preferredFootballRole ?? null,
        footballPosition: me.data?.preferredFootballPosition ?? null,
      },
    },
    locale,
  );

  const createTeam = api.teams.create.useMutation({
    onSuccess: async (team) => {
      toast.success(m.team.toast.created);
      await utils.teams.mine.invalidate();
      if (team.groupTag) {
        await utils.groups.byId.invalidate({ id: team.groupTag.id });
      }
      router.push(`/dashboard/teams/${team.id}`);
    },
    onError: (error) => {
      toastGlobalFormError(error);
      if (fieldErrorMessage(error, "name")) {
        setMode("form");
      }
      focusFormFailure(error, FIELD_IDS, summaryRef.current);
    },
  });
  const nameError = fieldErrorMessage(createTeam.error, "name");
  const pending = createTeam.isPending;

  function changeSport(next: Sport) {
    setSport(next);
    setDraft((current) => rosterDraftForSport(current, next));
  }

  function leaveGroupMode() {
    setSport(sport);
    setMode("form");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    createTeam.mutate(
      rosterDraftCreateInput({ name, sport, groupId: tagGroupId }, fitted),
    );
  }

  const title = mode === "group" ? c.fromGroupTitle : c.title;
  const crest = name.trim() ? initials(name) : null;

  return (
    <DashboardShell title={title} hidePageHeader hideMobileTopBar>
      <form
        onSubmit={onSubmit}
        className="mx-auto flex min-h-full w-full max-w-[560px] flex-col"
      >
        <header className="mt-[22px] flex items-center gap-1 lg:mt-2">
          {mode === "group" ? (
            <BackButton onClick={leaveGroupMode} />
          ) : (
            <BackButton href={TEAMS_HREF} />
          )}
          <h1 className="text-h2 font-bold tracking-[-0.01em]">{title}</h1>
        </header>

        <FormErrorSummary
          ref={summaryRef}
          message={globalFormErrorMessage(createTeam.error)}
        />

        <div className="mt-[22px] flex flex-col gap-[26px] pb-2">
          {mode === "group" ? (
            <TeamCreateFromGroup
              groups={groups}
              loading={organized.isPending}
              groupId={group?.id ?? null}
              onGroupChange={(next) => {
                setGroupId(next.id);
                setDraft((current) => rosterDraftForSport(current, next.sport));
              }}
              draft={fitted}
              sport={sport}
              captainName={captainName}
              onToggle={(member, groupName) =>
                setDraft((current) =>
                  toggleDraftGroupMember(
                    rosterDraftForSport(current, sport),
                    member,
                    { groupName, sport },
                  ),
                )
              }
              tagged={tagged}
              onTaggedChange={setTagged}
              disabled={pending}
            />
          ) : (
            <>
              <section>
                <h2 className="font-expanded text-title">
                  <label htmlFor={FIELD_IDS.name}>{c.nameTitle}</label>
                </h2>
                <div className="mt-3 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "rounded-card flex size-[52px] shrink-0 items-center justify-center text-[17px] font-bold tracking-[-0.02em] [font-variation-settings:'wdth'_112,'wght'_700]",
                      crest ? "bg-control text-on-control" : "hatch",
                    )}
                  >
                    {crest}
                  </span>
                  <input
                    id={FIELD_IDS.name}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={255}
                    placeholder={c.namePlaceholder}
                    autoComplete="off"
                    disabled={pending}
                    aria-invalid={nameError ? true : undefined}
                    aria-describedby={nameError ? "team-name-error" : undefined}
                    className="border-rule focus-visible:border-ink placeholder:text-muted-foreground aria-invalid:border-destructive h-[52px] min-w-0 flex-1 rounded-lg border bg-transparent px-4 text-[17px] font-semibold outline-none placeholder:font-normal"
                  />
                </div>
                <FieldError id="team-name-error" className="mt-1.5">
                  {nameError}
                </FieldError>
              </section>

              <section>
                <SectionHead title={c.sportTitle} aside={c.sportHint} />
                <div
                  role="radiogroup"
                  aria-label={c.sportTitle}
                  className="mt-3 grid grid-cols-2 gap-2"
                >
                  {teamSportChoices(locale).map((choice) => {
                    const selected = choice.value === sport;
                    return (
                      <button
                        key={choice.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={pending}
                        onClick={() => changeSport(choice.value)}
                        className={cn(
                          "focus-visible:ring-ring/50 flex h-[60px] flex-col items-center justify-center gap-0.5 rounded-lg border outline-none focus-visible:ring-[3px]",
                          selected
                            ? "border-control-edge bg-control text-on-control"
                            : "border-rule hover:bg-wash",
                        )}
                      >
                        <span className="text-[14px] font-semibold leading-5">
                          {choice.name}
                        </span>
                        <span
                          className={cn(
                            "text-[11px] leading-4",
                            selected ? "text-dim" : "text-muted-foreground",
                          )}
                        >
                          {choice.detail}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <SectionHead title={c.rosterTitle} aside={roster.countLine} />
                <TeamCreateSeatStrip roster={roster} legend={!adderOpen} />

                {adderOpen && !full ? (
                  <>
                    <div
                      role="group"
                      aria-label={c.sources.label}
                      className="mt-3.5 flex gap-1.5"
                    >
                      {(
                        [
                          ["phone", Phone, c.sources.phone],
                          ["temba", Search, c.sources.temba],
                        ] as const
                      ).map(([value, Icon, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={source === value}
                          onClick={() => setSource(value)}
                          className={cn(
                            "text-meta focus-visible:ring-ring/50 flex h-[38px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[9px] outline-none focus-visible:ring-[3px]",
                            source === value
                              ? "bg-control text-on-control font-semibold"
                              : "border-rule hover:bg-wash border",
                          )}
                        >
                          <Icon aria-hidden="true" className="size-3.5" />
                          <span className="truncate">{label}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setMode("group")}
                        className="text-meta border-rule hover:bg-wash focus-visible:ring-ring/50 flex h-[38px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[9px] border outline-none focus-visible:ring-[3px]"
                      >
                        <Users aria-hidden="true" className="size-3.5" />
                        <span className="truncate">{c.sources.group}</span>
                      </button>
                    </div>
                    {source === "phone" ? (
                      <TeamCreatePhoneLookup
                        sport={sport}
                        listedPhones={fitted.phones.map((phone) => phone.e164)}
                        full={full}
                        disabled={pending}
                        onAdd={(phone) => {
                          setDraft((current) =>
                            addDraftPhone(current, phone, sport),
                          );
                          setAdderOpen(false);
                        }}
                      />
                    ) : (
                      <TeamCreateTembaSearch
                        listedUserIds={fitted.invites.map(
                          (invite) => invite.userId,
                        )}
                        full={full}
                        disabled={pending}
                        onInvite={(user) => {
                          setDraft((current) =>
                            addDraftInvites(
                              current,
                              [
                                {
                                  userId: user.id,
                                  name: user.name,
                                  source: { kind: "temba" },
                                },
                              ],
                              sport,
                            ),
                          );
                          toast.success(m.team.addPlayers.listed(user.name));
                        }}
                      />
                    )}
                  </>
                ) : null}

                <TeamRosterDraftList
                  roster={roster}
                  onAddMore={
                    adderOpen
                      ? null
                      : () => {
                          setSource("phone");
                          setAdderOpen(true);
                        }
                  }
                  onRemove={(key) =>
                    setDraft((current) => removeDraftRow(current, key))
                  }
                  disabled={pending}
                />
              </section>
            </>
          )}
        </div>

        <div className="border-rule bg-background sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] z-10 mt-auto flex gap-2.5 border-t py-3.5 lg:bottom-0">
          <Button
            type="submit"
            size="lg"
            pending={pending}
            disabled={pending}
            className="h-[50px] min-h-[50px] flex-1 rounded-lg px-4 text-[15px] font-semibold"
          >
            {pending
              ? m.webDashboard.creating
              : teamCreateSubmitLabel({ name, sport, count }, locale)}
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="text-muted-foreground h-[50px] min-h-[50px] w-[104px] rounded-lg px-0 text-[15px] font-normal"
          >
            <Link href={TEAMS_HREF}>{m.common.cancel}</Link>
          </Button>
        </div>
      </form>
    </DashboardShell>
  );
}
