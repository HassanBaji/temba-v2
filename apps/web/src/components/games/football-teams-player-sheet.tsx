"use client";

import {
  ofSide,
  type Side,
  type TeamsOpenPlayer,
} from "@repo/domain/football-board";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import {
  teamsPlayerCardForm,
  teamsPlayerCardHead,
} from "@repo/domain/football-teams-card";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { FormStrip } from "~/components/temba/form-strip";
import { NicknameName } from "~/components/temba/nickname-name";
import { GuestTag } from "~/components/temba/seat";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

const FORM_MARK = 18;
/** The rating is the widest figure, so its column takes more of the row. */
const RATING_COLUMN = 1.4;

function Stat({
  value,
  label,
  pending = false,
  wide = false,
}: {
  value: string;
  label: string;
  pending?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className="border-rule min-w-0 space-y-0.5 border-s ps-3 first:border-s-0 first:ps-0"
      style={{ flex: wide ? RATING_COLUMN : 1 }}
    >
      <dt className="sr-only">{label}</dt>
      <dd className="font-expanded text-title min-[400px]:text-h2 whitespace-nowrap">
        {pending ? (
          <Skeleton className="h-lh w-full rounded-sm" />
        ) : (
          <span dir="ltr">{value}</span>
        )}
      </dd>
      <dd aria-hidden="true" className="text-muted-foreground text-eyebrow">
        {label}
      </dd>
    </div>
  );
}

/**
 * A pool player's short profile on Make teams: the number the teams balance
 * on and how it moved this month, Games, goals and MVPs in the Group and the
 * last five results. From here the Organizer puts them on a team, names them
 * their side's captain or opens the full profile.
 */
export function FootballTeamsPlayerSheet({
  gameId,
  open,
  names,
  balanceOn,
  onClose,
  onPlace,
  onToggleCaptain,
  onOpenProfile,
}: {
  gameId: string;
  open: TeamsOpenPlayer | null;
  names: { slot1: string; slot2: string };
  balanceOn: FootballBalanceOn;
  onClose: () => void;
  onPlace: (side: Side) => void;
  onToggleCaptain: () => void;
  onOpenProfile: () => void;
}) {
  const locale = useLocale();
  const m = useMessages().football.teamsCard;
  const player = open?.player ?? null;
  const card = api.games.footballPlayerCard.useQuery(
    { gameId, userId: player?.userId ?? "" },
    { enabled: player != null },
  );

  const stats = card.data;
  const pending = card.isLoading;
  const head =
    open && player
      ? teamsPlayerCardHead(
          player,
          {
            balanceOn,
            sideName: open.side ? ofSide(names, open.side) : null,
            pointsThisMonth: stats?.pointsThisMonth,
          },
          locale,
        )
      : null;
  const form = teamsPlayerCardForm(
    stats?.form ?? [],
    stats?.games ?? 0,
    locale,
  );

  return (
    <ResponsiveDialog
      open={open != null}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent showCloseButton className="lg:max-w-md">
        {open && player && head ? (
          <div className="space-y-4 px-4 pb-4 lg:p-0">
            <ResponsiveDialogHeader className="flex-row items-center gap-3 p-0 pe-14 text-start">
              <UserAvatar
                name={player.name}
                image={player.image}
                size="lg"
                guest={player.guest}
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <ResponsiveDialogTitle className="font-expanded text-h2 text-start">
                  <NicknameName
                    name={head.name}
                    isNickname={head.isNickname}
                    wrap
                  />
                </ResponsiveDialogTitle>
                {player.guest ? <GuestTag /> : null}
                <ResponsiveDialogDescription className="text-muted-foreground text-meta text-start">
                  {head.subtitle}
                </ResponsiveDialogDescription>
              </div>
            </ResponsiveDialogHeader>
            <dl className="border-rule flex gap-3 border-y py-3">
              <Stat value={head.ratingValue} label={head.ratingLabel} wide />
              <Stat
                value={String(stats?.games ?? 0)}
                label={m.games(stats?.games ?? 0)}
                pending={pending}
              />
              <Stat
                value={String(stats?.goals ?? 0)}
                label={m.goals(stats?.goals ?? 0)}
                pending={pending}
              />
              <Stat
                value={String(stats?.mvps ?? 0)}
                label={m.mvps}
                pending={pending}
              />
            </dl>
            {card.error ? (
              <p role="alert" className="text-muted-foreground text-meta">
                {m.statsFailed}
              </p>
            ) : (
              <div
                className="flex items-center justify-between gap-3"
                style={{ minHeight: FORM_MARK }}
              >
                {pending ? null : (
                  <>
                    <p className="text-muted-foreground text-meta">
                      {form.caption}
                    </p>
                    <FormStrip marks={form.slots} size={FORM_MARK} />
                  </>
                )}
              </div>
            )}
            <div className="space-y-2">
              <div className="flex gap-2">
                {open.placeTargets.map((target) => (
                  <Button
                    key={target}
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-w-0 flex-1"
                    onClick={() => onPlace(target)}
                  >
                    <span className="truncate">
                      {m.moveTo(ofSide(names, target))}
                    </span>
                  </Button>
                ))}
                {open.canBeCaptain ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-w-0 flex-1"
                    onClick={onToggleCaptain}
                  >
                    <span className="truncate">
                      {open.isCaptain ? m.removeCaptain : m.makeCaptain}
                    </span>
                  </Button>
                ) : null}
              </div>
              {player.guest ? null : (
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={onOpenProfile}
                >
                  {m.fullProfile}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
