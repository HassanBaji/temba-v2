"use client";

import * as React from "react";
import {
  LinkIcon,
  MessageCircle,
  MessageSquare,
  Phone,
  Search,
  Share,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { PhoneField } from "~/components/auth/phone-field";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  copyLinkLabel,
  inviteLinkEmptyNote,
  inviteLinkLifetimeNote,
  inviteModeLabel,
  inviteButtonLabel,
  inviteLinkNote,
  lookupResultView,
  noPendingCopy,
  noPlayersMatchCopy,
  pendingNote,
  pendingHeading,
  phoneInviteLabel,
  phoneInviteNote,
  playersHeading,
  type InviteDoorKind,
  type InviteMode,
  type LookupResultRow,
} from "@repo/domain/invite-door";
import { cn } from "~/lib/utils";

const MODE_ICONS: Record<InviteMode, LucideIcon> = {
  players: Users,
  phone: Phone,
  link: LinkIcon,
};

export type Slot<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; value: T };

export type PendingLookupRow = {
  id: string;
  user: { id: string; name: string | null; email: string | null };
};

export type PlayersModeProps = {
  query: string;
  onQueryChange: (query: string) => void;
  results: Slot<LookupResultRow[]>;
  invitedUserIds: ReadonlySet<string>;
  busyUserId: string | null;
  /** A Team partner has one open seat, so one pending invite closes the others. */
  singlePick: boolean;
  full: boolean;
  onInvite: (row: LookupResultRow) => void;
  onUninvite: (userId: string) => void;
  refused: { name: string; message: string }[] | null;
  canLink: boolean;
};

export type PhoneModeProps = {
  countryIso: string;
  national: string;
  onCountryIsoChange: (iso: string) => void;
  onNationalChange: (value: string) => void;
  ready: boolean;
  sending: boolean;
  onSend: () => void;
  canLookup: boolean;
};

export type LinkModeProps = {
  kind: InviteDoorKind;
  currentUrl: string | null;
  pending: boolean;
  copied: boolean;
  onShare: () => void;
  onCopy: () => void;
  onWhatsApp: () => void;
  onMessages: () => void;
};

export type PendingProps = {
  rows: Slot<PendingLookupRow[]>;
  revokingId: string | null;
  onRevoke: (inviteId: string) => void;
};

export type InviteDialogViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
  title: string;
  subtitle: string | null;
  modes: InviteMode[];
  mode: InviteMode;
  onModeChange: (mode: InviteMode) => void;
  players: PlayersModeProps | null;
  phone: PhoneModeProps | null;
  link: LinkModeProps | null;
  pending: PendingProps | null;
};

function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-muted-foreground text-eyebrow", className)}
      {...props}
    />
  );
}

