"use client";

import {
  ofSide,
  otherSide,
  type BoardPlayer,
  type Side,
} from "@repo/domain/football-board";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import {
  teamsPlayerCardForm,
  teamsPlayerCardHead,
} from "@repo/domain/football-teams-card";
import Link from "next/link";

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
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { playerProfilePath } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const FORM_MARK = 18;

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
      className={cn(
        "border-rule min-w-0 space-y-0.5 border-s ps-3 first:border-s-0 first:ps-0",
        wide ? "flex-[1.4]" : "flex-1",
      )}
    >
      <dt className="sr-only">{label}</dt>
      <dd className="font-expanded text-h2 truncate" dir="ltr">
        {pending ? <Skeleton className="h-[26px] w-full rounded-sm" /> : value}
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
 * their side's captain or opens the full profile. A drawer from the bottom
 * on a phone, a dialog on a wider screen.
 */
export function FootballTeamsPlayerSheet({
  gameId,
  player,
  side,
  names,
  balanceOn,
  isCaptain,
  canBeCaptain,
  onClose,
  onPlace,
  onToggleCaptain,
}: {
  gameId: string;
  player: BoardPlayer | null;
  /** The side the player is on; null while not placed. */
  side: Side | null;
  names: { slot1: string; slot2: string };
  balanceOn: FootballBalanceOn;
  isCaptain: boolean;
  canBeCaptain: boolean;
  onClose: () => void;
  onPlace: (side: Side) => void;
  onToggleCaptain: () => void;
}) {
  const locale = useLocale();
  const m = useMessages().football.teamsCard;
  const card = api.games.footballPlayerCard.useQuery(
    { gameId, userId: player?.userId ?? "" },
    { enabled: player != null },
  );

  const stats = card.data;
  const pending = card.isLoading;
  const head = player
    ? teamsPlayerCardHead(
        player,
        {
          balanceOn,
          sideName: side ? ofSide(names, side) : null,
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
  const moveTo: Side[] = side ? [otherSide(side)] : [1, 2];

  return (
    <ResponsiveDialog
      open={player != null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent showCloseButton className="sm:max-w-md">
        {player && head ? (
          <div className="space-y-4 px-4 pb-4 sm:p-0">
            <ResponsiveDialogHeader className="flex-row items-center gap-3 p-0 text-start">
              <UserAvatar
                name={player.name}
                image={player.image}
                size="lg"
                guest={player.guest}
              />
              <div className="min-w-0 flex-1 space-y-0.5 pe-8">
                <ResponsiveDialogTitle className="font-expanded text-h2 text-start">
                  <NicknameName
                    name={head.name}
                    isNickname={head.isNickname}
                    wrap
                  />
                </ResponsiveDialogTitle>
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
              <div className="flex min-h-[18px] items-center justify-between gap-3">
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
                {moveTo.map((target) => (
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
                {canBeCaptain ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-w-0 flex-1"
                    onClick={onToggleCaptain}
                  >
                    <span className="truncate">
                      {isCaptain ? m.removeCaptain : m.makeCaptain}
                    </span>
                  </Button>
                ) : null}
              </div>
              {player.guest ? null : (
                <Button asChild size="lg" className="w-full">
                  <Link href={playerProfilePath(player.userId, "football")}>
                    {m.fullProfile}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