function ModeSwitch({ modes }: { modes: InviteMode[] }) {
  const locale = useLocale();
  return (
    <TabsList className="bg-wash h-auto w-full gap-1 p-1">
      {modes.map((entry) => {
        const Icon = MODE_ICONS[entry];
        return (
          <TabsTrigger
            key={entry}
            value={entry}
            className="text-muted-foreground text-meta data-[state=active]:bg-control data-[state=active]:text-on-control h-[38px] gap-1.5 border-none font-semibold"
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {inviteModeLabel(entry, locale)}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}

function PlayerRow({
  row,
  invited,
  busy,
  blocked,
  onInvite,
  onUninvite,
}: {
  row: LookupResultRow;
  invited: boolean;
  busy: boolean;
  blocked: boolean;
  onInvite: () => void;
  onUninvite: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const view = lookupResultView(row, invited, locale);
  return (
    <li className="border-rule min-h-15 flex items-center gap-3 border-b py-2.5">
      <UserAvatar name={view.name} size="lg" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate font-semibold">{view.name}</p>
        {view.meta ? <Eyebrow className="truncate">{view.meta}</Eyebrow> : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant={invited ? "outline" : "default"}
        aria-label={
          invited
            ? m.webAuth.invites.door.cancelInviteFor(view.name)
            : m.webAuth.invites.door.invite(view.name)
        }
        aria-pressed={invited}
        pending={busy}
        disabled={!invited && blocked}
        onClick={invited ? onUninvite : onInvite}
      >
        {inviteButtonLabel(invited, locale)}
      </Button>
    </li>
  );
}

function PlayersMode({ players }: { players: PlayersModeProps }) {
  const m = useMessages();
  const locale = useLocale();
  const { results } = players;
  const hasPick = players.singlePick && players.invitedUserIds.size > 0;
  return (
    <div className="space-y-3.5">
      <InputGroup className="h-11">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={players.query}
          onChange={(event) => players.onQueryChange(event.target.value)}
          placeholder={m.webAuth.invites.door.searchPlaceholder}
          aria-label={m.webAuth.invites.door.searchLabel}
          autoComplete="off"
        />
      </InputGroup>
      {players.refused && players.refused.length > 0 ? (
        <ul role="alert" className="text-meta space-y-1 font-medium">
          {players.refused.map((item) => (
            <li key={`${item.name}-${item.message}`}>
              {item.name}: {item.message}
            </li>
          ))}
        </ul>
      ) : null}
      <Eyebrow>{playersHeading(players.query, locale)}</Eyebrow>
      {results.status === "loading" ? (
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : results.status === "error" ? (
        <p role="alert" className="text-meta font-medium">
          {results.message}
        </p>
      ) : results.value.length === 0 ? (
        <p className="text-muted-foreground text-meta whitespace-pre-line py-5 text-center">
          {noPlayersMatchCopy(players.query, players.canLink, locale)}
        </p>
      ) : (
        <ul className="-mt-2.5">
          {results.value.map((row) => (
            <PlayerRow
              key={row.id}
              row={row}
              invited={players.invitedUserIds.has(row.id)}
              busy={players.busyUserId === row.id}
              blocked={hasPick || players.full || players.busyUserId != null}
              onInvite={() => players.onInvite(row)}
              onUninvite={() => players.onUninvite(row.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PhoneMode({ phone }: { phone: PhoneModeProps }) {
  const m = useMessages();
  const locale = useLocale();
  const id = React.useId();
  return (
    <form
      className="space-y-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (phone.ready && !phone.sending) {
          phone.onSend();
        }
      }}
    >
      <div className="space-y-2">
        <label htmlFor={id} className="text-meta font-semibold">
          {m.webAuth.invites.door.phoneNumber}
        </label>
        <PhoneField
          id={id}
          countryIso={phone.countryIso}
          national={phone.national}
          onCountryIsoChange={phone.onCountryIsoChange}
          onNationalChange={phone.onNationalChange}
          disabled={phone.sending}
        />
      </div>
      <p className="text-muted-foreground text-meta">
        {phoneInviteNote(phone.canLookup, locale)}
      </p>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        pending={phone.sending}
        disabled={!phone.ready}
      >
        {phoneInviteLabel(phone.ready, phone.sending, locale)}
      </Button>
    </form>
  );
}

function LinkMode({ link }: { link: LinkModeProps }) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <div className="space-y-3.5">
      <div className="border-rule flex items-center gap-3 rounded-lg border px-4 py-3.5">
        <div className="min-w-0 flex-1 space-y-[3px]">
          {link.currentUrl ? (
            <p className="select-all truncate font-mono">{link.currentUrl}</p>
          ) : null}
          <Eyebrow>
            {link.currentUrl
              ? inviteLinkLifetimeNote(link.kind, locale)
              : inviteLinkEmptyNote(locale)}
          </Eyebrow>
        </div>
        <Button
          type="button"
          size="sm"
          variant={link.copied ? "outline" : "default"}
          aria-label={m.webAuth.invites.door.copyLink}
          disabled={link.pending}
          onClick={link.onCopy}
        >
          {copyLinkLabel(link.copied, locale)}
        </Button>
      </div>
      <p className="text-muted-foreground text-meta">
        {inviteLinkNote(link.kind, locale)}
      </p>
      <Button
        type="button"
        size="lg"
        className="w-full"
        pending={link.pending}
        onClick={link.onShare}
      >
        <Share aria-hidden="true" />
        {m.webAuth.invites.door.shareLink}
      </Button>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={link.pending}
          onClick={link.onWhatsApp}
        >
          <MessageCircle aria-hidden="true" />
          WhatsApp
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={link.pending}
          onClick={link.onMessages}
        >
          <MessageSquare aria-hidden="true" />
          {m.webAuth.invites.door.messages}
        </Button>
      </div>
    </div>
  );
}

function PendingChip({
  row,
  revoking,
  onRevoke,
}: {
  row: PendingLookupRow;
  revoking: boolean;
  onRevoke: () => void;
}) {
  const m = useMessages();
  const name = row.user.name ?? m.webAuth.invites.door.userFallback;
  return (
    <li
      className={cn(
        "border-rule flex h-8 items-center gap-1.5 rounded-full border pe-[5px] ps-3",
        revoking && "opacity-50",
      )}
    >
      <span className="text-meta truncate">{name}</span>
      <button
        type="button"
        aria-label={m.webAuth.invites.door.cancelInviteFor(name)}
        disabled={revoking}
        onClick={onRevoke}
        className="bg-wash text-muted-foreground hover:text-ink focus-visible:ring-ring/50 relative flex size-[22px] items-center justify-center rounded-full outline-none after:absolute after:size-11 focus-visible:ring-[3px]"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </li>
  );
}

function PendingFooter({ pending }: { pending: PendingProps }) {
  const locale = useLocale();
  const rows = pending.rows.status === "ready" ? pending.rows.value : [];
  return (
    <section className="border-rule space-y-2.5 border-t pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-meta font-semibold">
          {pendingHeading(rows.length, locale)}
        </h3>
        {rows.length > 0 ? <Eyebrow>{pendingNote(locale)}</Eyebrow> : null}
      </div>
      {pending.rows.status === "loading" ? (
        <Skeleton className="h-8 rounded-full" />
      ) : pending.rows.status === "error" ? (
        <p role="alert" className="text-meta font-medium">
          {pending.rows.message}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground text-meta">
          {noPendingCopy(locale)}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {rows.map((row) => (
            <PendingChip
              key={row.id}
              row={row}
              revoking={pending.revokingId === row.id}
              onRevoke={() => pending.onRevoke(row.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function InviteDialogView({
  open,
  onOpenChange,
  restoreFocusRef,
  title,
  subtitle,
  modes,
  mode,
  onModeChange,
  players,
  phone,
  link,
  pending,
}: InviteDialogViewProps) {
  const m = useMessages();
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        restoreFocusRef={restoreFocusRef}
        className="md:max-h-[min(720px,calc(100dvh-4rem))] md:grid-rows-[auto_minmax(0,1fr)]"
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription
            className={subtitle ? undefined : "sr-only"}
          >
            {subtitle ?? m.webAuth.invites.door.description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pb-4 md:min-h-[420px] md:px-0 md:pb-0">
          <Tabs
            value={mode}
            onValueChange={(value) => onModeChange(value as InviteMode)}
            className="flex-1 gap-4"
          >
            {modes.length > 1 ? <ModeSwitch modes={modes} /> : null}
            {players ? (
              <TabsContent value="players">
                <PlayersMode players={players} />
              </TabsContent>
            ) : null}
            {phone ? (
              <TabsContent value="phone">
                <PhoneMode phone={phone} />
              </TabsContent>
            ) : null}
            {link ? (
              <TabsContent value="link">
                <LinkMode link={link} />
              </TabsContent>
            ) : null}
          </Tabs>
          {pending ? <PendingFooter pending={pending} /> : null}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
